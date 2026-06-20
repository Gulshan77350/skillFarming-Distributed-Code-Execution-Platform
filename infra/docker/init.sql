CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  created_at    TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problems (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL,
  difficulty  VARCHAR(10)  CHECK (difficulty IN ('easy','medium','hard')),
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_cases (
  id         SERIAL PRIMARY KEY,
  problem_id INT  REFERENCES problems(id) ON DELETE CASCADE,
  input      TEXT NOT NULL,
  expected   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id         SERIAL PRIMARY KEY,
  user_id    INT  REFERENCES users(id),
  problem_id INT  REFERENCES problems(id),
  language   VARCHAR(20) NOT NULL,
  code       TEXT        NOT NULL,
  status     VARCHAR(20) DEFAULT 'QUEUED',
  output     TEXT,
  created_at TIMESTAMP   DEFAULT NOW()
);

INSERT INTO problems (title, description, difficulty)
VALUES ('Sum of Two Numbers','Read two integers from stdin and print their sum.','easy')
ON CONFLICT DO NOTHING;

INSERT INTO test_cases (problem_id, input, expected)
VALUES (1,'3 5','8'),(1,'10 20','30')
ON CONFLICT DO NOTHING;
