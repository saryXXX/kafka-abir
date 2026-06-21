import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import { saveDriver, getDrivers, getDriverById, getIdleDriver, updateDriverStatus, updateDriverLocation, saveDelivery, getDeliveryByOrderId, updateDeliveryStatus } from './db.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.resolve(__dirname, '../../../shared/proto/delivery.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const deliveryProto = grpc.loadPackageDefinition(packageDefinition);
const deliveryService = deliveryProto.delivery.DeliveryService.service;
// Kafka Setup
const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({
    clientId: 'delivery-service',
    brokers: [kafkaBroker]
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'delivery-service-group' });
// gRPC Handlers
const registerDriverHandler = (call, callback) => {
    const { name, vehicle } = call.request;
    try {
        const id = `driver_${Date.now()}`;
        const driver = {
            id,
            name,
            vehicle,
            status: 'IDLE',
            lat: 36.8065 + (Math.random() - 0.5) * 0.02,
            lng: 10.1815 + (Math.random() - 0.5) * 0.02
        };
        saveDriver(driver);
        callback(null, driver);
    }
    catch (err) {
        callback({
            code: grpc.status.INTERNAL,
            details: err.message
        });
    }
};
const getDriversHandler = (call, callback) => {
    try {
        callback(null, { drivers: getDrivers() });
    }
    catch (err) {
        callback({
            code: grpc.status.INTERNAL,
            details: err.message
        });
    }
};
const updateDriverLocationHandler = (call, callback) => {
    const { driver_id, lat, lng } = call.request;
    try {
        const driver = getDriverById(driver_id);
        if (!driver) {
            return callback(null, { success: false, message: 'Driver not found' });
        }
        updateDriverLocation(driver_id, Number(lat), Number(lng));
        callback(null, { success: true, message: 'Location updated successfully' });
    }
    catch (err) {
        callback({
            code: grpc.status.INTERNAL,
            details: err.message
        });
    }
};
const getDeliveryStatusHandler = (call, callback) => {
    const orderId = call.request.id;
    try {
        const delivery = getDeliveryByOrderId(orderId);
        if (!delivery) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: 'Delivery details not found for this order'
            });
        }
        const driver = getDriverById(delivery.driver_id);
        callback(null, {
            id: delivery.id,
            order_id: delivery.order_id,
            driver_id: delivery.driver_id,
            driver_name: driver ? driver.name : 'Unknown Driver',
            status: delivery.status,
            eta: delivery.eta
        });
    }
    catch (err) {
        callback({
            code: grpc.status.INTERNAL,
            details: err.message
        });
    }
};
// Start gRPC Server
const startGrpcServer = () => {
    const server = new grpc.Server();
    server.addService(deliveryService, {
        RegisterDriver: registerDriverHandler,
        GetDrivers: getDriversHandler,
        UpdateDriverLocation: updateDriverLocationHandler,
        GetDeliveryStatus: getDeliveryStatusHandler
    });
    const port = process.env.PORT || '50053';
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) {
            console.error('Failed to bind gRPC server:', err);
            process.exit(1);
        }
        console.log(`Delivery Service gRPC server running on port ${boundPort}`);
    });
};
// Start Kafka Consumer
const startKafka = async () => {
    try {
        await producer.connect();
        await consumer.connect();
        console.log('Delivery Service Kafka connected.');
        // Subscribe to restaurant events
        await consumer.subscribe({ topic: 'restaurant-events', fromBeginning: false });
        await consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value)
                    return;
                const event = JSON.parse(message.value.toString());
                console.log('Delivery Service received event:', event.type, event);
                if (event.type === 'RESTAURANT_APPROVED') {
                    const { orderId, restaurantId } = event.data;
                    // Find an available driver
                    const driver = getIdleDriver();
                    if (!driver) {
                        console.log(`No idle driver available for order ${orderId}. Rejecting delivery...`);
                        await publishEvent('delivery-events', 'DELIVERY_FAILED', {
                            orderId,
                            reason: 'No delivery drivers are currently available'
                        });
                        return;
                    }
                    console.log(`Assigning driver ${driver.name} (${driver.id}) to order ${orderId}`);
                    // Mark driver as busy
                    updateDriverStatus(driver.id, 'DELIVERING');
                    const deliveryId = `deliv_${Date.now()}`;
                    const newDelivery = {
                        id: deliveryId,
                        order_id: orderId,
                        driver_id: driver.id,
                        status: 'ASSIGNED',
                        eta: '15 mins'
                    };
                    saveDelivery(newDelivery);
                    // Publish delivery assigned event
                    await publishEvent('delivery-events', 'DELIVERY_ASSIGNED', {
                        orderId,
                        deliveryId,
                        driverId: driver.id,
                        driverName: driver.name,
                        eta: '15 mins'
                    });
                    // Simulate delivery status progression
                    // 1. Picked up (10s later)
                    setTimeout(async () => {
                        try {
                            console.log(`Driver ${driver.name} is en route for order ${orderId}`);
                            updateDeliveryStatus(deliveryId, 'EN_ROUTE');
                            // Move coordinates slightly closer to center
                            const newLat = driver.lat + 0.005;
                            const newLng = driver.lng + 0.005;
                            updateDriverLocation(driver.id, newLat, newLng);
                            await publishEvent('delivery-events', 'DELIVERY_PICKED_UP', {
                                orderId,
                                deliveryId,
                                status: 'EN_ROUTE',
                                eta: '8 mins'
                            });
                        }
                        catch (err) {
                            console.error('Error in en route simulation:', err);
                        }
                    }, 10000);
                    // 2. Completed (25s later)
                    setTimeout(async () => {
                        try {
                            console.log(`Driver ${driver.name} completed delivery for order ${orderId}`);
                            updateDeliveryStatus(deliveryId, 'COMPLETED');
                            updateDriverStatus(driver.id, 'IDLE');
                            // Move coordinates to destination
                            const destLat = driver.lat + 0.01;
                            const destLng = driver.lng + 0.01;
                            updateDriverLocation(driver.id, destLat, destLng);
                            await publishEvent('delivery-events', 'DELIVERY_COMPLETED', {
                                orderId,
                                deliveryId,
                                driverId: driver.id
                            });
                        }
                        catch (err) {
                            console.error('Error in completed simulation:', err);
                        }
                    }, 25000);
                }
            }
        });
    }
    catch (error) {
        console.error('Error in Kafka setup:', error);
    }
};
const publishEvent = async (topic, type, data) => {
    try {
        await producer.send({
            topic,
            messages: [
                {
                    key: data.orderId,
                    value: JSON.stringify({
                        type,
                        timestamp: new Date().toISOString(),
                        data
                    })
                }
            ]
        });
        console.log(`Published event ${type} to ${topic}`);
    }
    catch (error) {
        console.error(`Failed to publish event ${type}:`, error);
    }
};
// Run service
startGrpcServer();
startKafka().catch(console.error);
