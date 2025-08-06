import type { 
  CoreGameState,
  CoreGameHandlers
} from '../types/game-types';

// 모든 게임 핸들러의 기본 클래스
export abstract class BaseGameHandler<
  TGameState extends CoreGameState
> implements CoreGameHandlers<TGameState> {
  
  protected storage: any;
  protected broadcastToRoom: Function;
  
  constructor(storage: any, broadcastToRoom: Function) {
    this.storage = storage;
    this.broadcastToRoom = broadcastToRoom;
  }

  // 추상 메서드들 - 각 게임에서 구현
  protected abstract getGameType(): string;

  // CoreGameHandlers 인터페이스 구현
  async createGame(roomId: string, playerIds: string[]): Promise<TGameState> {
    const gameState = this.initializeGameState(roomId, playerIds);
    await this.storage.updateGame(roomId, gameState);
    console.log(`${this.getGameType()} game created:`, gameState);
    return gameState;
  }

  async getGameState(roomId: string): Promise<TGameState | null> {
    return await this.storage.getGame(roomId) as TGameState | null;
  }

  async endGame(roomId: string, reason?: string): Promise<void> {
    const gameState = await this.getGameState(roomId);
    if (!gameState) return;

    gameState.gameStatus = 'game_finished';
    gameState.lastUpdated = Date.now();
    
    if (reason) {
      (gameState as any).gameResult = {
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

  // 연결 관리 메서드들 (모든 게임 공통)
  async handlePlayerDisconnect(roomId: string, playerId: string): Promise<void> {
    const gameState = await this.getGameState(roomId);
    console.log(`🔍 [${this.getGameType()}] 연결 해제 처리 시작 - playerId: ${playerId}, gameState:`, gameState ? `found (type: ${gameState.gameType})` : 'null');
    
    if (!gameState) {
      console.log(`❌ [${this.getGameType()}] 게임 상태를 찾을 수 없음 - roomId: ${roomId}`);
      return;
    }
    
    if (gameState.gameType !== this.getGameType()) {
      console.log(`❌ [${this.getGameType()}] 게임 타입 불일치 - expected: ${this.getGameType()}, actual: ${gameState.gameType}`);
      return;
    }

    console.log(`✅ [${this.getGameType()}] 게임 플레이어 연결 해제 처리 시작: ${playerId}`);

    // 게임에 참여 중인 플레이어인지 확인
    if (!gameState.playerIds.includes(playerId)) {
      console.log(`❌ [${this.getGameType()}] 플레이어 ${playerId}가 게임에 없음 - playerIds: ${gameState.playerIds}`);
      return;
    }

    console.log(`🔍 [${this.getGameType()}] 연결 해제 전 상태 - disconnectedPlayers: [${gameState.disconnectedPlayers.join(', ')}]`);

    // 연결 해제된 플레이어 목록에 추가 (중복 방지)
    if (!gameState.disconnectedPlayers.includes(playerId)) {
      gameState.disconnectedPlayers.push(playerId);
      console.log(`✅ [${this.getGameType()}] 플레이어 ${playerId}를 disconnectedPlayers에 추가`);
    } else {
      console.log(`⚠️ [${this.getGameType()}] 플레이어 ${playerId}는 이미 disconnectedPlayers에 있음`);
    }

    gameState.lastUpdated = Date.now();
    await this.storage.updateGame(roomId, gameState);

    console.log(`🔍 [${this.getGameType()}] 연결 해제 후 상태 - disconnectedPlayers: [${gameState.disconnectedPlayers.join(', ')}]`);

    // 게임별 특수 처리
    await this.onPlayerDisconnect(gameState, playerId);

    // 클라이언트들에게 업데이트 브로드캐스트
    this.broadcastToRoom(roomId, {
      type: 'game_state',
      data: gameState
    });

    console.log(`✅ [${this.getGameType()}] 게임 연결 해제 처리 완료: ${playerId}, 연결 해제된 플레이어: [${gameState.disconnectedPlayers.join(', ')}]`);
  }

  async handlePlayerReconnect(roomId: string, playerId: string): Promise<void> {
    const gameState = await this.getGameState(roomId);
    console.log(`🔍 [${this.getGameType()}] 재연결 처리 시작 - playerId: ${playerId}, gameState:`, gameState ? `found (type: ${gameState.gameType})` : 'null');
    
    if (!gameState) {
      console.log(`❌ [${this.getGameType()}] 게임 상태를 찾을 수 없음 - roomId: ${roomId}`);
      return;
    }
    
    if (gameState.gameType !== this.getGameType()) {
      console.log(`❌ [${this.getGameType()}] 게임 타입 불일치 - expected: ${this.getGameType()}, actual: ${gameState.gameType}`);
      return;
    }

    console.log(`✅ [${this.getGameType()}] 게임 플레이어 재연결 처리 시작: ${playerId}`);

    // 게임에 참여 중인 플레이어인지 확인
    if (!gameState.playerIds.includes(playerId)) {
      console.log(`❌ [${this.getGameType()}] 플레이어 ${playerId}가 게임에 없음 - playerIds: ${gameState.playerIds}`);
      return;
    }

    console.log(`🔍 [${this.getGameType()}] 재연결 전 상태 - disconnectedPlayers: [${gameState.disconnectedPlayers.join(', ')}]`);

    // 연결 해제된 플레이어 목록에서 제거
    const disconnectedIndex = gameState.disconnectedPlayers.indexOf(playerId);
    if (disconnectedIndex > -1) {
      gameState.disconnectedPlayers.splice(disconnectedIndex, 1);
      console.log(`✅ [${this.getGameType()}] 플레이어 ${playerId}를 disconnectedPlayers에서 제거`);
    } else {
      console.log(`⚠️ [${this.getGameType()}] 플레이어 ${playerId}는 disconnectedPlayers에 없음`);
    }

    gameState.lastUpdated = Date.now();
    await this.storage.updateGame(roomId, gameState);

    console.log(`🔍 [${this.getGameType()}] 재연결 후 상태 - disconnectedPlayers: [${gameState.disconnectedPlayers.join(', ')}]`);

    // 게임별 특수 처리
    await this.onPlayerReconnect(gameState, playerId);

    // 클라이언트들에게 업데이트 브로드캐스트
    this.broadcastToRoom(roomId, {
      type: 'game_state',
      data: gameState
    });

    // 재연결된 플레이어에게 진행 중인 투표 취소 (턴 기반 게임인 경우)
    if ('kickVote' in gameState && (gameState as any).kickVote?.targetPlayerId === playerId) {
      (gameState as any).kickVote = undefined;
      await this.storage.updateGame(roomId, gameState);
      
      // 재연결 후 상태 다시 브로드캐스트
      this.broadcastToRoom(roomId, {
        type: 'game_state',
        data: gameState
      });
    }

    console.log(`✅ [${this.getGameType()}] 게임 재연결 처리 완료: ${playerId}, 연결 해제된 플레이어: [${gameState.disconnectedPlayers.join(', ')}]`);
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

    // 게임별 특수 처리
    await this.onPlayerLeave(gameState, playerId);

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
      (gameState as any).gameResult = {
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

  // 추상 메서드 - 각 게임에서 구현
  protected abstract initializeGameState(roomId: string, playerIds: string[]): TGameState;

  // 게임별 특수 처리 메서드들 (서브클래스에서 오버라이드 가능)
  protected async onPlayerDisconnect(gameState: TGameState, playerId: string): Promise<void> {
    // 턴 기반 게임이고 연결 해제된 플레이어가 현재 플레이어인 경우에만 투표 시작
    if ('currentPlayer' in gameState && gameState.currentPlayer === playerId) {
      // 1초 후 투표 시작 (게임 상태가 업데이트되고 브로드캐스트된 후)
      setTimeout(() => {
        this.handleDisconnectedPlayerTurnIfSupported(gameState.roomId);
      }, 1000);
    }
  }

  // 턴 기반 핸들러의 handleDisconnectedPlayerTurn 메서드 호출 (있다면)
  private async handleDisconnectedPlayerTurnIfSupported(roomId: string): Promise<void> {
    if ('handleDisconnectedPlayerTurn' in this && typeof (this as any).handleDisconnectedPlayerTurn === 'function') {
      try {
        await (this as any).handleDisconnectedPlayerTurn(roomId);
      } catch (error) {
        console.error('Error handling disconnected player turn:', error);
      }
    }
  }

  protected async onPlayerReconnect(gameState: TGameState, playerId: string): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
    // 서브클래스에서 필요시 오버라이드
  }

  protected async onPlayerLeave(gameState: TGameState, playerId: string): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
    // 서브클래스에서 필요시 오버라이드
  }
} 