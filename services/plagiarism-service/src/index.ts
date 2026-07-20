import express, { Request, Response } from 'express';
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

// Normalize code: strip comments, collapse whitespace, lowercase
export function normalize(code: string): string {
  return code
    .replace(/#.*$/gm, '')          // strip Python comments
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim()
    .toLowerCase();
}

// Generate k-grams (sequences of k tokens) for similarity comparison
export function kGrams(text: string, k = 5): Set<string> {
  const tokens = text.split(' ').filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i <= tokens.length - k; i++) {
    grams.add(tokens.slice(i, i + k).join(' '));
  }
  return grams;
}

// Jaccard similarity: |intersection| / |union|
export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) if (b.has(gram)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

app.get('/', (_req, res) => res.json({ service: 'Plagiarism Service', status: 'ok' }));

// Compare a submission against all other ACCEPTED submissions for the same problem
app.post('/check/:submission_id', async (req: Request, res: Response) => {
  try {
    const subResult = await pool.query(
      'SELECT id, user_id, problem_id, code FROM submissions WHERE id = $1',
      [req.params.submission_id]
    );
    if (!subResult.rows.length) return res.status(404).json({ error: 'Submission not found' });

    const target = subResult.rows[0];
    const targetGrams = kGrams(normalize(target.code));

    const othersResult = await pool.query(
      `SELECT id, user_id, code FROM submissions
       WHERE problem_id = $1 AND id != $2 AND user_id != $3 AND status = 'ACCEPTED'`,
      [target.problem_id, target.id, target.user_id]
    );

    const matches = othersResult.rows
      .map(other => ({
        submission_id: other.id,
        user_id: other.user_id,
        similarity: Math.round(similarity(targetGrams, kGrams(normalize(other.code))) * 100),
      }))
      .filter(m => m.similarity > 60) // flag anything over 60% similar
      .sort((a, b) => b.similarity - a.similarity);

    return res.json({
      submission_id: target.id,
      flagged: matches.length > 0,
      matches,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Plagiarism check failed' });
  }
});

if (require.main === module) {
  app.listen(5007, () => console.log('Plagiarism service on port 5007'));
}
