// Odd-Even Game Schema
import type { RoundBasedGameState, BaseChoice, BaseRound, GameConfig } from '../base/types/game-types';

export type OddEvenGuess = 'odd' | 'even';

export interface OddEvenGameState extends RoundBasedGameState {
  gameType: 'odd-even';
  roomId: string;
  category: 'round-based';
  playerIds: string[];
  gameStatus: 'waiting_for_moves' | 'playing' | 'game_finished';
  currentRound: number;
  maxRounds: number;
  playerScores: Record<string, number>;
  playerChoices: Record<string, OddEvenGuess>; // playerId -> selected choice
  targetAnswer?: OddEvenGuess;
  roundHistory: OddEvenRound[];
  disconnectedPlayers: string[];
  createdAt: number;
  lastUpdated: number;
}

export interface OddEvenRound extends BaseRound {
  round: number;
  playerChoices: Record<string, OddEvenGuess>;
  targetAnswer?: OddEvenGuess;
  winners: string[];
  playerResults: Record<string, 'win' | 'lose' | 'draw'>;
}

export interface OddEvenChoice extends BaseChoice {
  type: 'odd_even_choice';
  choice: OddEvenGuess;
}

export interface OddEvenChoiceMessage extends OddEvenChoice {
  type: 'odd_even_choice';
  choice: OddEvenGuess;
}

export const ODD_EVEN_CONFIG: GameConfig<OddEvenGuess> & { maxRounds: number } = {
  name: '홀짝 맞추기',
  description: '홀수 또는 짝수 중 하나를 맞춰보세요!',
  choices: ['odd', 'even'] as OddEvenGuess[],
  generateAnswer: () => (Math.random() < 0.5 ? 'odd' : 'even') as OddEvenGuess,
  maxRounds: 3
};