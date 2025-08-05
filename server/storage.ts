import { type User, type InsertUser, type Room, type InsertRoom, type RoomPlayer, type InsertRoomPlayer, type RoomWithPlayers, type ServerStats, type GameState, type GameType } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByNickname(nickname: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Rooms
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  getRoomWithPlayers(id: string): Promise<RoomWithPlayers | undefined>;
  getAllRoomsWithPlayers(): Promise<RoomWithPlayers[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<void>;

  // Room Players
  addPlayerToRoom(roomPlayer: InsertRoomPlayer): Promise<RoomPlayer>;
  removePlayerFromRoom(roomId: string, userId: string): Promise<void>;
  updatePlayerReady(roomId: string, userId: string, isReady: boolean): Promise<void>;
  getRoomPlayers(roomId: string): Promise<(RoomPlayer & { user: User })[]>;

  // Stats
  getServerStats(): Promise<ServerStats>;

  // Games - Note: createGame is now handled by individual game handlers
  // createGame(roomId: string, playerIds: string[], gameType?: string): Promise<GameState>;
  getGame(roomId: string): Promise<any>;
  updateGame(roomId: string, updates: any): Promise<any>;
  deleteGame(roomId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rooms: Map<string, Room>;
  private roomPlayers: Map<string, RoomPlayer>;
  private roomCodes: Set<string>;
  private games: Map<string, any>;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.roomPlayers = new Map();
    this.roomCodes = new Set();
    this.games = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByNickname(nickname: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.nickname === nickname);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      isGuest: insertUser.isGuest ?? true
    };
    this.users.set(id, user);
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
    // Clean up room players
    for (const [playerId, player] of Array.from(this.roomPlayers.entries())) {
      if (player.userId === id) {
        this.roomPlayers.delete(playerId);
      }
    }
  }

  // Rooms
  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(room => room.code === code);
  }

  async getRoomWithPlayers(id: string): Promise<RoomWithPlayers | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;

    const players = await this.getRoomPlayers(id);
    return {
      ...room,
      players,
      currentPlayers: players.length,
    };
  }

  async getAllRoomsWithPlayers(): Promise<RoomWithPlayers[]> {
    const rooms: RoomWithPlayers[] = [];
    for (const room of Array.from(this.rooms.values())) {
      const players = await this.getRoomPlayers(room.id);
      rooms.push({
        ...room,
        players,
        currentPlayers: players.length,
      });
    }
    return rooms.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = randomUUID();
    const code = this.generateRoomCode();
    const room: Room = {
      ...insertRoom,
      id,
      code,
      description: insertRoom.description ?? null,
      isPrivate: insertRoom.isPrivate ?? false,
      maxPlayers: insertRoom.maxPlayers ?? 6,
      status: insertRoom.status ?? "waiting",
      gameType: insertRoom.gameType ?? "number-guessing",
      createdAt: new Date(),
    };
    this.rooms.set(id, room);
    this.roomCodes.add(code);
    return room;
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;

    const updatedRoom = { ...room, ...updates };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async deleteRoom(id: string): Promise<void> {
    const room = this.rooms.get(id);
    if (room) {
      this.roomCodes.delete(room.code);
      this.rooms.delete(id);
      // Clean up room players
      for (const [playerId, player] of Array.from(this.roomPlayers.entries())) {
        if (player.roomId === id) {
          this.roomPlayers.delete(playerId);
        }
      }
    }
  }

  // Room Players
  async addPlayerToRoom(insertRoomPlayer: InsertRoomPlayer): Promise<RoomPlayer> {
    const id = randomUUID();
    const roomPlayer: RoomPlayer = {
      ...insertRoomPlayer,
      id,
      isReady: insertRoomPlayer.isReady ?? false,
      joinedAt: new Date(),
    };
    this.roomPlayers.set(id, roomPlayer);
    return roomPlayer;
  }

  async removePlayerFromRoom(roomId: string, userId: string): Promise<void> {
    for (const [playerId, player] of Array.from(this.roomPlayers.entries())) {
      if (player.roomId === roomId && player.userId === userId) {
        this.roomPlayers.delete(playerId);
        break;
      }
    }
  }

  async updatePlayerReady(roomId: string, userId: string, isReady: boolean): Promise<void> {
    for (const [playerId, player] of Array.from(this.roomPlayers.entries())) {
      if (player.roomId === roomId && player.userId === userId) {
        this.roomPlayers.set(playerId, { ...player, isReady });
        break;
      }
    }
  }

  async getRoomPlayers(roomId: string): Promise<(RoomPlayer & { user: User })[]> {
    const players: (RoomPlayer & { user: User })[] = [];
    
    for (const player of Array.from(this.roomPlayers.values())) {
      if (player.roomId === roomId) {
        const user = this.users.get(player.userId);
        if (user) {
          players.push({ ...player, user });
        }
      }
    }
    return players.sort((a, b) => new Date(a.joinedAt!).getTime() - new Date(b.joinedAt!).getTime());
  }

  async getServerStats(): Promise<ServerStats> {
    const totalPlayers = this.users.size;
    const activeRooms = this.rooms.size;
    const gamesInProgress = Array.from(this.rooms.values()).filter(room => room.status === 'playing').length;

    return {
      totalPlayers,
      activeRooms,
      gamesInProgress,
    };
  }

  // Games
  // createGame is now handled by individual game handlers
  // The storage just stores the game state

  async getGame(roomId: string): Promise<any> {
    console.log('Looking for game with roomId:', roomId);
    console.log('Available games:', Array.from(this.games.keys()));
    const game = this.games.get(roomId);
    console.log('Found game:', !!game);
    return game;
  }

  async updateGame(roomId: string, updates: any): Promise<any> {
    console.log('Storing/updating game state for room:', roomId);
    console.log('Game state:', updates);
    
    const game = this.games.get(roomId);
    
    if (!game) {
      // 새 게임 생성
      console.log('Creating new game state');
      this.games.set(roomId, updates);
      console.log('Game successfully stored. Current games:', Array.from(this.games.keys()));
      return updates;
    }

    // 기존 게임 업데이트
    console.log('Updating existing game state');
    const updatedGame = { ...game, ...updates };
    this.games.set(roomId, updatedGame);
    console.log('Game successfully updated. Current games:', Array.from(this.games.keys()));
    return updatedGame;
  }

  async deleteGame(roomId: string): Promise<void> {
    this.games.delete(roomId);
  }

  private generateRoomCode(): string {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.roomCodes.has(code));
    return code;
  }
}

export const storage = new MemStorage();
