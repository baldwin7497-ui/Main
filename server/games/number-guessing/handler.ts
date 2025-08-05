import { BaseGameHandler } from "@shared/games/base/base-game-handler";
import type { 
  NumberGuess, 
  NumberGuessGameState, 
  NumberGuessChoice, 
  NumberGuessRound 
} from "@shared/games/number-guessing/schema";
import { NUMBER_GUESSING_CONFIG } from "@shared/games/number-guessing/schema";
import type { GameResult } from "@shared/games/base/game-types";

export class NumberGuessingHandler extends BaseGameHandler<
  NumberGuessGameState,
  NumberGuessChoice,
  NumberGuess,
  NumberGuessRound
> {
  protected getGameType(): string {
    return 'number-guessing';
  }

  protected getPlayerChoicesKey(): keyof NumberGuessGameState {
    return 'playerNumbers';
  }

  protected getTargetAnswerKey(): keyof NumberGuessGameState {
    return 'targetNumber';
  }

  protected generateAnswer(): NumberGuess {
    return NUMBER_GUESSING_CONFIG.generateAnswer!();
  }

  protected extractChoiceValue(choice: NumberGuessChoice): NumberGuess {
    return choice.number;
  }

  protected isCorrectChoice(playerChoice: NumberGuess, targetAnswer: NumberGuess): boolean {
    return playerChoice === targetAnswer;
  }

  protected createInitialGameState(roomId: string, playerIds: string[]): NumberGuessGameState {
    const playerScores: Record<string, number> = {};
    playerIds.forEach(playerId => {
      playerScores[playerId] = 0;
    });

    return {
      roomId,
      gameType: 'number-guessing',
      category: 'round-based',
      playerIds,
      playerNumbers: {},
      currentRound: 1,
      maxRounds: this.getMaxRounds(),
      playerScores,
      gameStatus: 'waiting_for_moves',
      roundHistory: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      disconnectedPlayers: [] // 연결 관리 필드 초기화
    };
  }

  protected createRoundHistory(
    round: number,
    playerNumbers: Record<string, NumberGuess>,
    targetNumber: NumberGuess,
    winners: string[],
    playerResults: Record<string, GameResult>
  ): NumberGuessRound {
    return {
      round,
      playerNumbers,
      targetNumber,
      winners,
      playerResults
    };
  }

  protected getMaxRounds(): number {
    return 3;
  }

  // 게임별 특수 처리 메서드들 (베이스 클래스의 공통 로직 사용)
  protected async onPlayerLeave(game: NumberGuessGameState, playerId: string): Promise<void> {
    // 플레이어 제거
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex !== -1) {
      game.playerIds.splice(playerIndex, 1);
    }
    
    // 게임 데이터 정리
    delete game.playerNumbers[playerId];
    delete game.playerScores[playerId];

    // 모든 플레이어가 선택을 완료했는지 확인
    const allPlayersChosen = game.playerIds.every(playerId => 
      game.playerNumbers[playerId] !== undefined
    );
    
    if (allPlayersChosen) {
      await this.processRound(game.roomId);
    }
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