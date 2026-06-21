import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const loadProto = (protoName) => {
    const PROTO_PATH = path.resolve(__dirname, `../../shared/proto/${protoName}`);
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
    return grpc.loadPackageDefinition(packageDefinition);
};
// Load package definitions
const restaurantProto = loadProto('restaurant.proto');
const orderProto = loadProto('order.proto');
const deliveryProto = loadProto('delivery.proto');
// Define service hosts
const RESTAURANT_SERVICE_ADDR = process.env.RESTAURANT_SERVICE_ADDR || 'localhost:50051';
const ORDER_SERVICE_ADDR = process.env.ORDER_SERVICE_ADDR || 'localhost:50052';
const DELIVERY_SERVICE_ADDR = process.env.DELIVERY_SERVICE_ADDR || 'localhost:50053';
// Initialize clients
export const restaurantClient = new restaurantProto.restaurant.RestaurantService(RESTAURANT_SERVICE_ADDR, grpc.credentials.createInsecure());
export const orderClient = new orderProto.order.OrderService(ORDER_SERVICE_ADDR, grpc.credentials.createInsecure());
export const deliveryClient = new deliveryProto.delivery.DeliveryService(DELIVERY_SERVICE_ADDR, grpc.credentials.createInsecure());
console.log('gRPC Clients initialized at Gateway:');
console.log(`- Restaurant Service: ${RESTAURANT_SERVICE_ADDR}`);
console.log(`- Order Service: ${ORDER_SERVICE_ADDR}`);
console.log(`- Delivery Service: ${DELIVERY_SERVICE_ADDR}`);
