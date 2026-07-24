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
  const { user_id, problem_id, language, code, scheduled_at } = req.body;
  if (!user_id || !problem_id || !language || !code)
    return res.status(400).json({ error: 'All fields required' });

  const allowed = ['python', 'javascript', 'c', 'cpp', 'c++'];
  if (!allowed.includes(language))
    return res.status(400).json({ error: `Language must be one of: ${allowed.join(', ')}` });

  let initialStatus = 'QUEUED';
  let scheduledAtDate: Date | null = null;
  
  if (scheduled_at) {
    scheduledAtDate = new Date(scheduled_at);
    if (!isNaN(scheduledAtDate.getTime()) && scheduledAtDate > new Date()) {
      initialStatus = 'SCHEDULED';
    } else {
      scheduledAtDate = null;
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO submissions (user_id,problem_id,language,code,status,scheduled_at)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_id, problem_id, language, code, initialStatus, scheduledAtDate]
    );
    const submission = result.rows[0];
    
    if (initialStatus === 'QUEUED') {
      await producer.send({ topic: 'submission-created', messages: [{ value: JSON.stringify(submission) }] });
    }
    
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

// NEW: Fetch recent submissions across all problems for a user
app.get('/submit/recent/:user_id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.status, s.language, s.created_at, p.title as problem_title, p.id as problem_id
       FROM submissions s
       JOIN problems p ON s.problem_id = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC LIMIT 5`,
      [req.params.user_id]
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

// NEW: detailed user performance analytics for charts & dashboard
app.get('/stats/user-analytics/:user_id', async (req: Request, res: Response) => {
  const userId = req.params.user_id;
  const period = req.query.period || 'weekly'; // weekly, monthly, all

  let intervalDays = 7;
  if (period === 'monthly') intervalDays = 30;
  else if (period === 'all') intervalDays = 365;

  try {
    // 1. Overall Metrics
    const overallResult = await pool.query(`
      SELECT 
        COUNT(id)::int AS total_submissions,
        COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END)::int AS accepted_submissions,
        COUNT(DISTINCT CASE WHEN status = 'ACCEPTED' THEN problem_id END)::int AS solved_count,
        ROUND(
          COALESCE(
            (COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END)::numeric / NULLIF(COUNT(id), 0)) * 100,
            0
          ),
          1
        )::float AS overall_accuracy
      FROM submissions
      WHERE user_id = $1
    `, [userId]);
    const overall = overallResult.rows[0] || { total_submissions: 0, accepted_submissions: 0, solved_count: 0, overall_accuracy: 0 };

    // 2. Verdict Breakdown
    const verdictResult = await pool.query(`
      SELECT status, COUNT(id)::int AS count
      FROM submissions
      WHERE user_id = $1
      GROUP BY status
    `, [userId]);
    const verdicts = verdictResult.rows;

    // 3. Difficulty Breakdown
    const difficultyResult = await pool.query(`
      SELECT 
        p.difficulty,
        COUNT(s.id)::int AS total_submissions,
        COUNT(CASE WHEN s.status = 'ACCEPTED' THEN 1 END)::int AS accepted_submissions,
        ROUND(
          COALESCE(
            (COUNT(CASE WHEN s.status = 'ACCEPTED' THEN 1 END)::numeric / NULLIF(COUNT(s.id), 0)) * 100, 
            0
          ), 
          1
        )::float AS accuracy
      FROM problems p
      JOIN submissions s ON p.id = s.problem_id
      WHERE s.user_id = $1
      GROUP BY p.difficulty
    `, [userId]);
    
    // Default structure for difficulty stats
    const difficultyStats: Record<string, any> = {
      easy: { total_submissions: 0, accepted_submissions: 0, accuracy: 0 },
      medium: { total_submissions: 0, accepted_submissions: 0, accuracy: 0 },
      hard: { total_submissions: 0, accepted_submissions: 0, accuracy: 0 }
    };
    difficultyResult.rows.forEach(row => {
      if (difficultyStats[row.difficulty]) {
        difficultyStats[row.difficulty] = {
          total_submissions: row.total_submissions,
          accepted_submissions: row.accepted_submissions,
          accuracy: row.accuracy
        };
      }
    });

    // 4. Time Series Timeline (aggregated daily)
    const timeSeriesResult = await pool.query(`
      SELECT 
        DATE_TRUNC('day', created_at)::date AS raw_date,
        COUNT(id)::int AS total,
        COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END)::int AS accepted,
        COUNT(CASE WHEN status != 'ACCEPTED' AND status != 'QUEUED' THEN 1 END)::int AS failed
      FROM submissions
      WHERE user_id = $1 AND created_at >= NOW() - CAST($2 || ' days' AS INTERVAL)
      GROUP BY raw_date
      ORDER BY raw_date ASC
    `, [userId, intervalDays]);

    // Fill in empty dates for a smoother timeline graph
    const timelineMap = new Map();
    timeSeriesResult.rows.forEach(row => {
      // Format to YYYY-MM-DD
      const dateStr = new Date(row.raw_date).toISOString().split('T')[0];
      timelineMap.set(dateStr, { total: row.total, accepted: row.accepted, failed: row.failed });
    });

    const timeline = [];
    for (let i = intervalDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const data = timelineMap.get(dateStr) || { total: 0, accepted: 0, failed: 0 };
      
      // Visual date format (e.g. "Jul 20")
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      timeline.push({ date: label, dateFull: dateStr, ...data });
    }

    // 5. Weak Area Detection
    // We analyze the difficulty accuracy rates. The difficulty with lowest accuracy (and non-zero submissions) is the weak area.
    let weakArea = 'None';
    let minAccuracy = 101;
    let recommendation = 'Keep solving diverse problems!';

    Object.keys(difficultyStats).forEach(diff => {
      const stats = difficultyStats[diff];
      if (stats.total_submissions > 0 && stats.accuracy < minAccuracy && stats.accuracy < 80) {
        minAccuracy = stats.accuracy;
        weakArea = diff;
      }
    });

    if (weakArea === 'hard') {
      recommendation = 'Focus on breaking down hard problems into smaller components and dry-running core logic.';
    } else if (weakArea === 'medium') {
      recommendation = 'Practice medium-difficulty algorithm designs. Focus on optimizations (e.g., hash maps, dynamic programming).';
    } else if (weakArea === 'easy') {
      recommendation = 'Go back to basics. Revise simple arrays, logic conditions, and time complexity parameters.';
    } else if (overall.total_submissions === 0) {
      recommendation = 'Submit your first solution to see performance insights!';
    }

    return res.json({
      overall,
      verdicts,
      difficultyBreakdown: difficultyStats,
      timeline,
      weakArea: {
        topic: weakArea,
        accuracy: minAccuracy === 101 ? 100 : minAccuracy,
        recommendation
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// Background worker for scheduled submissions
setInterval(async () => {
  try {
    const result = await pool.query(`
      UPDATE submissions
      SET status = 'QUEUED'
      FROM problems
      WHERE submissions.problem_id = problems.id 
        AND submissions.status = 'SCHEDULED' 
        AND submissions.scheduled_at <= NOW()
      RETURNING submissions.*, problems.title as problem_title
    `);

    for (const submission of result.rows) {
      // 1. Dispatch to executor
      await producer.send({ topic: 'submission-created', messages: [{ value: JSON.stringify(submission) }] });
      
      // 2. Dispatch notification that it started
      await producer.send({
        topic: 'submission-verdict',
        messages: [{
          value: JSON.stringify({
            user_id: submission.user_id,
            problem_id: submission.problem_id,
            problem_title: submission.problem_title,
            status: 'SCHEDULED_STARTED',
          }),
        }],
      });

      console.log(`Dispatched scheduled submission: ${submission.id}`);
    }
  } catch (err) {
    console.error('Error in scheduled submissions poller:', err);
  }
}, 10000); // Check every 10 seconds

app.listen(5003, () => console.log('Submission service on port 5003'));
