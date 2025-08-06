import { BaseTurnGameHandler } from "@shared/games/base/handlers/turn-based-game-handler";
import type { 
  ChessGameState, 
  ChessMove, 
  ChessBoard, 
  ChessPosition, 
  ChessPiece, 
  ChessColor, 
  ChessPieceType 
} from "@shared/games/chess/schema";
import { INITIAL_CHESS_BOARD } from "@shared/games/chess/schema";

export class ChessHandler extends BaseTurnGameHandler<ChessGameState, ChessMove> {
  
  protected getGameType(): string {
    return 'chess';
  }

  protected initializeGameState(roomId: string, playerIds: string[]): ChessGameState {
    if (playerIds.length !== 2) {
      throw new Error('Chess requires exactly 2 players');
    }

    // 플레이어 색깔 할당 (첫 번째 플레이어가 백색)
    const playerColors: Record<string, ChessColor> = {
      [playerIds[0]]: 'white',
      [playerIds[1]]: 'black'
    };

    return this.createBaseTurnGameState(roomId, playerIds, 'chess', {
      category: 'board-game',
      disconnectedPlayers: [],
      board: this.initializeBoard(),
      boardSize: { width: 8, height: 8 },
      playerColors,
      castlingRights: {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
      },
      halfMoveClock: 0,
      fullMoveNumber: 1
    });
  }

  // 보드 초기화
  private initializeBoard(): ChessBoard {
    return INITIAL_CHESS_BOARD.map(row => row.map(piece => piece ? { ...piece } : null));
  }

  // 위치 유효성 검사
  private validatePosition(position: ChessPosition): boolean {
    return position.row >= 0 && position.row < 8 && position.col >= 0 && position.col < 8;
  }

  // 보드 복사 헬퍼
  private cloneBoard(board: ChessBoard): ChessBoard {
    return board.map(row => [...row]);
  }

  validateMove(gameState: ChessGameState, userId: string, move: ChessMove): boolean {
    try {
      // 기본 유효성 검사
      if (!this.validatePosition(move.from) || !this.validatePosition(move.to)) {
        return false;
      }

      // 플레이어의 말인지 확인
      const piece = gameState.board[move.from.row][move.from.col];
      if (!piece) {
        return false;
      }

      const playerColor = gameState.playerColors[userId];
      if (piece.color !== playerColor) {
        return false;
      }

      // 목적지에 같은 색깔 말이 있는지 확인
      const targetPiece = gameState.board[move.to.row][move.to.col];
      if (targetPiece && targetPiece.color === playerColor) {
        return false;
      }

      // 말별 이동 규칙 검사
      if (!this.isValidPieceMove(gameState, move, piece)) {
        return false;
      }

      // 이동 후 체크 상태 검사 (자신의 킹이 체크에 걸리면 안됨)
      const simulatedState = this.simulateMove(gameState, move);
      if (this.isInCheck(simulatedState, playerColor)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Move validation error:', error);
      return false;
    }
  }

  applyMove(gameState: ChessGameState, userId: string, move: ChessMove): ChessGameState {
    const newGameState = { ...gameState };
    newGameState.board = this.cloneBoard(gameState.board);
    
    const piece = newGameState.board[move.from.row][move.from.col]!;
    const capturedPiece = newGameState.board[move.to.row][move.to.col];

    // 말 이동
    newGameState.board[move.to.row][move.to.col] = { ...piece, hasMoved: true };
    newGameState.board[move.from.row][move.from.col] = null;

    // 특수 이동 처리
    this.handleSpecialMoves(newGameState, move, piece);

    // 캐슬링 권한 업데이트
    this.updateCastlingRights(newGameState, move, piece);

    // 50수 규칙 업데이트
    if (piece.type === 'pawn' || capturedPiece) {
      newGameState.halfMoveClock = 0;
    } else {
      newGameState.halfMoveClock++;
    }

    // 전체 이동 수 업데이트
    if (piece.color === 'black') {
      newGameState.fullMoveNumber++;
    }

    // 체크 상태 확인
    const opponentColor: ChessColor = piece.color === 'white' ? 'black' : 'white';
    if (this.isInCheck(newGameState, opponentColor)) {
      newGameState.check = opponentColor;
    } else {
      newGameState.check = undefined;
    }

    return newGameState;
  }

  checkGameEnd(gameState: ChessGameState): { ended: boolean; reason?: string; winner?: string } {
    const currentPlayerColor = gameState.playerColors[gameState.currentPlayer];
    
    // 체크메이트 검사
    if (this.isCheckmate(gameState, currentPlayerColor)) {
      const winnerColor: ChessColor = currentPlayerColor === 'white' ? 'black' : 'white';
      const winnerId = Object.keys(gameState.playerColors).find(
        id => gameState.playerColors[id] === winnerColor
      );
      return { ended: true, reason: 'checkmate', winner: winnerId };
    }

    // 스테일메이트 검사
    if (this.isStalemate(gameState, currentPlayerColor)) {
      return { ended: true, reason: 'stalemate' };
    }

    // 50수 규칙
    if (gameState.halfMoveClock >= 100) {
      return { ended: true, reason: 'draw_offer' };
    }

    return { ended: false };
  }

  getValidMoves(gameState: ChessGameState, userId: string): ChessMove[] {
    const playerColor = gameState.playerColors[userId];
    const validMoves: ChessMove[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = gameState.board[row][col];
        if (piece && piece.color === playerColor) {
          const pieceMoves = this.getPieceValidMoves(gameState, { row, col }, piece);
          validMoves.push(...pieceMoves);
        }
      }
    }

    return validMoves;
  }

  private isValidPieceMove(gameState: ChessGameState, move: ChessMove, piece: ChessPiece): boolean {
    const dx = move.to.col - move.from.col;
    const dy = move.to.row - move.from.row;

    switch (piece.type) {
      case 'pawn':
        return this.isValidPawnMove(gameState, move, piece, dx, dy);
      case 'rook':
        return this.isValidRookMove(gameState, move, dx, dy);
      case 'knight':
        return this.isValidKnightMove(dx, dy);
      case 'bishop':
        return this.isValidBishopMove(gameState, move, dx, dy);
      case 'queen':
        return this.isValidQueenMove(gameState, move, dx, dy);
      case 'king':
        return this.isValidKingMove(gameState, move, piece, dx, dy);
      default:
        return false;
    }
  }

  private isValidPawnMove(gameState: ChessGameState, move: ChessMove, piece: ChessPiece, dx: number, dy: number): boolean {
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;
    const targetPiece = gameState.board[move.to.row][move.to.col];

    // 직진
    if (dx === 0) {
      if (targetPiece) return false; // 앞에 말이 있으면 못감
      if (dy === direction) return true; // 한 칸 전진
      if (dy === 2 * direction && move.from.row === startRow) return true; // 첫 이동 시 두 칸
    }
    
    // 대각선 공격
    if (Math.abs(dx) === 1 && dy === direction) {
      if (targetPiece && targetPiece.color !== piece.color) return true;
      // 앙파상 처리 (나중에 구현)
    }

    return false;
  }

  private isValidRookMove(gameState: ChessGameState, move: ChessMove, dx: number, dy: number): boolean {
    // 직선 이동만 가능
    if (dx !== 0 && dy !== 0) return false;
    return this.isPathClear(gameState, move.from, move.to);
  }

  private isValidKnightMove(dx: number, dy: number): boolean {
    return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
  }

  private isValidBishopMove(gameState: ChessGameState, move: ChessMove, dx: number, dy: number): boolean {
    // 대각선 이동만 가능
    if (Math.abs(dx) !== Math.abs(dy)) return false;
    return this.isPathClear(gameState, move.from, move.to);
  }

  private isValidQueenMove(gameState: ChessGameState, move: ChessMove, dx: number, dy: number): boolean {
    // 룩 + 비숍 이동
    return this.isValidRookMove(gameState, move, dx, dy) || this.isValidBishopMove(gameState, move, dx, dy);
  }

  private isValidKingMove(gameState: ChessGameState, move: ChessMove, piece: ChessPiece, dx: number, dy: number): boolean {
    // 한 칸 이동
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return true;
    
    // 캐슬링 (나중에 구현)
    return false;
  }

  private isPathClear(gameState: ChessGameState, from: ChessPosition, to: ChessPosition): boolean {
    const dx = Math.sign(to.col - from.col);
    const dy = Math.sign(to.row - from.row);
    
    let currentRow = from.row + dy;
    let currentCol = from.col + dx;

    while (currentRow !== to.row || currentCol !== to.col) {
      if (gameState.board[currentRow][currentCol] !== null) {
        return false;
      }
      currentRow += dy;
      currentCol += dx;
    }

    return true;
  }

  private simulateMove(gameState: ChessGameState, move: ChessMove): ChessGameState {
    const simulated = { ...gameState };
    simulated.board = this.cloneBoard(gameState.board);
    
    const piece = simulated.board[move.from.row][move.from.col];
    simulated.board[move.to.row][move.to.col] = piece;
    simulated.board[move.from.row][move.from.col] = null;
    
    return simulated;
  }

  private isInCheck(gameState: ChessGameState, color: ChessColor): boolean {
    // 킹 위치 찾기
    const kingPos = this.findKing(gameState, color);
    if (!kingPos) return false;

    // 상대방 말들이 킹을 공격할 수 있는지 확인
    const opponentColor: ChessColor = color === 'white' ? 'black' : 'white';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = gameState.board[row][col];
        if (piece && piece.color === opponentColor) {
          const move: ChessMove = {
            from: { row, col },
            to: kingPos,
            piece: piece.type
          };
          if (this.isValidPieceMove(gameState, move, piece)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private findKing(gameState: ChessGameState, color: ChessColor): ChessPosition | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = gameState.board[row][col];
        if (piece && piece.type === 'king' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  private isCheckmate(gameState: ChessGameState, color: ChessColor): boolean {
    if (!this.isInCheck(gameState, color)) return false;
    return this.hasNoValidMoves(gameState, color);
  }

  private isStalemate(gameState: ChessGameState, color: ChessColor): boolean {
    if (this.isInCheck(gameState, color)) return false;
    return this.hasNoValidMoves(gameState, color);
  }

  private hasNoValidMoves(gameState: ChessGameState, color: ChessColor): boolean {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = gameState.board[row][col];
        if (piece && piece.color === color) {
          const moves = this.getPieceValidMoves(gameState, { row, col }, piece);
          if (moves.length > 0) return false;
        }
      }
    }
    return true;
  }

  private getPieceValidMoves(gameState: ChessGameState, position: ChessPosition, piece: ChessPiece): ChessMove[] {
    const moves: ChessMove[] = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const move: ChessMove = {
          from: position,
          to: { row, col },
          piece: piece.type
        };
        
        if (this.isValidPieceMove(gameState, move, piece)) {
          const simulatedState = this.simulateMove(gameState, move);
          if (!this.isInCheck(simulatedState, piece.color)) {
            moves.push(move);
          }
        }
      }
    }
    
    return moves;
  }

  private handleSpecialMoves(gameState: ChessGameState, move: ChessMove, piece: ChessPiece): void {
    // 폰 승진 처리
    if (piece.type === 'pawn') {
      const promotionRow = piece.color === 'white' ? 0 : 7;
      if (move.to.row === promotionRow) {
        // 기본적으로 퀸으로 승진
        gameState.board[move.to.row][move.to.col] = {
          type: move.promotion || 'queen',
          color: piece.color,
          hasMoved: true
        };
      }
    }
  }

  private updateCastlingRights(gameState: ChessGameState, move: ChessMove, piece: ChessPiece): void {
    // 킹이나 룩이 움직이면 캐슬링 권한 상실
    if (piece.type === 'king') {
      gameState.castlingRights[piece.color].kingside = false;
      gameState.castlingRights[piece.color].queenside = false;
    } else if (piece.type === 'rook') {
      // 어느 룩인지 확인하여 해당 사이드 캐슬링 권한 제거
      if (move.from.col === 0) {
        gameState.castlingRights[piece.color].queenside = false;
      } else if (move.from.col === 7) {
        gameState.castlingRights[piece.color].kingside = false;
      }
    }
  }

  // 연결 관리는 BaseBoardGameHandler에서 자동 제공됨
  // 필요시 handleGameAbandonment를 오버라이드하여 체스 전용 로직 추가 가능
}