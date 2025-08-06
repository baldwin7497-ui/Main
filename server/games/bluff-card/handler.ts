// BluffCard Game Handler - 턴 기반 블러핑 카드 게임
import { BaseTurnGameHandler } from "@shared/games/base/handlers/turn-based-game-handler";
import type { 
  BluffCardNumber, 
  BluffCardGameState, 
  BluffCardPlayMessage,
  BluffCardChallengeMessage,
  PlayerHand,
  PlayedCards
} from "@shared/games/bluff-card/schema";
import { BLUFF_CARD_CONFIG } from "@shared/games/bluff-card/schema";
import type { GameMove } from "@shared/games/base/types/game-types";

/**
 * 블러프 카드 게임 핸들러
 * 
 * 게임 규칙:
 * - 각 플레이어는 5장의 카드로 시작
 * - 턴마다 공개된 타겟 숫자가 있음
 * - 플레이어는 1~4장의 카드를 내며 진실/거짓 주장
 * - 다른 플레이어들은 3초 내에 이의제기 가능
 * - 이의제기 성공 시 블러핑한 플레이어가 패널티
 * - 이의제기 실패 시 이의제기한 플레이어가 패널티
 * - 먼저 모든 카드를 소진한 플레이어가 승리
 */
export class BluffCardHandler extends BaseTurnGameHandler<
  BluffCardGameState,
  BluffCardPlayMessage | BluffCardChallengeMessage
> {
  private challengeTimer: NodeJS.Timeout | null = null;

  protected getGameType(): string {
    return 'bluff-card';
  }

  // ============================================================================
  // 턴 기반 게임 핵심 메서드 구현
  // ============================================================================

  public validateMove(gameState: BluffCardGameState, userId: string, move: BluffCardPlayMessage | BluffCardChallengeMessage): boolean {
    if (move.type === 'bluff_card_play') {
      return this.validateCardPlay(gameState, userId, move);
    } else if (move.type === 'bluff_card_challenge') {
      return this.validateChallenge(gameState, userId, move);
    }
    return false;
  }

  public applyMove(gameState: BluffCardGameState, userId: string, move: BluffCardPlayMessage | BluffCardChallengeMessage): BluffCardGameState {
    const newState = { ...gameState };
    
    if (move.type === 'bluff_card_play') {
      this.applyCardPlay(newState, userId, move);
    } else if (move.type === 'bluff_card_challenge') {
      this.applyChallenge(newState, userId, move);
    }
    
    return newState;
  }

  public checkGameEnd(gameState: BluffCardGameState): { ended: boolean; reason?: string; winner?: string } {
    console.log(`🔍 [블러프카드] checkGameEnd 호출됨`);
    
    const winners = gameState.playerIds.filter(playerId => 
      !gameState.eliminatedPlayers.includes(playerId) && 
      gameState.playerHands[playerId]?.cards.length === 0
    );
    
    if (winners.length > 0) {
      console.log(`🏆 [블러프카드] 승자 있음: ${winners[0]} (카드 다 소진)`);
      return { ended: true, reason: 'cards_empty', winner: winners[0] };
    }
    
    // 연결된 플레이어가 1명 이하이면 게임 종료 (투표 중인 경우는 제외)
    const activePlayers = gameState.playerIds.filter(id => 
      !gameState.disconnectedPlayers.includes(id)
    );
    
    // 투표가 진행 중이면 게임을 계속 진행 (연결된 플레이어가 1명이어도)
    const hasActiveVote = !!(gameState.kickVote && Date.now() <= gameState.kickVote.voteEndTime);
    
    console.log(`👥 [블러프카드] 연결된 플레이어: ${activePlayers.length}명 [${activePlayers.join(', ')}]`);
    console.log(`🗳️ [블러프카드] 투표 진행 중: ${hasActiveVote}, 투표 정보:`, gameState.kickVote);
    
    if (activePlayers.length < 1 || (activePlayers.length === 1 && !hasActiveVote)) {
      console.log(`🔚 [블러프카드] 게임 종료: 플레이어 부족 (활성: ${activePlayers.length}, 투표 중: ${hasActiveVote})`);
      return { ended: true, reason: 'insufficient_players', winner: activePlayers[0] };
    }
    
    console.log(`✅ [블러프카드] 게임 계속 진행`);
    return { ended: false };
  }

  public getValidMoves(gameState: BluffCardGameState, userId: string): (BluffCardPlayMessage | BluffCardChallengeMessage)[] {
    const validMoves: (BluffCardPlayMessage | BluffCardChallengeMessage)[] = [];
    
    if (gameState.currentPlayer === userId && !gameState.challengeWindow) {
      // 현재 플레이어는 카드를 낼 수 있음
      const playerHand = gameState.playerHands[userId];
      if (playerHand && playerHand.cards.length > 0) {
        // 실제 구현에서는 모든 가능한 카드 조합을 반환해야 하지만,
        // 여기서는 간단한 예시만 제공
        validMoves.push({
          type: 'bluff_card_play',
          cards: [playerHand.cards[0]],
          cardIndices: [0],
          claimedNumber: gameState.currentTarget,
          claimedCount: 1,
          claimedTruth: true,
          actualTruth: playerHand.cards[0] === gameState.currentTarget
        });
      }
    } else if (gameState.challengeWindow && gameState.currentPlayer !== userId) {
      // 다른 플레이어들은 이의제기 가능
      validMoves.push({
        type: 'bluff_card_challenge',
        challenge: true
      });
    }
    
    return validMoves;
  }

  // ============================================================================
  // 게임 상태 초기화
  // ============================================================================

  protected initializeGameState(roomId: string, playerIds: string[]): BluffCardGameState {
    // 기존 게임 상태가 있다면 완전히 제거
    this.storage.deleteGame(roomId);
    
    const playerHands: Record<string, PlayerHand> = {};
    playerIds.forEach(playerId => {
      playerHands[playerId] = {
        cards: this.generateInitialHand(),
        penaltyCardIndices: []
      };
    });

    const baseState = this.createBaseTurnGameState(roomId, playerIds, 'bluff-card', {
      category: 'turn-based' as const,
      playerHands,
      currentTarget: this.generateTarget(),
      turnTimeLeft: 30,
      playedCards: null,
      challengeWindow: false,
      challengeTimeLeft: 3,
      challengingPlayers: [],
      currentChallengeResult: undefined, // 이의제기 결과 초기화
      roundHistory: [],
      eliminatedPlayers: [],
      disconnectedPlayers: []
    });
    
    return baseState;
  }

  // ============================================================================
  // 블러프 카드 게임 특수 로직
  // ============================================================================

  async makeMove(roomId: string, userId: string, move: BluffCardPlayMessage | BluffCardChallengeMessage): Promise<void> {
    // 블러프 카드는 특수한 로직(이의제기 창, 타이머)이 있어서 부모 클래스의 makeMove를 직접 사용할 수 없음
    // 대신 유효성 검사와 기본적인 게임 상태 체크는 여기서 수행
    const gameState = await this.getGameState(roomId);
    if (!gameState || gameState.gameType !== this.getGameType()) {
      throw new Error(`Game not found or invalid type: ${roomId}`);
    }

    // 게임이 끝났는지 확인
    if (gameState.gameStatus === 'game_finished') {
      throw new Error('Game is already finished');
    }

    // 플레이어가 게임에 참여 중인지 확인
    if (!gameState.playerIds.includes(userId)) {
      throw new Error('Player not in game');
    }

    // 블러프 카드 특수 로직 처리
    if (move.type === 'bluff_card_play') {
      await this.handleCardPlay(roomId, userId, move);
    } else if (move.type === 'bluff_card_challenge') {
      await this.handleChallenge(roomId, userId, move);
    }
  }

  private async handleCardPlay(roomId: string, playerId: string, message: BluffCardPlayMessage): Promise<void> {
    const game = await this.getGameState(roomId);
    if (!game || !this.validateCardPlay(game, playerId, message)) {
      return;
    }

    // 서버에서 실제 진실 여부를 계산 (보안)
    const actualTruth = message.cards.every(card => card === game.currentTarget);

    // 플레이한 카드 정보 저장
    game.playedCards = {
      playerId,
      cards: message.cards,
      cardIndices: message.cardIndices,
      claimedNumber: message.claimedNumber,
      claimedCount: message.claimedCount,
      claimedTruth: message.claimedTruth,
      actualTruth,
      revealed: false
    };

    // 이의제기 창 열기
    game.challengeWindow = true;
    game.challengeTimeLeft = 3;
    game.challengingPlayers = [];
    game.lastUpdated = Date.now();

    await this.storage.updateGame(roomId, game);
    this.broadcastToRoom(roomId, { type: 'game_update', data: game });

    // 3초 후 이의제기 처리
    this.scheduleChallengeWindowClose(roomId);
  }

  private async handleChallenge(roomId: string, playerId: string, message: BluffCardChallengeMessage): Promise<void> {
    const game = await this.getGameState(roomId);
    if (!game || !this.validateChallenge(game, playerId, message)) return;
    
    if (message.challenge && !game.challengingPlayers.includes(playerId)) {
      game.challengingPlayers.push(playerId);
      
      // 첫 번째 이의제기 시에만 타이머 리셋하고 3초 대기
      if (game.challengingPlayers.length === 1) {
        this.clearChallengeTimer();
        game.challengeTimeLeft = 3;
        this.scheduleChallengeWindowClose(roomId);
      }
      
      game.lastUpdated = Date.now();
      
      await this.storage.updateGame(roomId, game);
      this.broadcastToRoom(roomId, { type: 'game_update', data: game });
    }
  }

  private async processChallengeWindow(roomId: string): Promise<void> {
    const game = await this.getGameState(roomId);
    if (!game || !game.challengeWindow) return;

    game.challengeWindow = false;

    if (game.challengingPlayers.length > 0 && game.playedCards) {
      await this.resolveChallenge(game);
      
      // 이의제기 결과를 보여주기 위해 게임 상태 업데이트
      await this.storage.updateGame(roomId, game);
      this.broadcastToRoom(roomId, { type: 'game_update', data: game });
      
      // 3초 후 다음 턴으로 진행 (결과를 보여주는 시간)
      setTimeout(async () => {
        await this.proceedToNextTurn(game, roomId);
      }, 3000);
    } else {
      // 이의제기가 없었다면 카드를 정상적으로 제거하고 바로 다음 턴
      if (game.playedCards) {
        this.removeCardsFromHand(game, game.playedCards.playerId, game.playedCards.cards);
      }
      await this.proceedToNextTurn(game, roomId);
    }
  }

  private async resolveChallenge(game: BluffCardGameState): Promise<void> {
    if (!game.playedCards) return;
    
    const challenger = game.challengingPlayers[0];
    const wasBluff = !game.playedCards.actualTruth;

    if (wasBluff) {
      // 이의제기 성공: 블러핑한 플레이어가 패널티, 카드는 공개하지 않음
      this.applyPenalty(game, game.playedCards.playerId, 1);
      game.playedCards.revealed = false; // 블러핑이면 카드 숨김
    } else {
      // 이의제기 실패: 이의제기한 플레이어가 패널티, 카드 공개 (카드 제거는 나중에)
      this.applyPenalty(game, challenger, game.playedCards.cards.length);
      game.playedCards.revealed = true; // 진실이면 카드 공개
    }

    // 이의제기 결과를 게임 히스토리에 추가
    this.addChallengeToHistory(game, challenger, wasBluff);
    
    // 게임 상태에 이의제기 결과 저장
    game.currentChallengeResult = {
      wasBluff,
      penalizedPlayer: wasBluff ? game.playedCards.playerId : challenger,
      challenger
    };
    
    console.log('Server: Challenge result set:', {
      wasBluff,
      penalizedPlayer: wasBluff ? game.playedCards.playerId : challenger,
      challenger,
      currentChallengeResult: game.currentChallengeResult
    });
  }

  private async proceedToNextTurn(game: BluffCardGameState, roomId: string): Promise<void> {
    console.log(`🎯 [블러프카드] proceedToNextTurn 호출됨 - roomId: ${roomId}`);
    
    // 이의제기 실패 시 카드 제거 (이의제기 결과 표시 후)
    if (game.playedCards && game.currentChallengeResult && !game.currentChallengeResult.wasBluff) {
      this.removeCardsFromHand(game, game.playedCards.playerId, game.playedCards.cards);
    }
    
    // 먼저 다음 턴으로 이동
    game.currentPlayer = this.getNextPlayer(game);
    game.turnCount++;
    game.currentTarget = this.generateTarget();
    
    // 다음 플레이어가 연결이 끊어진 상태인지 확인
    const shouldStartVote = game.disconnectedPlayers.includes(game.currentPlayer);
    console.log(`🔍 [${this.getGameType()}] 블러프 게임 - 다음 플레이어: ${game.currentPlayer}, 연결 해제됨: ${shouldStartVote}, 연결 해제된 플레이어들: [${game.disconnectedPlayers.join(', ')}]`);
    
    // 투표가 필요하지 않은 경우에만 게임 종료 체크
    let gameEndCheck: { ended: boolean; reason?: string; winner?: string } = { ended: false };
    if (!shouldStartVote) {
      gameEndCheck = this.checkGameEnd(game);
      if (gameEndCheck.ended) {
        // 게임 종료
        game.gameStatus = 'game_finished';
        if (gameEndCheck.winner) {
          game.winners = [gameEndCheck.winner];
        }
        await this.storage.updateRoom(roomId, { status: 'waiting' });
      }
    }
    
    // 상태 초기화 (새 턴에서는 모든 상태 초기화)
    game.playedCards = null;
    game.challengingPlayers = [];
    game.challengeWindow = false;
    game.challengeTimeLeft = 3;
    game.currentChallengeResult = undefined; // 새 턴에서 이의제기 결과 초기화
    
    // 모든 플레이어의 패널티 카드 인덱스 초기화 (3초 표시 후)
    Object.values(game.playerHands).forEach(playerHand => {
      playerHand.penaltyCardIndices = [];
    });
    
    game.lastUpdated = Date.now();
    
    await this.storage.updateGame(roomId, game);
    
    const messageType = gameEndCheck.ended ? 'game_end' : 'game_update';
    this.broadcastToRoom(roomId, { type: messageType, data: game });
    
    // 다음 플레이어가 연결이 끊어진 상태면 투표 시작
    if (shouldStartVote && !gameEndCheck.ended) {
      console.log(`🗳️ [${this.getGameType()}] 블러프 게임 - 1초 후 투표 시작 예약됨 - 대상: ${game.currentPlayer}`);
      setTimeout(() => {
        this.handleDisconnectedPlayerTurn(roomId);
      }, 1000); // 1초 후 투표 시작
    }
    
    // 이의제기 결과는 다음 턴에서 카드를 낼 때 초기화됨
  }

  // ============================================================================
  // 유틸리티 메서드들
  // ============================================================================

  private validateCardPlay(gameState: BluffCardGameState, userId: string, move: BluffCardPlayMessage): boolean {
    if (gameState.currentPlayer !== userId || gameState.challengeWindow) return false;
    if (move.cards.length < 1 || move.cards.length > 4) return false;
    
    const playerHand = gameState.playerHands[userId];
    return playerHand && move.cards.every(card => playerHand.cards.includes(card));
  }

  private validateChallenge(gameState: BluffCardGameState, userId: string, move: BluffCardChallengeMessage): boolean {
    return gameState.challengeWindow && 
           gameState.currentPlayer !== userId &&
           move.challenge === true;
  }

  private applyCardPlay(gameState: BluffCardGameState, userId: string, move: BluffCardPlayMessage): void {
    const actualTruth = move.cards.every(card => card === gameState.currentTarget);
    
    gameState.playedCards = {
      playerId: userId,
      cards: move.cards,
      cardIndices: move.cardIndices,
      claimedNumber: move.claimedNumber,
      claimedCount: move.claimedCount,
      claimedTruth: move.claimedTruth,
      actualTruth,
      revealed: false
    };
    
    gameState.challengeWindow = true;
    gameState.challengeTimeLeft = 3;
    gameState.challengingPlayers = [];
    gameState.currentChallengeResult = undefined; // 새로운 카드를 낼 때 이의제기 결과 초기화
  }

  private applyChallenge(gameState: BluffCardGameState, userId: string, move: BluffCardChallengeMessage): void {
    if (move.challenge && !gameState.challengingPlayers.includes(userId)) {
      gameState.challengingPlayers.push(userId);
      // 카드 공개는 이의제기 해결 시에만 함
    }
  }

  private generateTarget(): BluffCardNumber {
    return BLUFF_CARD_CONFIG.generateAnswer!();
  }

  private generateInitialHand(): BluffCardNumber[] {
    const hand: BluffCardNumber[] = [];
    for (let i = 0; i < 5; i++) {
      const randomCard = Math.floor(Math.random() * 5) + 1 as BluffCardNumber;
      hand.push(randomCard);
    }
    return hand.sort((a, b) => a - b);
  }

  private applyPenalty(game: BluffCardGameState, playerId: string, cardCount: number): void {
    const playerHand = game.playerHands[playerId];
    if (!playerHand) return;
    
    for (let i = 0; i < cardCount; i++) {
      const penaltyCard = Math.floor(Math.random() * 5) + 1 as BluffCardNumber;
      const currentLength = playerHand.cards.length;
      playerHand.cards.push(penaltyCard);
      // 패널티 카드의 인덱스를 추가 (정렬 전 인덱스)
      playerHand.penaltyCardIndices.push(currentLength);
    }
    playerHand.cards.sort((a, b) => a - b);
    
    // 정렬 후 패널티 카드 인덱스 업데이트
    this.updatePenaltyIndicesAfterSort(playerHand);
  }

  private updatePenaltyIndicesAfterSort(playerHand: PlayerHand): void {
    // 정렬 후에는 패널티 카드 추적이 복잡하므로 
    // 간단히 최근에 추가된 카드들을 패널티로 간주
    const totalCards = playerHand.cards.length;
    const penaltyCount = playerHand.penaltyCardIndices.length;
    
    // 최근 추가된 카드들의 새로운 인덱스를 찾아서 업데이트
    playerHand.penaltyCardIndices = [];
    for (let i = Math.max(0, totalCards - penaltyCount); i < totalCards; i++) {
      playerHand.penaltyCardIndices.push(i);
    }
  }

  private removeCardsFromHand(game: BluffCardGameState, playerId: string, cards: BluffCardNumber[]): void {
    const playerHand = game.playerHands[playerId];
    if (!playerHand) return;
    
    cards.forEach(card => {
      const index = playerHand.cards.indexOf(card);
      if (index > -1) {
        playerHand.cards.splice(index, 1);
        // 제거된 카드가 패널티 카드였다면 패널티 인덱스에서도 제거
        const penaltyIndex = playerHand.penaltyCardIndices.indexOf(index);
        if (penaltyIndex > -1) {
          playerHand.penaltyCardIndices.splice(penaltyIndex, 1);
        }
        // 제거된 인덱스보다 큰 패널티 인덱스들은 1씩 감소
        playerHand.penaltyCardIndices = playerHand.penaltyCardIndices.map(i => i > index ? i - 1 : i);
      }
    });
  }

  private addChallengeToHistory(game: BluffCardGameState, challenger: string, wasBluff: boolean): void {
    const challengeMove: GameMove = {
      playerId: challenger,
      moveNumber: game.turnCount,
      timestamp: Date.now(),
      data: {
        type: 'challenge_result',
        wasBluff,
        penalizedPlayer: wasBluff ? game.playedCards?.playerId : challenger
      }
    };
    game.gameHistory.push(challengeMove);
  }

  private scheduleChallengeWindowClose(roomId: string): void {
    this.clearChallengeTimer();
    this.challengeTimer = setTimeout(async () => {
      await this.processChallengeWindow(roomId);
    }, 3000);
  }

  private clearChallengeTimer(): void {
    if (this.challengeTimer) {
      clearTimeout(this.challengeTimer);
      this.challengeTimer = null;
    }
  }

  // 부모 클래스의 getNextPlayer 사용 (연결이 끊어진 플레이어도 턴을 가져야 투표가 시작됨)
  // protected getNextPlayer 메서드 제거하여 부모 클래스 메서드 사용

  // ============================================================================
  // 연결 관리 오버라이드
  // ============================================================================

  async handlePlayerDisconnect(roomId: string, playerId: string): Promise<void> {
    const game = await this.getGameState(roomId);
    if (!game) return;

    // 이의제기 중인 플레이어가 연결 해제되었다면 제거
    const challengeIndex = game.challengingPlayers.indexOf(playerId);
    if (challengeIndex !== -1) {
      game.challengingPlayers.splice(challengeIndex, 1);
      await this.storage.updateGame(roomId, game);
    }

    await super.handlePlayerDisconnect(roomId, playerId);
  }

  protected async handleGameAbandonment(gameState: BluffCardGameState, leavingPlayerId: string, roomId: string): Promise<void> {
    const remainingPlayers = gameState.playerIds.filter(id => 
      id !== leavingPlayerId && !gameState.disconnectedPlayers.includes(id)
    );
    
    if (remainingPlayers.length < 2) {
      await super.handleGameAbandonment(gameState, leavingPlayerId, roomId);
    } else {
      // 게임 계속 진행
      delete gameState.playerHands[leavingPlayerId];
      
      if (gameState.currentPlayer === leavingPlayerId) {
        gameState.currentPlayer = this.getNextPlayer(gameState);
      }
      
      gameState.lastUpdated = Date.now();
      await this.storage.updateGame(roomId, gameState);
      
      this.broadcastToRoom(roomId, {
        type: 'game_state',
        data: gameState
      });
    }
  }
}