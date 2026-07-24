import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  total_submissions?: number;
  success_rate?: number;
  error_rate?: number;
}

const diffColor: Record<string, string> = {
  easy:   'text-green-400 bg-green-900/30 border border-green-700/50',
  medium: 'text-yellow-400 bg-yellow-900/30 border border-yellow-700/50',
  hard:   'text-red-400 bg-red-900/30 border border-red-700/50',
};

export default function Problems() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    client.get('/problems')
      .then(r => setProblems(r.data))
      .catch(() => setError('Could not load problems. Is the problem service running?'))
      .finally(() => setLoading(false));
  }, []);

  const topics = ['All', ...Array.from(new Set(problems.map(p => p.topic || 'General')))];
  const filteredProblems = selectedTopic === 'All' ? problems : problems.filter(p => (p.topic || 'General') === selectedTopic);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="font-bold text-lg text-blue-400">⚡ skillFarming</Link>
          <span className="text-white text-sm font-semibold border-b-2 border-blue-500 pb-0.5">Problems</span>
          <Link to="/leaderboard" className="text-gray-300 hover:text-white text-sm transition">Leaderboard</Link>
          <Link to="/analytics" className="text-gray-300 hover:text-white text-sm transition">Analytics</Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">Hey, <span className="text-white font-medium">{user?.username}</span></span>
          <button onClick={handleLogout}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition">
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-1">Problem Directory</h2>
            <p className="text-gray-400 text-sm">Browse algorithm challenges, inspect error rates, and improve your skill set.</p>
          </div>
          <div className="flex gap-4">
            <select 
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            >
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Link to="/analytics" className="text-xs bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700 text-blue-300 font-semibold px-3 py-2 rounded-lg transition">
              📊 View Performance Dashboard →
            </Link>
          </div>
        </div>

        {loading && (
          <div className="text-gray-400 text-center py-20">Loading problems...</div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden shadow-xl backdrop-blur">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-6 py-4">#</th>
                  <th className="text-left px-6 py-4">Title</th>
                  <th className="text-left px-6 py-4">Difficulty</th>
                  <th className="text-left px-6 py-4">Topic</th>
                  <th className="text-center px-6 py-4">Submissions</th>
                  <th className="text-center px-6 py-4">Success Rate</th>
                  <th className="text-center px-6 py-4">Error Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredProblems.map((p, i) => (
                  <tr key={p.id}
                    className="hover:bg-gray-800/40 transition cursor-pointer group"
                    onClick={() => navigate(`/problems/${p.id}`)}>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{i + 1}</td>
                    <td className="px-6 py-4 text-white font-semibold group-hover:text-blue-400 transition">{p.title}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md capitalize ${diffColor[p.difficulty]}`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs font-semibold">
                      {p.topic || 'General'}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-gray-300 text-xs">
                      {p.total_submissions ?? 0}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-green-400 font-bold">
                      {p.success_rate !== undefined ? `${p.success_rate}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-red-400 font-bold">
                      {p.error_rate !== undefined ? `${p.error_rate}%` : '—'}
                    </td>
                  </tr>
                ))}
                {filteredProblems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No problems found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
