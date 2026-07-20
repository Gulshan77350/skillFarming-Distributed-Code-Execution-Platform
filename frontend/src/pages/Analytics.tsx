import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import NotificationBell from '../components/NotificationBell';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

interface TimelineItem {
  date: string;
  total: number;
  accepted: number;
  failed: number;
}

interface VerdictItem {
  status: string;
  count: number;
}

interface DifficultyItem {
  total_submissions: number;
  accepted_submissions: number;
  accuracy: number;
}

interface AnalyticsData {
  overall: {
    total_submissions: number;
    accepted_submissions: number;
    solved_count: number;
    overall_accuracy: number;
  };
  verdicts: VerdictItem[];
  difficultyBreakdown: {
    easy: DifficultyItem;
    medium: DifficultyItem;
    hard: DifficultyItem;
  };
  timeline: TimelineItem[];
  weakArea: {
    topic: string;
    accuracy: number;
    recommendation: string;
  };
}

const VERDICT_COLORS: Record<string, string> = {
  ACCEPTED: '#34D399',      // Green
  WRONG_ANSWER: '#F87171',  // Red
  RUNTIME_ERROR: '#FBBF24', // Yellow
  ERROR: '#9CA3AF',         // Gray
  QUEUED: '#60A5FA',        // Blue
};

export default function Analytics() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('weekly');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    client.get(`/stats/user-analytics/${user.id}?period=${period}`)
      .then(r => setData(r.data))
      .catch(err => console.error('Failed to load analytics:', err))
      .finally(() => setLoading(false));
  }, [user, period]);

  const difficultyChartData = data ? [
    { name: 'Easy', accuracy: data.difficultyBreakdown.easy.accuracy, total: data.difficultyBreakdown.easy.total_submissions, fill: '#34D399' },
    { name: 'Medium', accuracy: data.difficultyBreakdown.medium.accuracy, total: data.difficultyBreakdown.medium.total_submissions, fill: '#FBBF24' },
    { name: 'Hard', accuracy: data.difficultyBreakdown.hard.accuracy, total: data.difficultyBreakdown.hard.total_submissions, fill: '#F87171' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Top Navbar */}
      <nav className="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="font-bold text-lg text-blue-400 flex items-center gap-2">
            ⚡ <span>skillFarming</span>
          </Link>
          <Link to="/problems" className="text-gray-300 hover:text-white text-sm transition">Problems</Link>
          <Link to="/leaderboard" className="text-gray-300 hover:text-white text-sm transition">Leaderboard</Link>
          <span className="text-blue-400 text-sm font-semibold border-b-2 border-blue-500 pb-0.5">Analytics</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">Hey, <span className="text-white font-medium">{user?.username}</span></span>
          <NotificationBell />
          <button onClick={handleLogout} className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition">
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Title & Filter Options */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Performance Analytics</h1>
            <p className="text-gray-400 text-sm mt-1">Real-time breakdown of your coding submissions, accuracy, and growth.</p>
          </div>

          <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-xl">
            {(['weekly', 'monthly', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                  period === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p === 'weekly' ? 'Weekly (7d)' : p === 'monthly' ? 'Monthly (30d)' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <span>Analyzing submission patterns...</span>
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 backdrop-blur">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Problems Solved</span>
                <p className="text-3xl font-extrabold text-green-400 mt-2">{data.overall.solved_count}</p>
                <p className="text-xs text-gray-500 mt-1">Distinct accepted challenges</p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 backdrop-blur">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Overall Accuracy</span>
                <p className="text-3xl font-extrabold text-blue-400 mt-2">{data.overall.overall_accuracy}%</p>
                <p className="text-xs text-gray-500 mt-1">{data.overall.accepted_submissions} of {data.overall.total_submissions} accepted</p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 backdrop-blur">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Submissions</span>
                <p className="text-3xl font-extrabold text-purple-400 mt-2">{data.overall.total_submissions}</p>
                <p className="text-xs text-gray-500 mt-1">Executed in Docker sandbox</p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 backdrop-blur">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Target Weak Area</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg capitalize bg-yellow-900/40 text-yellow-400 border border-yellow-700/50">
                    {data.weakArea.topic}
                  </span>
                  {data.weakArea.topic !== 'None' && (
                    <span className="text-xs text-gray-400">({data.weakArea.accuracy}% acc)</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{data.weakArea.recommendation}</p>
              </div>
            </div>

            {/* Main Graphs Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Submission Activity Timeline (2 cols) */}
              <div className="lg:col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Submission Activity</h2>
                    <p className="text-xs text-gray-400">Track your daily code executions and successful accepted runs.</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', color: '#fff' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="total" name="Total Runs" stroke="#3B82F6" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                      <Area type="monotone" dataKey="accepted" name="Accepted" stroke="#10B981" fillOpacity={1} fill="url(#colorAccepted)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Verdict Distribution Pie Chart (1 col) */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Verdict Distribution</h2>
                  <p className="text-xs text-gray-400">Breakdown of submission execution statuses.</p>
                </div>

                <div className="h-56 w-full my-auto flex items-center justify-center">
                  {data.verdicts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.verdicts}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="count"
                          nameKey="status"
                        >
                          {data.verdicts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={VERDICT_COLORS[entry.status] || '#6B7280'} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', color: '#fff' }}
                        />
                        <Legend
                          formatter={(value) => <span className="text-xs text-gray-300 font-medium">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-gray-500 text-center">No verdicts recorded yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Difficulty Matrix & Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Accuracy by Difficulty Bar Chart */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-1">Accuracy by Difficulty</h2>
                <p className="text-xs text-gray-400 mb-6">Percentage of successful submissions across difficulty tiers.</p>

                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={difficultyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', color: '#fff' }}
                        formatter={(value: any) => [`${value}% Accuracy`, 'Accuracy']}
                      />
                      <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} barSize={40}>
                        {difficultyChartData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Skill Recommendations & AI Focus Box */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-2 bg-blue-900/40 text-blue-400 rounded-lg text-lg">💡</span>
                    <h2 className="text-lg font-bold text-white">Targeted Practice Insights</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Auto-generated recommendations based on execution error patterns.</p>
                </div>

                <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-5 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Suggested Focus</span>
                    <span className="text-xs bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-400/30">
                      {data.weakArea.topic === 'None' ? 'Optimal Performance' : `${data.weakArea.topic.toUpperCase()} PROBLEMS`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed">{data.weakArea.recommendation}</p>
                </div>

                <div className="flex justify-end">
                  <Link to="/problems" className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition shadow-md">
                    Practice Recommended Problems →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">Failed to load analytics data.</div>
        )}
      </main>
    </div>
  );
}
