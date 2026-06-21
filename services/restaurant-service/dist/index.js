import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import { getRestaurants, getMenu, getRestaurantById, getMenuItem } from './db.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.resolve(__dirname, '../../../shared/proto/restaurant.proto');
// Load protobuf definition
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const restaurantProto = grpc.loadPackageDefinition(packageDefinition);
const restaurantService = restaurantProto.restaurant.RestaurantService.service;
// gRPC Handlers
const getRestaurantsHandler = (call, callback) => {
    try {
        const list = getRestaurants().map(r => ({
            id: r.id,
            name: r.name,
            cuisine: r.cuisine,
            address: r.address,
            is_open: Boolean(r.is_open)
        }));
        callback(null, { restaurants: list });
    }
    catch (err) {
        callback({
            code: grpc.status.INTERNAL,
            details: err.message
        });
    }
};
const getMenuHandler = (call, callback) => {
    const restaurantId = call.request.id;
    try {
        const items = getMenu(restaurantId).map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            available: Boolean(i.available)
        }));
        callback(null, { items });
    }
    catch (err) {
        callback({
            code: grpc.status.INTERNAL,
            details: err.message
        });
    }
};
const checkAvailabilityHandler = (call, callback) => {
    const { restaurant_id, item_ids } = call.request;
    try {
        const restaurant = getRestaurantById(restaurant_id);
        if (!restaurant) {
            return callback(null, {
                available: false,
                total_price: 0,
                message: 'Restaurant not found'
            });
        }
        if (!restaurant.is_open) {
            return callback(null, {
                available: false,
                total_price: 0,
                message: 'Restaurant is closed'
            });
        }
        let total = 0;
        for (const itemId of item_ids) {
            const item = getMenuItem(restaurant_id, itemId);
            if (!item || !item.available) {
                return callback(null, {
                    available: false,
                    total_price: 0,
                    message: `Item ${itemId} not available`
                });
            }
            total += item.price;
        }
        callback(null, {
            available: true,
            total_price: total,
            message: 'All items are available'
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
    server.addService(restaurantService, {
        GetRestaurants: getRestaurantsHandler,
        GetMenu: getMenuHandler,
        CheckAvailability: checkAvailabilityHandler
    });
    const port = process.env.PORT || '50051';
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) {
            console.error('Failed to bind gRPC server:', err);
            process.exit(1);
        }
        console.log(`Restaurant Service gRPC server running on port ${boundPort}`);
    });
};
// Kafka Setup
const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({
    clientId: 'restaurant-service',
    brokers: [kafkaBroker]
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'restaurant-service-group' });
const startKafka = async () => {
    try {
        await producer.connect();
        await consumer.connect();
        console.log('Restaurant Service Kafka connected.');
        // Subscribe to order events
        await consumer.subscribe({ topic: 'order-events', fromBeginning: false });
        await consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value)
                    return;
                const event = JSON.parse(message.value.toString());
                console.log(`Restaurant Service received event: ${event.type}`, event);
                if (event.type === 'ORDER_CREATED') {
                    const { orderId, restaurantId, items, totalPrice } = event.data;
                    const restaurant = getRestaurantById(restaurantId);
                    if (!restaurant || !restaurant.is_open) {
                        await publishEvent('restaurant-events', 'RESTAURANT_REJECTED', {
                            orderId,
                            restaurantId,
                            reason: !restaurant ? 'Restaurant not found' : 'Restaurant is closed'
                        });
                        return;
                    }
                    // Check each item
                    let allAvailable = true;
                    let missingItemName = '';
                    for (const orderItem of items) {
                        const item = getMenuItem(restaurantId, orderItem.itemId);
                        if (!item || !item.available) {
                            allAvailable = false;
                            missingItemName = orderItem.name || orderItem.itemId;
                            break;
                        }
                    }
                    if (allAvailable) {
                        console.log(`Approving order ${orderId} for Restaurant ${restaurantId}`);
                        await publishEvent('restaurant-events', 'RESTAURANT_APPROVED', {
                            orderId,
                            restaurantId,
                            totalPrice,
                            preparationTime: 20 // 20 minutes mock
                        });
                    }
                    else {
                        console.log(`Rejecting order ${orderId} due to item ${missingItemName} unavailable`);
                        await publishEvent('restaurant-events', 'RESTAURANT_REJECTED', {
                            orderId,
                            restaurantId,
                            reason: `Item "${missingItemName}" is out of stock`
                        });
                    }
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
                    key: data.orderId || data.restaurantId,
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
