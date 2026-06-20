import express, { Request, Response } from 'express';
import { Kafka } from 'kafkajs';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;
const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER, host: process.env.DB_HOST,
  database: process.env.DB_NAME, password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const kafka = new Kafka({ clientId: 'submission-service', brokers: [process.env.KAFKA_BROKER as string] });
const producer = kafka.producer();
producer.connect().then(() => console.log('Kafka producer connected'));

app.get('/', (_req, res) => res.json({ service: 'Submission Service', status: 'ok' }));

app.post('/submit', async (req: Request, res: Response) => {
  const { user_id, problem_id, language, code } = req.body;
  if (!user_id || !problem_id || !language || !code)
    return res.status(400).json({ error: 'All fields required' });

  const allowed = ['python'];
  if (!allowed.includes(language))
    return res.status(400).json({ error: `Language must be one of: ${allowed.join(', ')}` });

  try {
    const result = await pool.query(
      `INSERT INTO submissions (user_id,problem_id,language,code,status)
       VALUES($1,$2,$3,$4,'QUEUED') RETURNING *`,
      [user_id, problem_id, language, code]
    );
    const submission = result.rows[0];
    await producer.send({ topic: 'submission-created', messages: [{ value: JSON.stringify(submission) }] });
    return res.status(201).json(submission);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Submission failed' });
  }
});

app.get('/submit/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id,user_id,problem_id,language,status,output,created_at FROM submissions WHERE id=$1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Fetch failed' });
  }
});

app.get('/submit/history/:user_id/:problem_id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, status, created_at FROM submissions WHERE user_id=$1 AND problem_id=$2 ORDER BY created_at DESC LIMIT 10',
      [req.params.user_id, req.params.problem_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Fetch failed' });
  }
});

// NEW: stats for dashboard — total submissions + distinct problems solved (ACCEPTED)
app.get('/stats/:user_id', async (req: Request, res: Response) => {
  try {
    const totalResult = await pool.query(
      'SELECT COUNT(*) AS total FROM submissions WHERE user_id=$1',
      [req.params.user_id]
    );
    const solvedResult = await pool.query(
      `SELECT COUNT(DISTINCT problem_id) AS solved FROM submissions
       WHERE user_id=$1 AND status='ACCEPTED'`,
      [req.params.user_id]
    );
    return res.json({
      submissions: Number(totalResult.rows[0].total),
      solved: Number(solvedResult.rows[0].solved),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.listen(5003, () => console.log('Submission service on port 5003'));
