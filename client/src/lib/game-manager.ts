// 클라이언트 측 게임 매니저
import type { GameState } from '@shared/schema';
import type { NumberGuess, NumberGuessChoice } from '@shared/games/number-guessing/schema';
import type { OddEvenGuess, OddEvenChoice } from '@shared/games/odd-even/schema';
import type { TicTacToePosition, TicTacToeChoiceMessage } from '@shared/games/tic-tac-toe/schema';
import type { BluffCardNumber, BluffCardPlayMessage, BluffCardChallengeMessage } from '@shared/games/bluff-card/schema';
import type { ChessMove, ChessChoiceMessage } from '@shared/games/chess/schema';

// 게임 선택 타입 (모든 게임의 선택 타입 유니온)
export type GameChoice = NumberGuess | OddEvenGuess | TicTacToePosition | BluffCardNumber | ChessMove;

// 웹소켓 메시지 타입 (게임별)
export type GameChoiceMessage = NumberGuessChoice | OddEvenChoice | TicTacToeChoiceMessage | BluffCardPlayMessage | BluffCardChallengeMessage | ChessChoiceMessage;

// 게임 메타데이터 인터페이스
export interface GameMetadata {
  name: string;
  description: string;
  choices?: GameChoice[]; // 라운드 기반 게임만 사용
  messageType: string;
  gameCategory: 'round-based' | 'turn-based' | 'board-game';
}

// 게임 매니저 클래스
export class GameManager {
  private static instance: GameManager;
  private gameMetadata: Map<string, GameMetadata> = new Map();

  private constructor() {
    this.initializeGames();
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  private initializeGames(): void {
    // Number Guessing 게임 등록
    this.gameMetadata.set('number-guessing', {
      name: '숫자 맞추기',
      description: '1부터 5까지 숫자 중 하나를 맞춰보세요!',
      choices: [1, 2, 3, 4, 5] as NumberGuess[],
      messageType: 'number_choice',
      gameCategory: 'round-based'
    });

    // Odd-Even 게임 등록
    this.gameMetadata.set('odd-even', {
      name: '홀짝 맞추기',
      description: '홀수 또는 짝수 중 하나를 맞춰보세요!',
      choices: ['odd', 'even'] as OddEvenGuess[],
      messageType: 'odd_even_choice',
      gameCategory: 'round-based'
    });

    // Tic-Tac-Toe 게임 등록
    this.gameMetadata.set('tic-tac-toe', {
      name: '틱택토',
      description: '3x3 보드에서 같은 기호 3개를 한 줄로 만드세요!',
      messageType: 'tic_tac_toe_move',
      gameCategory: 'board-game'
    });

    // BluffCard 게임 등록
    this.gameMetadata.set('bluff-card', {
      name: '속였군요?',
      description: '카드를 내며 거짓말을 하거나 진실을 말하는 블러핑 게임!',
      messageType: 'bluff_card_play',
      gameCategory: 'turn-based'
    });

    // Chess 게임 등록
    this.gameMetadata.set('chess', {
      name: '체스',
      description: '고전적인 체스 게임을 즐겨보세요!',
      messageType: 'chess_move',
      gameCategory: 'board-game'
    });
  }

  // 게임 메타데이터 조회
  getGameMetadata(gameType: string): GameMetadata | null {
    return this.gameMetadata.get(gameType) || null;
  }

  // 지원되는 게임 타입 목록
  getSupportedGameTypes(): string[] {
    return Array.from(this.gameMetadata.keys());
  }

  // 모든 게임 메타데이터 조회
  getAllGameMetadata(): Record<string, GameMetadata> {
    const result: Record<string, GameMetadata> = {};
    this.gameMetadata.forEach((metadata, gameType) => {
      result[gameType] = metadata;
    });
    return result;
  }

  // 게임 선택을 웹소켓 메시지로 변환
  createChoiceMessage(gameType: string, choice: GameChoice): GameChoiceMessage | null {
    const metadata = this.getGameMetadata(gameType);
    if (!metadata) return null;

    switch (gameType) {
      case 'number-guessing':
        return {
          type: 'number_choice',
          number: choice as NumberGuess
        } as NumberGuessChoice;
      
      case 'odd-even':
        return {
          type: 'odd_even_choice',
          choice: choice as OddEvenGuess
        } as OddEvenChoice;
      
      default:
        return null;
    }
  }

  // 게임 상태에서 현재 플레이어의 선택 추출
  getCurrentPlayerChoice(gameState: GameState, playerId: string): GameChoice | null {
    switch (gameState.gameType) {
      case 'number-guessing':
        const numberGame = gameState as any;
        return numberGame.playerNumbers?.[playerId] || null;
      
      case 'odd-even':
        const oddEvenGame = gameState as any;
        return oddEvenGame.playerChoices?.[playerId] || null;
      
      default:
        return null;
    }
  }

  // 게임 상태에서 모든 플레이어가 선택했는지 확인
  areAllPlayersReady(gameState: GameState): boolean {
    switch (gameState.gameType) {
      case 'number-guessing':
        const numberGame = gameState as any;
        return gameState.playerIds.every(id => 
          numberGame.playerNumbers?.[id] !== undefined
        );
      
      case 'odd-even':
        const oddEvenGame = gameState as any;
        return gameState.playerIds.every(id => 
          oddEvenGame.playerChoices?.[id] !== undefined
        );
      
      default:
        return false;
    }
  }

  // 게임별 선택지 검증
  isValidChoice(gameType: string, choice: GameChoice): boolean {
    const metadata = this.getGameMetadata(gameType);
    if (!metadata) return false;

    // 라운드 기반 게임은 choices 배열과 비교
    if (metadata.gameCategory === 'round-based' && metadata.choices) {
      return metadata.choices.includes(choice);
    }

    // 턴/보드 기반 게임은 항상 true (서버에서 유효성 검사)
    if (metadata.gameCategory === 'turn-based' || metadata.gameCategory === 'board-game') {
      return true;
    }

    return false;
  }
}

// 싱글톤 인스턴스 내보내기
export const gameManager = GameManager.getInstance();