import { BaseRoundGameHandler } from "@shared/games/base/handlers/round-game-handler";
import type { 
  OddEvenGameState, 
  OddEvenChoiceMessage, 
  OddEvenGuess, 
  OddEvenRound 
} from "@shared/games/odd-even/schema";
import { ODD_EVEN_CONFIG } from "@shared/games/odd-even/schema";

export class OddEvenHandler extends BaseRoundGameHandler<
  OddEvenGameState,
  OddEvenChoiceMessage,
  OddEvenGuess,
  OddEvenRound
> {
  protected getGameType(): string {
    return 'odd-even';
  }

  protected getPlayerChoicesKey(): keyof OddEvenGameState {
    return 'playerChoices';
  }

  protected getTargetAnswerKey(): keyof OddEvenGameState {
    return 'targetAnswer';
  }

  protected generateAnswer(): OddEvenGuess {
    return ODD_EVEN_CONFIG.generateAnswer!();
  }

  protected extractChoiceValue(choice: OddEvenChoiceMessage): OddEvenGuess {
    return choice.choice;
  }

  protected isCorrectChoice(playerChoice: OddEvenGuess, targetAnswer: OddEvenGuess): boolean {
    return playerChoice === targetAnswer;
  }

  protected createInitialGameState(roomId: string, playerIds: string[]): OddEvenGameState {
    return {
      roomId,
      gameType: 'odd-even',
      category: 'round-based',
      playerIds,
      gameStatus: 'waiting_for_moves',
      currentRound: 1,
      maxRounds: ODD_EVEN_CONFIG.maxRounds,
      playerScores: {},
      playerChoices: {},
      targetAnswer: undefined,
      roundHistory: [],
      disconnectedPlayers: [],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
  }

  protected createRoundHistory(
    round: number,
    playerChoices: Record<string, OddEvenGuess>,
    targetAnswer: OddEvenGuess,
    winners: string[],
    playerResults: Record<string, 'win' | 'lose' | 'draw'>
  ): OddEvenRound {
    return {
      round,
      targetAnswer,
      playerChoices,
      winners,
      playerResults
    };
  }

  protected getMaxRounds(): number {
    return ODD_EVEN_CONFIG.maxRounds;
  }
}

// 팩토리 함수 (기존 코드와의 호환성을 위해)
export function createOddEvenHandlers(broadcastToRoom: Function) {
  const handler = new OddEvenHandler(
    require("../../storage").storage, 
    broadcastToRoom
  );
  
  return {
    handleChoice: handler.handleChoice.bind(handler),
    processRound: handler.processRound.bind(handler),
    createGame: handler.createGame.bind(handler)
  };
}