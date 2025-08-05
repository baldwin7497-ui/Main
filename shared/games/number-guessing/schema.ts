// Number Guessing Game Schema
import type { RoundBasedGameState, BaseChoice, BaseRound, GameConfig } from '../base/types/game-types';

export type NumberGuess = 1 | 2 | 3 | 4 | 5;

export interface NumberGuessGameState extends RoundBasedGameState {
  gameType: 'number-guessing';
  roomId: string;
  category: 'round-based';
  playerIds: string[];
  gameStatus: 'waiting_for_moves' | 'playing' | 'game_finished';
  currentRound: number;
  maxRounds: number;
  playerScores: Record<string, number>;
  playerNumbers: Record<string, NumberGuess>; // playerId -> selected number
  targetNumber?: NumberGuess;
  playerChoices: Record<string, NumberGuess>; // playerId -> selected number
  targetAnswer?: NumberGuess;
  roundHistory: NumberGuessRound[];
  disconnectedPlayers: string[];
  createdAt: number;
  lastUpdated: number;
}

export interface NumberGuessRound extends BaseRound {
  round: number;
  playerNumbers: Record<string, NumberGuess>;
  targetNumber?: NumberGuess;
  targetAnswer?: NumberGuess;
  playerChoices: Record<string, NumberGuess>;
  winners: string[];
  playerResults: Record<string, 'win' | 'lose' | 'draw'>;
}

export interface NumberGuessChoice extends BaseChoice {
  type: 'number_choice';
  number: NumberGuess;
}

export interface NumberGuessChoiceMessage extends NumberGuessChoice {
  type: 'number_choice';
  number: NumberGuess;
}

export const NUMBER_GUESSING_CONFIG: GameConfig<NumberGuess> & { maxRounds: number } = {
  name: '숫자 맞추기',
  description: '1부터 5까지 숫자 중 하나를 맞춰보세요!',
  choices: [1, 2, 3, 4, 5] as NumberGuess[],
  generateAnswer: () => (Math.floor(Math.random() * 5) + 1) as NumberGuess,
  maxRounds: 3
};