# Decision Log

This document records the significant architectural and technical decisions made during the development of `SplitEase`.

## 1. Framework Choice: React 19 + Vite vs Next.js
**Decision:** We chose to build the frontend as a pure Single Page Application (SPA) using React 19 and Vite, explicitly deciding against a Server-Side Rendered (SSR) framework like Next.js.
**Options Considered:** Next.js (App Router), React + Vite.
**Why Chosen:** 
- `SplitEase` is a highly interactive application where the core experience relies on complex dashboard UI manipulation, heavy animations (Framer Motion), and client-side CSV parsing.
- Next.js SSR provides no tangible benefit for a logged-in dashboard app (SEO is irrelevant behind a login wall).
- Vite provides significantly faster local HMR (Hot Module Replacement) and compilation times, allowing for rapid iteration during the prototyping phase.

## 2. Database Evolution: SQLite to PostgreSQL
**Decision:** We transitioned the backend database from SQLite to PostgreSQL.
**Options Considered:** Staying with SQLite, moving to MongoDB, migrating to PostgreSQL.
**Why Chosen:**
- Initial prototyping was done using a local SQLite file (`database.sqlite`) because it required zero setup and allowed us to build out the API endpoints immediately.
- However, as the application grew to manage complex group finances, **referential data integrity** became paramount. SQLite allows for relaxed foreign-key constraints by default. During our data migration script, we discovered 82 orphaned expenses attached to deleted groups that SQLite had allowed.
- We migrated to PostgreSQL because it strictly enforces Foreign Keys, preventing database corruption, and it is the industry standard for deploying robust applications to cloud platforms (like Render or Heroku) where local SQLite files would be wiped on server restarts.

## 3. CSV Anomaly Handling Strategy
**Decision:** We chose a "Non-Blocking Import with Flagging" strategy over a "Strict Rejection" strategy.
**Options Considered:**
- **Strict Rejection:** If a CSV has errors, reject the whole file and make the user fix it.
- **Silent Correction:** The system automatically fixes errors (e.g. converting negative numbers) without telling the user.
- **Non-Blocking Flagging:** Ingest everything, fix what can be safely inferred, and present an "Anomaly Dashboard" to the user to review the changes.
**Why Chosen:**
- Financial data from bank exports is notoriously messy. Rejecting the file frustrates users.
- Silent correction is dangerous for financial applications where trust is critical.
- Flagging anomalies strikes the perfect balance: it allows the user to import their data immediately, but maintains absolute transparency by explicitly showing them an Audit Log/Import Report of exactly what the system modified.
