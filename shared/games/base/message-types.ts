// 타입 안전 WebSocket 메시지 시스템

import type { 
  BaseChoice, 
  GameCategory, 
  CoreGameState,
  RoundBasedGameState,
  TurnBasedGameState,
  BoardGameState,
  GameMove 
} from './game-types';

// 기본 메시지 타입
export interface BaseMessage {
  type: string;
  timestamp: number;
  messageId: string;
  roomId?: string;
  userId?: string;
}

// 기본 WebSocket 메시지 인터페이스 (하위 호환성)
export interface BaseWebSocketMessage extends BaseMessage {
  data?: any;
}

// 에러 메시지
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// 성공 응답 메시지
export interface SuccessMessage<TData = any> extends BaseMessage {
  type: 'success';
  data: TData;
  requestId?: string;
}

// 게임 상태 메시지
export interface GameStateMessage<TState = CoreGameState> extends BaseMessage {
  type: 'game_state';
  data: {
    gameState: TState;
    gameType: string;
    category: GameCategory;
  };
}

// 게임 업데이트 메시지
export interface GameUpdateMessage<TState = CoreGameState> extends BaseMessage {
  type: 'game_update';
  data: {
    gameState: TState;
    updateType: 'state_change' | 'player_action' | 'round_change' | 'turn_change';
    changedFields?: string[];
  };
}

// 게임 선택 메시지 타입
export interface GameChoiceMessage extends BaseWebSocketMessage {
  type: 'game_choice';
  gameType: string;
  choice: any;
}

// 확장된 WebSocket 메시지 타입
export type ExtendedWebSocketMessage = 
  | BaseWebSocketMessage
  | GameChoiceMessage;

// 메시지 타입 등록 시스템
export class MessageTypeRegistry {
  private static instance: MessageTypeRegistry;
  private messageTypes = new Map<string, {
    validate: (data: any) => boolean;
    transform?: (data: any) => any;
  }>();

  private constructor() {
    this.initializeBaseTypes();
  }

  static getInstance(): MessageTypeRegistry {
    if (!MessageTypeRegistry.instance) {
      MessageTypeRegistry.instance = new MessageTypeRegistry();
    }
    return MessageTypeRegistry.instance;
  }

  private initializeBaseTypes(): void {
    // 기본 메시지 타입들 등록
    this.registerMessageType('room_update', {
      validate: () => true
    });

    this.registerMessageType('player_joined', {
      validate: (data) => data && typeof data.userId === 'string'
    });

    this.registerMessageType('player_left', {
      validate: (data) => data && typeof data.userId === 'string'
    });

    this.registerMessageType('game_start', {
      validate: (data) => data && data.gameState
    });

    this.registerMessageType('game_state', {
      validate: (data) => data && typeof data.gameType === 'string'
    });

    this.registerMessageType('round_result', {
      validate: (data) => data && typeof data.gameType === 'string'
    });

    this.registerMessageType('game_end', {
      validate: (data) => data && typeof data.gameType === 'string'
    });

    // 게임별 선택 메시지 타입들
    this.registerMessageType('number_choice', {
      validate: (data) => data && typeof data.number === 'number' && data.number >= 1 && data.number <= 5
    });

    this.registerMessageType('odd_even_choice', {
      validate: (data) => data && (data.choice === 'odd' || data.choice === 'even')
    });
  }

  registerMessageType(type: string, config: {
    validate: (data: any) => boolean;
    transform?: (data: any) => any;
  }): void {
    this.messageTypes.set(type, config);
  }

  validateMessage(type: string, data: any): boolean {
    const config = this.messageTypes.get(type);
    if (!config) {
      console.warn(`Unknown message type: ${type}`);
      return false;
    }
    return config.validate(data);
  }

  transformMessage(type: string, data: any): any {
    const config = this.messageTypes.get(type);
    if (!config || !config.transform) {
      return data;
    }
    return config.transform(data);
  }

  getSupportedTypes(): string[] {
    return Array.from(this.messageTypes.keys());
  }
}

// 메시지 타입 유틸리티 함수들
export function createGameChoiceMessage(
  gameType: string,
  choice: any,
  roomId: string,
  userId: string
): GameChoiceMessage {
  return {
    type: 'game_choice',
    timestamp: Date.now(),
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    gameType,
    choice,
    roomId,
    userId,
    data: { gameType, choice }
  };
}

export function isGameChoiceMessage(message: any): message is GameChoiceMessage {
  return message && message.type === 'game_choice' && message.gameType && message.choice !== undefined;
}

// 싱글톤 인스턴스
export const messageRegistry = MessageTypeRegistry.getInstance();