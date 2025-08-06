import type { 
  BaseGameState, 
  BaseChoice, 
  RoundGameHandlers, 
  GameResult,
  BaseRound 
} from '../types/game-types';
import { BaseGameHandler } from './base-game-handler';

// 추상 게임 핸들러 클래스
export abstract class BaseRoundGameHandler<
  TGameState extends BaseGameState, 
  TChoice extends BaseChoice,
  TAnswer,
  TRound extends BaseRound
> extends BaseGameHandler<TGameState> implements RoundGameHandlers<TGameState, TChoice> {
  
  // 추상 메서드들 - 각 게임에서 구현
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

  // BaseGameHandler의 initializeGameState를 createInitialGameState로 매핑
  protected initializeGameState(roomId: string, playerIds: string[]): TGameState {
    return this.createInitialGameState(roomId, playerIds);
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

    // Generate target answer for this round
    const targetAnswer = this.generateAnswer();
    (game[targetAnswerKey] as any) = targetAnswer;

    // Calculate results for each player
    const playerResults: Record<string, GameResult> = {};
    const winners: string[] = [];

    for (const playerId of game.playerIds) {
      const playerChoice = (game[choicesKey] as Record<string, any>)[playerId];
      const isCorrect = this.isCorrectChoice(playerChoice, targetAnswer);
      
      playerResults[playerId] = isCorrect ? 'win' : 'lose';
      if (isCorrect) {
        winners.push(playerId);
        game.playerScores[playerId] = (game.playerScores[playerId] || 0) + 1;
      }
    }

    // Create round history
    const roundHistory = this.createRoundHistory(
      game.currentRound,
      game[choicesKey] as Record<string, any>,
      targetAnswer,
      winners,
      playerResults
    );

    (game as any).roundHistory.push(roundHistory);
    game.currentRound++;

    // Check if game is finished
    if (game.currentRound > game.maxRounds) {
      game.gameStatus = 'game_finished';
      
      // Determine final winners (players with highest scores)
      const maxScore = Math.max(...Object.values(game.playerScores));
      game.winners = Object.keys(game.playerScores).filter(
        playerId => game.playerScores[playerId] === maxScore
      );
    } else {
      // Reset for next round
      game.gameStatus = 'waiting_for_moves';
      (game[choicesKey] as Record<string, any>) = {};
      (game[targetAnswerKey] as any) = undefined;
    }

    await this.storage.updateGame(roomId, game);

    // Broadcast round result
    this.broadcastToRoom(roomId, {
      type: game.gameStatus === 'game_finished' ? 'game_end' : 'round_result',
      data: game
    });
  }

  // 게임별 특수 처리 메서드들 (서브클래스에서 오버라이드 가능)
  protected async onPlayerDisconnect(game: TGameState, playerId: string): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
    // 서브클래스에서 필요시 오버라이드
  }

  protected async onPlayerReconnect(game: TGameState, playerId: string): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
    // 서브클래스에서 필요시 오버라이드
  }

  protected async onPlayerLeave(game: TGameState, playerId: string): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
    // 서브클래스에서 필요시 오버라이드
  }

  // 연결 관리는 BaseGameHandler에서 처리
  // 게임별 특수 처리가 필요한 경우 onPlayerDisconnect, onPlayerReconnect, onPlayerLeave 메서드를 오버라이드하여 구현
}