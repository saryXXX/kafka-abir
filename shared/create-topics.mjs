import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({
  clientId: 'topic-creator',
  brokers: [kafkaBroker]
});

const admin = kafka.admin();

const createTopics = async () => {
  try {
    await admin.connect();
    console.log('Connecting to Kafka Admin...');
    
    const existingTopics = await admin.listTopics();
    console.log('Existing topics:', existingTopics);

    const topicsToCreate = ['order-events', 'restaurant-events', 'delivery-events'].filter(
      t => !existingTopics.includes(t)
    );

    if (topicsToCreate.length > 0) {
      console.log('Creating missing topics:', topicsToCreate);
      await admin.createTopics({
        topics: topicsToCreate.map(topic => ({
          topic,
          numPartitions: 1,
          replicationFactor: 1
        }))
      });
      console.log('Topics created successfully!');
    } else {
      console.log('All required topics already exist.');
    }
  } catch (err) {
    console.error('Failed to create topics:', err);
  } finally {
    try {
      await admin.disconnect();
    } catch (e) {}
  }
};

createTopics();
