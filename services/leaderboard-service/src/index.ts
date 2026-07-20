import express, { Request, Response } from 'express';
import { createClient } from 'redis';
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

const redis = createClient({ url: 'redis://localhost:6379' });
redis.connect().then(() => console.log('Redis connected'));

const LEADERBOARD_KEY = 'leaderboard:global';

app.get('/', (_req, res) => res.json({ service: 'Leaderboard Service', status: 'ok' }));

// Called internally when a submission is ACCEPTED — awards points
app.post('/award', async (req: Request, res: Response) => {
  const { user_id, problem_id, difficulty } = req.body;
  if (!user_id || !problem_id) return res.status(400).json({ error: 'user_id and problem_id required' });

  // Avoid double-counting: SADD is atomic and returns 1 if newly added, 0 if already existed.
  const addedCount = await redis.sAdd(`solved:${user_id}`, String(problem_id));
  if (addedCount === 0) {
    return res.json({ awarded: false, reason: 'Already solved' });
  }

  const points = difficulty === 'hard' ? 50 : difficulty === 'medium' ? 30 : 10;
  await redis.zIncrBy(LEADERBOARD_KEY, points, String(user_id));

  return res.json({ awarded: true, points });
});

// Get top N leaderboard entries with usernames
app.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;
    // zRangeWithScores returns lowest to highest; REV for highest first
    const entries = await redis.zRangeWithScores(LEADERBOARD_KEY, 0, limit - 1, { REV: true });

    if (entries.length === 0) return res.json([]);

    const userIds = entries.map(e => Number(e.value));
    const usersResult = await pool.query(
      'SELECT id, username FROM users WHERE id = ANY($1)',
      [userIds]
    );
    const usernameMap: Record<number, string> = {};
    usersResult.rows.forEach(u => { usernameMap[u.id] = u.username; });

    const leaderboard = entries.map((e, i) => ({
      rank: i + 1,
      user_id: Number(e.value),
      username: usernameMap[Number(e.value)] || 'Unknown',
      points: e.score,
    }));

    return res.json(leaderboard);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get a specific user's rank
app.get('/leaderboard/rank/:user_id', async (req: Request, res: Response) => {
  try {
    const rank = await redis.zRevRank(LEADERBOARD_KEY, String(req.params.user_id));
    const score = await redis.zScore(LEADERBOARD_KEY, String(req.params.user_id));
    return res.json({
      rank: rank !== null ? rank + 1 : null,
      points: score || 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

app.listen(5005, () => console.log('Leaderboard service on port 5005'));
