import { BaseGameHandler } from "@shared/games/base/base-game-handler";
import type { 
  OddEvenGuess, 
  OddEvenGameState, 
  OddEvenChoice, 
  OddEvenRound 
} from "@shared/games/odd-even/schema";
import { ODD_EVEN_CONFIG } from "@shared/games/odd-even/schema";
import type { GameResult } from "@shared/games/base/game-types";

export class OddEvenHandler extends BaseGameHandler<
  OddEvenGameState,
  OddEvenChoice,
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

  protected extractChoiceValue(choice: OddEvenChoice): OddEvenGuess {
    return choice.choice;
  }

  protected isCorrectChoice(playerChoice: OddEvenGuess, targetAnswer: OddEvenGuess): boolean {
    return playerChoice === targetAnswer;
  }

  protected createInitialGameState(roomId: string, playerIds: string[]): OddEvenGameState {
    const playerScores: Record<string, number> = {};
    playerIds.forEach(playerId => {
      playerScores[playerId] = 0;
    });

    return {
      roomId,
      gameType: 'odd-even',
      category: 'round-based',
      playerIds,
      playerChoices: {},
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
    playerChoices: Record<string, OddEvenGuess>,
    targetAnswer: OddEvenGuess,
    winners: string[],
    playerResults: Record<string, GameResult>
  ): OddEvenRound {
    return {
      round,
      playerChoices,
      targetAnswer,
      winners,
      playerResults
    };
  }

  protected getMaxRounds(): number {
    return 3;
  }

  // 게임별 특수 처리 메서드들 (베이스 클래스의 공통 로직 사용)
  protected async onPlayerLeave(game: OddEvenGameState, playerId: string): Promise<void> {
    // 플레이어 제거
    const playerIndex = game.playerIds.indexOf(playerId);
    if (playerIndex !== -1) {
      game.playerIds.splice(playerIndex, 1);
    }
    
    // 게임 데이터 정리
    delete game.playerChoices[playerId];
    delete game.playerScores[playerId];

    // 모든 플레이어가 선택을 완료했는지 확인
    const allPlayersChosen = game.playerIds.every(playerId => 
      game.playerChoices[playerId] !== undefined
    );
    
    if (allPlayersChosen) {
      await this.processRound(game.roomId);
    }
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