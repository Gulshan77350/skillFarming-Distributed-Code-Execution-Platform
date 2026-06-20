# Distributed Online Judge Platform

A production-style distributed online judge platform inspired by:

- LeetCode
- HackerRank
- Codeforces

This project demonstrates:

- Microservices Architecture
- Distributed Systems
- Kafka-based asynchronous processing
- Docker sandbox execution
- PostgreSQL persistence
- Worker architecture
- Event-driven systems
- Backend scalability

---

# Features

## Core Features

- User authentication service
- Problem service
- Submission service
- Distributed execution workers
- Kafka queue processing
- Docker sandboxed code execution
- PostgreSQL database integration
- API Gateway

---

# Tech Stack

| Component | Technology |
|---|---|
| Backend | Node.js + TypeScript |
| API Framework | Express.js |
| Database | PostgreSQL |
| Queue System | Kafka |
| Cache | Redis |
| Containerization | Docker |
| Infrastructure | Docker Compose |
| Worker System | Kafka Consumers |

---

# Project Structure

```text
distributed-online-judge/
│
├── frontend/
├── gateway/
├── infra/
│   ├── docker/
│   ├── kubernetes/
│   └── monitoring/
│
├── services/
│   ├── auth-service/
│   ├── execution-service/
│   ├── leaderboard-service/
│   ├── notification-service/
│   ├── plagiarism-service/
│   ├── problem-service/
│   └── submission-service/
│
├── shared/
│
├── workers/
│   └── execution-worker/
│
└── docs/
```

---

# Start Infrastructure

```bash
cd infra/docker
docker compose up -d
```

---

# Install Dependencies

## Gateway

```bash
cd gateway
npm install
```

## Auth Service

```bash
cd services/auth-service
npm install
```

## Problem Service

```bash
cd services/problem-service
npm install
```

## Submission Service

```bash
cd services/submission-service
npm install
```

## Worker

```bash
cd workers/execution-worker
npm install
```

---

# Run Services

## Gateway

```bash
cd gateway
node server.js
```

## Auth Service

```bash
cd services/auth-service
npm run dev
```

## Problem Service

```bash
cd services/problem-service
npm run dev
```

## Submission Service

```bash
cd services/submission-service
npm run dev
```

## Worker

```bash
cd workers/execution-worker
node worker.js
```

---

# Test Submission Pipeline

```bash
curl -X POST http://localhost:5003/submit \
-H "Content-Type: application/json" \
-d '{
"user_id":1,
"problem_id":1,
"language":"python",
"code":"print(1+2)"
}'
```

---

# Architecture Flow

```text
Client
  ↓
Submission Service
  ↓
Kafka Topic
  ↓
Execution Worker
  ↓
Docker Sandbox
  ↓
PostgreSQL Update
```

---

# Important Concepts

- Distributed Systems
- Event-Driven Architecture
- Kafka Queues
- Docker Sandboxing
- Async Processing
- Worker Architecture
- Microservices

---

# Future Improvements

- JWT Authentication
- Redis caching
- Kubernetes deployment
- WebSocket verdict streaming
- Multi-language execution
- Prometheus + Grafana
- Autoscaling workers

---

# Resume Description

Built a distributed online judge platform using Kafka-based asynchronous worker architecture, Docker sandbox execution, PostgreSQL persistence, and scalable microservices.

## Monitoring

Prometheus scrapes the API Gateway's `/metrics` endpoint every 15s, tracking request duration and counts per route. Grafana (`http://localhost:3001`, admin/admin) can be pointed at Prometheus as a data source for dashboards.

## Plagiarism Detection

After a submission is `ACCEPTED`, the worker triggers an async similarity check against all other accepted solutions for the same problem. Code is normalized (comments stripped, whitespace collapsed) and compared using Jaccard similarity over 5-token n-grams. Matches above 60% similarity are flagged in the worker logs.

## Kubernetes

See `k8s/` for production deployment manifests, including horizontal scaling strategy for the execution worker tier and secrets management.
