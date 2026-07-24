import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Contest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contest, setContest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    if (!user) return;
    client.get(`/contests/active/${user.id}`)
      .then(r => {
        if (!r.data) navigate('/dashboard');
        else setContest(r.data);
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  useEffect(() => {
    if (!contest) return;
    const end = new Date(contest.end_time).getTime();
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diff = end - now;
      if (diff <= 0) {
        setIsOver(true);
        setTimeLeft('00:00:00');
        clearInterval(timer);
      } else {
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [contest]);

  if (loading) return <div className="min-h-screen bg-gray-950 text-white p-10">Loading contest...</div>;
  if (!contest) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="font-bold text-lg text-blue-400">⚡ skillFarming</Link>
          <span className="text-white text-sm font-semibold border-b-2 border-red-500 pb-0.5">Live Contest</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono text-red-400 font-bold bg-red-900/30 px-4 py-1.5 rounded border border-red-700/50">
          ⏳ {isOver ? 'CONTEST OVER' : timeLeft}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Virtual Contest Session</h2>
          <p className="text-gray-400 text-sm">
            You have 1 hour to solve these 2 problems. Your highest score will be ranked on the Contest Leaderboard.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-200">Current Score</h3>
            <span className="text-3xl font-bold text-yellow-400">{contest.score} pts</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Easy Problem */}
          <div className={`border rounded-xl p-6 transition ${contest.easySolved ? 'bg-green-900/20 border-green-700' : 'bg-gray-900 border-gray-700'}`}>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold px-2 py-1 rounded bg-green-900/40 text-green-400">Easy (100 pts)</span>
              {contest.easySolved && <span className="text-green-400 text-sm font-bold">✓ SOLVED</span>}
            </div>
            <h4 className="text-lg font-bold mb-4">Problem A</h4>
            <Link to={`/problems/${contest.problem_easy_id}`} target="_blank"
              className={`block text-center w-full py-2 rounded-lg font-semibold transition ${contest.easySolved ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
              {contest.easySolved ? 'Completed' : 'Solve Now'}
            </Link>
          </div>

          {/* Hard Problem */}
          <div className={`border rounded-xl p-6 transition ${contest.hardSolved ? 'bg-green-900/20 border-green-700' : 'bg-gray-900 border-gray-700'}`}>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold px-2 py-1 rounded bg-red-900/40 text-red-400">Medium/Hard (300 pts)</span>
              {contest.hardSolved && <span className="text-green-400 text-sm font-bold">✓ SOLVED</span>}
            </div>
            <h4 className="text-lg font-bold mb-4">Problem B</h4>
            <Link to={`/problems/${contest.problem_hard_id}`} target="_blank"
              className={`block text-center w-full py-2 rounded-lg font-semibold transition ${contest.hardSolved ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
              {contest.hardSolved ? 'Completed' : 'Solve Now'}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
