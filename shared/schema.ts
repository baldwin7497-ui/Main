import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nickname: text("nickname").notNull(),
  isGuest: boolean("is_guest").default(true),
});

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 6 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  hostId: varchar("host_id").notNull(),
  maxPlayers: integer("max_players").notNull().default(6),
  isPrivate: boolean("is_private").default(false),
  status: varchar("status").notNull().default("waiting"), // "waiting" | "playing"
  gameType: varchar("game_type").notNull().default("number-guessing"), // "number-guessing"
  createdAt: timestamp("created_at").defaultNow(),
});

export const roomPlayers = pgTable("room_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  userId: varchar("user_id").notNull(),
  isReady: boolean("is_ready").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  code: true,
  createdAt: true,
});

export const insertRoomPlayerSchema = createInsertSchema(roomPlayers).omit({
  id: true,
  joinedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

export type InsertRoomPlayer = z.infer<typeof insertRoomPlayerSchema>;
export type RoomPlayer = typeof roomPlayers.$inferSelect;

export interface RoomWithPlayers extends Room {
  players: (RoomPlayer & { user: User })[];
  currentPlayers: number;
}

export interface ServerStats {
  totalPlayers: number;
  activeRooms: number;
  gamesInProgress: number;
}

// Game types
export type GameType = 'number-guessing' | 'odd-even' | 'tic-tac-toe' | 'bluff-card' | 'chess';

// Import game-specific schemas
import type { NumberGuessGameState } from './games/number-guessing/schema';
import type { OddEvenGameState } from './games/odd-even/schema';
import type { TicTacToeGameState } from './games/tic-tac-toe/schema';
import type { BluffCardGameState } from './games/bluff-card/schema';
import type { ChessGameState } from './games/chess/schema';

// Union type for all game states
export type GameState = NumberGuessGameState | OddEvenGameState | TicTacToeGameState | BluffCardGameState | ChessGameState;

// Game configuration interface
export interface GameInfo {
  name: string;
  description: string;
}

export const GAME_INFO: Record<GameType, GameInfo> = {
  'number-guessing': {
    name: '숫자 맞추기',
    description: '1부터 5까지 숫자 중 하나를 맞춰보세요!'
  },
  'odd-even': {
    name: '홀짝 맞추기',
    description: '홀수 또는 짝수 중 하나를 맞춰보세요!'
  },
  'tic-tac-toe': {
    name: '틱택토',
    description: '3x3 보드에서 같은 기호 3개를 한 줄로 만드세요!'
  },
  'bluff-card': {
    name: '속였군요?',
    description: '카드를 내며 거짓말을 하거나 진실을 말하는 블러핑 게임!'
  },
  'chess': {
    name: '체스',
    description: '고전적인 체스 게임을 즐겨보세요!'
  }
};

// GameState is now defined above as a union type

// GameRound is now defined in each game's schema

export interface WebSocketMessage {
  type: 'room_update' | 'player_joined' | 'player_left' | 'player_ready' | 'game_start' | 'stats_update' | 'error' | 'game_state' | 'round_result' | 'game_end' | 'associate_user' | 'number_choice' | 'odd_even_choice' | 'tic_tac_toe_move' | 'bluff_card_play' | 'bluff_card_challenge' | 'chess_move';
  data?: any;
  roomId?: string;
  userId?: string;
}
