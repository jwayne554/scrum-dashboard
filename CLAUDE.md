# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Scrum Dashboard PRD & Technical Design (Linear Integration)

Last updated: 2025-08-09 · Owner: You (Scrum Master) · Status: Draft → Build-ready

⸻

0) Scope, Goals, Non-Goals

In scope
	•	Local dashboard for a single Linear workspace using the Linear TypeScript SDK and GraphQL API.
	•	Manual refresh button to pull latest data on demand (no background sync).
	•	Sprint context = Linear “Cycle”. Detect active cycle, compute sprint metrics, and persist a snapshot when a cycle ends; then roll to next cycle automatically on the next refresh.
	•	Visuals (from earlier mock): Sprint health KPIs, Burndown, Bug inflow/outflow + MTTR, Cumulative Flow Diagram (CFD), Work Item Age, Activity feed, Blockers.

Non-goals (for v1)
	•	Multi-tenant (multiple Linear orgs).
	•	Real-time streaming or push updates (webhooks are optional add-on).
	•	Cross-team portfolio analytics; only the chosen team’s cycle.

Success criteria
	•	Refresh completes < 4s with default-sized sprints.
	•	No lost data at cycle boundaries (snapshot saved once cycle closes).
	•	Metrics match Linear UI within rounding error.

⸻

1) Users & Use-cases
	•	Scrum Master / PM: prep daily standup, mid-sprint check, end-sprint review.
	•	Lead Dev: spot blockers, WIP aging, throughput trends.
	•	QA Lead: defect inflow/outflow, MTTR, carry-over analysis.

Top jobs-to-be-done
	•	“Show me current sprint plan vs progress.”
	•	“How many bugs came in, how fast did we resolve them?”
	•	“Where is scope churn happening?”
	•	“What rolled over, and why?”

⸻

2) Product Requirements

2.1 Core screens
	•	Header filters: Team selector (one team), Cycle selector (defaults to active).
	•	KPIs: Cycle Success %, 3-sprint Velocity (points), Planning Accuracy %, Scope Change %.
	•	Charts:
	•	Burndown (ideal vs actual; show added/removed scope markers).
	•	Bug inflow/outflow (stacked bars per day) + MTTR line.
	•	CFD (To-do/In-Progress/Done area over time).
	•	Tables:
	•	Work Item Age (sorted by oldest active).
	•	Top blockers (issues with blocked label/state, or long in-progress).
	•	Activity feed (last 24h issue events).
	•	Refresh button: pulls latest and re-computes metrics.
	•	Snapshot behavior: when active cycle is detected as completed, save snapshot and advance context.

2.2 Definitions (authoritative)
	•	Cycle success: “completed issues fully + 25% credit for started issues” / total scope. Linear exposes a progress measure and describes success similarly in docs (completed = 100%, started = 25%).  ￼
	•	Velocity: sum of completed estimates per cycle; rolling average over last 3 completed cycles (exclude current).
	•	Planning accuracy: completed scope / (initially committed scope at cycle start). We derive “initial scope” from Day-0 value of scope history.
	•	Scope change: (final scope – initial scope) / initial scope, using scopeHistory.  ￼
	•	Bug: issues labeled “Bug” (configurable label set). Label filtering is supported by Linear’s GraphQL filters.  ￼
	•	MTTR (bugs): avg(completedAt – createdAt) for bug issues resolved within cycle (or closed during cycle). completedAt exists on issues.  ￼

⸻

3) Technical Architecture

3.1 High-level
	•	Frontend: React (Vite), Recharts / ECharts, Tailwind. Calls backend /api/*.
	•	Backend: Node.js (TypeScript), @linear/sdk for GraphQL; Express/Fastify; Zod for I/O typing.
	•	Persistence: SQLite (via Prisma) for snapshots & caches.
	•	Config: .env with LINEAR_API_KEY.
	•	Time: store UTC; render user local (Paris).

3.2 Linear connectivity
	•	Use @linear/sdk and a personal API key for single-workspace local app (SDK quickstart shows new LinearClient({ apiKey })).  ￼
	•	API constraints:
	•	Cursor pagination (first/after), default page size 50; nodes helper available.  ￼
	•	Rate limit (API key): 1,500 req/hour and complexity budget headers; avoid polling and fetch only needed fields.  ￼
	•	Optional webhooks (for future auto-refresh): HTTPS endpoint, HMAC verification; events include Cycles, Issues, etc.  ￼

⸻

4) Data Model (local DB)

Minimal schema to compute metrics fast and keep immutable snapshots.

4.1 Tables
	•	teams(id, key, name)
	•	cycles(id, teamId, number, name, startsAt, endsAt, completedAt, progress, initialScope, finalScope)
	•	cycle_histories(cycleId, dayIndex, date, issueCount, completedIssueCount, scope, completedScope, inProgressScope)
	•	issues(id, teamId, identifier, title, estimate, priority, stateId, stateType, startedAt, completedAt, canceledAt, createdAt, updatedAt, cycleId)
	•	issue_labels(issueId, label)  // denormalized label names
	•	snapshots(cycleId, json) // frozen snapshot blob at cycle end for quick replay

stateType aligns to Linear workflow types (e.g., unstarted/started/completed/canceled) used for CFD bins.

⸻

5) Backend API Design

5.1 Endpoints
	•	POST /api/refresh?teamId=
Pulls active cycle + issues; updates caches; detects cycle transition; if closed → writes snapshot.
	•	GET /api/cycles/:cycleId/metrics
Returns computed KPIs and series for the UI.
	•	GET /api/cycles?teamId=
Lists recent cycles (active + last N completed) for selector.

5.2 Refresh flow (pseudocode)
const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

// 1) Resolve team & active cycle
const team = await client.team(teamId);
const activeCycle = await team.activeCycle; // Team.activeCycle supported in schema
// if null (cycles disabled), 422 to client.

const prevActiveId = cache.get('activeCycleId');
if (prevActiveId && prevActiveId !== activeCycle?.id) {
  // previous cycle ended; persist snapshot that we had stored from last fetch tick
  await db.insert('snapshots', { cycleId: prevActiveId, json: lastComputedSnapshotJSON });
}

// 2) Pull cycle fields + histories
// Use raw GraphQL or SDK fields; fetch only needed fields to manage complexity.

6) Linear GraphQL: Queries & Fields

These examples use raw GraphQL for clarity; in code, you can use either raw GraphQL via linearClient.client.rawRequest or the typed SDK methods. The SDK and docs recommend custom, specific queries to reduce complexity.  ￼

6.1 Resolve team & active cycle
	•	Team.activeCycle gives the currently running cycle. (Field exists on Team.)  ￼
    query TeamActiveCycle($teamId: String!) {
  team(id: $teamId) {
    id
    name
    activeCycle {
      id
      number
      name
      startsAt
      endsAt
      completedAt
      progress
      issueCountHistory
      completedIssueCountHistory
      scopeHistory
      completedScopeHistory
      inProgressScopeHistory
    }
  }
}
Cycle fields issueCountHistory, completedIssueCountHistory, scopeHistory, completedScopeHistory, inProgressScopeHistory, progress, uncompletedIssuesUponClose are present in the public schema (see generated clients).  ￼

6.2 Fetch issues in a cycle (with pagination & filters)
query CycleIssues($teamId: String!, $cycleId: String!, $after: String) {
  team(id: $teamId) {
    id
    issues(
      after: $after
      first: 50
      filter: { cycle: { id: { eq: $cycleId } } }
      orderBy: updatedAt
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        identifier
        title
        estimate
        priority
        createdAt
        updatedAt
        startedAt
        completedAt
        canceledAt
        labels { nodes { name } }
        state { id name type }  # type: unstarted/started/completed/canceled
        cycle { id }
        assignee { id name }
      }
    }
  }
}
	•	startedAt/completedAt are available on Issue (and in filter comparators).  ￼ ￼
	•	Label filtering is supported (e.g., { labels: { name: { eq: "Bug" } } }).  ￼
	•	Use cursor pagination (pageInfo.endCursor, hasNextPage).  ￼

6.3 Optional: list recent cycles for selector
query TeamRecentCycles($teamId: String!) {
  team(id: $teamId) {
    id
    cycles(first: 10, filter: { isPast: { eq: true } }) {
      nodes { id number name startsAt endsAt completedAt progress }
    }
    activeCycle { id number name }
  }
}
Cycle filters like isPast, isActive, isNext exist.  ￼

6.4 SDK snippets (typed)
import { LinearClient } from "@linear/sdk";
const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY }); // SDK getting started
const team = await linear.team(teamId);
const active = await team.activeCycle; // typed relation
// Raw GraphQL when you need custom selection:
const { data } = await linear.client.rawRequest(`query($id:String!){ cycle(id:$id){ id name } }`, { id: active?.id });
7) Metric Computation

Keep formulas deterministic and reproducible. When Linear provides the ground truth (e.g., cycle histories), use them.

7.1 Burndown
	•	Remaining scope per day = scopeHistory[day] - completedScopeHistory[day] (or by issues count if your team doesn’t use estimates).
	•	Ideal line = linear interpolation from initial remaining to 0 across business days (flatten on weekends if you want to mirror Linear UI).
	•	Scope change markers where scopeHistory increases/decreases.
Cycle histories are provided daily by Linear.  ￼

7.2 Velocity (early-stage team friendly)
	•	Per cycle: sum completed estimate for issues with completedAt inside cycle range.
	•	Rolling velocity: average of last 3 completed cycles; include 0 if no estimates used that cycle to avoid survivorship bias.

7.3 Planning accuracy
	•	initialScope = scopeHistory[0]
	•	completedScopeFinal = last value of completedScopeHistory
	•	Accuracy = completedScopeFinal / initialScope

7.4 Scope change
	•	(finalScope - initialScope) / initialScope using scopeHistory.  ￼

7.5 Bug inflow/outflow + MTTR
	•	Inflow: count of new bug issues (createdAt) per day in cycle.
	•	Outflow: count of bug issues with completedAt per day.
	•	MTTR: average (completedAt - createdAt) for bug issues resolved in the cycle.

7.6 CFD
	•	For each day of the cycle: count issues by state.type (unstarted/started/completed/canceled). Stack areas to visualize flow.

7.7 Work item age
	•	For each active issue (not completed/canceled): now - (startedAt || createdAt). Sort desc.

7.8 Carryover
	•	Use uncompletedIssuesUponClose to list rolled items and compare to next cycle.  ￼

⸻

8) Snapshotting (end-of-cycle)

Trigger: On refresh, if previously tracked activeCycleId ≠ current activeCycle?.id or if current cycle’s completedAt is set, finalize snapshot for the previous cycle.

Snapshot content:
	•	cycles row (final scope, progress).
	•	cycle_histories (entire arrays).
	•	Final KPIs (velocity, accuracy, scope change, MTTR).
	•	uncompletedIssuesUponClose (ids and metadata).

Historical cycles remain queryable via GraphQL if ever needed; snapshot is for fast local reporting & immutability. Cycle fields include completedAt and uncompletedIssuesUponClose.  ￼

⸻

9) Implementation Plan

9.1 Project structure
/app
  /client   (React UI)
  /server   (Node/TS)
  /prisma   (schema + migrations)
.env
9.2 Server (Node/TS)
	•	Dependencies: @linear/sdk, express/fastify, zod, prisma, dotenv, pino.
	•	Config: LINEAR_API_KEY in .env. (Personal API keys work; SDK supports both API key & OAuth.)  ￼
	•	Linear client:
    const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
    	•	Rate/complexity safety:
	•	Use field-minimal queries; use orderBy: updatedAt; page through with first + after.  ￼
	•	Respect headers: X-RateLimit-Requests-Remaining, X-Complexity (retry/backoff if low).  ￼
	•	Don’t poll; manual refresh only (as v1).  ￼

9.3 Client (React)
	•	Views: KPIs, Burndown, Bugs+MTTR, CFD, Ageing, Blockers, Activity.
	•	Refresh button → POST /api/refresh?teamId=..., then GET metrics endpoints.
	•	Charting: Recharts or ECharts; memoize data transforms.

9.4 Optional webhooks (v1.1)
	•	Add HTTPS endpoint and secret verification (Linear-Signature HMAC). Use resourceTypes: ["Cycle","Issue"].  ￼

⸻

10) Data Processing Algorithms

10.1 Fetch & assemble
	1.	team.activeCycle → cycle metadata & histories.  ￼
	2.	Page through team.issues(filter: { cycle: { id: { eq: cycleId }}}); extract labels, state.type, timestamps.
	3.	Build daily buckets by createdAt, startedAt, completedAt for CFD & bug charts.

10.2 KPI math (pseudo)
Cycle progress/success definition and histories documented by Linear.  ￼ ￼

⸻

11) Security & Secrets
	•	Keep API key in .env, never commit. SDK requires apiKey header under the hood.  ￼
	•	If you add webhooks, verify signatures and check webhookTimestamp.  ￼

⸻

12) Performance & Limits
	•	Batching/pagination (50 default) with hasNextPage/endCursor.  ￼
	•	Keep GraphQL selections lean to manage complexity limit and stay under 10k per query; per-hour complexity budget applies.  ￼
	•	Cache derived series in DB per cycle to avoid recompute on every render.

⸻

13) Testing

13.1 Unit
	•	Metric calculators with fixed fixtures (JSON snapshots).
	•	Date boundary cases (weekends, timezone, cycle rollover).

13.2 Integration
	•	Mock Linear GraphQL via recorded responses (nock / MSW).
	•	Live smoke (with a test team & dummy cycle) gated by env flag.

13.3 Acceptance
	•	Compare computed burndown & “cycle success” vs Linear UI for a known cycle (± rounding).

⸻

14) Migration & Evolution
	•	If team enables estimates later: charts switch from issue-count mode to estimate-based automatically when scopeHistory present.
	•	If later enabling auto-updates: plug webhooks to pre-warm caches; keep manual refresh.
	•	Multi-team future: add teamId columns across tables; namespace snapshots.

⸻

15) Developer How-To (Copy/Paste)

15.1 Install & configure

# server
npm i @linear/sdk express zod dotenv pino prisma sqlite3
# client
npm i react react-dom recharts
# init prisma
npx prisma init

.env
LINEAR_API_KEY=lin_api_********************************
TEAM_ID=<your-team-id>

15.2 Get your Team ID

Run this once:
query { teams { nodes { id name } } }

Use the chosen team’s id. (The SDK docs show simple viewer/teams queries.)  ￼

15.3 Minimal refresh route
app.post("/api/refresh", async (req, res) => {
  const teamId = req.query.teamId as string;
  const team = await linear.team(teamId);
  const cycle = await team.activeCycle;

  if (!cycle) return res.status(422).json({ error: "Cycles disabled" });

  // Fetch minimal cycle fields & histories (raw GraphQL for lean selection)
  const { data } = await linear.client.rawRequest(`
    query Q($id:String!){
      cycle(id:$id){
        id number name startsAt endsAt completedAt progress
        issueCountHistory completedIssueCountHistory scopeHistory completedScopeHistory inProgressScopeHistory
      }
    }`, { id: cycle.id });

  // Page issues (filter by cycle)
  // ... compute KPIs; persist caches; detect rollover; snapshot if needed
  return res.json({ ok: true });
});

	•	Raw GraphQL pattern per SDK “Advanced usage”.  ￼

⸻

16) Risks & Mitigations
	•	Rate limit/complexity spikes → reduce fields; fetch histories once per refresh; page issues by 100 (explicit) only when needed; watch headers.  ￼
	•	Label taxonomy drift (Bug label renamed) → configurable bug label list in .env or settings UI.
	•	Cycle disabled → clear error in UI with setup link (Team Settings → Cycles).  ￼
	•	Time math off by TZ → use UTC for storage; render local.

⸻

17) Appendix: Field Reference (key bits)
	•	Team
	•	activeCycle: team’s current cycle.  ￼
	•	Cycle
	•	id, number, name, startsAt, endsAt, completedAt
	•	Histories: issueCountHistory, completedIssueCountHistory, scopeHistory, completedScopeHistory, inProgressScopeHistory
	•	progress (completed + 25% of started, normalized)
	•	uncompletedIssuesUponClose (carryover)
(All present per generated schema/clients.)  ￼
	•	Issue
	•	estimate, labels{name}, state{type}, createdAt, startedAt, completedAt, canceledAt
(Timestamps and filters documented in schema references.)  ￼ ￼
	•	API mechanics
	•	Pagination (first/after, nodes/pageInfo).  ￼
	•	Rate/complexity limits; avoid polling; prefer targeted queries.  ￼
	•	Webhooks (optional)
	•	Models supported include Cycles and Issues; HMAC signature, retry behavior documented.  ￼

⸻

18) What the AI engineer should build, in order
	1.	Prisma schema + migrations for tables above.
	2.	Linear client wrapper (typed queries + raw GraphQL helper).
	3.	/api/refresh endpoint + cycle transition detection + snapshot write.
	4.	KPI calculators (unit tested) using cycle histories + issue set.
	5.	Metrics endpoints for current/selected cycle.
	6.	React UI wired to endpoints; charts and tables.
	7.	Polish: error states, empty states, bug label setting, timezone display.
	8.	(Optional) Webhook endpoint (verify signature), then a toggle in UI to auto-refresh when events arrive.