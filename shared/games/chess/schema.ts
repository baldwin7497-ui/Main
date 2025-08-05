// Chess Game Schema (예시 - 기본 구조)
import type { BoardGameState, BaseChoice, GameTurn } from '../base/game-types';

export type ChessPieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type ChessColor = 'white' | 'black';

export interface ChessPiece {
  type: ChessPieceType;
  color: ChessColor;
  hasMoved: boolean; // 캐슬링, 앙파상을 위해 필요
}

export interface ChessPosition {
  row: number; // 0-7 (8x8 보드)
  col: number; // 0-7
}

export interface ChessMove {
  from: ChessPosition;
  to: ChessPosition;
  piece: ChessPieceType;
  capturedPiece?: ChessPiece;
  promotion?: ChessPieceType; // 폰 승진
  castling?: 'kingside' | 'queenside'; // 캐슬링
  enPassant?: boolean; // 앙파상
}

export type ChessBoard = (ChessPiece | null)[][];

export interface ChessGameState extends BoardGameState {
  gameType: 'chess';
  board: ChessBoard;
  playerColors: Record<string, ChessColor>; // playerId -> color
  boardSize: { width: 8; height: 8 };
  // 체스 전용 필드들
  castlingRights: {
    white: { kingside: boolean; queenside: boolean };
    black: { kingside: boolean; queenside: boolean };
  };
  enPassantTarget?: ChessPosition; // 앙파상 대상 위치
  halfMoveClock: number; // 50수 규칙용
  fullMoveNumber: number; // 게임 전체 이동 수
  check?: ChessColor; // 체크 상태인 색깔
}

export interface ChessChoiceMessage extends BaseChoice {
  type: 'chess_move';
  move: ChessMove;
}

export interface ChessTurn extends GameTurn {
  move: {
    playerId: string;
    moveNumber: number;
    timestamp: number;
    data: ChessMove;
  };
  algebraicNotation?: string; // PGN 기록용 (예: "Nf3", "Qxe7+")
}

// 체스 게임 설정
export const CHESS_CONFIG = {
  name: '체스',
  description: '고전적인 체스 게임을 즐겨보세요!',
  choices: [], // 동적으로 생성 (가능한 이동들)
  generateAnswer: () => ({ row: 0, col: 0 }) // 사용하지 않음
};

// 초기 체스 보드 설정
export const INITIAL_CHESS_BOARD: ChessBoard = [
  // 흑색 말들 (위쪽)
  [
    { type: 'rook', color: 'black', hasMoved: false },
    { type: 'knight', color: 'black', hasMoved: false },
    { type: 'bishop', color: 'black', hasMoved: false },
    { type: 'queen', color: 'black', hasMoved: false },
    { type: 'king', color: 'black', hasMoved: false },
    { type: 'bishop', color: 'black', hasMoved: false },
    { type: 'knight', color: 'black', hasMoved: false },
    { type: 'rook', color: 'black', hasMoved: false }
  ],
  // 흑색 폰들
  Array(8).fill({ type: 'pawn', color: 'black', hasMoved: false }),
  // 빈 칸들
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  // 백색 폰들
  Array(8).fill({ type: 'pawn', color: 'white', hasMoved: false }),
  // 백색 말들 (아래쪽)
  [
    { type: 'rook', color: 'white', hasMoved: false },
    { type: 'knight', color: 'white', hasMoved: false },
    { type: 'bishop', color: 'white', hasMoved: false },
    { type: 'queen', color: 'white', hasMoved: false },
    { type: 'king', color: 'white', hasMoved: false },
    { type: 'bishop', color: 'white', hasMoved: false },
    { type: 'knight', color: 'white', hasMoved: false },
    { type: 'rook', color: 'white', hasMoved: false }
  ]
];

// 체스 말 유니코드 심볼
export const CHESS_PIECE_SYMBOLS = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟'
  }
};