// 메시지 타입 테스트

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  MessageBuilder,
  validateMessage,
  isErrorMessage,
  isGameStateMessage,
  isGameChoiceMessage,
  MessageTypeRegistry
} from '@shared/games/base/message-types';
import type { GameCategory } from '@shared/games/base/game-types';

describe('MessageBuilder', () => {
  describe('에러 메시지 생성', () => {
    it('에러 메시지를 올바르게 생성해야 한다', () => {
      const error = MessageBuilder.error(
        'GAME_NOT_FOUND',
        '게임을 찾을 수 없습니다',
        { gameType: 'test-game' },
        'room-123',
        'user-456'
      );

      expect(error.type).toBe('error');
      expect(error.error.code).toBe('GAME_NOT_FOUND');
      expect(error.error.message).toBe('게임을 찾을 수 없습니다');
      expect(error.error.details).toEqual({ gameType: 'test-game' });
      expect(error.roomId).toBe('room-123');
      expect(error.userId).toBe('user-456');
      expect(error.timestamp).toBeTypeOf('number');
      expect(error.messageId).toMatch(/^msg_/);
    });
  });

  describe('성공 메시지 생성', () => {
    it('성공 메시지를 올바르게 생성해야 한다', () => {
      const success = MessageBuilder.success(
        { result: 'ok' },
        'req-123',
        'room-123',
        'user-456'
      );

      expect(success.type).toBe('success');
      expect(success.data).toEqual({ result: 'ok' });
      expect(success.requestId).toBe('req-123');
      expect(success.roomId).toBe('room-123');
      expect(success.userId).toBe('user-456');
      expect(success.timestamp).toBeTypeOf('number');
      expect(success.messageId).toMatch(/^msg_/);
    });
  });

  describe('게임 상태 메시지 생성', () => {
    it('게임 상태 메시지를 올바르게 생성해야 한다', () => {
      const gameState = {
        roomId: 'room-123',
        gameType: 'test-game',
        category: 'round-based' as GameCategory,
        playerIds: ['user-1', 'user-2'],
        gameStatus: 'playing' as const,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        disconnectedPlayers: []
      };

      const message = MessageBuilder.gameState(
        gameState,
        'test-game',
        'round-based',
        'room-123'
      );

      expect(message.type).toBe('game_state');
      expect(message.data.gameState).toEqual(gameState);
      expect(message.data.gameType).toBe('test-game');
      expect(message.data.category).toBe('round-based');
      expect(message.roomId).toBe('room-123');
      expect(message.timestamp).toBeTypeOf('number');
      expect(message.messageId).toMatch(/^msg_/);
    });
  });

  describe('플레이어 선택 메시지 생성', () => {
    it('플레이어 선택 메시지를 올바르게 생성해야 한다', () => {
      const choice = { type: 'number-guessing', value: 3 };
      
      const message = MessageBuilder.playerChoice(
        choice,
        'number-guessing',
        'room-123',
        'user-456'
      );

      expect(message.type).toBe('player_choice');
      expect(message.data.choice).toEqual(choice);
      expect(message.data.gameType).toBe('number-guessing');
      expect(message.roomId).toBe('room-123');
      expect(message.userId).toBe('user-456');
      expect(message.timestamp).toBeTypeOf('number');
      expect(message.messageId).toMatch(/^msg_/);
    });
  });

  describe('게임 종료 메시지 생성', () => {
    it('게임 종료 메시지를 올바르게 생성해야 한다', () => {
      const gameState = {
        roomId: 'room-123',
        gameType: 'test-game',
        gameStatus: 'game_finished' as const
      };

      const message = MessageBuilder.gameEnd(
        'normal',
        gameState,
        ['user-1'],
        { 'user-1': 10, 'user-2': 8 },
        { duration: 300, totalRounds: 5 },
        'room-123'
      );

      expect(message.type).toBe('game_end');
      expect(message.data.reason).toBe('normal');
      expect(message.data.winners).toEqual(['user-1']);
      expect(message.data.finalScores).toEqual({ 'user-1': 10, 'user-2': 8 });
      expect(message.data.statistics).toEqual({ duration: 300, totalRounds: 5 });
      expect(message.roomId).toBe('room-123');
      expect(message.timestamp).toBeTypeOf('number');
      expect(message.messageId).toMatch(/^msg_/);
    });
  });
});

describe('메시지 검증', () => {
  it('유효한 메시지는 통과해야 한다', () => {
    const validMessage = {
      type: 'game_state',
      timestamp: Date.now(),
      messageId: 'msg_123',
      roomId: 'room-123'
    };

    const result = validateMessage(validMessage);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('타입이 없는 메시지는 실패해야 한다', () => {
    const invalidMessage = {
      timestamp: Date.now(),
      messageId: 'msg_123'
    };

    const result = validateMessage(invalidMessage);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Message must have a valid type');
  });

  it('객체가 아닌 메시지는 실패해야 한다', () => {
    const result = validateMessage('not an object');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Message must be an object');
  });

  it('null 메시지는 실패해야 한다', () => {
    const result = validateMessage(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Message must be an object');
  });
});

describe('메시지 타입 가드', () => {
  describe('isErrorMessage', () => {
    it('에러 메시지를 올바르게 식별해야 한다', () => {
      const errorMessage = MessageBuilder.error('TEST_ERROR', 'Test error');
      expect(isErrorMessage(errorMessage)).toBe(true);
    });

    it('에러가 아닌 메시지는 false를 반환해야 한다', () => {
      const successMessage = MessageBuilder.success({ result: 'ok' });
      expect(isErrorMessage(successMessage)).toBe(false);
    });
  });

  describe('isGameStateMessage', () => {
    it('게임 상태 메시지를 올바르게 식별해야 한다', () => {
      const gameState = {
        roomId: 'room-123',
        gameType: 'test-game',
        category: 'round-based' as GameCategory,
        playerIds: [],
        gameStatus: 'playing' as const,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        disconnectedPlayers: []
      };
      
      const gameStateMessage = MessageBuilder.gameState(gameState, 'test-game', 'round-based');
      expect(isGameStateMessage(gameStateMessage)).toBe(true);
    });

    it('게임 상태가 아닌 메시지는 false를 반환해야 한다', () => {
      const errorMessage = MessageBuilder.error('TEST_ERROR', 'Test error');
      expect(isGameStateMessage(errorMessage)).toBe(false);
    });
  });

  describe('isGameChoiceMessage', () => {
    it('게임 선택 메시지를 올바르게 식별해야 한다', () => {
      const choiceMessage = MessageBuilder.playerChoice({ value: 3 }, 'test-game');
      expect(isGameChoiceMessage(choiceMessage)).toBe(true);
    });

    it('게임 선택이 아닌 메시지는 false를 반환해야 한다', () => {
      const errorMessage = MessageBuilder.error('TEST_ERROR', 'Test error');
      expect(isGameChoiceMessage(errorMessage)).toBe(false);
    });
  });
});

describe('MessageTypeRegistry', () => {
  let registry: MessageTypeRegistry;

  beforeEach(() => {
    registry = MessageTypeRegistry.getInstance();
  });

  describe('메시지 타입 등록', () => {
    it('커스텀 메시지 타입을 등록할 수 있어야 한다', () => {
      registry.registerMessageType('custom_message', {
        validate: (data) => data && typeof data.customField === 'string'
      });

      const supportedTypes = registry.getSupportedTypes();
      expect(supportedTypes).toContain('custom_message');
    });
  });

  describe('메시지 검증', () => {
    beforeEach(() => {
      registry.registerMessageType('test_message', {
        validate: (data) => data && typeof data.testField === 'number' && data.testField > 0
      });
    });

    it('유효한 메시지는 통과해야 한다', () => {
      const isValid = registry.validateMessage('test_message', { testField: 5 });
      expect(isValid).toBe(true);
    });

    it('유효하지 않은 메시지는 실패해야 한다', () => {
      const isValid = registry.validateMessage('test_message', { testField: -1 });
      expect(isValid).toBe(false);
    });

    it('등록되지 않은 메시지 타입은 false를 반환해야 한다', () => {
      const isValid = registry.validateMessage('unknown_message', { data: 'test' });
      expect(isValid).toBe(false);
    });
  });

  describe('메시지 변환', () => {
    beforeEach(() => {
      registry.registerMessageType('transform_message', {
        validate: (data) => true,
        transform: (data) => ({ ...data, transformed: true })
      });
    });

    it('변환 함수가 있는 메시지는 변환되어야 한다', () => {
      const originalData = { field: 'value' };
      const transformedData = registry.transformMessage('transform_message', originalData);
      
      expect(transformedData).toEqual({
        field: 'value',
        transformed: true
      });
    });

    it('변환 함수가 없는 메시지는 원본을 반환해야 한다', () => {
      registry.registerMessageType('no_transform_message', {
        validate: (data) => true
      });

      const originalData = { field: 'value' };
      const result = registry.transformMessage('no_transform_message', originalData);
      
      expect(result).toEqual(originalData);
    });
  });
});