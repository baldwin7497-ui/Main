import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertRoomSchema, type User, type WebSocketMessage, GAME_INFO } from "@shared/schema";
import type { NumberGuessChoice } from "@shared/games/number-guessing/schema";
import type { OddEvenChoice } from "@shared/games/odd-even/schema";
import type { TicTacToeChoiceMessage } from "@shared/games/tic-tac-toe/schema";
import type { ChessChoiceMessage } from "@shared/games/chess/schema";
import type { BluffCardPlayMessage, BluffCardChallengeMessage } from "@shared/games/bluff-card/schema";
import { registerAllGames, createGameHandler, getSupportedGameTypes } from "./games/game-registry";
import { z } from "zod";

interface ClientConnection {
  socket: WebSocket;
  userId?: string;
  roomId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<string, ClientConnection>();
  
  // 모든 게임을 팩토리에 등록
  registerAllGames();

  // Game handlers cache (팩토리로 생성된 핸들러들을 캐시)
  const gameHandlers = new Map<string, any>();

  // WebSocket connection handling
  wss.on('connection', (socket) => {
    const clientId = Math.random().toString(36).substring(2);
    clients.set(clientId, { socket });

    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        await handleWebSocketMessage(clientId, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
        sendToClient(clientId, { type: 'error', data: 'Invalid message format' });
      }
    });

    socket.on('close', async () => {
      const client = clients.get(clientId);
      if (client?.userId) {
        await handleUserDisconnect(client.userId);
      }
      clients.delete(clientId);
    });

    // Send initial stats
    sendServerStats();
  });

  async function handleWebSocketMessage(clientId: string, message: WebSocketMessage) {
    const client = clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'associate_user':
        if (message.data?.userId) {
          client.userId = message.data.userId;
          console.log(`Associated client ${clientId} with user ${message.data.userId}`);
          
          // 재연결 처리: 게임이 진행 중인 방에 있는지 확인
          const userRooms = await storage.getAllRoomsWithPlayers();
          for (const room of userRooms) {
            const player = room.players.find(p => p.userId === message.data.userId);
            if (player && room.status === 'playing') {
              // 게임 상태 확인
              const gameState = await storage.getGame(room.id);
              if (gameState && gameState.gameType) {
                // 연결 해제된 플레이어 목록에 있는지 확인
                const isDisconnected = gameState.disconnectedPlayers?.includes(message.data.userId);
                
                if (isDisconnected) {
                  console.log(`재연결 감지: ${message.data.userId}가 게임 중인 방 ${room.id}에 재연결`);
                  
                  // 클라이언트를 방과 연결
                  client.roomId = room.id;
                  
                  // 게임 핸들러에서 재연결 처리
                  const handler = getGameHandler(gameState.gameType);
                  if (handler && 'handlePlayerReconnect' in handler) {
                    await handler.handlePlayerReconnect(room.id, message.data.userId);
                  }
                  
                  // 방 업데이트 브로드캐스트
                  await broadcastRoomUpdate(room.id);
                } else {
                  console.log(`연결 유지: ${message.data.userId}가 이미 연결된 상태`);
                  // 클라이언트를 방과 연결만 하고 재연결 처리는 하지 않음
                  client.roomId = room.id;
                }
              }
              break;
            }
          }
        }
        break;
      case 'room_update':
        if (message.roomId) {
          // 클라이언트를 해당 방과 연결
          if (client.roomId !== message.roomId) {
            client.roomId = message.roomId;
            console.log(`Client ${clientId} joined room ${message.roomId}`);
          }
          await broadcastRoomUpdate(message.roomId);
        }
        break;

      case 'number_choice':
        if (message.roomId && message.userId && message.data?.number) {
          const choice: NumberGuessChoice = { type: 'number_choice', number: message.data.number };
          const handler = getGameHandler('number-guessing');
          await handler.handleChoice(message.roomId, message.userId, choice);
        }
        break;
      case 'odd_even_choice':
        if (message.roomId && message.userId && message.data?.choice) {
          const choice: OddEvenChoice = { type: 'odd_even_choice', choice: message.data.choice };
          const handler = getGameHandler('odd-even');
          await handler.handleChoice(message.roomId, message.userId, choice);
        }
        break;

      case 'tic_tac_toe_move':
        console.log('🎯 서버: tic_tac_toe_move 메시지 수신:', message);
        if (message.roomId && message.userId && message.data?.position) {
          try {
            const handler = getGameHandler('tic-tac-toe');
            console.log('🎮 서버: 틱택토 핸들러 존재:', !!handler, 'makeMove:', 'makeMove' in (handler || {}));
            if (handler && 'makeMove' in handler) {
              // 틱택토는 턴 기반 게임이므로 makeMove 사용
              const gameState = await handler.getGameState(message.roomId);
              console.log('🎯 서버: 틱택토 게임 상태:', { 
                gameExists: !!gameState, 
                currentPlayer: gameState?.currentPlayer,
                userId: message.userId,
                isCurrentPlayer: gameState?.currentPlayer === message.userId
              });
              if (gameState) {
                const playerSymbol = gameState.playerSymbols[message.userId];
                const move = {
                  position: message.data.position,
                  symbol: playerSymbol
                };
                console.log('🎯 서버: 틱택토 이동:', move);
                await handler.makeMove(message.roomId, message.userId, move);
                console.log('✅ 서버: 틱택토 이동 완료');
              }
            }
          } catch (error) {
            console.error('❌ 서버: Error handling tic-tac-toe move:', error);
          }
        } else {
          console.log('❌ 서버: tic_tac_toe_move 메시지 검증 실패:', {
            roomId: !!message.roomId,
            userId: !!message.userId,
            position: !!message.data?.position
          });
        }
        break;

      case 'bluff_card_play':
        if (message.roomId && message.userId && message.data?.cards) {
          try {
            const playMessage: BluffCardPlayMessage = {
              type: 'bluff_card_play',
              cards: message.data.cards,
              cardIndices: message.data.cardIndices,
              claimedNumber: message.data.claimedNumber,
              claimedCount: message.data.claimedCount,
              claimedTruth: message.data.claimedTruth,
              actualTruth: message.data.actualTruth
            };
            const handler = getGameHandler('bluff-card');
            if (handler && 'makeMove' in handler) {
              await handler.makeMove(message.roomId, message.userId, playMessage);
            }
          } catch (error) {
            console.error('Error handling bluff card play:', error);
          }
        }
        break;

      case 'bluff_card_challenge':
        if (message.roomId && message.userId && 'challenge' in message.data) {
          try {
            const challengeMessage: BluffCardChallengeMessage = {
              type: 'bluff_card_challenge',
              challenge: message.data.challenge
            };
            const handler = getGameHandler('bluff-card');
            if (handler && 'makeMove' in handler) {
              await handler.makeMove(message.roomId, message.userId, challengeMessage);
            }
          } catch (error) {
            console.error('Error handling bluff card challenge:', error);
          }
        }
        break;

      case 'chess_move':
        if (message.roomId && message.userId && message.data?.move) {
          try {
            const handler = getGameHandler('chess');
            if (handler && 'makeMove' in handler) {
              await handler.makeMove(message.roomId, message.userId, message.data.move);
            } else {
              console.log('Chess game handler not yet implemented');
            }
          } catch (error) {
            console.error('Error handling chess move:', error);
          }
        }
        break;

      case 'kick_vote':
        if (message.roomId && message.userId && message.data?.targetPlayerId && message.data?.voteType) {
          try {
            // 게임 타입별로 적절한 핸들러 찾기
            const gameState = await storage.getGame(message.roomId);
            if (gameState && gameState.gameType) {
              const handler = getGameHandler(gameState.gameType);
              if (handler && 'voteKick' in handler) {
                await handler.voteKick(message.roomId, message.userId, message.data.targetPlayerId, message.data.voteType);
              } else {
                console.log('Game handler does not support kick voting');
              }
            }
          } catch (error) {
            console.error('Error handling kick vote:', error);
          }
        }
        break;

      default:
        console.log('Unhandled WebSocket message:', message.type);
    }
  }

  async function handleUserDisconnect(userId: string) {
    console.log(`🔌 사용자 연결 해제: ${userId}`);
    
    // Find and leave any rooms the user was in
    const rooms = await storage.getAllRoomsWithPlayers();
    console.log(`📋 사용자가 참여 중인 방 수: ${rooms.length}`);
    let shouldDeleteUser = true; // 유저 삭제 여부 결정

    for (const room of rooms) {
      const player = room.players.find(p => p.userId === userId);
      if (player) {
        console.log(`🏠 방 ${room.id}에서 플레이어 ${userId} 발견, 방 상태: ${room.status}`);
        
        // 게임이 진행 중이라면 방에서 플레이어를 제거하지 않고 게임에서만 턴 처리
        if (room.status === 'playing') {
          console.log(`🎮 게임 진행 중 - 연결 해제 처리`);
          const gameState = await storage.getGame(room.id);
          if (gameState && gameState.gameType) {
            console.log(`🎯 게임 타입: ${gameState.gameType}, 연결 해제된 플레이어: ${gameState.disconnectedPlayers || []}`);
            const handler = getGameHandler(gameState.gameType);
            if (handler && 'handlePlayerDisconnect' in handler) {
              console.log(`🔧 게임 핸들러에서 연결 해제 처리`);
              await handler.handlePlayerDisconnect(room.id, userId);
              
              // 처리 후 상태 확인
              const updatedGameState = await storage.getGame(room.id);
              console.log(`✅ 연결 해제 처리 후 - 연결 해제된 플레이어: ${updatedGameState?.disconnectedPlayers || []}`);
            }
          }

          // 연결 해제 상태를 모든 클라이언트에게 브로드캐스트
          console.log(`📢 연결 해제 브로드캐스트 전송`);
          broadcastToRoom(room.id, { 
            type: 'player_left', 
            data: { userId, nickname: player.user.nickname, reason: 'disconnected' } 
          });

          // 방 업데이트도 브로드캐스트하여 UI가 최신 상태를 반영하도록 함
          await broadcastRoomUpdate(room.id);

          // 모든 플레이어가 연결 해제되었는지 확인
          const connectedPlayers = getConnectedPlayers(room.id);
          console.log(`👥 연결된 플레이어 수: ${connectedPlayers.length}`);
          if (connectedPlayers.length === 0) {
            console.log(`모든 플레이어가 연결 해제됨. 방을 삭제: ${room.id}`);
            await storage.deleteRoom(room.id);
            sendRoomListUpdate();
            sendServerStats();
            continue; // 방이 삭제되었으므로 다음 처리 생략
          } else {
            // 게임이 진행 중이고 다른 플레이어가 있으면 유저를 삭제하지 않음
            shouldDeleteUser = false;
            console.log(`🔄 다른 플레이어가 있으므로 유저 삭제하지 않음`);
          }
        } else {
          console.log(`🏠 게임 진행 중이 아님 - 방에서 플레이어 제거`);
          // 게임이 진행 중이 아닐 때만 방에서 플레이어 제거
          await storage.removePlayerFromRoom(room.id, userId);
          
          // If this was the host, reassign host or delete room
          if (room.hostId === userId) {
            const remainingPlayers = room.players.filter(p => p.userId !== userId);
            if (remainingPlayers.length > 0) {
              await storage.updateRoom(room.id, { hostId: remainingPlayers[0].userId });
            } else {
              await storage.deleteRoom(room.id);
            }
          }
        }
        
        await broadcastRoomUpdate(room.id);
        broadcastToRoom(room.id, { 
          type: 'player_left', 
          data: { userId, nickname: player.user.nickname } 
        });
      }
    }
    
    // 게임이 진행 중이 아닐 때만 유저 삭제
    if (shouldDeleteUser) {
      console.log(`🗑️ 유저 삭제: ${userId}`);
      await storage.deleteUser(userId);
    } else {
      console.log(`⏸️ 유저 삭제 보류: ${userId} (게임 진행 중)`);
    }
    sendServerStats();
  }

  function sendToClient(clientId: string, message: WebSocketMessage) {
    const client = clients.get(clientId);
    if (client?.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  function broadcastToRoom(roomId: string, message: WebSocketMessage) {
    Array.from(clients.values()).forEach(client => {
      if (client.roomId === roomId && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify(message));
      }
    });
  }

  // 게임 핸들러를 캐시에서 가져오거나 새로 생성하는 헬퍼 함수
  function getGameHandler(gameType: string) {
    if (!gameHandlers.has(gameType)) {
      const handler = createGameHandler(gameType, storage, broadcastToRoom);
      gameHandlers.set(gameType, handler);
    }
    return gameHandlers.get(gameType);
  }

  // 연결된 플레이어 목록을 가져오는 헬퍼 함수
  function getConnectedPlayers(roomId: string): string[] {
    const connectedPlayers: string[] = [];
    Array.from(clients.values()).forEach(client => {
      if (client.roomId === roomId && client.userId && client.socket.readyState === WebSocket.OPEN) {
        connectedPlayers.push(client.userId);
      }
    });
    return connectedPlayers;
  }

  async function broadcastRoomUpdate(roomId: string) {
    const roomWithPlayers = await storage.getRoomWithPlayers(roomId);
    if (roomWithPlayers) {
      broadcastToRoom(roomId, { 
        type: 'room_update', 
        data: roomWithPlayers 
      });
    }
    sendRoomListUpdate();
  }

  async function sendRoomListUpdate() {
    const rooms = await storage.getAllRoomsWithPlayers();
    const message: WebSocketMessage = { type: 'room_update', data: { rooms } };
    
    Array.from(clients.values()).forEach(client => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify(message));
      }
    });
  }

  async function sendServerStats() {
    const stats = await storage.getServerStats();
    const message: WebSocketMessage = { type: 'stats_update', data: stats };
    
    Array.from(clients.values()).forEach(client => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify(message));
      }
    });
  }

  // Game logic functions

  // Game logic is now handled by individual game handlers

  // Round processing is now handled by individual game handlers



  // REST API routes
  app.post('/api/users', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: 'Invalid user data' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  });

  app.post('/api/rooms', async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(roomData);
      
      // Add host as first player
      const hostPlayer = await storage.addPlayerToRoom({
        roomId: room.id,
        userId: room.hostId,
        isReady: true,
      });

      // Update WebSocket client room association
      for (const [clientId, client] of Array.from(clients.entries())) {
        if (client.userId === room.hostId) {
          client.roomId = room.id;
          console.log(`Host ${room.hostId} joined room ${room.id} via room creation`);
          break;
        }
      }

      sendRoomListUpdate();
      sendServerStats();
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: 'Invalid room data' });
    }
  });

  app.get('/api/rooms', async (req, res) => {
    const rooms = await storage.getAllRoomsWithPlayers();
    res.json(rooms);
  });

  app.get('/api/rooms/:id', async (req, res) => {
    const room = await storage.getRoomWithPlayers(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  });

  app.post('/api/rooms/:id/join', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      const room = await storage.getRoomWithPlayers(req.params.id);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      if (room.currentPlayers >= room.maxPlayers) {
        return res.status(400).json({ message: 'Room is full' });
      }

      if (room.status === 'playing') {
        return res.status(400).json({ message: 'Game is already in progress' });
      }

      // Check if player is already in room
      const existingPlayer = room.players.find(p => p.userId === userId);
      if (existingPlayer) {
        return res.status(400).json({ message: 'Already in room' });
      }

      await storage.addPlayerToRoom({
        roomId: room.id,
        userId,
        isReady: false,
      });

      // Update WebSocket client room association
      for (const [clientId, client] of Array.from(clients.entries())) {
        if (client.userId === userId) {
          client.roomId = room.id;
          break;
        }
      }

      const user = await storage.getUser(userId);
      broadcastToRoom(room.id, { 
        type: 'player_joined', 
        data: { userId, nickname: user?.nickname } 
      });

      await broadcastRoomUpdate(room.id);
      sendServerStats();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to join room' });
    }
  });

  app.post('/api/rooms/:id/leave', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      await storage.removePlayerFromRoom(req.params.id, userId);

      // Update WebSocket client room association
      for (const [clientId, client] of Array.from(clients.entries())) {
        if (client.userId === userId && client.roomId === req.params.id) {
          client.roomId = undefined;
          break;
        }
      }

      // If this was the host, reassign host or delete room
      if (room.hostId === userId) {
        const remainingPlayers = await storage.getRoomPlayers(req.params.id);
        if (remainingPlayers.length > 0) {
          await storage.updateRoom(req.params.id, { hostId: remainingPlayers[0].userId });
        } else {
          await storage.deleteRoom(req.params.id);
          sendRoomListUpdate();
          sendServerStats();
          return res.json({ success: true, roomDeleted: true });
        }
      }

      const user = await storage.getUser(userId);
      broadcastToRoom(req.params.id, { 
        type: 'player_left', 
        data: { userId, nickname: user?.nickname } 
      });

      await broadcastRoomUpdate(req.params.id);
      sendServerStats();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to leave room' });
    }
  });

  app.post('/api/rooms/:id/ready', async (req, res) => {
    try {
      const { userId, isReady } = req.body;
      if (!userId || typeof isReady !== 'boolean') {
        return res.status(400).json({ message: 'User ID and ready status required' });
      }

      await storage.updatePlayerReady(req.params.id, userId, isReady);
      await broadcastRoomUpdate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update ready status' });
    }
  });

  app.get('/api/rooms/code/:code', async (req, res) => {
    const room = await storage.getRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  });

  app.post('/api/rooms/:id/start-game', async (req, res) => {
    try {
      const { userId } = req.body;
      const roomId = req.params.id;
      
      const room = await storage.getRoomWithPlayers(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Check if user is host
      if (room.hostId !== userId) {
        return res.status(403).json({ message: 'Only host can start the game' });
      }

      // Check if there are at least 2 players
      if (room.players.length < 2) {
        return res.status(400).json({ message: 'Need at least 2 players to start the game' });
      }

      // Check if all players are ready
      const allReady = room.players.every(p => p.isReady);
      if (!allReady) {
        return res.status(400).json({ message: 'All players must be ready' });
      }

      // Update room status to playing
      await storage.updateRoom(roomId, { status: 'playing' });

      // Create game state with all ready players
      const readyPlayerIds = room.players
        .filter(p => p.isReady)
        .map(p => p.userId);
      
      console.log('Creating game for room type:', room.gameType);
      console.log('Ready players:', readyPlayerIds);
      
      // 팩토리를 통해 게임 핸들러 가져오기
      const handler = getGameHandler(room.gameType);
      if (!handler) {
        throw new Error(`Unsupported game type: ${room.gameType}`);
      }
      
      const gameState = await handler.createGame(roomId, readyPlayerIds);

      console.log('Game state created:', gameState);

      // Broadcast game start
      broadcastToRoom(roomId, {
        type: 'game_start',
        data: { gameState, roomId }
      });

      console.log('Game start broadcasted to room:', roomId);

      res.json({ success: true, gameState });
    } catch (error) {
      console.error('Error starting game:', error);
      res.status(500).json({ message: 'Failed to start game' });
    }
  });

  app.get('/api/games/:roomId', async (req, res) => {
    try {
      const gameState = await storage.getGame(req.params.roomId);
      if (!gameState) {
        return res.status(404).json({ message: 'Game not found' });
      }
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get game state' });
    }
  });

  app.get('/api/stats', async (req, res) => {
    const stats = await storage.getServerStats();
    res.json(stats);
  });

  // Associate WebSocket client with user
  app.post('/api/ws/associate', async (req, res) => {
    try {
      const { clientId, userId } = req.body;
      const client = clients.get(clientId);
      if (client) {
        client.userId = userId;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to associate client' });
    }
  });

  return httpServer;
}
