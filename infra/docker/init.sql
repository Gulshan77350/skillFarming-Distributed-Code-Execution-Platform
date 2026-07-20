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

CREATE INDEX IF NOT EXISTS idx_submissions_user_problem ON submissions(user_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON test_cases(problem_id);

INSERT INTO problems (id, title, description, difficulty) VALUES
(1, 'Sum of Two Numbers', 'Read two space-separated integers from stdin and print their sum.', 'easy'),
(2, 'Two Sum', 'Given space-separated numbers on line 1 and a target integer on line 2, print the 0-indexed indices of the two numbers that add up to target.', 'easy'),
(3, 'Palindrome Check', 'Read a single word from stdin. Print true if it reads the same forwards and backwards, else false.', 'easy'),
(4, 'Reverse String', 'Read a line of text from stdin and print the string in reverse order.', 'easy'),
(5, 'Fibonacci Number', 'Given an integer N on stdin, print the Nth Fibonacci number (where F(0)=0, F(1)=1, F(2)=1, F(3)=2...).', 'easy'),
(6, 'Maximum Subarray Sum', 'Given space-separated integers from stdin, find the contiguous subarray with the largest sum and print the sum.', 'medium'),
(7, 'Valid Parentheses', 'Read a string containing brackets ()[]{} from stdin. Print true if the string is validly balanced, else false.', 'medium'),
(8, 'Longest Substring Without Repeating Characters', 'Read a string from stdin and print the length of the longest substring without repeating characters.', 'medium'),
(9, 'Binary Search', 'Read space-separated sorted numbers on line 1 and target integer on line 2. Print 0-indexed position of target, or -1 if not found.', 'medium'),
(10, 'Merge Intervals', 'Given space-separated integer pairs representing intervals, print the merged overlapping intervals space-separated.', 'hard'),
(11, 'Trapping Rain Water', 'Given space-separated non-negative integers representing elevation map bars of width 1, print total water trapped.', 'hard')
ON CONFLICT (id) DO NOTHING;

-- Adjust sequence so SERIAL PRIMARY KEY continues from 12
SELECT setval('problems_id_seq', (SELECT MAX(id) FROM problems));

INSERT INTO test_cases (problem_id, input, expected) VALUES
(1, '3 5', '8'),
(1, '10 20', '30'),
(2, '2 7 11 15\n9', '0 1'),
(2, '3 2 4\n6', '1 2'),
(3, 'racecar', 'true'),
(3, 'hello', 'false'),
(4, 'algorithm', 'mhtirogla'),
(4, 'code', 'edoc'),
(5, '6', '8'),
(5, '10', '55'),
(6, '-2 1 -3 4 -1 2 1 -5 4', '6'),
(6, '5 4 -1 7 8', '23'),
(7, '()[]{}', 'true'),
(7, '(]', 'false'),
(8, 'abcabcbb', '3'),
(8, 'bbbbb', '1'),
(9, '-1 0 3 5 9 12\n9', '4'),
(9, '-1 0 3 5 9 12\n2', '-1'),
(10, '1 3 2 6 8 10 15 18', '1 6 8 10 15 18'),
(10, '1 4 4 5', '1 5'),
(11, '0 1 0 2 1 0 1 3 2 1 2 1', '6'),
(11, '4 2 0 3 2 5', '9')
ON CONFLICT DO NOTHING;
