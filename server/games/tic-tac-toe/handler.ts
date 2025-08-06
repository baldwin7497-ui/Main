import { BaseTurnGameHandler } from "@shared/games/base/handlers/turn-based-game-handler";
import type { 
  TicTacToeGameState,
  TicTacToeMove,
  TicTacToePosition,
  TicTacToeBoard,
  TicTacToeSymbol,
  TicTacToeCell
} from "@shared/games/tic-tac-toe/schema";
import { TIC_TAC_TOE_CONFIG, TIC_TAC_TOE_WIN_CONDITIONS } from "@shared/games/tic-tac-toe/schema";

export class TicTacToeHandler extends BaseTurnGameHandler<
  TicTacToeGameState,
  TicTacToeMove
> {
  protected getGameType(): string {
    return 'tic-tac-toe';
  }

  protected initializeGameState(roomId: string, playerIds: string[]): TicTacToeGameState {
    if (playerIds.length !== 2) {
      throw new Error('Tic-tac-toe requires exactly 2 players');
    }

    // 플레이어별 심볼 할당 (첫 번째 플레이어는 X, 두 번째는 O)
    const playerSymbols: Record<string, TicTacToeSymbol> = {
      [playerIds[0]]: 'X',
      [playerIds[1]]: 'O'
    };

    return this.createBaseTurnGameState(roomId, playerIds, this.getGameType(), {
      category: 'board-game',
      board: this.initializeBoard(),
      boardSize: { width: 3, height: 3 },
      playerSymbols,
      disconnectedPlayers: []
    });
  }

  // 보드 초기화
  private initializeBoard(): TicTacToeBoard {
    return [
      [null, null, null],
      [null, null, null],
      [null, null, null]
    ];
  }

  // 위치 유효성 검사
  private validatePosition(position: TicTacToePosition): boolean {
    return position.row >= 0 && position.row < 3 && position.col >= 0 && position.col < 3;
  }

  // 보드 복사 헬퍼
  private cloneBoard(board: TicTacToeBoard): TicTacToeBoard {
    return board.map(row => [...row]);
  }

  // 위치가 비어있는지 확인
  private isPositionEmpty(board: TicTacToeBoard, row: number, col: number): boolean {
    return board[row] && board[row][col] === null;
  }

  // 보드 경계 내인지 확인
  private isWithinBounds(row: number, col: number): boolean {
    return row >= 0 && row < 3 && col >= 0 && col < 3;
  }

  public validateMove(gameState: TicTacToeGameState, userId: string, move: TicTacToeMove): boolean {
    const { position } = move;
    
    // 보드 범위 내인지 확인
    if (!this.isWithinBounds(position.row, position.col)) {
      return false;
    }

    // 해당 위치가 비어있는지 확인
    if (!this.isPositionEmpty(gameState.board, position.row, position.col)) {
      return false;
    }

    // 플레이어의 심볼과 이동의 심볼이 일치하는지 확인
    const playerSymbol = gameState.playerSymbols[userId];
    if (move.symbol !== playerSymbol) {
      return false;
    }

    return true;
  }

  public applyMove(gameState: TicTacToeGameState, userId: string, move: TicTacToeMove): TicTacToeGameState {
    // 게임 상태 복사
    const newGameState = { ...gameState };
    newGameState.board = this.cloneBoard(gameState.board);

    // 이동 적용
    const { position, symbol } = move;
    newGameState.board[position.row][position.col] = symbol;

    return newGameState;
  }

  public checkGameEnd(gameState: TicTacToeGameState): { ended: boolean; reason?: string; winner?: string } {
    // 승리 조건 확인
    const winner = this.checkWinner(gameState.board);
    if (winner) {
      const winnerPlayerId = Object.keys(gameState.playerSymbols).find(
        playerId => gameState.playerSymbols[playerId] === winner
      );
      return {
        ended: true,
        reason: 'three_line',
        winner: winnerPlayerId
      };
    }

    // 무승부 확인 (보드가 다 찼는지)
    if (this.isBoardFull(gameState.board)) {
      return {
        ended: true,
        reason: 'draw_offer'
      };
    }

    return { ended: false };
  }

  public getValidMoves(gameState: TicTacToeGameState, userId: string): TicTacToeMove[] {
    const moves: TicTacToeMove[] = [];
    const playerSymbol = gameState.playerSymbols[userId];

    if (!playerSymbol) return moves;

    // 빈 칸들을 찾아서 유효한 이동 목록 생성
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (this.isPositionEmpty(gameState.board, row, col)) {
          moves.push({
            position: { row, col },
            symbol: playerSymbol
          });
        }
      }
    }

    return moves;
  }

  // 승자 확인
  private checkWinner(board: TicTacToeBoard): TicTacToeSymbol | null {
    for (const condition of TIC_TAC_TOE_WIN_CONDITIONS) {
      const [pos1, pos2, pos3] = condition;
      const cell1 = board[pos1[0]][pos1[1]];
      const cell2 = board[pos2[0]][pos2[1]];
      const cell3 = board[pos3[0]][pos3[1]];

      if (cell1 && cell1 === cell2 && cell2 === cell3) {
        return cell1;
      }
    }
    return null;
  }

  // 보드가 꽉 찼는지 확인
  private isBoardFull(board: TicTacToeBoard): boolean {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (this.isPositionEmpty(board, row, col)) {
          return false;
        }
      }
    }
    return true;
  }

  // 게임별 특수 처리 메서드들 (베이스 클래스의 공통 로직 사용)
  protected async onPlayerDisconnect(game: TicTacToeGameState, playerId: string): Promise<void> {
    // 현재 턴이 연결 해제된 플레이어라면 다음 플레이어로 턴 이동
    if (game.currentPlayer === playerId) {
      console.log(`현재 턴 플레이어가 연결 해제됨: ${playerId}`);
      game.currentPlayer = this.getNextPlayer(game);
    }
  }

  protected async onPlayerLeave(game: TicTacToeGameState, playerId: string): Promise<void> {
    // 플레이어 제거
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex !== -1) {
      game.playerIds.splice(playerIndex, 1);
    }
    
    // 게임 데이터 정리
    delete game.playerSymbols[playerId];

    // 현재 턴이 나간 플레이어라면 다음 플레이어로 턴 이동
    if (game.currentPlayer === playerId) {
      console.log(`현재 턴 플레이어가 나감: ${playerId}`);
      if (game.playerIds.length > 0) {
        game.currentPlayer = game.playerIds[0]; // 첫 번째 남은 플레이어로 설정
      }
    }

    // 게임 종료 처리 (플레이어가 나가면 게임 종료)
    game.gameStatus = 'game_finished';
    game.winners = game.playerIds; // 남은 플레이어가 승자
    await this.storage.updateRoom(game.roomId, { status: 'waiting' });
  }
}

// 팩토리 함수 (기존 코드와의 호환성을 위해)
export function createTicTacToeHandlers(broadcastToRoom: Function) {
  const handler = new TicTacToeHandler(
    require("../../storage").storage,
    broadcastToRoom
  );

  return {
    makeMove: handler.makeMove.bind(handler),
    createGame: handler.createGame.bind(handler),
    getGameState: handler.getGameState.bind(handler),
    endGame: handler.endGame.bind(handler),
    getValidMoves: handler.getValidMoves.bind(handler)
  };
}