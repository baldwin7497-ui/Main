// BluffCard Game Schema - 턴 기반 블러핑 카드 게임 타입 정의
import type { TurnBasedGameState, BaseChoice, BaseRound, GameConfig, GameMove } from '../base/types/game-types';

// ============================================================================
// 기본 타입 정의
// ============================================================================

/** 블러프 카드 게임에서 사용되는 카드 숫자 (1-5) */
export type BluffCardNumber = 1 | 2 | 3 | 4 | 5;

/** 블러프 카드 선택지 타입 (하위 호환성) */
export type BluffCardChoice = BluffCardNumber;

// ============================================================================
// 게임 상태 인터페이스
// ============================================================================

/** 플레이어의 손패 정보 */
export interface PlayerHand {
  /** 플레이어가 보유한 카드들 */
  cards: BluffCardNumber[];
}

/** 플레이한 카드 정보 */
export interface PlayedCards {
  /** 카드를 낸 플레이어 ID */
  playerId: string;
  /** 실제로 낸 카드들 */
  cards: BluffCardNumber[];
  /** 선택된 카드의 인덱스 (UI용) */
  cardIndices: number[];
  /** 주장한 숫자 */
  claimedNumber: BluffCardNumber;
  /** 주장한 카드 수 */
  claimedCount: number;
  /** 주장한 진실 여부 (현재는 항상 true) */
  claimedTruth: boolean;
  /** 실제 진실 여부 (서버에서 계산) */
  actualTruth: boolean;
  /** 카드가 공개되었는지 여부 (이의제기 시에만 true) */
  revealed?: boolean;
}

/** 블러프 카드 게임 상태 */
export interface BluffCardGameState extends TurnBasedGameState {
  /** 게임 타입 식별자 */
  gameType: 'bluff-card';
  /** 게임 카테고리 */
  category: 'turn-based';
  
  // 게임별 상태
  /** 플레이어별 손패 */
  playerHands: Record<string, PlayerHand>;
  /** 현재 라운드의 타겟 숫자 */
  currentTarget: BluffCardNumber;
  /** 턴 제한 시간 (초) */
  turnTimeLeft: number;
  /** 현재 플레이된 카드 정보 */
  playedCards: PlayedCards | null;
  
  // 이의제기 관련
  /** 이의제기 창이 열려있는지 여부 */
  challengeWindow: boolean;
  /** 이의제기 제한 시간 (초) */
  challengeTimeLeft: number;
  /** 이의제기를 한 플레이어들 */
  challengingPlayers: string[];
  /** 현재 이의제기 결과 */
  currentChallengeResult?: {
    /** 블러핑이었는지 여부 */
    wasBluff: boolean;
    /** 패널티를 받은 플레이어 */
    penalizedPlayer: string;
    /** 이의제기한 플레이어 */
    challenger: string;
  };
  
  // 게임 진행 상태
  /** 라운드 히스토리 (하위 호환성) */
  roundHistory: BluffCardRound[];
  /** 탈락한 플레이어들 */
  eliminatedPlayers: string[];
}

// ============================================================================
// 라운드 및 이동 정의
// ============================================================================

/** 블러프 카드 라운드 정보 (하위 호환성) */
export interface BluffCardRound extends BaseRound {
  /** 라운드 번호 */
  round: number;
  /** 해당 라운드의 타겟 숫자 */
  targetNumber: BluffCardNumber;
  /** 플레이된 카드 정보 */
  playedCards: PlayedCards | null;
  /** 이의제기 결과 */
  challengeResult?: {
    /** 이의제기한 플레이어 */
    challenger: string;
    /** 블러핑이었는지 여부 */
    wasBluff: boolean;
    /** 패널티를 받은 플레이어 */
    penalizedPlayer: string;
  };
  /** 라운드 승자들 */
  winners: string[];
  /** 플레이어별 결과 */
  playerResults: Record<string, 'win' | 'lose' | 'draw'>;
  
  // 턴 기반 게임에서는 사용하지 않는 필드들 (하위 호환성)
  /** @deprecated 턴 기반 게임에서는 사용하지 않음 */
  playerChoices?: Record<string, BluffCardChoice>;
  /** @deprecated 턴 기반 게임에서는 사용하지 않음 */
  targetAnswer?: BluffCardChoice;
}

// ============================================================================
// 메시지 타입 정의
// ============================================================================

/** 카드 플레이 메시지 */
export interface BluffCardPlayMessage extends BaseChoice {
  /** 메시지 타입 */
  type: 'bluff_card_play';
  /** 실제로 낸 카드들 */
  cards: BluffCardNumber[];
  /** 선택된 카드의 인덱스 */
  cardIndices: number[];
  /** 주장한 숫자 */
  claimedNumber: BluffCardNumber;
  /** 주장한 카드 수 */
  claimedCount: number;
  /** 주장한 진실 여부 */
  claimedTruth: boolean;
  /** 실제 진실 여부 */
  actualTruth: boolean;
}

/** 이의제기 메시지 */
export interface BluffCardChallengeMessage extends BaseChoice {
  /** 메시지 타입 */
  type: 'bluff_card_challenge';
  /** 이의제기 여부 */
  challenge: boolean;
}

// ============================================================================
// 게임 설정
// ============================================================================

/** 블러프 카드 게임 설정 */
export const BLUFF_CARD_CONFIG: GameConfig<BluffCardNumber> & { 
  /** 최대 라운드 수 (하위 호환성) */
  maxRounds: number 
} = {
  /** 게임 이름 */
  name: '속였군요?',
  /** 게임 설명 */
  description: '타겟 숫자에 맞는 카드를 내거나 다른 카드를 내서 속이는 게임!',
  /** 가능한 선택지들 */
  choices: [1, 2, 3, 4, 5] as BluffCardNumber[],
  /** 
   * 타겟 숫자 생성 함수
   * @returns 1-5 사이의 랜덤한 숫자
   */
  generateAnswer: (): BluffCardNumber => {
    const choices: BluffCardNumber[] = [1, 2, 3, 4, 5];
    return choices[Math.floor(Math.random() * choices.length)];
  },
  /** 최대 라운드 수 (하위 호환성, 실제로는 카드 소진까지) */
  maxRounds: 50
};

// ============================================================================
// 유틸리티 타입들
// ============================================================================

/** 블러프 카드 게임의 모든 메시지 타입 */
export type BluffCardMessage = BluffCardPlayMessage | BluffCardChallengeMessage;

/** 게임 이벤트 타입들 */
export type BluffCardEventType = 
  | 'card_played'
  | 'challenge_started'
  | 'challenge_resolved'
  | 'penalty_applied'
  | 'player_won';

/** 블러프 카드 게임별 통계 */
export interface BluffCardStats {
  /** 총 플레이한 카드 수 */
  totalCardsPlayed: number;
  /** 성공한 블러핑 수 */
  successfulBluffs: number;
  /** 실패한 블러핑 수 */
  failedBluffs: number;
  /** 성공한 이의제기 수 */
  successfulChallenges: number;
  /** 실패한 이의제기 수 */
  failedChallenges: number;
  /** 받은 패널티 카드 수 */
  penaltyCardsReceived: number;
}