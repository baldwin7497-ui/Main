# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time multiplayer gaming platform built with React/TypeScript frontend, Express.js backend, and WebSocket-based real-time communication. The platform supports multiple game types including simple round-based games (number guessing, odd-even) and complex board games (tic-tac-toe, chess).

## Development Commands

### Build & Development
- `npm run dev` - Start development server (both client and server)
- `npm run build` - Build for production (client with Vite, server with esbuild)
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes with Drizzle

### Testing & Quality
No specific test or lint commands are configured. Use TypeScript checking with `npm run check`.

## Architecture Overview

### Monorepo Structure
```
├── client/          # React frontend (Vite)
├── server/          # Express.js backend
├── shared/          # Shared TypeScript types and game logic
└── docs/            # Documentation and guides
```

### Game Architecture

The project uses a sophisticated game system that supports three categories of games:

#### 1. Round-Based Games (`BaseGameHandler`)
- **Examples**: Number guessing, odd-even
- **Pattern**: Multiple rounds, score-based, simultaneous player choices
- **State**: `RoundBasedGameState` with rounds, scores, and choice tracking

#### 2. Turn-Based Games (`BaseTurnGameHandler`) 
- **Examples**: Bluff card game
- **Pattern**: Sequential turns, game history, move validation
- **State**: `TurnBasedGameState` with current player and move history

#### 3. Board Games (`BaseBoardGameHandler`)
- **Examples**: Tic-tac-toe, chess
- **Pattern**: Grid-based board, position-based moves, win conditions
- **State**: `BoardGameState` with board state and position tracking

### Key Components

#### Game Factory Pattern
- `shared/games/base/game-factory.ts` - Central game registration and handler creation
- `server/games/game-registry.ts` - Server-side game registration
- `client/src/lib/game-manager.ts` - Client-side game metadata management

#### Game Handler Hierarchy
```
CoreGameHandlers (base interface)
├── RoundGameHandlers → BaseGameHandler
├── TurnGameHandlers → BaseTurnGameHandler  
└── BoardGameHandlers → BaseBoardGameHandler
```

#### Real-time Communication
- WebSocket server integrated with Express
- Room-based message broadcasting
- Game state synchronization across clients
- Player connection/disconnection handling

### Adding New Games

Follow the established pattern in `docs/GAME_DEVELOPMENT_GUIDE.md`:

1. **Schema**: Create `shared/games/{game-name}/schema.ts` with game state, choices, and config
2. **Handler**: Implement server logic in `server/games/{game-name}/handler.ts`
3. **UI**: Build React component in `client/src/components/game-play/{game-name}/`
4. **Registration**: Add to game registry, manager, and route handlers

### Database & Storage

- **ORM**: Drizzle with PostgreSQL (Neon serverless)
- **Current**: In-memory storage via `MemStorage` class
- **Schema**: Users, rooms, room players with proper relationships
- **Migrations**: Use `npm run db:push` for schema changes

### Frontend Stack

- **React 18** with TypeScript and Vite
- **UI Library**: Shadcn/ui components (Radix UI primitives)
- **Styling**: Tailwind CSS with custom gaming theme
- **State**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing

### Important File Locations

- **Game Types**: `shared/games/base/game-types.ts` - Core type system
- **Main Routes**: `server/routes.ts` - API endpoints and WebSocket handling  
- **Game Play**: `client/src/pages/game-play.tsx` - Dynamic game component rendering
- **WebSocket Hook**: `client/src/hooks/use-websocket.tsx` - Real-time communication

### Development Notes

- TypeScript paths configured: `@/*` for client, `@shared/*` for shared code
- All games must be registered in both server registry and client manager
- WebSocket messages follow typed pattern with game-specific message types
- Game state is strongly typed per game category (Round/Turn/Board)
- UI components follow consistent props pattern via `BaseGameProps`

### Refactoring History

The codebase was recently refactored (see `REFACTORING_SUMMARY.md`) to support complex games beyond simple round-based ones. The new architecture enables AI-assisted game creation for sophisticated games like chess and strategy games through the template system documented in `docs/AI_GAME_CREATION_GUIDE.md`.