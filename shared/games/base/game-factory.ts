import type { BaseGameHandlers, BaseGameState, BaseChoice } from './game-types';

// 게임 팩토리 인터페이스
export interface GameFactory {
  createHandler(gameType: string, storage: any, broadcastToRoom: Function): BaseGameHandlers<any, any> | null;
  getSupportedGameTypes(): string[];
  getGameInfo(gameType: string): { name: string; description: string } | null;
}

// 게임 핸들러 생성자 타입
export type GameHandlerConstructor<T extends BaseGameHandlers<any, any>> = new (
  storage: any, 
  broadcastToRoom: Function
) => T;

// 게임 팩토리 구현
export class GameFactoryImpl implements GameFactory {
  private handlerRegistry = new Map<string, GameHandlerConstructor<any>>();
  private gameInfoRegistry = new Map<string, { name: string; description: string }>();

  // 게임 핸들러 등록
  registerGame<T extends BaseGameHandlers<any, any>>(
    gameType: string,
    handlerConstructor: GameHandlerConstructor<T>,
    gameInfo: { name: string; description: string }
  ): void {
    this.handlerRegistry.set(gameType, handlerConstructor);
    this.gameInfoRegistry.set(gameType, gameInfo);
  }

  // 게임 정보만 등록 (핸들러 없이)
  registerGameInfo(
    gameType: string,
    gameInfo: { name: string; description: string }
  ): void {
    this.gameInfoRegistry.set(gameType, gameInfo);
  }

  // 게임 핸들러 생성
  createHandler(gameType: string, storage: any, broadcastToRoom: Function): BaseGameHandlers<any, any> | null {
    const HandlerClass = this.handlerRegistry.get(gameType);
    if (!HandlerClass) {
      return null;
    }
    return new HandlerClass(storage, broadcastToRoom);
  }

  // 지원되는 게임 타입 목록
  getSupportedGameTypes(): string[] {
    return Array.from(this.handlerRegistry.keys());
  }

  // 게임 정보 조회
  getGameInfo(gameType: string): { name: string; description: string } | null {
    return this.gameInfoRegistry.get(gameType) || null;
  }

  // 모든 게임 정보 조회
  getAllGameInfo(): Record<string, { name: string; description: string }> {
    const result: Record<string, { name: string; description: string }> = {};
    this.gameInfoRegistry.forEach((info, gameType) => {
      result[gameType] = info;
    });
    return result;
  }
}

// 싱글톤 게임 팩토리 인스턴스
export const gameFactory = new GameFactoryImpl();