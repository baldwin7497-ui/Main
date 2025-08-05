// BluffCard Game Handler
import { BaseGameHandler } from "@shared/games/base/base-game-handler";
import type { 
  BluffCardNumber, 
  BluffCardGameState, 
  BluffCardPlayMessage,
  BluffCardChallengeMessage,
  BluffCardRound,
  PlayerHand,
  PlayedCards
} from "@shared/games/bluff-card/schema";
import { BLUFF_CARD_CONFIG } from "@shared/games/bluff-card/schema";
import type { GameResult } from "@shared/games/base/game-types";

export class BluffCardHandler extends BaseGameHandler<
  BluffCardGameState,
  BluffCardPlayMessage | BluffCardChallengeMessage,
  BluffCardNumber,
  BluffCardRound
> {
  private turnTimer: NodeJS.Timeout | null = null;
  private challengeTimer: NodeJS.Timeout | null = null;

  protected getGameType(): string {
    return 'bluff-card';
  }

  protected getPlayerChoicesKey(): keyof BluffCardGameState {
    return 'playerHands' as any;
  }

  protected getTargetAnswerKey(): keyof BluffCardGameState {
    return 'currentTarget' as any;
  }

  protected generateAnswer(): BluffCardNumber {
    return BLUFF_CARD_CONFIG.generateAnswer!();
  }

  protected extractChoiceValue(choice: BluffCardPlayMessage | BluffCardChallengeMessage): BluffCardNumber {
    // 턴제 게임이므로 이 메서드는 사용하지 않음
    return 1;
  }

  protected isCorrectChoice(playerChoice: any, targetAnswer: BluffCardNumber): boolean {
    // 블러프 카드 게임은 정답/오답 개념이 없음
    return true;
  }

  protected getMaxRounds(): number {
    return 10;
  }

  protected createInitialGameState(roomId: string, playerIds: string[]): BluffCardGameState {
    // 각 플레이어에게 5장의 카드 배분
    const playerHands: Record<string, PlayerHand> = {};
    playerIds.forEach(playerId => {
      playerHands[playerId] = {
        cards: this.generateInitialHand()
      };
    });

    return {
      roomId,
      gameType: 'bluff-card',
      category: 'turn-based',
      playerIds: [...playerIds],
      playerHands,
      currentRound: 1,
      currentTarget: this.generateAnswer(),
      maxRounds: 10, // 충분히 긴 라운드 (먼저 카드를 다 쓴 사람이 승리)
      playerScores: {},
      currentPlayerIndex: 0,
      currentPlayerId: playerIds[0],
      turnTimeLeft: 30,
      playedCards: null,
      challengeWindow: false,
      challengeTimeLeft: 3,
      challengingPlayers: [],
      gameStatus: 'waiting_for_moves',
      roundHistory: [],
      eliminatedPlayers: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      disconnectedPlayers: []
    };
  }

  private generateInitialHand(): BluffCardNumber[] {
    const hand: BluffCardNumber[] = [];
    for (let i = 0; i < 5; i++) {
      const randomValue = Math.random();
      const randomCard = Math.floor(randomValue * 5) + 1 as BluffCardNumber;
      console.log(`초기 카드 생성: random=${randomValue}, card=${randomCard}`);
      hand.push(randomCard);
    }
    console.log(`초기 손패 생성 완료:`, hand);
    return hand.sort((a, b) => a - b);
  }

  protected createRoundHistory(
    round: number,
    playerChoices: Record<string, BluffCardNumber>,
    targetAnswer: BluffCardNumber,
    winners: string[],
    playerResults: Record<string, GameResult>
  ): BluffCardRound {
    return {
      round,
      targetNumber: targetAnswer,
      playedCards: null,
      winners,
      playerResults
    };
  }

  async handleMessage(roomId: string, playerId: string, message: BluffCardPlayMessage | BluffCardChallengeMessage): Promise<void> {
    const game = await this.storage.getGame(roomId) as BluffCardGameState | undefined;
    if (!game || game.gameType !== this.getGameType()) return;

    if (message.type === 'bluff_card_play') {
      await this.handlePlayCards(roomId, playerId, message);
    } else if (message.type === 'bluff_card_challenge') {
      await this.handleChallenge(roomId, playerId, message);
    }
  }

  private async handlePlayCards(roomId: string, playerId: string, message: BluffCardPlayMessage): Promise<void> {
    const game = await this.storage.getGame(roomId) as BluffCardGameState;
    
    // 현재 플레이어 턴 확인
    if (game.currentPlayerId !== playerId || game.challengeWindow) return;
    
    // 카드 수 검증 (1~4장)
    if (message.cards.length < 1 || message.cards.length > 4) return;
    
    // 플레이어가 해당 카드를 가지고 있는지 확인
    const playerHand = game.playerHands[playerId];
    const canPlayCards = message.cards.every(card => 
      playerHand.cards.includes(card)
    );
    
    if (!canPlayCards) return;

    // 카드는 이의제기 결과에 따라 나중에 처리
    // (이의제기 성공시 다시 돌려줘야 하므로 지금은 제거하지 않음)

    // 서버에서 실제 진실 여부를 직접 계산 (보안상 클라이언트 값 신뢰하지 않음)
    const serverActualTruth = message.cards.every(card => card === game.currentTarget);

    // 플레이한 카드 정보 저장
    game.playedCards = {
      playerId,
      cards: message.cards,
      cardIndices: message.cardIndices, // 선택된 카드의 인덱스 저장
      claimedNumber: message.claimedNumber,
      claimedCount: message.claimedCount,
      claimedTruth: message.claimedTruth,
      actualTruth: serverActualTruth, // 서버에서 계산한 값 사용
      revealed: false // 처음에는 항상 뒤집힌 상태
    };

    console.log(`카드 플레이:`, {
      playerId,
      cards: message.cards,
      cardIndices: message.cardIndices,
      target: game.currentTarget,
      clientActualTruth: message.actualTruth,
      serverActualTruth: serverActualTruth,
      카드가모두타겟과같은가: serverActualTruth
    });

    // 이의제기 창 열기 (3초)
    game.challengeWindow = true;
    game.challengeTimeLeft = 3;
    game.challengingPlayers = [];

    await this.storage.updateGame(roomId, game);
    
    console.log(`🔄 브로드캐스트 전송 중... challengeWindow: ${game.challengeWindow}, currentPlayer: ${game.currentPlayerId}`);
    this.broadcastToRoom(roomId, { type: 'game_update', data: game });
    console.log(`📡 브로드캐스트 완료`);

    // 3초 후 이의제기 처리
    this.challengeTimer = setTimeout(async () => {
      await this.processChallengeWindow(roomId);
    }, 3000);
  }

  private async handleChallenge(roomId: string, playerId: string, message: BluffCardChallengeMessage): Promise<void> {
    const game = await this.storage.getGame(roomId) as BluffCardGameState;
    
    // 이의제기 창이 열려있고, 현재 플레이어가 아닌 다른 플레이어만 이의제기 가능
    if (!game.challengeWindow || game.currentPlayerId === playerId) return;
    
    if (message.challenge && !game.challengingPlayers.includes(playerId)) {
      // 첫 번째 이의제기가 발생하면 카드 공개하고 새로운 3초 타이머 시작
      if (game.challengingPlayers.length === 0 && game.playedCards) {
        game.playedCards.revealed = true;
        
        // 기존 타이머 취소하고 새로운 3초 타이머 시작
        if (this.challengeTimer) {
          clearTimeout(this.challengeTimer);
        }
        
        game.challengeTimeLeft = 3;
        console.log(`🔥 이의제기 발생! 카드 공개하고 3초 타이머 재시작`);
        
        // 새로운 3초 타이머 시작
        this.challengeTimer = setTimeout(async () => {
          await this.processChallengeWindow(roomId);
        }, 3000);
      }
      
      game.challengingPlayers.push(playerId);
      await this.storage.updateGame(roomId, game);
      this.broadcastToRoom(roomId, { type: 'game_update', data: game });
    }
  }

  private async processChallengeWindow(roomId: string): Promise<void> {
    const game = await this.storage.getGame(roomId) as BluffCardGameState;
    if (!game.challengeWindow) return;

    game.challengeWindow = false;

    if (game.challengingPlayers.length > 0 && game.playedCards) {
      // 첫 번째 이의제기자 처리 (카드는 이미 공개됨)
      const challenger = game.challengingPlayers[0];
      const wasBluff = this.checkIfBluff(game.playedCards);
      
      console.log(`이의제기 상황 분석:`, {
        challenger,
        playerId: game.playedCards.playerId,
        actualTruth: game.playedCards.actualTruth,
        wasBluff,
        설명: wasBluff ? '플레이어의 카드가 타겟과 다름 (이의제기 성공)' : '플레이어의 카드가 모두 타겟과 일치 (이의제기 실패)'
      });

      if (wasBluff) {
        // 이의제기 성공: 실제로 블러핑이었음
        // 1. 낸 카드들은 다시 손패로 돌아감 (이미 제거하지 않았으므로 그대로)
        // 2. 블러핑한 플레이어가 1장 패널티
        console.log(`✅ 이의제기 성공! ${game.playedCards.playerId}가 1장 패널티 (낸 카드는 다시 손패로)`);
        this.applyPenalty(game, game.playedCards.playerId, 1);
      } else {
        // 이의제기 실패: 블러핑이 아니었음
        // 1. 낸 카드들은 정상적으로 제거
        this.removeCardsFromHand(game, game.playedCards.playerId, game.playedCards.cards);
        // 2. 이의제기한 플레이어가 상대가 낸 카드 수만큼 패널티  
        const challengerPenalty = game.playedCards.cards.length;
        console.log(`❌ 이의제기 실패! ${challenger}가 ${challengerPenalty}장 패널티`);
        this.applyPenalty(game, challenger, challengerPenalty);
      }

      // 라운드 히스토리에 추가
      game.roundHistory.push({
        round: game.currentRound,
        targetNumber: game.currentTarget,
        playedCards: game.playedCards,
        challengeResult: {
          challenger,
          wasBluff,
          penalizedPlayer: wasBluff ? game.playedCards.playerId : challenger
        },
        winners: [],
        playerResults: {}
      });
    }

    // 이의제기가 없었다면 카드를 정상적으로 제거
    if (game.challengingPlayers.length === 0 && game.playedCards) {
      this.removeCardsFromHand(game, game.playedCards.playerId, game.playedCards.cards);
    }

    // 다음 턴으로 이동
    await this.moveToNextTurn(game);
    await this.storage.updateGame(roomId, game);
    
    console.log(`🔄 이의제기 처리 후 브로드캐스트... currentPlayer: ${game.currentPlayerId}, challengeWindow: ${game.challengeWindow}`);
    this.broadcastToRoom(roomId, { type: 'game_update', data: game });
    console.log(`📡 이의제기 처리 브로드캐스트 완료`);
  }

  private checkIfBluff(playedCards: PlayedCards): boolean {
    // 단순화된 블러프 로직:
    // 항상 "진실을 말한다"고 간주하므로, 실제 카드가 모두 타겟과 같은지만 확인
    // actualTruth가 false면 블러프 (이의제기 성공)
    // actualTruth가 true면 진실 (이의제기 실패)
    
    const isBluff = !playedCards.actualTruth;
    console.log(`이의제기 판정: actualTruth=${playedCards.actualTruth}, isBluff=${isBluff}`);
    return isBluff;
  }

  private applyPenalty(game: BluffCardGameState, playerId: string, cardCount: number): void {
    // 패널티: 지정된 수만큼 랜덤 카드를 다시 받음
    console.log(`패널티 적용 시작: ${playerId}에게 ${cardCount}장`);
    for (let i = 0; i < cardCount; i++) {
      const randomValue = Math.random();
      const penaltyCard = Math.floor(randomValue * 5) + 1 as BluffCardNumber;
      console.log(`패널티 카드 생성: random=${randomValue}, card=${penaltyCard}`);
      game.playerHands[playerId].cards.push(penaltyCard);
    }
    console.log(`패널티 적용 후 손패:`, game.playerHands[playerId].cards);
    game.playerHands[playerId].cards.sort((a, b) => a - b);
  }

  private removeCardsFromHand(game: BluffCardGameState, playerId: string, cards: BluffCardNumber[]): void {
    // 손패에서 카드 제거
    const playerHand = game.playerHands[playerId];
    cards.forEach(card => {
      const index = playerHand.cards.indexOf(card);
      if (index > -1) {
        playerHand.cards.splice(index, 1);
      }
    });
  }

  private async moveToNextTurn(game: BluffCardGameState): Promise<void> {
    // 승리 조건 확인
    const winners = game.playerIds.filter(playerId => 
      !game.eliminatedPlayers.includes(playerId) && 
      game.playerHands[playerId].cards.length === 0
    );

    if (winners.length > 0) {
      game.gameStatus = 'game_finished';
      game.winners = winners;
      await this.storage.updateRoom(game.roomId, { status: 'waiting' });
      return;
    }

    // 연결이 끊긴 플레이어를 제외하고 다음 플레이어 찾기
    let nextPlayerIndex = game.currentPlayerIndex;
    let attempts = 0;
    const maxAttempts = game.playerIds.length;

    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % game.playerIds.length;
      attempts++;
    } while (
      attempts < maxAttempts && 
      game.disconnectedPlayers.includes(game.playerIds[nextPlayerIndex])
    );

    // 모든 플레이어가 한 턴씩 했으면 새 라운드
    if (nextPlayerIndex === 0) {
      game.currentRound++;
      game.currentTarget = this.generateAnswer();
    }

    game.currentPlayerIndex = nextPlayerIndex;
    game.currentPlayerId = game.playerIds[nextPlayerIndex];
    game.turnTimeLeft = 30;
    game.playedCards = null;
    game.challengingPlayers = [];
  }

  // 기본 메서드들 오버라이드 (턴제 게임이므로 사용하지 않음)
  async processRound(roomId: string): Promise<void> {
    // 턴제 게임이므로 라운드 기반 처리하지 않음
  }

  // 플레이어 연결 해제 처리 메서드 (재연결 고려)
  async handlePlayerDisconnect(roomId: string, playerId: string): Promise<void> {
    const game = await this.storage.getGame(roomId) as BluffCardGameState | undefined;
    if (!game || game.gameType !== this.getGameType()) return;

    console.log(`플레이어 연결 해제 처리: ${playerId}`);

    // 게임 상태에서 플레이어 제거하지 않음 (재연결 고려)
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex === -1) {
      console.log(`플레이어 ${playerId}가 게임에 없음`);
      return;
    }

    // 연결이 끊긴 플레이어 목록에 추가
    if (!game.disconnectedPlayers.includes(playerId)) {
      game.disconnectedPlayers.push(playerId);
    }

    // 이의제기 중인 플레이어가 연결 해제되었다면 이의제기 목록에서 제거
    const challengeIndex = game.challengingPlayers.indexOf(playerId);
    if (challengeIndex !== -1) {
      game.challengingPlayers.splice(challengeIndex, 1);
    }

    // 현재 턴이 연결 해제된 플레이어라면 다음 플레이어로 턴 이동
    if (game.currentPlayerId === playerId) {
      console.log(`현재 턴 플레이어가 연결 해제됨: ${playerId}`);
      await this.moveToNextTurn(game);
    }

    // 모든 플레이어가 연결 해제되었는지 확인
    const allDisconnected = game.playerIds.every(playerId => 
      game.disconnectedPlayers.includes(playerId)
    );

    if (allDisconnected) {
      console.log(`모든 플레이어가 연결 해제됨. 방 상태를 대기로 변경: ${roomId}`);
      game.gameStatus = 'game_finished';
      await this.storage.updateRoom(roomId, { status: 'waiting' });
    }

    // 게임 상태 업데이트 및 브로드캐스트
    await this.storage.updateGame(roomId, game);
    this.broadcastToRoom(roomId, { type: 'game_update', data: game });

    console.log(`플레이어 연결 해제 처리 완료: ${playerId}, 남은 플레이어: ${game.playerIds.length}`);
  }

  // 플레이어 재연결 처리 메서드
  async handlePlayerReconnect(roomId: string, playerId: string): Promise<void> {
    const game = await this.storage.getGame(roomId) as BluffCardGameState | undefined;
    if (!game || game.gameType !== this.getGameType()) return;

    console.log(`플레이어 재연결 처리: ${playerId}`);

    // 게임에 참여 중인 플레이어인지 확인
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex === -1) {
      console.log(`플레이어 ${playerId}가 게임에 없음`);
      return;
    }

    // 연결이 끊긴 플레이어 목록에서 제거
    const disconnectIndex = game.disconnectedPlayers.indexOf(playerId);
    if (disconnectIndex !== -1) {
      game.disconnectedPlayers.splice(disconnectIndex, 1);
      console.log(`플레이어 ${playerId}를 연결 해제 목록에서 제거`);
    }

    // 게임 상태 업데이트 및 브로드캐스트
    await this.storage.updateGame(roomId, game);
    this.broadcastToRoom(roomId, { 
      type: 'player_reconnected', 
      data: { userId: playerId } 
    });
    this.broadcastToRoom(roomId, { type: 'game_update', data: game });

    console.log(`플레이어 재연결 처리 완료: ${playerId}`);
  }

  // 플레이어 퇴장 처리 메서드 (완전히 나갈 때)
  async handlePlayerLeave(roomId: string, playerId: string): Promise<void> {
    const game = await this.storage.getGame(roomId) as BluffCardGameState | undefined;
    if (!game || game.gameType !== this.getGameType()) return;

    console.log(`플레이어 퇴장 처리: ${playerId}`);

    // 게임 상태에서 플레이어 제거
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex === -1) {
      console.log(`플레이어 ${playerId}가 게임에 없음`);
      return;
    }

    // 플레이어 제거
    game.playerIds.splice(playerIndex, 1);
    delete game.playerHands[playerId];
    delete game.playerScores[playerId];

    // 이의제기 중인 플레이어가 나갔다면 이의제기 목록에서 제거
    const challengeIndex = game.challengingPlayers.indexOf(playerId);
    if (challengeIndex !== -1) {
      game.challengingPlayers.splice(challengeIndex, 1);
    }

    // 현재 턴이 나간 플레이어라면 다음 플레이어로 턴 이동
    if (game.currentPlayerId === playerId) {
      console.log(`현재 턴 플레이어가 나감: ${playerId}`);
      await this.moveToNextTurn(game);
    } else {
      // 현재 턴 인덱스 조정 (나간 플레이어보다 앞에 있던 플레이어들의 인덱스)
      if (playerIndex < game.currentPlayerIndex) {
        game.currentPlayerIndex--;
      }
    }

    // 승리 조건 확인
    const winners = game.playerIds.filter(playerId => 
      !game.eliminatedPlayers.includes(playerId) && 
      game.playerHands[playerId].cards.length === 0
    );

    if (winners.length > 0) {
      game.gameStatus = 'game_finished';
      game.winners = winners;
      await this.storage.updateRoom(game.roomId, { status: 'waiting' });
    }

    // 게임 상태 업데이트 및 브로드캐스트
    await this.storage.updateGame(roomId, game);
    this.broadcastToRoom(roomId, { type: 'game_update', data: game });

    console.log(`플레이어 퇴장 처리 완료: ${playerId}, 남은 플레이어: ${game.playerIds.length}`);
  }
}