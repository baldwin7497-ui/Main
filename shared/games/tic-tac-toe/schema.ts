// Tic-tac-toe Game Schema
import type { TurnBasedGameState, BaseChoice, GameTurn, GameConfig } from '../base/types/game-types';

export type TicTacToeSymbol = 'X' | 'O';
export type TicTacToeCell = TicTacToeSymbol | null;
export type TicTacToeBoard = TicTacToeCell[][];

export interface TicTacToePosition {
  row: number; // 0-2
  col: number; // 0-2
}

export interface TicTacToeMove {
  position: TicTacToePosition;
  symbol: TicTacToeSymbol;
}

export interface TicTacToeGameState extends TurnBasedGameState {
  gameType: 'tic-tac-toe';
  roomId: string;
  category: 'board-game';
  playerIds: string[];
  gameStatus: 'waiting_for_moves' | 'playing' | 'game_finished';
  currentPlayer: string;
  turnCount: number;
  gameHistory: any[];
  board: TicTacToeBoard;
  playerSymbols: Record<string, TicTacToeSymbol>; // playerId -> symbol
  boardSize: { width: 3; height: 3 };
  disconnectedPlayers: string[];
  createdAt: number;
  lastUpdated: number;
}

export interface TicTacToeChoiceMessage extends BaseChoice {
  type: 'tic_tac_toe_move';
  position: TicTacToePosition;
}

export interface TicTacToeTurn extends GameTurn {
  move: {
    playerId: string;
    moveNumber: number;
    timestamp: number;
    data: TicTacToeMove;
  };
}

export const TIC_TAC_TOE_CONFIG: GameConfig<TicTacToePosition> = {
  name: '틱택토',
  description: '3x3 보드에서 같은 기호 3개를 한 줄로 만드세요!',
  choices: [], // 동적으로 생성 (빈 칸들)
  generateAnswer: () => ({ row: 1, col: 1 }) // 사용하지 않음
};

// 게임 승리 조건 체크용 유틸리티
export const TIC_TAC_TOE_WIN_CONDITIONS = [
  // 가로줄
  [[0, 0], [0, 1], [0, 2]],
  [[1, 0], [1, 1], [1, 2]],
  [[2, 0], [2, 1], [2, 2]],
  // 세로줄
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  // 대각선
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]]
];