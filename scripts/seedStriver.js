const { Pool } = require('pg');
require('dotenv').config();

// Connect using the same DB credentials (make sure to run this script where .env has DB_HOST=localhost etc. if running locally, or inside a container)
const pool = new Pool({
  user: process.env.DB_USER || 'judgeuser',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'onlinejudge',
  password: process.env.DB_PASSWORD || 'judgepass',
  port: Number(process.env.DB_PORT) || 5432,
});

const striverProblems = [
  {
    title: 'Sort Colors (0s, 1s, 2s)',
    description: 'Given an array with n objects colored red, white or blue, sort them in-place so that objects of the same color are adjacent. Colors are represented by 0, 1, 2. Input: Space separated integers.',
    difficulty: 'medium',
    topic: 'Arrays',
    test_cases: [
      { input: '2 0 2 1 1 0', expected: '0 0 1 1 2 2' },
      { input: '2 0 1', expected: '0 1 2' }
    ]
  },
  {
    title: 'Majority Element (>N/2)',
    description: 'Given an array of size n, find the majority element. The majority element is the element that appears more than ⌊n / 2⌋ times. Input: Space separated integers.',
    difficulty: 'easy',
    topic: 'Arrays',
    test_cases: [
      { input: '3 2 3', expected: '3' },
      { input: '2 2 1 1 1 2 2', expected: '2' }
    ]
  },
  {
    title: 'Reverse Linked List',
    description: 'Given the head of a singly linked list (represented as space-separated integers), reverse the list and print its values space-separated.',
    difficulty: 'easy',
    topic: 'Linked Lists',
    test_cases: [
      { input: '1 2 3 4 5', expected: '5 4 3 2 1' },
      { input: '1 2', expected: '2 1' }
    ]
  },
  {
    title: 'Climbing Stairs',
    description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    difficulty: 'easy',
    topic: 'DP',
    test_cases: [
      { input: '2', expected: '2' },
      { input: '3', expected: '3' },
      { input: '5', expected: '8' }
    ]
  }
];

async function seed() {
  console.log('Seeding Striver A-Z Core Problems...');
  for (const prob of striverProblems) {
    try {
      // Check if exists
      const exists = await pool.query('SELECT id FROM problems WHERE title = $1', [prob.title]);
      if (exists.rows.length > 0) {
        console.log(`Skipping: ${prob.title} (already exists)`);
        continue;
      }

      const res = await pool.query(
        'INSERT INTO problems (title, description, difficulty, topic) VALUES ($1, $2, $3, $4) RETURNING id',
        [prob.title, prob.description, prob.difficulty, prob.topic]
      );
      const problemId = res.rows[0].id;

      for (const tc of prob.test_cases) {
        await pool.query(
          'INSERT INTO test_cases (problem_id, input, expected) VALUES ($1, $2, $3)',
          [problemId, tc.input, tc.expected]
        );
      }
      console.log(`Successfully added: ${prob.title}`);
    } catch (err) {
      console.error(`Error adding ${prob.title}:`, err.message);
    }
  }
  console.log('Seeding complete! You can add the remaining 400+ problems by adding to the array in this script.');
  pool.end();
}

seed();
