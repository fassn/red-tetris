A multiplayer tetris implementation over websockets, freely based over 42'[s Red Tetris Project](https://cdn.intra.42.fr/pdf/pdf/75142/en.subject.pdf)
Built with NextJS, Prisma (PostgreSQL), TailwindCSS & Sockets.IO .

## Getting Started

- `npm i`
- copy .env.example to .env.local
- fill the missing credentials in .env.local

run the development server with NextJS or use the Firebase emulators:

```bash
npm run dev
# or
npm run fe
```

With NextJS development server:
Open [http://localhost:3000](http://localhost:3000).

## Deploy

Currently deployed on [fly.io](https://red-tetris.fly.dev).