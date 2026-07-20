import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';

interface TestCase { id: number; input: string; expected: string; }
interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  test_cases: TestCase[];
}

const TEMPLATES: Record<string, string> = {
  python: `# Read input, write your solution, print the result
a, b = map(int, input().split())
print(a + b)
`,
  javascript: `// Read input, write your solution, print the result
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
const [a, b] = input.split(' ').map(Number);
console.log(a + b);
`,
  c: `// Read input, write your solution, print the result
#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", a + b);
    }
    return 0;
}
`,
  cpp: `// Read input, write your solution, print the result
#include <iostream>
using namespace std;

int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << a + b << endl;
    }
    return 0;
}
`
};

const DEFAULT_CODE = TEMPLATES.python;

const statusStyles: Record<string, string> = {
  QUEUED:         'text-gray-400 bg-gray-800',
  ACCEPTED:       'text-green-400 bg-green-900/40',
  WRONG_ANSWER:   'text-red-400 bg-red-900/40',
  RUNTIME_ERROR:  'text-orange-400 bg-orange-900/40',
  ERROR:          'text-red-400 bg-red-900/40',
  NO_TEST_CASES:  'text-yellow-400 bg-yellow-900/40',
};

export default function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [problem, setProblem]       = useState<Problem | null>(null);
  const [language, setLanguage]     = useState('python');
  const [code, setCode]             = useState(DEFAULT_CODE);
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict]       = useState<{ status: string; output: string } | null>(null);
  const [error, setError]           = useState('');

  // Use a ref so the WebSocket callback always sees the latest pending submission id
  const pendingIdRef = useRef<number | null>(null);
  const fallbackTimer = useRef<number | null>(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Live verdict via WebSocket — ref avoids stale closure issue
  const [plagiarismAlert, setPlagiarismAlert] = useState<{ similarity: number } | null>(null);

  useWebSocket((data) => {
    console.log('WS message received:', data);
    if (data.type === 'VERDICT' && data.submission_id === pendingIdRef.current) {
      setVerdict({ status: data.status, output: data.output });
      setSubmitting(false);
      pendingIdRef.current = null;
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
    }
    if (data.type === 'PLAGIARISM_FLAGGED') {
      setPlagiarismAlert({ similarity: data.similarity });
      setTimeout(() => setPlagiarismAlert(null), 8000);
    }
  });

  useEffect(() => {
    client.get(`/problems/${id}`)
      .then(r => setProblem(r.data))
      .catch(() => setError('Failed to load problem'));
  }, [id]);

  const handleSubmit = async () => {
    if (!problem || !user) return;
    setSubmitting(true);
    setVerdict(null);
    setError('');

    try {
      const { data } = await client.post('/submissions', {
        user_id: user.id,
        problem_id: problem.id,
        language,
        code,
      });

      pendingIdRef.current = data.id;

      // Safety fallback: if WS doesn't respond in 8s, poll once
      fallbackTimer.current = window.setTimeout(async () => {
        if (pendingIdRef.current === data.id) {
          try {
            const res = await client.get(`/submissions/${data.id}`);
            if (res.data.status !== 'QUEUED') {
              setVerdict({ status: res.data.status, output: res.data.output });
              setSubmitting(false);
              pendingIdRef.current = null;
            }
          } catch { /* ignore */ }
        }
      }, 8000);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.response?.data?.error || 'Submission failed');
    }
  };

  if (error && !problem) {
    return <div className="min-h-screen bg-gray-950 text-red-400 p-8">{error}</div>;
  }

  if (!problem) {
    return <div className="min-h-screen bg-gray-950 text-gray-400 p-8">Loading problem...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {plagiarismAlert && (
        <div className="fixed top-4 right-4 z-50 bg-orange-900/90 border border-orange-500 text-orange-200 px-5 py-3 rounded-lg shadow-xl max-w-sm">
          <p className="font-semibold">🚩 Plagiarism Check Flagged</p>
          <p className="text-sm mt-1">{plagiarismAlert.similarity}% similarity detected with another solution.</p>
        </div>
      )}
      <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="font-bold text-lg text-blue-400">⚡ skillFarming</Link>
          <Link to="/problems" className="text-gray-300 hover:text-white text-sm transition">Problems</Link>
          <span className="text-xs text-green-400 flex items-center gap-1">● Live</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">Hey, <span className="text-white font-medium">{user?.username}</span></span>
          <button onClick={handleLogout} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition">
            Logout
          </button>
        </div>
      </nav>

      <main className="grid grid-cols-1 lg:grid-cols-2 h-[calc(100vh-65px)]">
        <div className="overflow-y-auto p-8 border-r border-gray-800">
          <h1 className="text-2xl font-bold mb-2">{problem.title}</h1>
          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded capitalize mb-6 ${
            problem.difficulty === 'easy' ? 'bg-green-900/30 text-green-400' :
            problem.difficulty === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
            'bg-red-900/30 text-red-400'
          }`}>
            {problem.difficulty}
          </span>

          <p className="text-gray-300 leading-relaxed whitespace-pre-line mb-8">
            {problem.description}
          </p>

          <h3 className="font-semibold text-gray-200 mb-3">Sample Test Cases</h3>
          <div className="space-y-3">
            {problem.test_cases.slice(0, 2).map(tc => (
              <div key={tc.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm font-mono">
                <p className="text-gray-400 mb-1">Input: <span className="text-white">{tc.input}</span></p>
                <p className="text-gray-400">Expected: <span className="text-white">{tc.expected}</span></p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex bg-gray-900 border-b border-gray-800 px-4 py-2 justify-between items-center">
            <span className="text-sm font-semibold text-gray-400">Language:</span>
            <select
              value={language}
              onChange={(e) => {
                const lang = e.target.value;
                setLanguage(lang);
                setCode(TEMPLATES[lang] || '');
              }}
              className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="c">C (GCC)</option>
              <option value="cpp">C++ (G++)</option>
            </select>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{ fontSize: 14, minimap: { enabled: false } }}
            />
          </div>

          <div className="border-t border-gray-700 bg-gray-900 p-4">
            {error && (
              <div className="bg-red-900/40 border border-red-600 text-red-300 text-sm px-4 py-2 rounded mb-3">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
              >
                {submitting ? 'Judging...' : 'Submit'}
              </button>

              {verdict && (
                <span className={`text-sm font-semibold px-3 py-1 rounded ${statusStyles[verdict.status] || 'text-gray-400 bg-gray-800'}`}>
                  {verdict.status.replace('_', ' ')}
                </span>
              )}
            </div>

            {verdict && (
              <pre className="mt-3 bg-black/40 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {verdict.output}
              </pre>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
