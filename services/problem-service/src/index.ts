import express, { Request, Response } from 'express';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;
const app = express();
app.use(express.json());

const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     Number(process.env.DB_PORT),
});

// Health
app.get('/', (_req, res) => res.json({ service: 'Problem Service', status: 'ok' }));

// Get all problems
app.get('/problems', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, title, difficulty, created_at FROM problems ORDER BY id'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// Get single problem with test cases
app.get('/problems/:id', async (req: Request, res: Response) => {
  try {
    const problem = await pool.query(
      'SELECT * FROM problems WHERE id = $1', [req.params.id]
    );
    if (!problem.rows.length)
      return res.status(404).json({ error: 'Problem not found' });

    const testCases = await pool.query(
      'SELECT id, input, expected FROM test_cases WHERE problem_id = $1',
      [req.params.id]
    );

    return res.json({ ...problem.rows[0], test_cases: testCases.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

// Seed a problem (admin use)
app.post('/problems', async (req: Request, res: Response) => {
  const { title, description, difficulty, test_cases } = req.body;
  if (!title || !description || !difficulty)
    return res.status(400).json({ error: 'title, description, difficulty required' });

  try {
    const result = await pool.query(
      'INSERT INTO problems (title, description, difficulty) VALUES ($1,$2,$3) RETURNING *',
      [title, description, difficulty]
    );
    const problem = result.rows[0];

    if (test_cases && Array.isArray(test_cases)) {
      for (const tc of test_cases) {
        await pool.query(
          'INSERT INTO test_cases (problem_id, input, expected) VALUES ($1,$2,$3)',
          [problem.id, tc.input, tc.expected]
        );
      }
    }

    return res.status(201).json(problem);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create problem' });
  }
});

app.listen(5004, () => console.log('Problem service on port 5004'));
