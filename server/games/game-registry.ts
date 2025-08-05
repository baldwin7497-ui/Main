// 게임 등록 및 팩토리 설정
import { gameFactory } from "@shared/games/base/factory/game-factory";
import { NumberGuessingHandler } from "./number-guessing/handler";
import { OddEvenHandler } from "./odd-even/handler";
import { TicTacToeHandler } from "./tic-tac-toe/handler";
import { BluffCardHandler } from "./bluff-card/handler";
import { ChessHandler } from "./chess/handler";
import { NUMBER_GUESSING_CONFIG } from "@shared/games/number-guessing/schema";
import { ODD_EVEN_CONFIG } from "@shared/games/odd-even/schema";
import { TIC_TAC_TOE_CONFIG } from "@shared/games/tic-tac-toe/schema";
import { BLUFF_CARD_CONFIG } from "@shared/games/bluff-card/schema";
import { CHESS_CONFIG } from "@shared/games/chess/schema";

// 모든 게임을 팩토리에 등록
export function registerAllGames() {
  // Number Guessing 게임 등록
  gameFactory.registerGame(
    'number-guessing',
    NumberGuessingHandler,
    {
      name: NUMBER_GUESSING_CONFIG.name,
      description: NUMBER_GUESSING_CONFIG.description
    }
  );

  // Odd-Even 게임 등록
  gameFactory.registerGame(
    'odd-even',
    OddEvenHandler,
    {
      name: ODD_EVEN_CONFIG.name,
      description: ODD_EVEN_CONFIG.description
    }
  );

  // Tic-Tac-Toe 게임 등록
  gameFactory.registerGame(
    'tic-tac-toe',
    TicTacToeHandler as any,
    {
      name: TIC_TAC_TOE_CONFIG.name,
      description: TIC_TAC_TOE_CONFIG.description
    }
  );

  // BluffCard 게임 등록 (턴 기반 게임으로 변경)
  gameFactory.registerGame(
    'bluff-card',
    BluffCardHandler as any,
    {
      name: BLUFF_CARD_CONFIG.name,
      description: BLUFF_CARD_CONFIG.description
    }
  );

  // Chess 게임 등록
  gameFactory.registerGame(
    'chess',
    ChessHandler as any,
    {
      name: CHESS_CONFIG.name,
      description: CHESS_CONFIG.description
    }
  );

  console.log('All games registered to factory:', gameFactory.getSupportedGameTypes());
}

// 게임 핸들러 생성 헬퍼 함수
export function createGameHandler(gameType: string, storage: any, broadcastToRoom: Function) {
  const handler = gameFactory.createHandler(gameType, storage, broadcastToRoom);
  if (!handler) {
    throw new Error(`Unsupported game type: ${gameType}`);
  }
  return handler;
}

// 지원되는 게임 타입 목록 조회
export function getSupportedGameTypes(): string[] {
  return gameFactory.getSupportedGameTypes();
}

// 게임 정보 조회
export function getGameInfo(gameType: string) {
  return gameFactory.getGameInfo(gameType);
}

// 모든 게임 정보 조회
export function getAllGameInfo() {
  return gameFactory.getAllGameInfo();
}