// BluffCard Game Schema
import type { BaseGameState, BaseChoice, BaseRound, GameConfig } from '../base/game-types';

export type BluffCardNumber = 1 | 2 | 3 | 4 | 5;

export interface PlayerHand {
  cards: BluffCardNumber[];
}

export interface PlayedCards {
  playerId: string;
  cards: BluffCardNumber[];
  cardIndices: number[]; // 선택된 카드의 인덱스 (순서 보존용)
  claimedNumber: BluffCardNumber;
  claimedCount: number;
  claimedTruth: boolean; // 플레이어가 주장하는 것 (진실/거짓)
  actualTruth: boolean; // 실제 진실 여부
  revealed?: boolean; // 카드가 공개되었는지 여부 (이의제기 시에만 true)
}

export interface BluffCardGameState extends BaseGameState {
  gameType: 'bluff-card';
  // 플레이어별 손패
  playerHands: Record<string, PlayerHand>;
  // 현재 라운드 정보
  currentRound: number;
  currentTarget: BluffCardNumber; // 매 라운드마다 공개되는 숫자
  // 턴 정보
  currentPlayerIndex: number;
  currentPlayerId: string;
  turnTimeLeft: number;
  // 플레이한 카드들
  playedCards: PlayedCards | null;
  // 이의제기 관련
  challengeWindow: boolean;
  challengeTimeLeft: number;
  challengingPlayers: string[];
  // 게임 진행
  roundHistory: BluffCardRound[];
  eliminatedPlayers: string[];
  // 연결이 끊긴 플레이어 목록
  disconnectedPlayers: string[];
}

export interface BluffCardRound extends BaseRound {
  targetNumber: BluffCardNumber;
  playedCards: PlayedCards | null;
  challengeResult?: {
    challenger: string;
    wasBluff: boolean;
    penalizedPlayer: string;
  };
}

export interface BluffCardPlayMessage extends BaseChoice {
  type: 'bluff_card_play';
  cards: BluffCardNumber[];
  cardIndices: number[]; // 선택된 카드의 인덱스
  claimedNumber: BluffCardNumber;
  claimedCount: number;
  claimedTruth: boolean;
  actualTruth: boolean;
}

export interface BluffCardChallengeMessage extends BaseChoice {
  type: 'bluff_card_challenge';
  challenge: boolean;
}

export const BLUFF_CARD_CONFIG: GameConfig<BluffCardNumber> = {
  name: '속였군요?',
  description: '타겟 숫자에 맞는 카드를 내거나 다른 카드를 내서 속이는 게임!',
  choices: [1, 2, 3, 4, 5] as BluffCardNumber[],
  generateAnswer: () => {
    // 매 라운드마다 랜덤한 타겟 숫자 생성
    const choices: BluffCardNumber[] = [1, 2, 3, 4, 5];
    return choices[Math.floor(Math.random() * choices.length)];
  }
};