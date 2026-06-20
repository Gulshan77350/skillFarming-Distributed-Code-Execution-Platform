import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const diffColor: Record<string, string> = {
  easy:   'text-green-400 bg-green-900/30',
  medium: 'text-yellow-400 bg-yellow-900/30',
  hard:   'text-red-400 bg-red-900/30',
};

export default function Problems() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    client.get('/problems')
      .then(r => setProblems(r.data))
      .catch(() => setError('Could not load problems. Is the problem service running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="font-bold text-lg text-blue-400">⚡ skillFarming</Link>
          <span className="text-white text-sm font-medium">Problems</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">Hey, <span className="text-white font-medium">{user?.username}</span></span>
          <button onClick={handleLogout}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition">
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-2">Problems</h2>
        <p className="text-gray-400 mb-8">Pick a problem and start solving.</p>

        {loading && (
          <div className="text-gray-400 text-center py-20">Loading problems...</div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left px-6 py-3">#</th>
                  <th className="text-left px-6 py-3">Title</th>
                  <th className="text-left px-6 py-3">Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p, i) => (
                  <tr key={p.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition cursor-pointer"
                    onClick={() => navigate(`/problems/${p.id}`)}>
                    <td className="px-6 py-4 text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4 text-white font-medium">{p.title}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded capitalize ${diffColor[p.difficulty]}`}>
                        {p.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
                {problems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                      No problems yet. Phase 3 will add the code editor here.
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
