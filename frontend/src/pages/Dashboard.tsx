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
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [recommendedProblems, setRecommendedProblems] = useState<any[]>([]);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    if (!user) return;

    client.get(`/stats/${user.id}`)
      .then(r => setStats(r.data))
      .catch(() => {});

    client.get(`/leaderboard/rank/${user.id}`)
      .then(r => setRank(r.data.rank))
      .catch(() => {});

    client.get(`/submissions/recent/${user.id}`)
      .then(r => setRecentSubmissions(r.data))
      .catch(() => {});

    client.get('/problems')
      .then(r => setRecommendedProblems(r.data.sort(() => 0.5 - Math.random()).slice(0, 3)))
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Random Problem Card */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 mb-2">🎲 Quick Practice</h3>
            <p className="text-gray-400 text-sm mb-6">
              Not sure what to solve? Let the platform pick a random Striver A-Z problem for you to practice.
            </p>
            <button
              onClick={() => {
                client.get('/problems/random')
                  .then(r => navigate(`/problems/${r.data.id}`))
                  .catch(() => alert('Failed to fetch a random problem.'));
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition">
              Select Random Problem
            </button>
          </div>

          {/* Virtual Contest Card */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
            <h3 className="font-semibold text-blue-300 mb-2">🏆 Virtual Contest</h3>
            <p className="text-blue-100/70 text-sm mb-6">
              Challenge yourself! 1 Hour. 2 Problems (1 Easy, 1 Medium/Hard). Compete for the top spot on the Contest Leaderboard.
            </p>
            <button
              onClick={() => {
                client.post('/contests/start', { user_id: user.id })
                  .then(() => navigate('/contest'))
                  .catch(err => alert(err.response?.data?.error || 'Failed to start contest'));
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-blue-900/50">
              Start Contest Now
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <span>🕒</span> Recent Activity
            </h3>
            {recentSubmissions.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent submissions yet. Start solving!</p>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map(s => (
                  <div key={s.id} className="flex justify-between items-center bg-gray-950/50 p-3 rounded-lg border border-gray-800/60">
                    <div>
                      <Link to={`/problems/${s.problem_id}`} className="font-medium text-blue-400 hover:underline">{s.problem_title}</Link>
                      <p className="text-xs text-gray-500 mt-1">{new Date(s.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      s.status === 'ACCEPTED' ? 'bg-green-900/40 text-green-400' :
                      s.status === 'QUEUED' || s.status === 'SCHEDULED' ? 'bg-yellow-900/40 text-yellow-400' :
                      'bg-red-900/40 text-red-400'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended */}
          <div className="md:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <span>🔥</span> Recommended
            </h3>
            <div className="space-y-3">
              {recommendedProblems.map(p => (
                <Link key={p.id} to={`/problems/${p.id}`} className="block group">
                  <div className="bg-gray-950/50 p-3 rounded-lg border border-gray-800/60 transition group-hover:border-blue-500/50">
                    <p className="font-medium text-gray-200 group-hover:text-blue-400 transition truncate">{p.title}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                        p.difficulty === 'easy' ? 'text-green-400 bg-green-900/30' :
                        p.difficulty === 'medium' ? 'text-yellow-400 bg-yellow-900/30' :
                        'text-red-400 bg-red-900/30'
                      }`}>
                        {p.difficulty}
                      </span>
                      {p.topic && (
                        <span className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                          {p.topic}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
