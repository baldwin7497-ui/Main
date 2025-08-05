import type { 
  CoreGameState,
  TurnBasedGameState, 
  TurnGameHandlers,
  GameMove,
  GameResult 
} from './game-types';

// 턴 기반 게임을 위한 추상 핸들러 클래스
export abstract class BaseTurnGameHandler<
  TGameState extends TurnBasedGameState,
  TMove
> implements TurnGameHandlers<TGameState, TMove> {

  protected storage: any;
  protected broadcastToRoom: Function;

  constructor(storage: any, broadcastToRoom: Function) {
    this.storage = storage;
    this.broadcastToRoom = broadcastToRoom;
  }

  // 추상 메서드들 - 각 게임에서 구현
  protected abstract getGameType(): string;
  protected abstract initializeGameState(roomId: string, playerIds: string[]): TGameState;
  
  // public 인터페이스 구현
  abstract validateMove(gameState: TGameState, userId: string, move: TMove): boolean;
  abstract applyMove(gameState: TGameState, userId: string, move: TMove): TGameState;
  abstract checkGameEnd(gameState: TGameState): { ended: boolean; reason?: string; winner?: string };
  abstract getValidMoves(gameState: TGameState, userId: string): TMove[];

  // 게임 생성
  async createGame(roomId: string, playerIds: string[]): Promise<TGameState> {
    const gameState = this.initializeGameState(roomId, playerIds);
    await this.storage.updateGame(roomId, gameState);
    console.log(`${this.getGameType()} turn-based game created:`, gameState);
    return gameState;
  }

  // 게임 상태 조회
  async getGameState(roomId: string): Promise<TGameState | null> {
    return await this.storage.getGame(roomId) as TGameState | null;
  }

  // 이동 처리
  async makeMove(roomId: string, userId: string, move: TMove): Promise<void> {
    const gameState = await this.getGameState(roomId);
    if (!gameState || gameState.gameType !== this.getGameType()) {
      throw new Error(`Game not found or invalid type: ${roomId}`);
    }

    // 게임이 끝났는지 확인
    if (gameState.gameStatus === 'game_finished') {
      throw new Error('Game is already finished');
    }

    // 현재 플레이어인지 확인
    if (gameState.currentPlayer !== userId) {
      throw new Error('Not your turn');
    }

    // 플레이어가 게임에 참여 중인지 확인
    if (!gameState.playerIds.includes(userId)) {
      throw new Error('Player not in game');
    }

    // 이동 유효성 검사
    if (!this.validateMove(gameState, userId, move)) {
      throw new Error('Invalid move');
    }

    // 이동 적용
    const newGameState = this.applyMove(gameState, userId, move);
    
    // 게임 이력에 이동 추가
    const gameMove: GameMove = {
      playerId: userId,
      moveNumber: newGameState.turnCount,
      timestamp: Date.now(),
      data: move
    };
    newGameState.gameHistory.push(gameMove);
    newGameState.lastUpdated = Date.now();

    // 다음 플레이어로 턴 넘기기 (게임이 끝나지 않았다면)
    const gameEndCheck = this.checkGameEnd(newGameState);
    if (!gameEndCheck.ended) {
      newGameState.currentPlayer = this.getNextPlayer(newGameState);
      newGameState.turnCount++;
    } else {
      // 게임 종료 처리
      newGameState.gameStatus = 'game_finished';
      if (gameEndCheck.winner) {
        newGameState.winners = [gameEndCheck.winner];
      }
      if (gameEndCheck.reason) {
        newGameState.gameResult = {
          winner: gameEndCheck.winner,
          reason: gameEndCheck.reason as any
        };
      }

      // 방 상태를 대기로 변경
      await this.storage.updateRoom(roomId, { status: 'waiting' });
    }

    // 게임 상태 저장
    await this.storage.updateGame(roomId, newGameState);

    // 클라이언트들에게 브로드캐스트
    if (gameEndCheck.ended) {
      this.broadcastToRoom(roomId, {
        type: 'game_end',
        data: newGameState
      });
    } else {
      this.broadcastToRoom(roomId, {
        type: 'game_state',
        data: newGameState
      });
    }
  }

  // 게임 종료
  async endGame(roomId: string, reason?: string): Promise<void> {
    const gameState = await this.getGameState(roomId);
    if (!gameState) return;

    gameState.gameStatus = 'game_finished';
    gameState.lastUpdated = Date.now();
    
    if (reason) {
      gameState.gameResult = {
        reason: reason as any
      };
    }

    await this.storage.updateGame(roomId, gameState);
    await this.storage.updateRoom(roomId, { status: 'waiting' });

    this.broadcastToRoom(roomId, {
      type: 'game_end',
      data: gameState
    });
  }

  // 다음 플레이어 결정 (기본: 순환)
  protected getNextPlayer(gameState: TGameState): string {
    const currentIndex = gameState.playerIds.indexOf(gameState.currentPlayer);
    const nextIndex = (currentIndex + 1) % gameState.playerIds.length;
    return gameState.playerIds[nextIndex];
  }

  // 기본 게임 상태 생성 헬퍼
  protected createBaseTurnGameState(
    roomId: string, 
    playerIds: string[], 
    gameType: string,
    additionalData: Partial<TGameState> = {}
  ): TGameState {
    const baseState = {
      roomId,
      gameType,
      playerIds,
      gameStatus: 'playing' as const,
      currentPlayer: playerIds[0], // 첫 번째 플레이어부터 시작
      turnCount: 1,
      gameHistory: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      ...additionalData
    };

    return baseState as unknown as TGameState;
  }
}