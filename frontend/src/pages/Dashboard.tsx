import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import NotificationBell from '../components/NotificationBell';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ solved: 0, submissions: 0 });
  const [rank, setRank] = useState<number | null>(null);
  const [gatewayOk, setGatewayOk] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    fetch('http://localhost:3000/')
      .then(r => r.ok && setGatewayOk(true))
      .catch(() => setGatewayOk(false));

    if (!user) return;

    client.get(`/stats/${user.id}`)
      .then(r => setStats(r.data))
      .catch(() => {});

    client.get(`/leaderboard/rank/${user.id}`)
      .then(r => setRank(r.data.rank))
      .catch(() => {});
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg text-blue-400">⚡ skillFarming</span>
          <Link to="/problems" className="text-gray-300 hover:text-white text-sm transition">
            Problems
          </Link>
          <Link to="/leaderboard" className="text-gray-300 hover:text-white text-sm transition">
            Leaderboard
          </Link>
          <Link to="/analytics" className="text-gray-300 hover:text-white text-sm transition">
            Analytics
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">
            Hey, <span className="text-white font-medium">{user?.username}</span>
          </span>
          <NotificationBell />
          <button onClick={handleLogout}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition">
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
        <p className="text-gray-400 mb-8">Welcome back, {user?.username}. Ready to code?</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Problems Solved', value: stats.solved,            color: 'text-green-400'  },
            { label: 'Submissions',     value: stats.submissions,       color: 'text-blue-400'   },
            { label: 'Rank',            value: rank ? `#${rank}` : '—', color: 'text-yellow-400' },
          ].map(card => (
            <div key={card.label} className="bg-gray-900 border border-gray-700 rounded-xl p-6">
              <p className="text-gray-400 text-sm">{card.label}</p>
              <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h3 className="font-semibold mb-4 text-gray-200">System Status</h3>
          <div className="space-y-3 text-sm">
            {[
              { name: 'API Gateway',        port: 3000, ok: gatewayOk },
              { name: 'Auth Service',        port: 5001, ok: true      },
              { name: 'Submission Service',  port: 5003, ok: true      },
              { name: 'Problem Service',     port: 5004, ok: true      },
            ].map(s => (
              <div key={s.name} className="flex justify-between items-center text-gray-400">
                <span>{s.name}</span>
                <span className={`font-mono text-xs px-2 py-1 rounded ${s.ok ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                  {s.ok ? '● running' : '○ offline'} :{s.port}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-6">
          <h3 className="font-semibold text-blue-300 mb-2">🚀 Start Solving</h3>
          <p className="text-gray-400 text-sm mb-4">
            Browse problems and submit your solutions.
          </p>
          <Link to="/problems"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2 rounded-lg transition">
            View Problems →
          </Link>
        </div>
      </main>
    </div>
  );
}
