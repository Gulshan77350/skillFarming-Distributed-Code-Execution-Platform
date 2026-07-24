import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard       from './pages/Dashboard';
import Problems        from './pages/Problems';
import ProblemDetail   from './pages/ProblemDetail';
import Leaderboard     from './pages/Leaderboard';
import Analytics       from './pages/Analytics';
import Contest         from './pages/Contest';

function PrivateRoute({ children }: { children: React.JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"             element={<Navigate to="/login" replace />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/dashboard"    element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/problems"     element={<PrivateRoute><Problems /></PrivateRoute>} />
          <Route path="/problems/:id" element={<PrivateRoute><ProblemDetail /></PrivateRoute>} />
          <Route path="/leaderboard"  element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/analytics"    element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/contest"      element={<PrivateRoute><Contest /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
