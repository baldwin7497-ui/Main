import type { 
  CoreGameState,
  TurnBasedGameState, 
  TurnGameHandlers,
  GameMove,
  GameResult 
} from '../types/game-types';
import { BaseGameHandler } from './base-game-handler';

// 턴 기반 게임을 위한 추상 핸들러 클래스
export abstract class BaseTurnGameHandler<
  TGameState extends TurnBasedGameState,
  TMove
> extends BaseGameHandler<TGameState> implements TurnGameHandlers<TGameState, TMove> {

  // 추상 메서드들 - 각 게임에서 구현
  protected abstract initializeGameState(roomId: string, playerIds: string[]): TGameState;
  
  // public 인터페이스 구현
  abstract validateMove(gameState: TGameState, userId: string, move: TMove): boolean;
  abstract applyMove(gameState: TGameState, userId: string, move: TMove): TGameState;
  abstract checkGameEnd(gameState: TGameState): { ended: boolean; reason?: string; winner?: string };
  abstract getValidMoves(gameState: TGameState, userId: string): TMove[];

  // 퇴출 투표 처리
  async voteKick(roomId: string, voterId: string, targetPlayerId: string, voteType: 'agree' | 'disagree'): Promise<void> {
    const gameState = await this.getGameState(roomId);
    if (!gameState || gameState.gameType !== this.getGameType()) {
      throw new Error(`Game not found or invalid type: ${roomId}`);
    }

    // 투표자가 게임에 참여 중인지 확인
    if (!gameState.playerIds.includes(voterId)) {
      throw new Error('Voter not in game');
    }

    // 대상이 게임에 참여 중인지 확인
    if (!gameState.playerIds.includes(targetPlayerId)) {
      throw new Error('Target player not in game');
    }

    // 대상이 연결이 끊어진 상태인지 확인
    if (!gameState.disconnectedPlayers.includes(targetPlayerId)) {
      throw new Error('Target player is not disconnected');
    }

    // 투표가 이미 진행 중인지 확인
    if (!gameState.kickVote || gameState.kickVote.targetPlayerId !== targetPlayerId) {
      throw new Error('No active kick vote for this player');
    }

    // 이미 투표했는지 확인
    const hasVotedAgree = gameState.kickVote.agreeVotes.includes(voterId);
    const hasVotedDisagree = gameState.kickVote.disagreeVotes.includes(voterId);
    
    if (hasVotedAgree || hasVotedDisagree) {
      throw new Error('Already voted');
    }

    // 투표 추가
    if (voteType === 'agree') {
      gameState.kickVote.agreeVotes.push(voterId);
    } else {
      gameState.kickVote.disagreeVotes.push(voterId);
    }
    
    gameState.lastUpdated = Date.now();

    // 연결된 플레이어 수 계산 (대상 제외)
    const connectedPlayers = gameState.playerIds.filter(
      id => !gameState.disconnectedPlayers.includes(id) && id !== targetPlayerId
    );
    const totalVotes = gameState.kickVote.agreeVotes.length + gameState.kickVote.disagreeVotes.length;
    
    // 모든 플레이어가 투표했거나 찬성이 반대보다 많을 때 결과 처리
    const shouldProcessVote = totalVotes >= connectedPlayers.length || 
                             gameState.kickVote.agreeVotes.length > gameState.kickVote.disagreeVotes.length;
    
    if (shouldProcessVote) {
      if (gameState.kickVote.agreeVotes.length > gameState.kickVote.disagreeVotes.length) {
        // 찬성이 더 많으면 퇴출
        await this.kickPlayer(gameState, targetPlayerId, roomId);
      } else {
        // 반대가 더 많거나 동점이면 투표 종료만
        gameState.kickVote = undefined;
        console.log(`📊 [${this.getGameType()}] 퇴출 투표 실패 - 반대가 더 많음`);
      }
    }

    await this.storage.updateGame(roomId, gameState);
    
    // 클라이언트들에게 브로드캐스트
    this.broadcastToRoom(roomId, {
      type: 'game_state',
      data: gameState
    });
  }

  // 플레이어 퇴출 처리
  private async kickPlayer(gameState: TGameState, playerId: string, roomId: string): Promise<void> {
    console.log(`Kicking player ${playerId} from game ${roomId}`);
    
    // 플레이어를 게임에서 제거
    gameState.playerIds = gameState.playerIds.filter(id => id !== playerId);
    gameState.disconnectedPlayers = gameState.disconnectedPlayers.filter(id => id !== playerId);
    
    // 퇴출된 플레이어가 현재 플레이어였다면 다음 플레이어로 턴 변경
    if (gameState.currentPlayer === playerId) {
      if (gameState.playerIds.length > 0) {
        gameState.currentPlayer = this.getNextPlayer(gameState);
      }
    }
    
    // 투표 정보 제거
    gameState.kickVote = undefined;
    
    // 게임 종료 조건 확인
    if (gameState.playerIds.length < 2) {
      if (gameState.playerIds.length === 1) {
        gameState.gameStatus = 'game_finished';
        gameState.winners = gameState.playerIds;
        gameState.gameResult = {
          winner: gameState.playerIds[0],
          reason: 'other'
        };
      } else {
        gameState.gameStatus = 'game_finished';
        gameState.gameResult = {
          reason: 'other'
        };
      }
      
      await this.storage.updateRoom(roomId, { status: 'waiting' });
    }
    
    gameState.lastUpdated = Date.now();
  }

  // 연결이 끊어진 플레이어의 턴 처리
  async handleDisconnectedPlayerTurn(roomId: string): Promise<void> {
    console.log(`🎯 [${this.getGameType()}] handleDisconnectedPlayerTurn 호출됨 - roomId: ${roomId}`);
    
    const gameState = await this.getGameState(roomId);
    if (!gameState || gameState.gameType !== this.getGameType()) {
      console.log(`❌ [${this.getGameType()}] 게임 상태 없음 또는 타입 불일치`);
      return;
    }

    const currentPlayer = gameState.currentPlayer;
    console.log(`🔍 [${this.getGameType()}] 현재 플레이어: ${currentPlayer}, 연결 해제된 플레이어들: [${gameState.disconnectedPlayers.join(', ')}]`);
    
    // 현재 플레이어가 연결이 끊어진 상태인지 확인
    if (!gameState.disconnectedPlayers.includes(currentPlayer)) {
      console.log(`⚠️ [${this.getGameType()}] 현재 플레이어가 연결 해제 상태가 아님 - 투표 시작하지 않음`);
      return;
    }

    // 이미 투표가 진행 중인지 확인
    if (gameState.kickVote && gameState.kickVote.targetPlayerId === currentPlayer) {
      // 투표 시간이 끝났는지 확인
      if (Date.now() > gameState.kickVote.voteEndTime) {
        // 투표 시간 끝남 - 시간초과시 자동으로 퇴출
        console.log(`⏰ [${this.getGameType()}] 투표 시간 초과 - 플레이어 ${currentPlayer} 자동 퇴출`);
        await this.kickPlayer(gameState, currentPlayer, roomId);
        
        await this.storage.updateGame(roomId, gameState);
        this.broadcastToRoom(roomId, {
          type: 'game_state',
          data: gameState
        });
        
        // 게임이 종료되지 않았다면 다음 플레이어도 연결 해제 상태인지 확인
        if (gameState.gameStatus !== 'game_finished') {
          const nextPlayerDisconnected = gameState.disconnectedPlayers.includes(gameState.currentPlayer);
          console.log(`🔄 [${this.getGameType()}] 다음 플레이어: ${gameState.currentPlayer}, 연결 해제됨: ${nextPlayerDisconnected}`);
          
          if (nextPlayerDisconnected) {
            console.log(`🔁 [${this.getGameType()}] 다음 플레이어도 연결 해제 상태 - 1초 후 다시 투표 시작`);
            setTimeout(() => {
              this.handleDisconnectedPlayerTurn(roomId);
            }, 1000); // 1초 후 투표 시작
          }
        }
      }
      return;
    }

    // 새로운 투표 시작
    console.log(`🗳️ [${this.getGameType()}] 새로운 투표 시작! 대상: ${currentPlayer}`);
    
    gameState.kickVote = {
      targetPlayerId: currentPlayer,
      agreeVotes: [],
      disagreeVotes: [],
      voteStartTime: Date.now(),
      voteEndTime: Date.now() + 10000 // 10초
    };

    await this.storage.updateGame(roomId, gameState);
    
    console.log(`📡 [${this.getGameType()}] 투표 상태 브로드캐스트 중...`);
    
    // 클라이언트들에게 브로드캐스트
    this.broadcastToRoom(roomId, {
      type: 'game_state',
      data: gameState
    });

    // 10초 후 자동으로 투표 종료
    setTimeout(async () => {
      try {
        await this.handleDisconnectedPlayerTurn(roomId);
      } catch (error) {
        console.error('Error handling vote timeout:', error);
      }
    }, 10000);
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
    let shouldStartVote = false;
    
    if (!gameEndCheck.ended) {
      newGameState.currentPlayer = this.getNextPlayer(newGameState);
      newGameState.turnCount++;
      
      // 게임 상태 저장 후 다음 플레이어가 연결이 끊어진 상태인지 확인
      shouldStartVote = newGameState.disconnectedPlayers.includes(newGameState.currentPlayer);
      console.log(`🔍 [${this.getGameType()}] 다음 플레이어: ${newGameState.currentPlayer}, 연결 해제됨: ${shouldStartVote}, 연결 해제된 플레이어들: [${newGameState.disconnectedPlayers.join(', ')}]`);
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
      
      // 다음 플레이어가 연결이 끊어진 상태면 투표 시작
      if (shouldStartVote) {
        console.log(`🗳️ [${this.getGameType()}] 1초 후 투표 시작 예약됨 - 대상: ${newGameState.currentPlayer}`);
        setTimeout(() => {
          this.handleDisconnectedPlayerTurn(roomId);
        }, 1000); // 1초 후 투표 시작
      }
    }
  }

  // 다음 플레이어 결정 (기본: 순환)
  protected getNextPlayer(gameState: TGameState): string {
    const currentIndex = gameState.playerIds.indexOf(gameState.currentPlayer);
    const nextIndex = (currentIndex + 1) % gameState.playerIds.length;
    return gameState.playerIds[nextIndex];
  }

  // 연결된 다음 플레이어 찾기 (투표 시간 종료 후 사용)
  protected getNextConnectedPlayer(gameState: TGameState): string {
    const currentIndex = gameState.playerIds.indexOf(gameState.currentPlayer);
    
    // 연결이 끊어지지 않은 플레이어들만 필터링
    const connectedPlayers = gameState.playerIds.filter(
      playerId => !gameState.disconnectedPlayers.includes(playerId)
    );
    
    // 모든 플레이어가 연결이 끊어진 경우 원래 로직 사용
    if (connectedPlayers.length === 0) {
      const nextIndex = (currentIndex + 1) % gameState.playerIds.length;
      return gameState.playerIds[nextIndex];
    }
    
    // 다음 연결된 플레이어 찾기
    let nextIndex = (currentIndex + 1) % gameState.playerIds.length;
    let nextPlayer = gameState.playerIds[nextIndex];
    
    // 연결된 플레이어 찾을 때까지 계속 찾기
    while (gameState.disconnectedPlayers.includes(nextPlayer) && nextIndex !== currentIndex) {
      nextIndex = (nextIndex + 1) % gameState.playerIds.length;
      nextPlayer = gameState.playerIds[nextIndex];
    }
    
    return nextPlayer;
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
      category: 'turn-based' as const,
      playerIds,
      gameStatus: 'playing' as const,
      currentPlayer: playerIds[0], // 첫 번째 플레이어부터 시작
      turnCount: 1,
      gameHistory: [],
      disconnectedPlayers: [], // 초기화
      winners: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      ...additionalData
    };

    return baseState as unknown as TGameState;
  }

  // 연결 관리는 BaseGameHandler에서 처리
  // 필요시 onPlayerDisconnect, onPlayerReconnect, onPlayerLeave 메서드를 오버라이드하여 게임별 추가 로직 구현
}