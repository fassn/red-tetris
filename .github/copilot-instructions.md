# Copilot Instructions — Red Tetris

## Project Overview

Multiplayer Tetris (up to 4 players) built with Next.js 16, React 19, Socket.IO 4.8, TypeScript 5.8, and Tailwind CSS 3.4. Uses the Pages Router (not App Router).

## Architecture

- **Custom server pattern**: `server/index.ts` creates an HTTP server, attaches the Next.js request handler and Socket.IO. The game loop runs via `setTimeout` recursion at `1000/TICK_RATE`.
- **Directory convention**: `server/` (server-only), `shared/` (both client+server), `hooks/` (React hooks), `utils/` (client-only), `components/`, `context/`, `pages/`.
- **State is in-memory**: `server/stores/` uses Maps. No database — state is ephemeral and lost on restart.
- **Socket.IO is fully typed**: Event interfaces in `shared/socket-events.ts` (client+server) and `server/io-types.ts` (server-only). Client socket created in `context/socket.ts` with `autoConnect: false`.

## Commands

- **Dev**: `npm run dev` (runs `tsx server/index.ts`)
- **Build**: `npm run build` (runs `next build`)
- **Start**: `npm start` (runs `NODE_ENV=production tsx server/index.ts`)
- **Lint**: `npm run lint` (runs `eslint .` — NOT `next lint`, which was removed in Next.js 16)
- **Test**: `npm test` (runs `vitest run`)
- **Type check**: `npx tsc --noEmit`

## Coding Conventions

- Use **interfaces** (not abstract classes) for store contracts.
- All socket event handlers must validate player state before acting (e.g., check `PlayState.PLAYING`).
- Every `useEffect` that registers socket listeners must clean up with `.off()` in the return function.
- Import socket directly from `context/socket.ts` (not via `useContext`) in files that mutate `socket.auth` — React 19's immutability rule forbids mutating context values.
- Canvas rendering uses the native Canvas 2D API — no external rendering libraries.
- Tailwind classes must be static strings (no dynamic interpolation like `` `h-[${value}px]` `` — Tailwind can't detect these at build time).

## Known Constraints

- **Node.js ≥ 20.9.0** required (Next.js 16 requirement).
- **ESLint 9** (not 10) — `eslint-plugin-react` bundled in `eslint-config-next` is incompatible with ESLint 10.
- `eslint-config-next@16` exports a native flat config array (no FlatCompat needed).
- Two pre-existing `react-hooks/exhaustive-deps` warnings in `chat.tsx` and `use-listeners.ts` — intentional (socket refs are stable singletons).
- Deployment target is Docker-based (Coolify), not serverless. `NEXT_PUBLIC_SOCKET_URL` is set via environment variable.

## Caveman

Terse like caveman. Technical substance exact. Only fluff die.
Drop: articles, filler (just/really/basically), pleasantries, hedging.
Fragments OK. Short synonyms. Code unchanged.
Pattern: [thing] [action] [reason]. [next step].
ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift.
Code/commits/PRs: normal. Off: "stop caveman" / "normal mode".

## Claude Model Interaction Instructions

### Rules for Claude models

1. **Use the ask_user tool (AskUserQuestion) for all user-facing questions.**
   - Never ask a question via plain-text output in the chat. The repository's UX requires using the ask_user tool so responses are captured and presented correctly.
   - Prefer multiple-choice options when possible to speed user responses; allow freeform only when necessary.

2. **Always ask about the next step before ending the request.**
   - Every response that would otherwise finish must instead end by asking what the user wants done next (for example: "What would you like me to do next?" or using ask_user with choices like: ["Start implementation (Recommended)", "Write tests", "Update docs", "Stop here"]).
   - Do not assume a next step; explicitly ask and wait for the user's selection.

3. **If follow-up clarification is required to proceed, ask one focused question at a time using ask_user.**

#### Example (pseudocode):

ask_user({
  "question": "Which task should I take next?",
  "choices": ["Start implementation (Recommended)", "Write tests", "Update docs", "Other"],
  "allow_freeform": true
});