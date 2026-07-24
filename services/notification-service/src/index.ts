import express, { Request, Response } from 'express';
import { Kafka } from 'kafkajs';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.connect().then(() => console.log('Redis connected for Notification Service')).catch(err => console.error('Redis connection failed:', err.message));

const kafka = new Kafka({ clientId: 'notification-service', brokers: [process.env.KAFKA_BROKER as string] });
const consumer = kafka.consumer({ groupId: 'notification-group' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'submission-verdict', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value!.toString());
      const { user_id, status, problem_title } = data;

      let msg;
      if (status === 'ACCEPTED') {
        msg = `🎉 Your solution for "${problem_title}" was Accepted!`;
      } else if (status === 'PLAGIARISM_FLAGGED') {
        msg = `🚩 Plagiarism check flagged your submission for "${problem_title}" — ${data.similarity}% similarity to another solution.`;
      } else if (status === 'SCHEDULED_STARTED') {
        msg = `⏳ Your scheduled submission for "${problem_title}" has started executing.`;
      } else {
        msg = `❌ Your submission for "${problem_title}" got ${status.replace('_', ' ')}`;
      }

      let type = 'error';
      if (status === 'ACCEPTED') type = 'success';
      if (status === 'PLAGIARISM_FLAGGED') type = 'warning';
      if (status === 'SCHEDULED_STARTED') type = 'info';

      const notif = {
        message: msg,
        type: type,
        created_at: new Date().toISOString(),
      };

      const key = `notifications:${user_id}`;
      try {
        await redis.lPush(key, JSON.stringify(notif));
        await redis.lTrim(key, 0, 19);
        console.log(`Notification persisted to Redis for user ${user_id}: ${msg}`);
      } catch (err: any) {
        console.error(`Failed to persist notification to Redis: ${err.message}`);
      }
    },
  });
}

startConsumer().catch(console.error);

app.get('/', (_req, res) => res.json({ service: 'Notification Service', status: 'ok' }));

app.get('/notifications/:user_id', async (req: Request, res: Response) => {
  const userId = Number(req.params.user_id);
  try {
    const rawList = await redis.lRange(`notifications:${userId}`, 0, -1);
    const parsedList = rawList.map(item => JSON.parse(item));
    return res.json(parsedList);
  } catch (err: any) {
    console.error(`Failed to fetch notifications from Redis: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.listen(5006, () => console.log('Notification service on port 5006'));
