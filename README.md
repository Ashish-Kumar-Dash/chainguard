# ChainGuard — Autonomous Supply Chain Threat Investigation Agent

ChainGuard is an AI-powered security operations tool that autonomously investigates software supply chain attacks using Splunk data. It detects threats, hunts for indicators of compromise across multiple data sources, assesses blast radius, and recommends prioritized remediation actions — all through a real-time SOC dashboard.

Built for the **Splunk Agentic Ops Hackathon 2026**.

![MIT License](https://img.shields.io/badge/license-MIT-green)
![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)

---

## What It Does

1. **Paste a security alert** — a suspicious VS Code extension, a compromised CI pipeline, a typosquatted npm package
2. **ChainGuard autonomously investigates** — the multi-agent pipeline runs DETECT → INVESTIGATE (3 parallel sub-agents) → ASSESS → REMEDIATE
3. **Watch the investigation live** — SSE-streamed updates show each agent's reasoning, SPL queries, findings, and MITRE ATT&CK mappings in real time
4. **Review and approve remediation** — human-in-the-loop approval gate before any action is taken

### Key Features

- **Multi-Agent Architecture**: Supervisor dispatches 3 parallel sub-agents (IOC Hunter, Threat Intel, Blast Radius) that each independently query Splunk and analyze results, then a merge node synthesizes findings
- **Splunk MCP Integration**: Connects to Splunk via the Model Context Protocol (MCP) for live SPL query execution against real security data
- **Real-Time SOC Dashboard**: Command center with live investigation streaming, attack propagation graphs, MITRE ATT&CK heatmap, and MCP observability metrics
- **Human-in-the-Loop**: Investigation results and remediation actions require human approval before execution
- **3 Built-In Attack Scenarios**: Trojanized VS Code extension, compromised CI/CD pipeline, poisoned npm package — each with synthetic Splunk data

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                        │
│  Command Center ─── Investigation Workspace ─── MITRE ATT&CK View  │
│        │                     │ SSE Stream                           │
└────────┼─────────────────────┼──────────────────────────────────────┘
         │ REST API            │
┌────────┼─────────────────────┼──────────────────────────────────────┐
│        ▼                     ▼          BACKEND (FastAPI)           │
│  ┌──────────┐  ┌──────────────────────────────────────────────┐    │
│  │  Routes   │  │           LangGraph StateGraph                │    │
│  │ /investigate│  │                                              │    │
│  │ /stream   │  │  ┌────────┐     ┌─────────────────────┐      │    │
│  │ /actions  │  │  │ DETECT │────▶│    SUPERVISOR        │      │    │
│  └──────────┘  │  └────────┘     │  (conditional edge)  │      │    │
│                │                  └─────────┬────────────┘      │    │
│                │          ┌────────────────┬┼────────────────┐  │    │
│                │          ▼                ▼▼                ▼  │    │
│                │  ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│                │  │  IOC Hunter  │ │ Threat Intel │ │Blast Radius│ │
│                │  │  (sub-agent) │ │ (sub-agent)  │ │(sub-agent) │ │
│                │  └──────┬───────┘ └──────┬───────┘ └─────┬──────┘ │
│                │         └────────────────┼───────────────┘  │     │
│                │                          ▼                  │     │
│                │                   ┌──────────┐              │     │
│                │                   │  MERGE   │              │     │
│                │                   └────┬─────┘              │     │
│                │                        ▼                    │     │
│                │    ┌─────────┐  ┌──────────┐  ┌───────────┐│     │
│                │    │  LOOP?  │◀─│  ASSESS  │  │ REMEDIATE ││     │
│                │    │(max: 3) │  │  IMPACT  │──│  (HITL)   ││     │
│                │    └─────────┘  └──────────┘  └───────────┘│     │
│                │                                             │     │
│                └─────────────────────────────────────────────┘     │
│                                                                    │
│  ┌──────────────────────┐                                          │
│  │   MCP Metrics Store  │  ← Tracks latency, success rate, calls  │
│  └──────────────────────┘                                          │
└────────────────────────────────────────────────────────────────────┘
         │
         │ MCP (Streamable HTTP)
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SPLUNK ENTERPRISE (Docker)                       │
│                                                                     │
│  Indexes:  cicd_events │ git_events │ secret_audit │ extensions │   │
│            threat_intel                                              │
│                                                                     │
│  MCP Server (Splunk App for MCP) ← Exposes splunk_run_query tool   │
│  HEC Endpoint ← Receives synthetic attack data                     │
└─────────────────────────────────────────────────────────────────────┘
```

See [`architecture.svg`](./architecture.svg) for a visual diagram.

### Data Flow

1. **User** pastes a security alert into the Command Center
2. **DETECT node** classifies the attack type, extracts IOCs, and creates an investigation plan (LLM call)
3. **Supervisor** fans out to 3 parallel sub-agents via LangGraph `Send()`:
   - **IOC Hunter** — searches for indicator matches across all Splunk indexes
   - **Threat Intel** — correlates IOCs with known threats and MITRE ATT&CK techniques
   - **Blast Radius** — traces compromise spread across repos, pipelines, endpoints, secrets
4. Each sub-agent generates SPL queries, executes them via **Splunk MCP**, and analyzes results (2 LLM calls per agent)
5. **Merge node** synthesizes all three perspectives with LLM-powered deduplication
6. **Loop controller** decides whether to re-investigate with newly discovered IOCs (max 3 loops)
7. **ASSESS** scores severity, maps blast radius, builds attack timeline and propagation graph
8. **REMEDIATE** generates prioritized actions with MITRE-aligned categories
9. **Human-in-the-loop** — user approves or rejects each remediation action

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Framework | LangGraph (StateGraph with Send() fan-out) |
| LLM | Groq (llama-3.3-70b-versatile) via LangChain |
| Data Platform | Splunk Enterprise (Docker) |
| Splunk Integration | MCP (Model Context Protocol) via Streamable HTTP |
| Backend | FastAPI + SSE streaming (sse-starlette) |
| Frontend | Next.js 16 + React Flow + Tailwind CSS |
| Testing | pytest + pytest-asyncio (42 tests) |

---

## Prerequisites

- **Python 3.12+**
- **Node.js 20+**
- **Docker** (for Splunk Enterprise)
- **Groq API Key** — free at [console.groq.com](https://console.groq.com)
- **Splunk MCP Token** — from the Splunk App for MCP (installed automatically via Docker)

---

## Setup & Run

### 1. Clone and configure

```bash
git clone https://github.com/AshishKumar-Dash/ChainGuard.git
cd ChainGuard
```

Create a `.env` file in the project root (see `.env.example`):

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start Splunk (Docker)

```bash
docker compose up -d
# Wait ~2 minutes for Splunk to initialize

# Set up indexes and HEC
bash scripts/setup-splunk.sh

# Load synthetic attack data (3 scenarios)
bash scripts/ingest-data.sh
```

Verify at http://localhost:8000 (admin / ChainGuard123!)

### 3. Start the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

uvicorn app.main:app --reload --port 8080
```

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — the Command Center is ready.

### 5. Run an Investigation

1. Click **"New Investigation"** on the Command Center
2. Choose a **Quick Launch** demo scenario or paste your own alert
3. Click **"Investigate"** and watch the multi-agent pipeline work in real time
4. Review findings, attack graph, and blast radius in the Investigation Workspace
5. **Approve or reject** remediation actions in the Remediation panel

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

All 42 tests pass, covering:
- Agent graph topology and loop-back logic
- DETECT node with IOC extraction
- Supervisor fan-out (returns 3 Send objects)
- Merge node synthesis of sub-agent results
- Sub-agent nodes (IOC Hunter, Threat Intel, Blast Radius)
- All REST API routes (create, stream, continue, approve, reject)
- Full end-to-end pipeline simulation

---

## Project Structure

```
chainguard/
├── backend/
│   ├── app/
│   │   ├── agent/
│   │   │   ├── graph.py              # LangGraph StateGraph assembly
│   │   │   ├── nodes/
│   │   │   │   ├── detect.py         # Attack classification + IOC extraction
│   │   │   │   ├── investigate.py    # Supervisor (Send fan-out) + Merge node
│   │   │   │   ├── sub_agents.py     # IOC Hunter, Threat Intel, Blast Radius
│   │   │   │   ├── assess.py         # Severity scoring + blast radius mapping
│   │   │   │   └── remediate.py      # Prioritized action generation
│   │   │   ├── prompts.py            # All LLM prompt templates
│   │   │   └── parse.py              # JSON extraction from LLM responses
│   │   ├── routes/
│   │   │   ├── investigate.py        # Investigation CRUD + SSE streaming
│   │   │   ├── splunk.py             # Direct Splunk query proxy
│   │   │   └── metrics.py            # MCP observability endpoint
│   │   ├── config.py                 # Pydantic settings (.env loading)
│   │   ├── llm.py                    # LLM factory (Groq/OpenAI)
│   │   ├── main.py                   # FastAPI app + MCP tool discovery
│   │   ├── mcp_metrics.py            # MCP call tracking (latency, success)
│   │   ├── state.py                  # InvestigationState TypedDict
│   │   └── storage.py                # JSON file persistence
│   ├── data/
│   │   └── generate.py               # Synthetic attack data generator
│   ├── tests/                        # 42 tests
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Command Center dashboard
│   │   │   ├── investigate/
│   │   │   │   ├── page.tsx          # Investigations list
│   │   │   │   └── [id]/page.tsx     # Investigation workspace
│   │   │   └── mitre/page.tsx        # MITRE ATT&CK heatmap
│   │   ├── components/               # 18 React components
│   │   └── lib/
│   │       ├── api.ts                # Backend API client + SSE
│   │       └── types.ts              # TypeScript type definitions
│   └── package.json
├── scripts/
│   ├── setup-splunk.sh               # Splunk index + HEC configuration
│   └── ingest-data.sh                # Synthetic data loader
├── docker-compose.yml                # Splunk Enterprise container
├── .env.example                      # Environment variable template
├── LICENSE                           # MIT
└── README.md
```

---

## Environment Variables

| Variable | Description | Required |
|----------|------------|----------|
| `GROQ_API_KEY` | Groq API key for LLM calls | Yes |
| `LLM_PROVIDER` | LLM provider (`groq` or `openai`) | No (default: `groq`) |
| `LLM_MODEL` | Model name | No (default: `llama-3.3-70b-versatile`) |
| `SPLUNK_MCP_URL` | Splunk MCP server URL | No (default: `https://localhost:8089/services/mcp`) |
| `SPLUNK_MCP_TOKEN` | MCP authentication token | Yes (for live Splunk queries) |
| `SPLUNK_HEC_URL` | Splunk HEC endpoint | No (default: `https://localhost:8088`) |
| `SPLUNK_HEC_TOKEN` | HEC token for data ingestion | No (default: `chainguard-hec-token`) |

---

## License

MIT — see [LICENSE](./LICENSE)
