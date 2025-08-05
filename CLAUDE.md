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
- `npm run test` - Run tests with Vitest (watch mode)
- `npm run test:run` - Run tests once (CI mode)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with UI interface
- **TypeScript checking**: Always run `npm run check` before commits
- **Test locations**: Tests can be placed in `tests/`, or alongside source files with `.test.ts` suffix

## Architecture Overview

### Monorepo Structure
```
├── client/          # React frontend (Vite)
├── server/          # Express.js backend
├── shared/          # Shared TypeScript types and game logic
└── docs/            # Documentation and guides
```

### Game Architecture

The project uses a sophisticated game system that supports four categories of games through a hierarchical type system:

#### 1. Round-Based Games (`BaseGameHandler`)
- **Examples**: Number guessing, odd-even
- **Pattern**: Multiple rounds, score-based, simultaneous player choices
- **State**: `RoundBasedGameState` with rounds, scores, and choice tracking
- **Base Class**: `BaseGameHandler<TState, TMessage, TChoice, TRound>`

#### 2. Turn-Based Games (`BaseTurnGameHandler`) 
- **Examples**: Bluff card game
- **Pattern**: Sequential turns, game history, move validation
- **State**: `TurnBasedGameState` with current player and move history
- **Base Class**: `BaseTurnGameHandler<TState, TMove>`

#### 3. Board Games (`BaseBoardGameHandler`)
- **Examples**: Tic-tac-toe, chess
- **Pattern**: Grid-based board, position-based moves, win conditions
- **State**: `BoardGameState` with board state and position tracking
- **Base Class**: `BaseBoardGameHandler<TState, TMove>`

#### 4. Real-time Games (Future)
- **Examples**: Real-time strategy, action games
- **Pattern**: Continuous interaction, time-based mechanics
- **State**: `RealTimeGameState` (planned)

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

Type System Hierarchy:
├── CoreGameState (base)
│   ├── RoundBasedGameState (extends CoreGameState)
│   └── TurnBasedGameState (extends CoreGameState)
│       └── BoardGameState (extends TurnBasedGameState)
```

#### Real-time Communication
- WebSocket server integrated with Express
- Room-based message broadcasting
- Game state synchronization across clients
- Player connection/disconnection handling

### Adding New Games

The system supports automatic game generation through templates. Follow this pattern:

#### Option 1: AI-Assisted Generation (Recommended)
Use the `GameGenerator` system documented in `docs/AI_GAME_DEVELOPMENT_ARCHITECTURE_GUIDE.md`:
1. **Determine Category**: Choose round-based, turn-based, or board-game
2. **Use GameGenerator**: Automatically generates schema, handler, and component
3. **Customize Logic**: Implement game-specific rules in generated files
4. **Register**: Add to both server and client registries

#### Option 2: Manual Implementation
1. **Schema**: Create `shared/games/{game-name}/schema.ts` with game state, choices, and config
2. **Handler**: Implement server logic in `server/games/{game-name}/handler.ts` extending appropriate base class
3. **UI**: Build React component in `client/src/components/game-play/{game-name}/`
4. **Registration**: Add to game registry (`server/games/game-registry.ts`) and manager (`client/src/lib/game-manager.ts`)
5. **Modal Update**: Add game option to CreateRoomModal in `client/src/components/create-room-modal.tsx`

#### Key Requirements
- All games MUST extend the appropriate base handler (`BaseGameHandler`, `BaseTurnGameHandler`, or `BaseBoardGameHandler`)
- Game state MUST extend the corresponding state interface (`RoundBasedGameState`, `TurnBasedGameState`, or `BoardGameState`)
- Both server and client registration is required for the game to function
- CreateRoomModal must be updated to include the new game option for lobby integration
- **✅ Connection management**: All base handlers now provide automatic connection management - no manual implementation needed

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

#### Core Type System
- **Game Types**: `shared/games/base/game-types.ts` - Core type definitions and interfaces
- **Game Interfaces**: `shared/games/base/game-interfaces.ts` - Handler interface definitions
- **Message Types**: `shared/games/base/message-types.ts` - WebSocket message system

#### Base Handler Classes
- **Round-Based**: `shared/games/base/base-game-handler.ts` - Base for round-based games
- **Turn-Based**: `shared/games/base/turn-based-game-handler.ts` - Base for turn-based games
- **Board Games**: `shared/games/base/board-game-handler.ts` - Base for board games

#### Game Factory & Generation
- **Game Factory**: `shared/games/base/game-factory.ts` - Game registration and handler creation
- **Game Generator**: `shared/games/base/game-generator.ts` - Automatic code generation system

#### Server Components
- **Main Routes**: `server/routes.ts` - API endpoints and WebSocket handling  
- **Game Registry**: `server/games/game-registry.ts` - Server-side game registration

#### Client Components
- **Game Play**: `client/src/pages/game-play.tsx` - Dynamic game component rendering
- **Game Manager**: `client/src/lib/game-manager.ts` - Client-side game metadata management
- **WebSocket Hook**: `client/src/hooks/use-websocket.tsx` - Real-time communication

### Development Notes

- **TypeScript paths**: `@/*` for client, `@shared/*` for shared code
- **Game registration**: All games must be registered in both server registry and client manager
- **Type safety**: Game state is strongly typed per game category using generics
- **Message system**: WebSocket messages follow typed pattern with `MessageBuilder` for consistency
- **UI patterns**: Components follow consistent props pattern via `BaseGameProps` and category-specific interfaces
- **Base class usage**: Always extend appropriate base handler class - NEVER implement handlers from scratch
- **Connection management**: All base handlers (`BaseGameHandler`, `BaseTurnGameHandler`, `BaseBoardGameHandler`) provide automatic connection management with disconnect/reconnect handling

### Game Category Selection Guide

When creating new games, choose the appropriate category:
- **Round-based**: Players make simultaneous choices, multiple rounds, score-based (e.g., trivia, guessing games)
- **Turn-based**: Players take sequential turns, move history tracking (e.g., card games, strategy games)
- **Board-game**: Grid-based board with position-based moves (e.g., chess, tic-tac-toe, checkers)

### Recent Architecture Improvements

The codebase was extensively refactored in 2025 (see `REFACTORING_SUMMARY.md`) to support complex games beyond simple round-based ones. Key improvements:

- **Hierarchical type system**: `CoreGameState` → `TurnBasedGameState` → `BoardGameState`
- **Category-specific base classes**: Each game type has specialized base handler with relevant methods
- **Automatic code generation**: `GameGenerator` system creates boilerplate code from templates
- **Enhanced message system**: Type-safe WebSocket messages with validation
- **AI-assisted development**: Comprehensive guides in `docs/AI_GAME_DEVELOPMENT_ARCHITECTURE_GUIDE.md`