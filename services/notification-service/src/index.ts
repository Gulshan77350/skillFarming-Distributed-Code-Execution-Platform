import express, { Request, Response } from 'express';
import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());

// Simple in-memory notification store per user (fine for a demo project)
const notifications: Record<number, { message: string; type: string; created_at: string }[]> = {};

const kafka = new Kafka({ clientId: 'notification-service', brokers: [process.env.KAFKA_BROKER as string] });
const consumer = kafka.consumer({ groupId: 'notification-group' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'submission-verdict', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value!.toString());
      const { user_id, status, problem_title } = data;

      if (!notifications[user_id]) notifications[user_id] = [];

      let msg;
      if (status === 'ACCEPTED') {
        msg = `🎉 Your solution for "${problem_title}" was Accepted!`;
      } else if (status === 'PLAGIARISM_FLAGGED') {
        msg = `🚩 Plagiarism check flagged your submission for "${problem_title}" — ${data.similarity}% similarity to another solution.`;
      } else {
        msg = `❌ Your submission for "${problem_title}" got ${status.replace('_', ' ')}`;
      }

      notifications[user_id].unshift({
        message: msg,
        type: status === 'ACCEPTED' ? 'success' : status === 'PLAGIARISM_FLAGGED' ? 'warning' : 'error',
        created_at: new Date().toISOString(),
      });

      // Keep only last 20 notifications per user
      notifications[user_id] = notifications[user_id].slice(0, 20);

      console.log(`Notification queued for user ${user_id}: ${msg}`);
    },
  });
}

startConsumer().catch(console.error);

app.get('/', (_req, res) => res.json({ service: 'Notification Service', status: 'ok' }));

app.get('/notifications/:user_id', (req: Request, res: Response) => {
  const userId = Number(req.params.user_id);
  res.json(notifications[userId] || []);
});

app.listen(5006, () => console.log('Notification service on port 5006'));
