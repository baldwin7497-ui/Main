// 게임 팩토리 테스트

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameFactoryImpl } from '@shared/games/base/game-factory';
import type { CoreGameHandlers, GameMetadata } from '@shared/games/base/game-types';

// 테스트용 모크 핸들러
class MockGameHandler implements CoreGameHandlers<any> {
  constructor(private storage: any, private broadcastToRoom: Function) {}

  async createGame(roomId: string, playerIds: string[]): Promise<any> {
    return {
      roomId,
      playerIds,
      gameType: 'test-game',
      category: 'round-based',
      gameStatus: 'waiting_for_moves',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      disconnectedPlayers: []
    };
  }

  async getGameState(roomId: string): Promise<any> {
    return null;
  }

  async endGame(roomId: string, reason?: string): Promise<void> {
    // Mock implementation
  }
}

describe('GameFactory', () => {
  let gameFactory: GameFactoryImpl;
  let mockStorage: any;
  let mockBroadcastToRoom: any;

  beforeEach(() => {
    gameFactory = new GameFactoryImpl();
    mockStorage = {
      getGame: vi.fn(),
      updateGame: vi.fn(),
      updateRoom: vi.fn()
    };
    mockBroadcastToRoom = vi.fn();
  });

  describe('게임 등록', () => {
    it('새로운 게임을 등록할 수 있어야 한다', () => {
      const metadata: GameMetadata = {
        id: 'test-game',
        name: '테스트 게임',
        description: '테스트용 게임',
        category: 'round-based',
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 10,
        difficulty: 'easy',
        tags: ['test']
      };

      gameFactory.registerGame(
        'test-game',
        MockGameHandler,
        { name: metadata.name, description: metadata.description },
        { id: metadata.id, name: metadata.name, description: metadata.description, category: metadata.category, minPlayers: metadata.minPlayers, maxPlayers: metadata.maxPlayers, estimatedDuration: metadata.estimatedDuration, difficulty: metadata.difficulty, tags: metadata.tags }
      );

      const supportedTypes = gameFactory.getSupportedGameTypes();
      expect(supportedTypes).toContain('test-game');
    });

    it('게임 정보만 등록할 수 있어야 한다', () => {
      gameFactory.registerGameInfo('info-only-game', {
        name: '정보만 있는 게임',
        description: '핸들러가 없는 게임'
      });

      const gameInfo = gameFactory.getGameInfo('info-only-game');
      expect(gameInfo).toEqual({
        name: '정보만 있는 게임',
        description: '핸들러가 없는 게임'
      });
    });
  });

  describe('게임 핸들러 생성', () => {
    beforeEach(() => {
      const metadata: GameMetadata = {
        id: 'test-game',
        name: '테스트 게임',
        description: '테스트용 게임',
        category: 'round-based',
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 10,
        difficulty: 'easy',
        tags: ['test']
      };

      gameFactory.registerGame(
        'test-game',
        MockGameHandler,
        { name: metadata.name, description: metadata.description },
        { id: metadata.id, name: metadata.name, description: metadata.description, category: metadata.category, minPlayers: metadata.minPlayers, maxPlayers: metadata.maxPlayers, estimatedDuration: metadata.estimatedDuration, difficulty: metadata.difficulty, tags: metadata.tags }
      );
    });

    it('등록된 게임의 핸들러를 생성할 수 있어야 한다', () => {
      const handler = gameFactory.createHandler('test-game', mockStorage, mockBroadcastToRoom);
      
      expect(handler).toBeInstanceOf(MockGameHandler);
      expect(handler).not.toBeNull();
    });

    it('등록되지 않은 게임의 핸들러 생성은 null을 반환해야 한다', () => {
      const handler = gameFactory.createHandler('non-existent-game', mockStorage, mockBroadcastToRoom);
      
      expect(handler).toBeNull();
    });
  });

  describe('게임 조회', () => {
    beforeEach(() => {
      const metadata: GameMetadata = {
        id: 'test-game',
        name: '테스트 게임',
        description: '테스트용 게임',
        category: 'round-based',
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 10,
        difficulty: 'easy',
        tags: ['test']
      };

      gameFactory.registerGame(
        'test-game',
        MockGameHandler,
        { name: metadata.name, description: metadata.description },
        { id: metadata.id, name: metadata.name, description: metadata.description, category: metadata.category, minPlayers: metadata.minPlayers, maxPlayers: metadata.maxPlayers, estimatedDuration: metadata.estimatedDuration, difficulty: metadata.difficulty, tags: metadata.tags }
      );
    });

    it('지원되는 게임 타입 목록을 반환해야 한다', () => {
      const supportedTypes = gameFactory.getSupportedGameTypes();
      
      expect(supportedTypes).toBeInstanceOf(Array);
      expect(supportedTypes).toContain('test-game');
    });

    it('카테고리별 게임 목록을 반환해야 한다', () => {
      const roundBasedGames = gameFactory.getGamesByCategory('round-based');
      
      expect(roundBasedGames).toContain('test-game');
    });

    it('게임 정보를 조회할 수 있어야 한다', () => {
      const gameInfo = gameFactory.getGameInfo('test-game');
      
      expect(gameInfo).toEqual({
        name: '테스트 게임',
        description: '테스트용 게임'
      });
    });

    it('게임 메타데이터를 조회할 수 있어야 한다', () => {
      const metadata = gameFactory.getGameMetadata('test-game');
      
      expect(metadata).toEqual({
        id: 'test-game',
        name: '테스트 게임',
        description: '테스트용 게임',
        category: 'round-based',
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 10,
        difficulty: 'easy',
        tags: ['test']
      });
    });
  });

  describe('게임 검증', () => {
    beforeEach(() => {
      const metadata: GameMetadata = {
        id: 'test-game',
        name: '테스트 게임',
        description: '테스트용 게임',
        category: 'round-based',
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 10,
        difficulty: 'easy',
        tags: ['test']
      };

      gameFactory.registerGame(
        'test-game',
        MockGameHandler,
        { name: metadata.name, description: metadata.description },
        { id: metadata.id, name: metadata.name, description: metadata.description, category: metadata.category, minPlayers: metadata.minPlayers, maxPlayers: metadata.maxPlayers, estimatedDuration: metadata.estimatedDuration, difficulty: metadata.difficulty, tags: metadata.tags }
      );
    });

    it('등록된 게임 타입은 유효해야 한다', () => {
      const isValid = gameFactory.validateGameType('test-game');
      expect(isValid).toBe(true);
    });

    it('등록되지 않은 게임 타입은 유효하지 않아야 한다', () => {
      const isValid = gameFactory.validateGameType('non-existent-game');
      expect(isValid).toBe(false);
    });
  });

  describe('게임 활성화/비활성화', () => {
    beforeEach(() => {
      const metadata: GameMetadata = {
        id: 'test-game',
        name: '테스트 게임',
        description: '테스트용 게임',
        category: 'round-based',
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 10,
        difficulty: 'easy',
        tags: ['test']
      };

      gameFactory.registerGame(
        'test-game',
        MockGameHandler,
        { name: metadata.name, description: metadata.description },
        { id: metadata.id, name: metadata.name, description: metadata.description, category: metadata.category, minPlayers: metadata.minPlayers, maxPlayers: metadata.maxPlayers, estimatedDuration: metadata.estimatedDuration, difficulty: metadata.difficulty, tags: metadata.tags }
      );
    });

    it('게임을 비활성화할 수 있어야 한다', () => {
      const result = gameFactory.setGameEnabled('test-game', false);
      expect(result).toBe(true);
      
      const supportedTypes = gameFactory.getSupportedGameTypes();
      expect(supportedTypes).not.toContain('test-game');
    });

    it('게임을 다시 활성화할 수 있어야 한다', () => {
      gameFactory.setGameEnabled('test-game', false);
      const result = gameFactory.setGameEnabled('test-game', true);
      expect(result).toBe(true);
      
      const supportedTypes = gameFactory.getSupportedGameTypes();
      expect(supportedTypes).toContain('test-game');
    });
  });

  describe('게임 등록 해제', () => {
    beforeEach(() => {
      const metadata: GameMetadata = {
        id: 'test-game',
        name: '테스트 게임',
        description: '테스트용 게임',
        category: 'round-based',
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 10,
        difficulty: 'easy',
        tags: ['test']
      };

      gameFactory.registerGame(
        'test-game',
        MockGameHandler,
        { name: metadata.name, description: metadata.description },
        { id: metadata.id, name: metadata.name, description: metadata.description, category: metadata.category, minPlayers: metadata.minPlayers, maxPlayers: metadata.maxPlayers, estimatedDuration: metadata.estimatedDuration, difficulty: metadata.difficulty, tags: metadata.tags }
      );
    });

    it('게임 등록을 해제할 수 있어야 한다', () => {
      const result = gameFactory.unregisterGame('test-game');
      expect(result).toBe(true);
      
      const supportedTypes = gameFactory.getSupportedGameTypes();
      expect(supportedTypes).not.toContain('test-game');
      
      const gameInfo = gameFactory.getGameInfo('test-game');
      expect(gameInfo).toBeNull();
    });

    it('존재하지 않는 게임의 등록 해제는 false를 반환해야 한다', () => {
      const result = gameFactory.unregisterGame('non-existent-game');
      expect(result).toBe(false);
    });
  });
});