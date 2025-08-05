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
    const winners = gameState.playerIds.filter(playerId => 
      !gameState.eliminatedPlayers.includes(playerId) && 
      gameState.playerHands[playerId]?.cards.length === 0
    );
    
    if (winners.length > 0) {
      return { ended: true, reason: 'cards_empty', winner: winners[0] };
    }
    
    // 연결된 플레이어가 2명 미만이면 게임 종료
    const activePlayers = gameState.playerIds.filter(id => 
      !gameState.disconnectedPlayers.includes(id)
    );
    
    if (activePlayers.length < 2) {
      return { ended: true, reason: 'insufficient_players', winner: activePlayers[0] };
    }
    
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
    const playerHands: Record<string, PlayerHand> = {};
    playerIds.forEach(playerId => {
      playerHands[playerId] = {
        cards: this.generateInitialHand()
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
    if (move.type === 'bluff_card_play') {
      await this.handleCardPlay(roomId, userId, move);
    } else if (move.type === 'bluff_card_challenge') {
      await this.handleChallenge(roomId, userId, move);
    }
  }

  private async handleCardPlay(roomId: string, playerId: string, message: BluffCardPlayMessage): Promise<void> {
    const game = await this.getGameState(roomId);
    if (!game || !this.validateCardPlay(game, playerId, message)) return;

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
    } else {
      // 이의제기가 없었다면 카드를 정상적으로 제거
      if (game.playedCards) {
        this.removeCardsFromHand(game, game.playedCards.playerId, game.playedCards.cards);
      }
    }

    await this.proceedToNextTurn(game, roomId);
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
      // 이의제기 실패: 카드 제거 후 이의제기한 플레이어가 패널티, 카드 공개
      this.removeCardsFromHand(game, game.playedCards.playerId, game.playedCards.cards);
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
  }

  private async proceedToNextTurn(game: BluffCardGameState, roomId: string): Promise<void> {
    const gameEndCheck = this.checkGameEnd(game);
    
    if (!gameEndCheck.ended) {
      // 다음 턴으로 이동
      game.currentPlayer = this.getNextPlayer(game);
      game.turnCount++;
      game.currentTarget = this.generateTarget();
    } else {
      // 게임 종료
      game.gameStatus = 'game_finished';
      if (gameEndCheck.winner) {
        game.winners = [gameEndCheck.winner];
      }
      await this.storage.updateRoom(roomId, { status: 'waiting' });
    }
    
    // 상태 초기화
    game.playedCards = null;
    game.challengingPlayers = [];
    game.challengeWindow = false;
    game.challengeTimeLeft = 3;
    game.currentChallengeResult = undefined; // 이의제기 결과 초기화
    game.lastUpdated = Date.now();
    
    await this.storage.updateGame(roomId, game);
    
    const messageType = gameEndCheck.ended ? 'game_end' : 'game_update';
    this.broadcastToRoom(roomId, { type: messageType, data: game });
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
      playerHand.cards.push(penaltyCard);
    }
    playerHand.cards.sort((a, b) => a - b);
  }

  private removeCardsFromHand(game: BluffCardGameState, playerId: string, cards: BluffCardNumber[]): void {
    const playerHand = game.playerHands[playerId];
    if (!playerHand) return;
    
    cards.forEach(card => {
      const index = playerHand.cards.indexOf(card);
      if (index > -1) {
        playerHand.cards.splice(index, 1);
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

  protected getNextPlayer(gameState: BluffCardGameState): string {
    const currentIndex = gameState.playerIds.indexOf(gameState.currentPlayer);
    let nextIndex = (currentIndex + 1) % gameState.playerIds.length;
    let attempts = 0;
    const maxAttempts = gameState.playerIds.length;

    // 연결이 끊긴 플레이어 제외
    while (attempts < maxAttempts && gameState.disconnectedPlayers.includes(gameState.playerIds[nextIndex])) {
      nextIndex = (nextIndex + 1) % gameState.playerIds.length;
      attempts++;
    }

    return gameState.playerIds[nextIndex];
  }

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