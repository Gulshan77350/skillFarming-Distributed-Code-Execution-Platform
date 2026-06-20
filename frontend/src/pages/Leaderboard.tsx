import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

interface Entry { rank: number; user_id: number; username: string; points: number; }

export default function Leaderboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    client.get('/leaderboard?limit=20')
      .then(r => setEntries(r.data))
      .finally(() => setLoading(false));
  }, []);

  const medal = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="font-bold text-lg text-blue-400">⚡ skillFarming</Link>
          <Link to="/problems" className="text-gray-300 hover:text-white text-sm transition">Problems</Link>
          <span className="text-white text-sm font-medium">Leaderboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">Hey, <span className="text-white font-medium">{user?.username}</span></span>
          <button onClick={handleLogout} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition">Logout</button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-2">🏆 Leaderboard</h2>
        <p className="text-gray-400 mb-8">Top performers ranked by points earned from accepted solutions.</p>

        {loading && <div className="text-gray-400 text-center py-20">Loading rankings...</div>}

        {!loading && entries.length === 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-12 text-center text-gray-500">
            No one has solved a problem yet. Be the first!
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            {entries.map(e => (
              <div key={e.user_id}
                className={`flex items-center justify-between px-6 py-4 border-b border-gray-800 last:border-0 ${
                  e.user_id === user?.id ? 'bg-blue-900/20' : ''
                }`}>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 w-8 font-mono">{medal(e.rank) || `#${e.rank}`}</span>
                  <span className="font-medium">{e.username}</span>
                  {e.user_id === user?.id && (
                    <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">You</span>
                  )}
                </div>
                <span className="text-blue-400 font-bold">{e.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
