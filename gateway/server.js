require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const jwt     = require('jsonwebtoken');
const http    = require('http');
const WebSocket = require('ws');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { createClient } = require('redis');

const app = express();

const promClient = require('prom-client');
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    httpRequestDuration.observe(
      { method: req.method, route: req.path, status: res.statusCode },
      (Date.now() - start) / 1000
    );
  });
  next();
});

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));

const JWT_SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/', (_req, res) => {
  res.json({
    service: 'API Gateway',
    status: 'running',
    routes: {
      public:    ['POST /auth/register', 'POST /auth/login'],
      protected: ['POST /submissions', 'GET /submissions/:id', 'GET /problems', 'GET /leaderboard', 'GET /notifications/:user_id', 'GET /stats/:user_id'],
      websocket: ['ws://localhost:3000/ws?token=JWT'],
    },
  });
});

// ─── WebSocket push (internal, used by worker) — MUST be registered before proxies/404 ───
const clients = new Map();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisSub = createClient({ url: redisUrl });
const redisPub = createClient({ url: redisUrl });

async function initRedis() {
  await redisSub.connect();
  await redisPub.connect();
  console.log('Redis Pub/Sub connected for Gateway');

  await redisSub.subscribe('ws-push', (message) => {
    try {
      const { userId, payload } = JSON.parse(message);
      const sockets = clients.get(Number(userId));
      if (sockets) {
        for (const ws of sockets) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
          }
        }
      }
    } catch (err) {
      console.error('Error handling Redis Pub/Sub message:', err.message);
    }
  });
}
initRedis().catch(err => console.error('Redis subscription failed:', err.message));

app.post('/internal/push/:user_id', express.json(), async (req, res) => {
  const userId = Number(req.params.user_id);
  try {
    await redisPub.publish('ws-push', JSON.stringify({ userId, payload: req.body }));
    res.json({ status: 'published' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish message: ' + err.message });
  }
});

app.use('/auth', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: { '^/auth': '' },
  onError: (_e, _r, res) => res.status(502).json({ error: 'Auth service unavailable' }),
}));

app.use('/stats', authenticate, createProxyMiddleware({
  target: 'http://localhost:5003',
  changeOrigin: true,
  pathRewrite: { '^/stats': '/stats' },
  onError: (_e, _r, res) => res.status(502).json({ error: 'Stats unavailable' }),
}));

app.use('/submissions', authenticate, createProxyMiddleware({
  target: 'http://localhost:5003',
  changeOrigin: true,
  pathRewrite: { '^/submissions': '/submit' },
  onError: (_e, _r, res) => res.status(502).json({ error: 'Submission service unavailable' }),
}));

app.use('/problems', authenticate, createProxyMiddleware({
  target: 'http://localhost:5004',
  changeOrigin: true,
  pathRewrite: { '^/problems': '/problems' },
  onError: (_e, _r, res) => res.status(502).json({ error: 'Problem service unavailable' }),
}));

app.use('/leaderboard', authenticate, createProxyMiddleware({
  target: 'http://localhost:5005',
  changeOrigin: true,
  onError: (_e, _r, res) => res.status(502).json({ error: 'Leaderboard service unavailable' }),
}));

app.use('/notifications', authenticate, createProxyMiddleware({
  target: 'http://localhost:5006',
  changeOrigin: true,
  onError: (_e, _r, res) => res.status(502).json({ error: 'Notification service unavailable' }),
}));

// 404 catch-all — MUST be last
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── HTTP + WebSocket server ──────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    socket.destroy();
    return;
  }

  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const token = url.searchParams.get('token');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.userId = decoded.id;
      if (!clients.has(decoded.id)) clients.set(decoded.id, new Set());
      clients.get(decoded.id).add(ws);
      console.log(`WS connected: user ${decoded.id}`);

      ws.on('close', () => {
        clients.get(decoded.id)?.delete(ws);
        console.log(`WS disconnected: user ${decoded.id}`);
      });
    });
  } catch (err) {
    console.error('WS auth failed:', err.message);
    socket.destroy();
  }
});

server.listen(3000, () => {
  console.log('API Gateway (HTTP + WS) running on port 3000');
});
