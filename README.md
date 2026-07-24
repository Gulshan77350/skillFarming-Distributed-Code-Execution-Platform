# ⚡ skillFarming: Distributed Code Execution & Virtual Contest Arena

A high-performance, production-ready Distributed Code Judge and Execution Platform built on a containerized microservices architecture. Inspired by platforms like LeetCode and HackerRank, this system is designed to securely, reliably, and asynchronously compile and run user-submitted code in sandboxed environments at scale.

Recently updated to include **Striver's A-Z DSA Sheet Integration** and a real-time **Virtual Contest Engine**.

---

## 📸 Platform Previews

Please save your screenshots in a `docs/` folder to view them here:

<div align="center">
  <img src="./docs/dashboard.png" alt="Dashboard" width="45%" />
  <img src="./docs/analytics.png" alt="Analytics" width="45%" />
  <br/>
  <img src="./docs/problems.png" alt="Problems Directory" width="45%" />
  <img src="./docs/leaderboard.png" alt="Leaderboard" width="45%" />
</div>

---

## 🌟 Core Features & Implementations

### 1. 🥊 Virtual Contest Engine
A built-in contest system that dynamically generates a 1-hour competitive session. 
* **Dynamic Generation**: Randomly assigns 1 Easy and 1 Medium/Hard problem to the user.
* **Strict Timer**: A synchronized countdown timer enforces a 60-minute coding window.
* **Live Scoring**: Submissions made within the active contest window are evaluated. Accepted solutions grant 100 points (Easy) or 300 points (Hard/Medium).
* **Contest Leaderboard**: A dedicated leaderboard tracks the top performers based solely on their highest single-session contest score.

### 2. 📚 Striver A-Z DSA Integration
* **Topic-Based Filtering**: The database is structured to support comprehensive algorithm sets. It currently features core problems tagged by topic (e.g., *Two Pointers, Dynamic Programming, Arrays*).
* **Quick Practice Mode**: A randomizer algorithm instantly drops the user into an active IDE with a random Striver problem to combat decision paralysis.
* **Extensible Seeder**: A Node.js seeder (`scripts/seedStriver.js`) automatically provisions problems and test cases into the Postgres database.

### 3. 🛡️ Security & Plagiarism Detection
* **Smart Plagiarism Detection**: Tokenized similarity scanning running normalized Jaccard distance calculation on structural n-grams. It prevents users from blindly copy-pasting existing solutions.
* **Redis-Backed Rate Limiting**: The API Gateway implements fail-safe rate limiters (e.g., 5 login attempts/min, 10 submissions/min) to prevent brute-force attacks and spamming.

### 4. 🐳 Docker-in-Docker (DinD) Sandboxed Execution
Secure sibling-container code execution supporting **Python (`3.11-slim`)**, **JavaScript (`Node 20`)**, **C (`GCC`)**, and **C++ (`G++`)** mapped via `/var/run/docker.sock` with strict memory and CPU resource limits per execution.

### 5. 📊 Interactive Analytics Dashboard
Beautiful visual performance metrics utilizing `Recharts` for tracking daily submissions timelines, verdict distributions, success/error rates, difficulty breakdowns, and automated targeted practice recommendations for weak areas.

### 6. 🚀 Asynchronous Event-Driven Pipeline
Decoupled submission lifecycle managed via **Apache Kafka** and **Redis Pub/Sub** for sub-second, real-time WebSocket state streaming from the worker back to the React UI.

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
```

---

## 🛠️ Technology Stack

| Tier | Technologies |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS, Monaco Editor, Recharts |
| **Gateway** | Express.js API Gateway, Redis Rate Limiting |
| **Backing Services** | Node.js, TypeScript, Express |
| **Databases & Cache** | PostgreSQL, Redis (Caching & WebSockets) |
| **Message Broker** | Apache Kafka, ZooKeeper |
| **Sandboxing** | Docker Container Engine (DinD) |
| **Monitoring** | Prometheus, Grafana, Redis Exporter, Node Exporter |

---

## 📁 Repository Directory Structure

```text
.
├── frontend/                     # React UI (Vite, Tailwind, Monaco Editor)
├── gateway/                      # Express API Gateway, Rate Limiter & WebSockets
├── scripts/                      # DB Seeding utilities (seedStriver.js)
├── services/                     
│   ├── auth-service/             # JWT Authentication
│   ├── problem-service/          # Problem directory & Virtual Contest generation
│   ├── submission-service/       # Submission queuing & user analytics
│   ├── leaderboard-service/      # Global and Contest point rankings
│   ├── notification-service/     # Kafka consumer sending persistent user notifications
│   ├── plagiarism-service/       # N-gram token scanning for similarity validation
│   └── execution-worker/         # Kafka consumer orchestrating sandboxed code runs
├── infra/                        
│   ├── docker/                   # Postgres DB init schema scripts
│   └── kubernetes/               # Production Kubernetes deployment manifests
```

---

## 🚀 Quickstart: Unified Local Production Run

Ensure you have **Docker** and **Docker Compose** installed on your host system.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Gulshan77350/skillFarming-Distributed-Code-Execution-Platform.git
   cd skillFarming-Distributed-Code-Execution-Platform
   ```

2. **Boot the entire platform (17 containers)**:
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```

3. **Access the web application**:
   - **Vite Frontend**: `http://localhost:5173`
   - **API Gateway**: `http://localhost:3000`
   - **Grafana Dashboard**: `http://localhost:3001` (Credentials: `admin` / `admin`)

4. **Stop Platform & Free Ports**:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

---

## 📝 Resume Project Highlight

**Distributed Code Judge & Virtual Contest Platform**
- Architected a containerized microservices execution platform handling asynchronous code runs using **Node.js, TypeScript, Docker**, and **PostgreSQL**.
- Integrated **Apache Kafka** and **Redis Pub/Sub** to orchestrate execution tasks, achieving low-latency real-time verdict streaming over WebSockets.
- Engineered a **Virtual Contest Engine** featuring 1-hour session timers, dynamic problem generation, and session-scoped isolated scoring.
- Built a secure execution engine utilizing **Docker-in-Docker sibling containers** to run user code inside sandboxed runtimes with strict CPU/memory allocation limits.
- Designed a custom plagiarism detection service using normalized tokenization and **Jaccard similarity** scanning on submission code histories.
- Constructed an interactive **performance dashboard** with visual analytics mapping user accuracies, daily submissions timeline activity, and weak spot recommendations.
- Implemented robust **Redis-backed Rate Limiting** at the Gateway tier to protect against brute-force attacks and abuse.
- Set up system monitoring using **Prometheus & Grafana** for service metrics scraping, and designed Kubernetes manifests for auto-scaled deployment.
