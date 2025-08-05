# Gaming Platform - Replit.md

## Overview

This is a real-time multiplayer gaming platform built with a modern full-stack architecture. The application uses React for the frontend, Express.js for the backend, WebSockets for real-time communication, and PostgreSQL with Drizzle ORM for data persistence. The platform supports creating game rooms, joining games, and real-time player interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom gaming theme
- **State Management**: TanStack Query for server state, local state with React hooks
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Real-time Communication**: WebSocket server for live updates
- **API Design**: RESTful endpoints with WebSocket integration
- **Session Management**: In-memory storage with fallback for database integration

### Data Storage
- **Database**: PostgreSQL (configured via Drizzle)
- **ORM**: Drizzle ORM with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations
- **Current Implementation**: In-memory storage (MemStorage class) with database interface ready

## Key Components

### Database Schema
- **Users**: Player profiles with nickname and guest status
- **Rooms**: Game rooms with host, capacity, and privacy settings
- **Room Players**: Junction table linking users to rooms with ready status

### API Endpoints
- User management (create, retrieve users)
- Room operations (create, join, leave rooms)
- Server statistics and room listings

### WebSocket Events
- Real-time room updates
- Player join/leave notifications
- Ready status changes
- Connection management

### UI Components
- **Lobby**: Main interface for browsing and joining rooms
- **Waiting Room**: Pre-game lobby with player list and ready system
- **Modals**: Room creation and join interfaces
- **Gaming Theme**: Custom Tailwind configuration with gaming-specific colors

## Data Flow

1. **User Authentication**: Guest users auto-created on first visit, stored in localStorage
2. **Room Management**: RESTful API for CRUD operations, WebSocket for real-time updates
3. **Real-time Updates**: WebSocket connection maintains live synchronization across clients
4. **State Synchronization**: TanStack Query manages server state with automatic refetching

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **ws**: WebSocket implementation
- **zod**: Runtime type validation

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **react-hook-form**: Form management

## Deployment Strategy

### Development
- **Development Server**: Vite dev server with HMR
- **API Server**: Express with WebSocket on same port
- **Database**: Configured for Neon PostgreSQL
- **Build Process**: Separate client (Vite) and server (esbuild) builds

### Production Build
- **Client**: Static assets built with Vite to `dist/public`
- **Server**: Bundled with esbuild to `dist/index.js`
- **Environment**: Requires `DATABASE_URL` for PostgreSQL connection
- **Deployment**: Node.js server serving both API and static files

### Architecture Decisions

1. **Monorepo Structure**: Single repository with separate client/server/shared directories for code organization
2. **WebSocket + REST Hybrid**: REST for standard CRUD operations, WebSockets for real-time features
3. **In-Memory Fallback**: Current implementation uses memory storage with database interface ready for production
4. **Type Safety**: Shared TypeScript types between client and server via shared directory
5. **Modern Tooling**: Vite for fast development, Drizzle for type-safe database operations