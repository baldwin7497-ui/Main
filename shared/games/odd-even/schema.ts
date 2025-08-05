// Odd-Even Game Schema
import type { RoundBasedGameState, BaseChoice, BaseRound, GameConfig } from '../base/game-types';

export type OddEvenGuess = 'odd' | 'even';

export interface OddEvenGameState extends RoundBasedGameState {
  gameType: 'odd-even';
  playerChoices: Record<string, OddEvenGuess>; // playerId -> selected choice
  targetAnswer?: OddEvenGuess;
  roundHistory: OddEvenRound[];
}

export interface OddEvenRound extends BaseRound {
  playerChoices: Record<string, OddEvenGuess>;
  targetAnswer?: OddEvenGuess;
}

export interface OddEvenChoice extends BaseChoice {
  type: 'odd_even_choice';
  choice: OddEvenGuess;
}

export const ODD_EVEN_CONFIG: GameConfig<OddEvenGuess> = {
  name: '홀짝 맞추기',
  description: '홀수 또는 짝수 중 하나를 맞춰보세요!',
  choices: ['odd', 'even'] as OddEvenGuess[],
  generateAnswer: () => (Math.random() < 0.5 ? 'odd' : 'even') as OddEvenGuess
};