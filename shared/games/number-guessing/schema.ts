// Number Guessing Game Schema
import type { RoundBasedGameState, BaseChoice, BaseRound, GameConfig } from '../base/game-types';

export type NumberGuess = 1 | 2 | 3 | 4 | 5;

export interface NumberGuessGameState extends RoundBasedGameState {
  gameType: 'number-guessing';
  playerNumbers: Record<string, NumberGuess>; // playerId -> selected number
  targetNumber?: NumberGuess;
  roundHistory: NumberGuessRound[];
}

export interface NumberGuessRound extends BaseRound {
  playerNumbers: Record<string, NumberGuess>;
  targetNumber?: NumberGuess;
}

export interface NumberGuessChoice extends BaseChoice {
  type: 'number_choice';
  number: NumberGuess;
}

export const NUMBER_GUESSING_CONFIG: GameConfig<NumberGuess> = {
  name: '숫자 맞추기',
  description: '1부터 5까지 숫자 중 하나를 맞춰보세요!',
  choices: [1, 2, 3, 4, 5] as NumberGuess[],
  generateAnswer: () => (Math.floor(Math.random() * 5) + 1) as NumberGuess
};