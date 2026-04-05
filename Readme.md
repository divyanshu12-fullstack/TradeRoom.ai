# TradeRoom.ai

Autonomous Institutional Trading Floor and Risk Orchestrator

TradeRoom.ai is built around one simple idea: trading systems should think fast, but they should never ignore risk. Instead of asking one big model to do everything, TradeRoom.ai runs a small team of specialized AI agents that challenge each other before any action is taken.

The result is a system that can react to live markets, keep context over time, and avoid repeating the same expensive mistakes.

## Demo Video

[![Watch Demo](https://img.shields.io/badge/▶%20Watch-Demo%20Video-red?style=for-the-badge&logo=googledrive&logoColor=white)](https://drive.google.com/file/d/1QBkchdGXTZjmLBb3eegzK0fzdz9XfHQR/view?usp=sharing)

## Why This Problem Is Big

In modern markets, decisions must be made in seconds or less. But those decisions are not just about price.

You must process:

- live market structure,
- changing sentiment from news/social channels,
- portfolio exposure,
- and strict risk limits.

Most bots fail for three reasons:

1. Cognitive overload

A single LLM is forced to read data, reason about strategy, and do risk checks in one prompt. That often creates weak logic, dropped context, or hallucinated confidence.

2. No long-term memory

Many systems behave like they have a short memory. They lose on a known trap pattern, then repeat the same error later because that lesson was never stored or recalled.

3. Slow and fragmented state sync

When state is spread across multiple layers with high latency, agent decisions are made on stale information. In trading, stale state means bad trades.

## How TradeRoom.ai Solves It

TradeRoom.ai uses a decoupled swarm architecture with three focused roles:

1. The Quant

- Reads live market and sentiment signals.
- Produces a structured market view.

2. The Portfolio Manager

- Turns the Quant view into a concrete trade plan.
- Chooses position sizing and execution intent.

3. The Chief Risk Officer (CRO)

- Challenges assumptions.
- Checks risk limits and conflict signals.
- Has final veto authority.

If the CRO rejects a trade, it does not execute.

This design keeps the system aggressive when opportunities are real, but conservative when conditions are dangerous.

## Architecture Overview

<img width="1600" height="872" alt="image" src="https://github.com/user-attachments/assets/7c7cb4a7-55f7-4d91-9274-66213b22f0e4" />


TradeRoom.ai runs on two asynchronous tracks.

### 1) Data Firehose (Ingestion)

A lightweight poller service (Node.js or Python) fetches high-frequency market data from providers such as Binance or Alpaca and writes ticker/indicator updates into SpaceTimeDB.

### 2) Swarm Cycle (Reasoning)

Scheduled Rust procedures wake agents in sequence. They read the freshest state, retrieve relevant memories, debate the action, and write the final decision.

```text
[ Live Market APIs ] -> [ Data Poller ] -> [ SpaceTimeDB: Live State ]
                                            | 
                                            | (fast synchronized reads)
                                            v
                  [ Mem0 Memory ] <-> [ AI Swarm: Quant -> PM -> CRO ]
                                            |
                                            v
                              [ Execution Decision + Action Plan ]
                                            |
                                            v
                                 [ React Dashboard and Audit UI ]
```

## Why We Use This Tech Stack

TradeRoom.ai is not a normal web app. It is a real-time decision system where data freshness and timing matter.

### Rust + SpaceTimeDB (Core Engine)

- Rust runs the orchestration logic safely and predictably.
- SpaceTimeDB keeps shared state in sync for all agents in real time.
- Together, they reduce stale reads and timing drift between decision steps.

### React + Vite (Live Dashboard)

- The frontend listens to backend table updates directly.
- Operators can see agent reasoning, risk flags, and final decisions as they happen.
- Vite keeps development fast while the UI remains lightweight.

### Gemini + Mem0 (Reasoning + Memory)

- Gemini handles role-based reasoning for each agent.
- Mem0 stores useful lessons from earlier trades and incidents.
- This helps the system avoid repeating known mistakes.

In many generic MERN-style setups, a similar flow can become slow or inconsistent because of extra service hops and delayed state updates.

## How Gemini Is Used in TradeRoom.ai

Gemini is not treated as a single "magic brain." It is used in role-specific calls.

1. Different role prompts per agent

- Quant prompt focuses on signal interpretation.
- Portfolio Manager prompt focuses on plan quality and sizing.
- CRO prompt focuses on risk, conflicts, and veto decisions.

2. Structured outputs

Each Gemini response is parsed into structured fields such as:

- thesis,
- confidence,
- risk flags,
- approve or veto recommendation.

3. Decision support, not blind execution

- Gemini outputs go through risk gating before execution.
- No order is sent only because one model sounded confident.
- The final action is based on agent agreement plus CRO approval.

## How Multiple AI Agents Are Implemented

The multi-agent system is implemented as a sequential swarm cycle on top of shared database state.

### Implementation Flow

1. Read latest state

- Agent reads live tables (market, context, messages).

2. Pull relevant memory

- Agent asks Mem0 for similar past situations.

3. Run Gemini call with role prompt

- Agent generates a structured reasoning output.

4. Write back to shared state

- Output is saved to reasoning and decision tables.
- A message is passed to the next agent.

5. CRO final gate

- CRO can veto the plan.
- Only approved plans move to execution.

### Agents in TradeRoom.ai

1. Quant Agent

- Understands live data and sentiment.
- Produces a market thesis.

2. Portfolio Manager Agent

- Converts thesis into action (entry, size, intent).
- Balances opportunity versus exposure.

3. Chief Risk Officer (CRO) Agent

- Challenges logic and checks risk thresholds.
- Has final veto power.

## Single Agent vs Multi-Agent (Why Debate Matters)

| Scenario                    | Single Agent LLM                                            | TradeRoom.ai Multi-Agent Swarm                                  |
| --------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| Mixed signal input          | One model tries to do everything at once and can lose focus | Clear role split: Quant reads signals, PM plans, CRO challenges |
| Contradictory evidence      | Often averages conflict into weak decisions                 | CRO explicitly flags conflicts and can veto                     |
| Learning from past mistakes | Memory is often short-lived per call                        | Mem0 recall brings similar past failures into current decision  |
| Risk discipline             | Can over-trade when confidence is overestimated             | Final risk gate blocks unsafe execution                         |

Bottom line: the swarm approach reduces hallucinated or emotionally biased trades by forcing every idea through a skeptical risk gate.

## Core Components

- Backend Orchestration: Rust + SpaceTimeDB
- AI Reasoning: Google Gemini API
- Persistent Memory: Mem0 API
- Frontend Dashboard: React + Vite
- Live Data Ingestion: Node.js or Python micro service

## What the Dashboard Shows

- current agent status,
- live reasoning stream,
- message passing between agents,
- conflict flags and risk veto events,
- final execution recommendation,
- session memory and long-term memory view.

## Final Note

TradeRoom.ai is designed as a professional decision-support and orchestration system for trading teams, not as an unchecked auto-trader. The core philosophy is simple: move fast, but never bypass risk.

## Disclaimer

TradeRoom.ai is not financial advice and does not guarantee returns. Use only with proper governance, legal review, and qualified human oversight.
