# CircuitMind PCB Agent Studio

CircuitMind PCB Agent Studio is a presentation-ready workspace for agent-assisted PCB engineering. The current release translates natural-language requirements into structured design intent; the product shell also reserves a clear integration point for future routing, trace generation, and engineering-validation agents.

## What the demo includes

- Three anonymized scenarios covering BGA connection repair, PCIe constraint understanding, and routing trade-off judgment
- Structured target component, pin, net, constraint, and priority outputs
- A board-evidence visualization that highlights targets and risk regions without claiming to generate a physical route
- A local heuristic preview for custom text input
- Responsive desktop and mobile layouts

The displayed benchmark figures describe a fixed validation snapshot. They are not per-request confidence scores. Production model weights, credentials, endpoints, private board files, and routing-agent implementations are not included in this repository.

## Run locally

Requirements: Node.js 20 or later and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run build
```

## Current integration boundary

Validation scenarios replay anonymized, checked results. Edited or custom text is parsed by a transparent local preview so the interface remains demonstrable without a backend. Connect the production intent-model API at deployment time; do not commit its URL or credentials.

The Agent Routing tab is intentionally a placeholder. The evidence diagram marks relevant pads, nets, and risk areas, but it does not represent an automatically generated PCB trace.

## Repository safety

Environment files, build output, dependencies, certificates, and local agent test helpers are ignored by Git. Before publishing changes, review staged content with:

```bash
git diff --cached
git status --short
```
