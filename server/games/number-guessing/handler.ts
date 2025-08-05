import { BaseRoundGameHandler } from "@shared/games/base/handlers/round-game-handler";
import type { 
  NumberGuessGameState, 
  NumberGuessChoiceMessage, 
  NumberGuess, 
  NumberGuessRound 
} from "@shared/games/number-guessing/schema";
import { NUMBER_GUESSING_CONFIG } from "@shared/games/number-guessing/schema";

export class NumberGuessingHandler extends BaseRoundGameHandler<
  NumberGuessGameState,
  NumberGuessChoiceMessage,
  NumberGuess,
  NumberGuessRound
> {
  protected getGameType(): string {
    return 'number-guessing';
  }

  protected getPlayerChoicesKey(): keyof NumberGuessGameState {
    return 'playerChoices';
  }

  protected getTargetAnswerKey(): keyof NumberGuessGameState {
    return 'targetAnswer';
  }

  protected generateAnswer(): NumberGuess {
    return NUMBER_GUESSING_CONFIG.generateAnswer!();
  }

  protected extractChoiceValue(choice: NumberGuessChoiceMessage): NumberGuess {
    return choice.number;
  }

  protected isCorrectChoice(playerChoice: NumberGuess, targetAnswer: NumberGuess): boolean {
    return playerChoice === targetAnswer;
  }

  protected createInitialGameState(roomId: string, playerIds: string[]): NumberGuessGameState {
    return {
      roomId,
      gameType: 'number-guessing',
      category: 'round-based',
      playerIds,
      gameStatus: 'waiting_for_moves',
      currentRound: 1,
      maxRounds: NUMBER_GUESSING_CONFIG.maxRounds,
      playerScores: {},
      playerChoices: {},
      playerNumbers: {},
      targetAnswer: undefined,
      targetNumber: undefined,
      roundHistory: [],
      disconnectedPlayers: [],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
  }

  protected createRoundHistory(
    round: number,
    playerChoices: Record<string, NumberGuess>,
    targetAnswer: NumberGuess,
    winners: string[],
    playerResults: Record<string, 'win' | 'lose' | 'draw'>
  ): NumberGuessRound {
    return {
      round,
      targetAnswer,
      playerChoices,
      playerNumbers: playerChoices,
      targetNumber: targetAnswer,
      winners,
      playerResults
    };
  }

  protected getMaxRounds(): number {
    return NUMBER_GUESSING_CONFIG.maxRounds;
  }
}

// 팩토리 함수 (기존 코드와의 호환성을 위해)
export function createNumberGuessingHandlers(broadcastToRoom: Function) {
  const handler = new NumberGuessingHandler(
    require("../../storage").storage, 
    broadcastToRoom
  );
  
  return {
    handleChoice: handler.handleChoice.bind(handler),
    processRound: handler.processRound.bind(handler),
    createGame: handler.createGame.bind(handler)
  };
}