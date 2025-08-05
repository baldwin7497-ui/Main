import type { 
  BoardGameState, 
  BoardGameHandlers 
} from './game-types';
import { BaseTurnGameHandler } from './turn-based-game-handler';

// 보드 게임을 위한 추상 핸들러 클래스
export abstract class BaseBoardGameHandler<
  TGameState extends BoardGameState,
  TMove
> extends BaseTurnGameHandler<TGameState, TMove> implements BoardGameHandlers<TGameState, TMove> {

  // 추상 메서드들 - 각 보드 게임에서 구현
  protected abstract getBoardSize(): { width: number; height: number };
  abstract initializeBoard(boardSize: { width: number; height: number }): any;
  protected abstract validatePositionInternal(position: any, boardSize: { width: number; height: number }): boolean;

  // 게임 상태 초기화 시 보드 생성
  protected createBaseBoardGameState(
    roomId: string, 
    playerIds: string[], 
    gameType: string,
    additionalData: Partial<TGameState> = {}
  ): TGameState {
    const boardSize = this.getBoardSize();
    const board = this.initializeBoard(boardSize);

    const baseState = this.createBaseTurnGameState(roomId, playerIds, gameType, {
      board,
      boardSize,
      ...additionalData
    });

    return baseState as TGameState;
  }

  // 보드 상태 조회
  getBoardState(gameState: TGameState): any {
    return gameState.board;
  }

  // 위치 유효성 검사 (public 인터페이스 구현)
  validatePosition(position: any, boardSize?: { width: number; height: number }): boolean {
    const size = boardSize || this.getBoardSize();
    return this.validatePositionInternal(position, size);
  }

  // 보드 위치가 비어있는지 확인하는 헬퍼
  protected isPositionEmpty(board: any[][], row: number, col: number): boolean {
    return board[row] && board[row][col] === null || board[row][col] === undefined || board[row][col] === '';
  }

  // 보드 경계 내인지 확인하는 헬퍼
  protected isWithinBounds(row: number, col: number, boardSize?: { width: number; height: number }): boolean {
    const size = boardSize || this.getBoardSize();
    return row >= 0 && row < size.height && col >= 0 && col < size.width;
  }

  // 보드 복사 헬퍼
  protected cloneBoard(board: any[][]): any[][] {
    return board.map(row => [...row]);
  }

  // 보드 상태 출력 헬퍼 (디버깅용)
  protected printBoard(board: any[][]): void {
    console.log('Board state:');
    board.forEach((row, index) => {
      console.log(`${index}: [${row.map(cell => cell || ' ').join(', ')}]`);
    });
  }
}