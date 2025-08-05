import type { 
  BaseGameState, 
  BaseChoice, 
  RoundGameHandlers, 
  GameResult,
  BaseRound 
} from '../types/game-types';

// 추상 게임 핸들러 클래스
export abstract class BaseRoundGameHandler<
  TGameState extends BaseGameState, 
  TChoice extends BaseChoice,
  TAnswer,
  TRound extends BaseRound
> implements RoundGameHandlers<TGameState, TChoice> {
  
  protected storage: any;
  protected broadcastToRoom: Function;
  
  constructor(storage: any, broadcastToRoom: Function) {
    this.storage = storage;
    this.broadcastToRoom = broadcastToRoom;
  }

  // 추상 메서드들 - 각 게임에서 구현
  protected abstract getGameType(): string;
  protected abstract getPlayerChoicesKey(): keyof TGameState;
  protected abstract getTargetAnswerKey(): keyof TGameState;
  protected abstract generateAnswer(): TAnswer;
  protected abstract extractChoiceValue(choice: TChoice): any;
  protected abstract isCorrectChoice(playerChoice: any, targetAnswer: TAnswer): boolean;
  protected abstract createInitialGameState(roomId: string, playerIds: string[]): TGameState;
  protected abstract createRoundHistory(
    round: number, 
    playerChoices: Record<string, any>, 
    targetAnswer: TAnswer,
    winners: string[],
    playerResults: Record<string, GameResult>
  ): TRound;
  protected abstract getMaxRounds(): number;

  // RoundGameHandlers 인터페이스 구현
  async getGameState(roomId: string): Promise<TGameState | null> {
    return await this.storage.getGame(roomId) as TGameState | null;
  }

  async endGame(roomId: string): Promise<void> {
    const game = await this.getGameState(roomId);
    if (game) {
      game.gameStatus = 'game_finished';
      await this.storage.updateGame(roomId, game);
      await this.storage.updateRoom(roomId, { status: 'waiting' });
    }
  }

  async handleChoice(roomId: string, userId: string, choice: TChoice): Promise<void> {
    const game = await this.storage.getGame(roomId) as TGameState | undefined;
    if (!game || game.gameStatus !== 'waiting_for_moves' || game.gameType !== this.getGameType()) {
      return;
    }

    // Check if user is a valid player
    if (!game.playerIds.includes(userId)) {
      return;
    }

    // Update player choice
    const choicesKey = this.getPlayerChoicesKey();
    (game[choicesKey] as Record<string, any>)[userId] = this.extractChoiceValue(choice);
    
    await this.storage.updateGame(roomId, game);

    // Check if all players have made their choice
    const allPlayersChosen = game.playerIds.every(playerId => 
      (game[choicesKey] as Record<string, any>)[playerId] !== undefined
    );
    
    if (allPlayersChosen) {
      await this.processRound(roomId);
    }

    // Broadcast game state to room
    this.broadcastToRoom(roomId, {
      type: 'game_state',
      data: game
    });
  }

  async processRound(roomId: string): Promise<void> {
    const game = await this.storage.getGame(roomId) as TGameState | undefined;
    if (!game || game.gameType !== this.getGameType()) return;

    const choicesKey = this.getPlayerChoicesKey();
    const targetAnswerKey = this.getTargetAnswerKey();

    // Check if all players have made their choices
    const allPlayersChosen = game.playerIds.every(playerId => 
      (game[choicesKey] as Record<string, any>)[playerId] !== undefined
    );
    if (!allPlayersChosen) return;

    // Generate target answer for this round if not set
    if (!(game[targetAnswerKey] as TAnswer)) {
      (game[targetAnswerKey] as TAnswer) = this.generateAnswer();
    }

    const targetAnswer = game[targetAnswerKey] as TAnswer;
    const playerChoices = game[choicesKey] as Record<string, any>;

    // Determine round winners
    const roundWinners: string[] = [];
    const playerResults: Record<string, GameResult> = {};
    
    game.playerIds.forEach(playerId => {
      const playerChoice = playerChoices[playerId];
      const isCorrect = this.isCorrectChoice(playerChoice, targetAnswer);
      
      if (isCorrect) {
        roundWinners.push(playerId);
        game.playerScores[playerId]++;
        playerResults[playerId] = 'win';
      } else {
        playerResults[playerId] = 'lose';
      }
    });

    // If no one or everyone got it right, it's a draw for all
    if (roundWinners.length === 0 || roundWinners.length === game.playerIds.length) {
      game.playerIds.forEach(playerId => {
        playerResults[playerId] = 'draw';
      });
    }

    // Add to round history
    const roundHistory = this.createRoundHistory(
      game.currentRound,
      { ...playerChoices },
      targetAnswer,
      roundWinners,
      playerResults
    );
    
    (game as any).roundHistory.push(roundHistory);

    // Check if game is finished
    if (game.currentRound >= this.getMaxRounds()) {
      game.gameStatus = 'game_finished';
      
      // Find overall winners (highest scores)
      const maxScore = Math.max(...Object.values(game.playerScores));
      game.winners = game.playerIds.filter(playerId => game.playerScores[playerId] === maxScore);

      // Update room status back to waiting
      await this.storage.updateRoom(roomId, { status: 'waiting' });
      
      this.broadcastToRoom(roomId, {
        type: 'game_end',
        data: game
      });
    } else {
      // Prepare for next round
      game.currentRound++;
      game.gameStatus = 'waiting_for_moves';
      (game[choicesKey] as Record<string, any>) = {}; // Reset all player choices
      (game[targetAnswerKey] as TAnswer | undefined) = undefined; // Will be generated in next round
      
      this.broadcastToRoom(roomId, {
        type: 'round_result',
        data: game
      });
    }

    await this.storage.updateGame(roomId, game);
  }

  async createGame(roomId: string, playerIds: string[]): Promise<TGameState> {
    const gameState = this.createInitialGameState(roomId, playerIds);
    await this.storage.updateGame(roomId, gameState);
    console.log(`${this.getGameType()} game created:`, gameState);
    return gameState;
  }

  // 공통 연결 관리 메서드들
  async handlePlayerDisconnect(roomId: string, playerId: string): Promise<void> {
    const game = await this.storage.getGame(roomId) as TGameState | undefined;
    if (!game || game.gameType !== this.getGameType()) return;

    console.log(`${this.getGameType()} 플레이어 연결 해제 처리: ${playerId}`);

    // 게임에 참여 중인 플레이어인지 확인
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex === -1) {
      console.log(`플레이어 ${playerId}가 게임에 없음`);
      return;
    }

    // 연결이 끊긴 플레이어 목록에 추가
    if (!game.disconnectedPlayers) {
      game.disconnectedPlayers = [];
    }
    if (!game.disconnectedPlayers.includes(playerId)) {
      game.disconnectedPlayers.push(playerId);
    }

    // 게임별 특수 연결 해제 처리 (오버라이드 가능)
    await this.onPlayerDisconnect(game, playerId);

    // 게임 상태 업데이트 및 브로드캐스트
    await this.storage.updateGame(roomId, game);
    this.broadcastToRoom(roomId, { type: 'game_update', data: game });

    console.log(`${this.getGameType()} 플레이어 연결 해제 처리 완료: ${playerId}, 남은 플레이어: ${game.playerIds.length}`);
  }

  async handlePlayerReconnect(roomId: string, playerId: string): Promise<void> {
    const game = await this.storage.getGame(roomId) as TGameState | undefined;
    if (!game || game.gameType !== this.getGameType()) return;

    console.log(`${this.getGameType()} 플레이어 재연결 처리: ${playerId}`);

    // 게임에 참여 중인 플레이어인지 확인
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex === -1) {
      console.log(`플레이어 ${playerId}가 게임에 없음`);
      return;
    }

    // 연결이 끊긴 플레이어 목록에서 제거
    if (game.disconnectedPlayers) {
      const disconnectIndex = game.disconnectedPlayers.indexOf(playerId);
      if (disconnectIndex !== -1) {
        game.disconnectedPlayers.splice(disconnectIndex, 1);
        console.log(`플레이어 ${playerId}를 연결 해제 목록에서 제거`);
      }
    }

    // 게임별 특수 재연결 처리 (오버라이드 가능)
    await this.onPlayerReconnect(game, playerId);

    // 게임 상태 업데이트 및 브로드캐스트
    await this.storage.updateGame(roomId, game);
    this.broadcastToRoom(roomId, { 
      type: 'player_reconnected', 
      data: { userId: playerId } 
    });
    this.broadcastToRoom(roomId, { type: 'game_update', data: game });

    console.log(`${this.getGameType()} 플레이어 재연결 처리 완료: ${playerId}`);
  }

  async handlePlayerLeave(roomId: string, playerId: string): Promise<void> {
    const game = await this.storage.getGame(roomId) as TGameState | undefined;
    if (!game || game.gameType !== this.getGameType()) return;

    console.log(`${this.getGameType()} 플레이어 퇴장 처리: ${playerId}`);

    // 게임에 참여 중인 플레이어인지 확인
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex === -1) {
      console.log(`플레이어 ${playerId}가 게임에 없음`);
      return;
    }

    // 게임별 특수 퇴장 처리 (오버라이드 가능)
    await this.onPlayerLeave(game, playerId);

    // 게임 상태 업데이트 및 브로드캐스트
    await this.storage.updateGame(roomId, game);
    this.broadcastToRoom(roomId, { type: 'game_update', data: game });

    console.log(`${this.getGameType()} 플레이어 퇴장 처리 완료: ${playerId}, 남은 플레이어: ${game.playerIds.length}`);
  }

  // 게임별 특수 처리 메서드들 (기본 구현은 빈 함수)
  protected async onPlayerDisconnect(game: TGameState, playerId: string): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
    // 각 게임에서 필요시 오버라이드
  }

  protected async onPlayerReconnect(game: TGameState, playerId: string): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
    // 각 게임에서 필요시 오버라이드
  }

  protected async onPlayerLeave(game: TGameState, playerId: string): Promise<void> {
    // 기본 구현: 플레이어를 게임에서 제거
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex !== -1) {
      game.playerIds.splice(playerIndex, 1);
    }
    
    // 연결 해제 목록에서도 제거
    if (game.disconnectedPlayers) {
      const disconnectIndex = game.disconnectedPlayers.indexOf(playerId);
      if (disconnectIndex !== -1) {
        game.disconnectedPlayers.splice(disconnectIndex, 1);
      }
    }
  }
}