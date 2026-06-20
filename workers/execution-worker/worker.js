require('dotenv').config();

const { Kafka } = require('kafkajs');
const { exec }  = require('child_process');
const fs        = require('fs');
const path      = require('path');
const { Pool }  = require('pg');
const axios     = require('axios');

const kafka     = new Kafka({ clientId: 'execution-worker', brokers: [process.env.KAFKA_BROKER] });
const consumer  = kafka.consumer({ groupId: 'judge-group' });
const producer  = kafka.producer();

const pool = new Pool({
  user: process.env.DB_USER, host: process.env.DB_HOST,
  database: process.env.DB_NAME, password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

function runInDocker(filename, input) {
  return new Promise((resolve) => {
    const cmd = `echo "${input.replace(/"/g, '\\"')}" | docker run --rm -i --network none --memory 128m --cpus 0.5 \
      -v ${filename}:/app/code.py python:3.11-slim \
      timeout 5 python /app/code.py`;

    exec(cmd, { timeout: 8000 }, (error, stdout, stderr) => {
      resolve({ output: stdout.trim(), error: error ? (stderr.trim() || error.message) : null });
    });
  });
}

async function pushToUser(userId, payload) {
  try {
    await axios.post(`http://localhost:3000/internal/push/${userId}`, payload);
  } catch (err) {
    console.error('WS push failed (gateway may be down):', err.message);
  }
}

async function run() {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'submission-created', fromBeginning: false });
  console.log('Worker listening to Kafka...');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const submission = JSON.parse(message.value.toString());
      console.log('Processing submission:', submission.id);

      const filename = path.join('/tmp', `code-${submission.id}.py`);
      fs.writeFileSync(filename, submission.code, { mode: 0o600 });

      try {
        const problemResult = await pool.query(
          'SELECT title, difficulty FROM problems WHERE id = $1', [submission.problem_id]
        );
        const problemMeta = problemResult.rows[0] || { title: 'Unknown', difficulty: 'easy' };

        const testCasesResult = await pool.query(
          'SELECT input, expected FROM test_cases WHERE problem_id = $1', [submission.problem_id]
        );
        const testCases = testCasesResult.rows;

        let status, output;

        if (testCases.length === 0) {
          status = 'NO_TEST_CASES';
          output = 'No test cases found for this problem';
        } else {
          let passed = 0, failOutput = '', runtimeError = null;

          for (const tc of testCases) {
            const result = await runInDocker(filename, tc.input);
            if (result.error) { runtimeError = result.error; break; }
            if (result.output.trim() === tc.expected.trim()) passed++;
            else { failOutput = `Input: ${tc.input}\nExpected: ${tc.expected}\nGot: ${result.output}`; break; }
          }

          if (runtimeError) { status = 'RUNTIME_ERROR'; output = runtimeError; }
          else if (passed === testCases.length) { status = 'ACCEPTED'; output = `Passed all ${testCases.length} test case(s)`; }
          else { status = 'WRONG_ANSWER'; output = `Passed ${passed}/${testCases.length}\n${failOutput}`; }
        }

        await pool.query(
          'UPDATE submissions SET status=$1, output=$2 WHERE id=$3',
          [status, output, submission.id]
        );

        // Push live verdict over WebSocket (instant, no polling needed)
        await pushToUser(submission.user_id, {
          type: 'VERDICT',
          submission_id: submission.id,
          problem_id: submission.problem_id,
          status,
          output,
        });

        // Publish verdict event for the Notification Service (Kafka, async)
        await producer.send({
          topic: 'submission-verdict',
          messages: [{
            value: JSON.stringify({
              user_id: submission.user_id,
              problem_id: submission.problem_id,
              problem_title: problemMeta.title,
              status,
            }),
          }],
        });

        // Award leaderboard points if accepted
        if (status === 'ACCEPTED') {
          axios.post('http://localhost:5005/award', {
            user_id: submission.user_id,
            problem_id: submission.problem_id,
            difficulty: problemMeta.difficulty,
          }).then(() => {
          // Run plagiarism check in background (non-blocking)
          axios.post(`http://localhost:5007/check/${submission.id}`)
            .then(r => {
              if (r.data.flagged) {
                const topMatch = r.data.matches[0];
                console.log(`⚠️  Plagiarism flagged for submission ${submission.id}:`, r.data.matches);

                // Push live alert to the submitter over WebSocket
                pushToUser(submission.user_id, {
                  type: 'PLAGIARISM_FLAGGED',
                  submission_id: submission.id,
                  similarity: topMatch.similarity,
                  matches: r.data.matches.length,
                });

                // Also send through Kafka so it shows in the persistent notification feed
                producer.send({
                  topic: 'submission-verdict',
                  messages: [{
                    value: JSON.stringify({
                      user_id: submission.user_id,
                      problem_id: submission.problem_id,
                      problem_title: problemMeta.title,
                      status: 'PLAGIARISM_FLAGGED',
                      similarity: topMatch.similarity,
                    }),
                  }],
                }).catch(err => console.error('Failed to publish plagiarism event:', err.message));
              }
            })
            .catch(err => console.error('Plagiarism check failed:', err.message));

            // Notify frontend to refresh stats/leaderboard live too
            pushToUser(submission.user_id, { type: 'POINTS_AWARDED' });
          }).catch(err => console.error('Leaderboard award failed:', err.message));
        }

        console.log(`Submission ${submission.id} → ${status}`);
      } catch (err) {
        console.error('Worker error:', err);
        await pool.query(
          'UPDATE submissions SET status=$1, output=$2 WHERE id=$3',
          ['ERROR', err.message, submission.id]
        );
        await pushToUser(submission.user_id, {
          type: 'VERDICT',
          submission_id: submission.id,
          status: 'ERROR',
          output: err.message,
        });
      } finally {
        fs.unlink(filename, () => {});
      }
    },
  });
}

run().catch(console.error);
