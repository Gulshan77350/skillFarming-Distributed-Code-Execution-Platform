# Distributed Code Judge & Execution Platform (skillFarming)

A high-performance, production-ready Distributed Code Judge and Execution Platform built on a containerized microservices architecture. Inspired by platforms like LeetCode and HackerRank, this system is designed to securely, reliably, and asynchronously compile and run user-submitted code in sandboxed environments at scale.

---

## ⚡ System Highlights

- **Unified Production Orchestration**: Launch the entire 17-container stack (Microservices, Databases, Message Brokers, Monitoring, Gateway, Frontend) using a single command: `docker compose -f docker-compose.prod.yml up -d`.
- **Docker-in-Docker (DinD) Sandboxed Execution**: Secure sibling-container code execution supporting **Python (`3.11-slim`)**, **JavaScript (`Node 20`)**, **C (`GCC`)**, and **C++ (`G++`)** mapped via `/var/run/docker.sock` with memory/CPU resource limits.
- **Interactive Analytics Dashboard**: Beautiful visual performance metrics utilizing `Recharts` for tracking daily submissions timelines, verdict distributions, success/error rates, difficulty breakdown (Easy, Medium, Hard), and automated practice recommendations for weak areas.
- **Asynchronous Event-Driven Pipeline**: Decoupled submission lifecycle managed via Apache Kafka and Redis Pub/Sub for sub-second, real-time WebSocket state streaming.
- **Smart Plagiarism Detection**: Tokenized similarity scanning running normalized Jaccard distance calculation on structural n-grams for code submissions.
- **Production-Grade Monitoring**: Pre-integrated Prometheus & Grafana dashboarding with Node/Redis Exporters to monitor load, memory usage, and endpoint throughput.
- **Cloud-Native Architecture**: Fully mapped Kubernetes manifests for transition to AWS/GCP clusters, including Horizontal Pod Autoscaling (HPA) policies for worker tiers.

---

## 🏗️ System Architecture

```text
       [ React Frontend ] ──(WebSocket)── [ Redis Pub/Sub (ws-push) ]
              │                                      ▲
              ▼                                      │
       [ Express API Gateway ]                       │
              │                                      │
     ┌────────┼────────┬─────────────────┐           │
     ▼        ▼        ▼                 ▼           │
  [Auth]  [Problem] [Submission]    [Leaderboard]    │
  (5001)   (5004)    (5003)            (5005)        │
                       │                             │
                       ▼                             │
               [ Apache Kafka ]                      │
               (Topic: submission-created)           │
                       │                             │
                       ▼                             │
               [ Execution Worker ] ─────────────────┘
                       │
                       ▼
              [ Ephemeral Docker Sandbox ]
              (python:3.11-slim / node:20-slim / gcc:latest)
```

---

## 🛠️ Technology Stack

| Tier | Technologies |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS, Monaco Editor, Recharts |
| **Gateway** | Express.js API Gateway, HTTP Proxy Middleware |
| **Backing Services** | Node.js, TypeScript, Express |
| **Databases & Cache** | PostgreSQL, Redis (Caching & WebSockets) |
| **Message Broker** | Apache Kafka, ZooKeeper |
| **Sandboxing** | Docker Container Engine |
| **Monitoring** | Prometheus, Grafana, Redis Exporter, Node Exporter |

---

## 📁 Repository Directory Structure

```text
.
├── frontend/                     # React dashboard with Monaco Editor & Recharts
├── gateway/                      # Express API Gateway Proxy & WebSocket router
├── services/                     
│   ├── auth-service/             # JWT Registration, Login, and Session management
│   ├── problem-service/          # Problem directory, descriptions, and test case storage
│   ├── submission-service/       # Handles submission queuing, results, and user analytics
│   ├── leaderboard-service/      # Real-time Redis-backed points leaderboard
│   ├── notification-service/     # Kafka consumer sending persistent user notifications
│   └── plagiarism-service/       # N-gram token scanning for similarity validation
├── workers/                      
│   └── execution-worker/         # Kafka consumer orchestrating sandboxed container runs
├── infra/                        
│   ├── docker/                   # Postgres DB init schema scripts
│   └── monitoring/               # Prometheus & Grafana scrape configs
└── k8s/                          # Production Kubernetes deployment & HPA manifests
```

---

## 🚀 Quickstart: Unified Local Production Run

Ensure you have **Docker** and **Docker Compose** installed on your host system.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Gulshan77350/skillFarming-Distributed-Code-Execution-Platform.git
   cd skillFarming-Distributed-Code-Execution-Platform
   ```

2. **Boot the entire platform**:
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```

3. **Verify the active containers**:
   ```bash
   docker ps
   ```

4. **Access the web application**:
   - **Vite Frontend**: `http://localhost:5173`
   - **API Gateway**: `http://localhost:3000`
   - **Grafana Dashboard**: `http://localhost:3001` (Default credentials: `admin` / `admin`)
   - **Prometheus Scraper**: `http://localhost:9090`

---

## 📈 Supported Algorithmic Problems

The system comes pre-seeded with 11 core algorithmic challenges across different difficulty tiers and data structures:

1. **Sum of Two Numbers** (Easy) — Basic input/output addition
2. **Two Sum** (Easy) — Array indices addition matching a target
3. **Palindrome Check** (Easy) — String validation
4. **Reverse String** (Easy) — Characters reversing
5. **Fibonacci Number** (Easy) — Basic recursion/memoization
6. **Maximum Subarray Sum** (Medium) — Kadane's algorithm
7. **Valid Parentheses** (Medium) — Stack manipulation
8. **Longest Substring Without Repeating Characters** (Medium) — Sliding window
9. **Binary Search** (Medium) — Array search logic
10. **Merge Intervals** (Hard) — Sorting & intervals merging
11. **Trapping Rain Water** (Hard) — Dynamic programming/two-pointer trap computation

---

## 📝 Resume Project Highlight

**Distributed Code Judge & Execution Platform**
- Architected a containerized microservices execution platform handling asynchronous code runs using **Node.js, TypeScript, Docker**, and **PostgreSQL**.
- Integrated **Apache Kafka** and **Redis Pub/Sub** to orchestrate execution tasks, achieving low-latency real-time verdict streaming over WebSockets.
- Built a secure execution engine utilizing **Docker-in-Docker sibling containers** to run user code inside sandboxed runtimes with strict CPU/memory allocation limits.
- Designed a custom plagiarism detection service using normalized tokenization and **Jaccard similarity** scanning on submission code histories.
- Constructed an interactive **performance dashboard** with visual analytics mapping user accuracies, daily submissions timeline activity, and weak spot recommendations.
- Set up system monitoring using **Prometheus & Grafana** for service metrics scraping, and designed Kubernetes manifests for auto-scaled deployment.
