# Red Tetris

A multiplayer Tetris implementation over WebSockets, freely based on 42's [Red Tetris Project](https://cdn.intra.42.fr/pdf/pdf/75142/en.subject.pdf).

Built with **Next.js 16**, **React 19**, **Socket.IO 4.8**, **TypeScript 5.8**, and **Tailwind CSS 3.4**.

## Features

- **Multiplayer** — Up to 4 players per room with host/guest roles
- **Real-time** — Socket.IO with session recovery and auto-reconnection (5 attempts, exponential backoff)
- **Canvas 2D rendering** — Lightweight game board using the native Canvas API
- **Responsive** — Mobile-first layout that stacks on small screens, side-by-side on desktop
- **Accessible** — Skip-to-content, ARIA landmarks, live regions, labeled controls
- **Chat** — Per-room real-time chat with message history

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Next.js + Socket.IO) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
server/          # Socket.IO server, game logic, stores
  index.ts       # Custom server (Next.js + Socket.IO + game loop)
  game.ts        # Game class (scoring, line clearing, piece management)
  game-handler.ts # Socket event handler (room join, start, moves)
  gameloop.ts    # Game loop tick functions
  piece.ts       # Tetrimino class (movement, rotation, collision)
  player.ts      # Player class
  points.ts      # Piece rotation point tables
  stores/        # In-memory session, message, game stores
shared/          # Code shared between client and server
  types.ts       # TypeScript types (PlayerState, PlayState, RoomPlayer, etc.)
  config.ts      # Constants (MAX_PLAYERS=4, FRAMERATE=15, board dimensions)
  socket-events.ts # Typed Socket.IO event interfaces
  stack.ts       # Stack/piece factory functions
hooks/           # React hooks
  use-listeners.ts       # Socket event listeners for game state
  use-connection-status.ts # Connection state tracking
components/      # React components
  game-client.tsx   # Canvas game board + keyboard controls
  lobby.tsx         # Room lobby (player list, ready/start)
  chat.tsx          # Real-time chat
  welcome.tsx       # Landing page / room join form
  connection-overlay.tsx # Connection status modal
  error-boundary.tsx # React error boundary
  footer.tsx
utils/           # Client-only utilities
  draw.ts        # Canvas 2D drawing functions
pages/           # Next.js pages
  index.tsx      # Main page (routing, state, layout)
  _app.tsx       # App wrapper (SocketContext, ErrorBoundary)
context/         # React context
  socket.ts      # Socket.IO client singleton
__tests__/       # Vitest tests (49 tests)
```

## Deployment

Docker-based deployment (Coolify, Fly.io, etc.):

```bash
docker build -t red-tetris .
docker run -p 3000:3000 red-tetris
```

Set `NEXT_PUBLIC_SOCKET_URL` via environment variable if the socket server URL differs from the app URL.

## CI

GitHub Actions runs lint, type check, tests, and build on every push to `main` and all PRs.