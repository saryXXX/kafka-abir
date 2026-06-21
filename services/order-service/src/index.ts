import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import {
  saveOrder,
  getOrderById,
  getOrderItems,
  getOrdersByUserId,
  updateOrderStatus,
  updateOrderDriver
} from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../../shared/proto/order.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const orderProto = grpc.loadPackageDefinition(packageDefinition) as any;
const orderService = orderProto.order.OrderService.service;

// Kafka Setup
const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [kafkaBroker]
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'order-service-group' });

// gRPC Handlers
const createOrderHandler = async (call: any, callback: any) => {
  const { user_id, restaurant_id, items, delivery_address } = call.request;

  try {
    const orderId = `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const createdAt = new Date().toISOString();
    
    // Calculate total price
    let totalPrice = 0;
    const dbItems = items.map((item: any) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      totalPrice += price * quantity;
      return {
        order_id: orderId,
        item_id: item.item_id,
        name: item.name,
        quantity,
        price
      };
    });

    const newOrder = {
      id: orderId,
      user_id,
      restaurant_id,
      total_price: totalPrice,
      status: 'PENDING',
      delivery_address,
      driver_id: null,
      created_at: createdAt
    };

    // Save to Database
    saveOrder(newOrder, dbItems);

    console.log(`Order ${orderId} saved locally. Emitting ORDER_CREATED event...`);

    // Publish ORDER_CREATED event
    await publishEvent('order-events', 'ORDER_CREATED', {
      orderId,
      user_id,
      restaurant_id,
      items: items.map((i: any) => ({
        itemId: i.item_id,
        name: i.name,
        quantity: i.quantity,
        price: i.price
      })),
      totalPrice,
      deliveryAddress: delivery_address
    });

    callback(null, {
      id: orderId,
      user_id,
      restaurant_id,
      items,
      total_price: totalPrice,
      status: 'PENDING',
      delivery_address,
      driver_id: '',
      created_at: createdAt
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    callback({
      code: grpc.status.INTERNAL,
      details: err.message
    });
  }
};

const getOrderHandler = (call: any, callback: any) => {
  const orderId = call.request.id;
  try {
    const order = getOrderById(orderId);
    if (!order) {
      return callback({
        code: grpc.status.NOT_FOUND,
        details: 'Order not found'
      });
    }

    const items = getOrderItems(orderId).map(i => ({
      item_id: i.item_id,
      name: i.name,
      quantity: i.quantity,
      price: i.price
    }));

    callback(null, {
      id: order.id,
      user_id: order.user_id,
      restaurant_id: order.restaurant_id,
      items,
      total_price: order.total_price,
      status: order.status,
      delivery_address: order.delivery_address,
      driver_id: order.driver_id || '',
      created_at: order.created_at
    });
  } catch (err: any) {
    callback({
      code: grpc.status.INTERNAL,
      details: err.message
    });
  }
};

const getUserOrdersHandler = (call: any, callback: any) => {
  const userId = call.request.id;
  try {
    const orders = getOrdersByUserId(userId).map(order => {
      const items = getOrderItems(order.id).map(i => ({
        item_id: i.item_id,
        name: i.name,
        quantity: i.quantity,
        price: i.price
      }));
      return {
        id: order.id,
        user_id: order.user_id,
        restaurant_id: order.restaurant_id,
        items,
        total_price: order.total_price,
        status: order.status,
        delivery_address: order.delivery_address,
        driver_id: order.driver_id || '',
        created_at: order.created_at
      };
    });

    callback(null, { orders });
  } catch (err: any) {
    callback({
      code: grpc.status.INTERNAL,
      details: err.message
    });
  }
};

// Start gRPC Server
const startGrpcServer = () => {
  const server = new grpc.Server();
  server.addService(orderService, {
    CreateOrder: createOrderHandler,
    GetOrder: getOrderHandler,
    GetUserOrders: getUserOrdersHandler
  });

  const port = process.env.PORT || '50052';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('Failed to bind gRPC server:', err);
      process.exit(1);
    }
    console.log(`Order Service gRPC server running on port ${boundPort}`);
  });
};

// Start Kafka Consumers
const startKafka = async () => {
  try {
    await producer.connect();
    await consumer.connect();
    console.log('Order Service Kafka connected.');

    // Subscribe to restaurant and delivery events
    await consumer.subscribe({ topic: 'restaurant-events', fromBeginning: false });
    await consumer.subscribe({ topic: 'delivery-events', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        const event = JSON.parse(message.value.toString());
        console.log(`Order Service received event from ${topic}: ${event.type}`, event);

        const { orderId } = event.data;
        if (!orderId) return;

        // Saga states orchestrator
        switch (event.type) {
          case 'RESTAURANT_APPROVED':
            updateOrderStatus(orderId, 'RESTAURANT_APPROVED');
            console.log(`Order ${orderId} updated to RESTAURANT_APPROVED`);
            break;

          case 'RESTAURANT_REJECTED':
            updateOrderStatus(orderId, 'CANCELLED_RESTAURANT_REJECTED');
            console.log(`Order ${orderId} updated to CANCELLED_RESTAURANT_REJECTED`);
            break;

          case 'DELIVERY_ASSIGNED':
            const { driverId } = event.data;
            updateOrderStatus(orderId, 'PREPARING'); // Move to cooking and dispatching
            updateOrderDriver(orderId, driverId);
            console.log(`Order ${orderId} updated to PREPARING, assigned to driver ${driverId}`);
            break;

          case 'DELIVERY_FAILED':
            updateOrderStatus(orderId, 'CANCELLED_NO_DRIVERS');
            console.log(`Order ${orderId} updated to CANCELLED_NO_DRIVERS`);
            break;

          case 'DELIVERY_COMPLETED':
            updateOrderStatus(orderId, 'DELIVERED');
            console.log(`Order ${orderId} updated to DELIVERED`);
            break;
        }
      }
    });
  } catch (error) {
    console.error('Error in Kafka setup:', error);
  }
};

const publishEvent = async (topic: string, type: string, data: any) => {
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
  } catch (error) {
    console.error(`Failed to publish event ${type}:`, error);
  }
};

// Run service
startGrpcServer();
startKafka().catch(console.error);
