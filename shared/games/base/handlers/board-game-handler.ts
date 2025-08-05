import type { 
  BoardGameState, 
  BoardGameHandlers 
} from '../types/game-types';
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

  // 연결 관리 메서드들 (보드 게임 공통)
  async handlePlayerDisconnect(roomId: string, playerId: string): Promise<void> {
    const gameState = await this.getGameState(roomId);
    if (!gameState || gameState.gameType !== this.getGameType()) return;

    console.log(`${this.getGameType()} 게임 플레이어 연결 해제 처리: ${playerId}`);

    // 게임에 참여 중인 플레이어인지 확인
    if (!gameState.playerIds.includes(playerId)) {
      console.log(`플레이어 ${playerId}가 ${this.getGameType()} 게임에 없음`);
      return;
    }

    // 연결 해제된 플레이어 목록에 추가 (중복 방지)
    if (!gameState.disconnectedPlayers.includes(playerId)) {
      gameState.disconnectedPlayers.push(playerId);
    }

    gameState.lastUpdated = Date.now();
    await this.storage.updateGame(roomId, gameState);

    // 클라이언트들에게 업데이트 브로드캐스트
    this.broadcastToRoom(roomId, {
      type: 'game_state',
      data: gameState
    });

    console.log(`${this.getGameType()} 게임 연결 해제 처리 완료: ${playerId}, 연결 해제된 플레이어: ${gameState.disconnectedPlayers}`);
  }

  async handlePlayerReconnect(roomId: string, playerId: string): Promise<void> {
    const gameState = await this.getGameState(roomId);
    if (!gameState || gameState.gameType !== this.getGameType()) return;

    console.log(`${this.getGameType()} 게임 플레이어 재연결 처리: ${playerId}`);

    // 게임에 참여 중인 플레이어인지 확인
    if (!gameState.playerIds.includes(playerId)) {
      console.log(`플레이어 ${playerId}가 ${this.getGameType()} 게임에 없음`);
      return;
    }

    // 연결 해제된 플레이어 목록에서 제거
    const disconnectedIndex = gameState.disconnectedPlayers.indexOf(playerId);
    if (disconnectedIndex > -1) {
      gameState.disconnectedPlayers.splice(disconnectedIndex, 1);
    }

    gameState.lastUpdated = Date.now();
    await this.storage.updateGame(roomId, gameState);

    // 클라이언트들에게 업데이트 브로드캐스트
    this.broadcastToRoom(roomId, {
      type: 'game_state',
      data: gameState
    });

    console.log(`${this.getGameType()} 게임 재연결 처리 완료: ${playerId}, 연결 해제된 플레이어: ${gameState.disconnectedPlayers}`);
  }

  async handlePlayerLeave(roomId: string, playerId: string): Promise<void> {
    const gameState = await this.getGameState(roomId);
    if (!gameState || gameState.gameType !== this.getGameType()) return;

    console.log(`${this.getGameType()} 게임 플레이어 나가기 처리: ${playerId}`);

    // 게임에 참여 중인 플레이어인지 확인
    if (!gameState.playerIds.includes(playerId)) {
      console.log(`플레이어 ${playerId}가 ${this.getGameType()} 게임에 없음`);
      return;
    }

    // 게임이 진행 중이라면 특별 처리 (기본: 상대방 승리)
    if (gameState.gameStatus === 'playing') {
      await this.handleGameAbandonment(gameState, playerId, roomId);
    }
  }

  // 게임 포기 처리 (서브클래스에서 오버라이드 가능)
  protected async handleGameAbandonment(gameState: TGameState, leavingPlayerId: string, roomId: string): Promise<void> {
    // 기본 구현: 다른 플레이어들을 승자로 처리
    const remainingPlayers = gameState.playerIds.filter(id => id !== leavingPlayerId);
    
    if (remainingPlayers.length > 0) {
      gameState.gameStatus = 'game_finished';
      gameState.winners = remainingPlayers;
      gameState.gameResult = {
        winner: remainingPlayers[0], // 첫 번째 남은 플레이어를 승자로
        reason: 'resign'
      };
      gameState.lastUpdated = Date.now();

      await this.storage.updateGame(roomId, gameState);
      await this.storage.updateRoom(roomId, { status: 'waiting' });

      // 게임 종료 브로드캐스트
      this.broadcastToRoom(roomId, {
        type: 'game_end',
        data: gameState
      });

      console.log(`${this.getGameType()} 게임 종료: ${leavingPlayerId} 나가기로 인한 ${remainingPlayers[0]} 승리`);
    }
  }
}