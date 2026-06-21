import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import restRouter from './rest/routes.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// Enable CORS
app.use(cors({
    origin: '*', // Allow all origins for testing dashboard
    credentials: true
}));
// Body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Setup Apollo Server for GraphQL
const server = new ApolloServer({
    typeDefs,
    resolvers,
});
await server.start();
app.use('/graphql', expressMiddleware(server));
const logs = [];
// Setup Kafka consumer to capture logs for the dashboard
const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({
    clientId: 'gateway-log-consumer',
    brokers: [kafkaBroker]
});
const gatewayConsumer = kafka.consumer({ groupId: 'gateway-log-group' });
const startGatewayKafka = async () => {
    try {
        await gatewayConsumer.connect();
        await gatewayConsumer.subscribe({ topic: 'order-events', fromBeginning: false });
        await gatewayConsumer.subscribe({ topic: 'restaurant-events', fromBeginning: false });
        await gatewayConsumer.subscribe({ topic: 'delivery-events', fromBeginning: false });
        await gatewayConsumer.run({
            eachMessage: async ({ topic, message }) => {
                if (!message.value)
                    return;
                try {
                    const val = JSON.parse(message.value.toString());
                    const logEntry = {
                        id: `log_${Date.now()}_${Math.random()}`,
                        topic,
                        type: val.type,
                        timestamp: val.timestamp || new Date().toISOString(),
                        data: val.data
                    };
                    logs.unshift(logEntry); // Add to the top
                    if (logs.length > 50) {
                        logs.pop(); // Keep only 50 logs
                    }
                }
                catch (err) {
                    console.error('Error parsing Kafka log message:', err);
                }
            }
        });
        console.log('Gateway Kafka log aggregator connected successfully.');
    }
    catch (error) {
        console.error('Failed to connect Gateway Kafka log aggregator:', error);
    }
};
// Expose logs REST endpoint
app.get('/api/logs', (req, res) => {
    res.json(logs);
});
// Mount REST router
app.use('/api', restRouter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'API Gateway' });
});
// Start Express server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 API Gateway running at: http://localhost:${PORT}`);
    console.log(`👉 GraphQL endpoint: http://localhost:${PORT}/graphql`);
    console.log(`👉 REST API endpoint: http://localhost:${PORT}/api`);
    console.log(`👉 Live Kafka Logs API: http://localhost:${PORT}/api/logs`);
    console.log(`====================================================`);
});
// Start Gateway Kafka consumer in background
startGatewayKafka().catch(console.error);
