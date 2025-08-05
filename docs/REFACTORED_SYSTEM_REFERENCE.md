# 리팩토링된 시스템 참조 가이드

> 🔧 **개발자/AI 에이전트용**: 리팩토링된 시스템의 실제 구현과 사용법을 빠르게 참조할 수 있는 실용적 가이드

## 🎯 빠른 참조

### 📁 핵심 파일 위치

```bash
# 타입 시스템 (가장 중요!)
shared/games/base/game-types.ts         # 모든 타입 정의
shared/games/base/game-interfaces.ts    # 인터페이스 정의

# 베이스 클래스들
shared/games/base/base-game-handler.ts      # 라운드 기반
shared/games/base/turn-based-game-handler.ts # 턴 기반  
shared/games/base/board-game-handler.ts     # 보드 게임

# 팩토리 및 생성
shared/games/base/game-factory.ts       # 게임 등록/생성
shared/games/base/game-generator.ts     # 자동 코드 생성

# 메시지 시스템
shared/games/base/message-types.ts      # 메시지 타입 및 빌더

# React 컴포넌트 베이스
client/src/components/game-play/common/base-game-component.tsx
```

### 🎮 게임 카테고리별 구현 예시

#### 📍 현재 구현된 게임들

| 게임 | 카테고리 | 베이스 클래스 | 복잡도 |
|------|----------|---------------|---------|
| 숫자 맞추기 | Round-based | BaseGameHandler | 간단 |
| 홀짝 | Round-based | BaseGameHandler | 간단 |
| 블러프 카드 | Turn-based | BaseTurnGameHandler | 복잡 |
| 틱택토 | Board-game | BaseBoardGameHandler | 중간 |

## 🏗️ 실제 구현 패턴

### 1. 라운드 기반 게임 구현

**📁 파일**: `server/games/number-guessing/handler.ts`

```typescript
export class NumberGuessingHandler extends BaseGameHandler<
  NumberGuessGameState,      // 게임 상태 타입
  NumberGuessChoiceMessage,  // 메시지 타입
  NumberGuess,               // 선택지 타입
  NumberGuessRound          // 라운드 타입
> {
  protected getGameType(): string {
    return 'number-guessing';
  }

  // 핵심: 베이스 클래스가 대부분 로직 처리
  // 게임별로 이 메서드들만 구현하면 됨
  protected generateAnswer(): NumberGuess {
    return NUMBER_GUESSING_CONFIG.generateAnswer()!;
  }

  protected extractChoiceValue(choice: NumberGuessChoiceMessage): NumberGuess {
    return choice.number;
  }

  protected isCorrectChoice(playerChoice: NumberGuess, targetAnswer: NumberGuess): boolean {
    return playerChoice === targetAnswer;
  }
}
```

### 2. 턴 기반 게임 구현

**📁 파일**: `server/games/bluff-card/handler.ts` (복잡한 예시)

```typescript
export class BluffCardHandler extends BaseTurnGameHandler<
  BluffCardGameState,
  BluffCardPlayMessage | BluffCardChallengeMessage
> {
  
  // 턴 기반 게임의 핵심 메서드들
  public validateMove(gameState: BluffCardGameState, userId: string, move: any): boolean {
    // 게임별 이동 유효성 검사
  }

  public applyMove(gameState: BluffCardGameState, userId: string, move: any): BluffCardGameState {
    // 이동 적용 로직
  }

  public checkGameEnd(gameState: BluffCardGameState): { ended: boolean; reason?: string; winner?: string } {
    // 게임 종료 조건 확인
  }

  public getValidMoves(gameState: BluffCardGameState, userId: string): any[] {
    // 가능한 이동 목록 반환
  }
}
```

### 3. 보드 게임 구현

**📁 파일**: `server/games/tic-tac-toe/handler.ts`

```typescript
export class TicTacToeHandler extends BaseBoardGameHandler<
  TicTacToeGameState,
  TicTacToeMove
> {
  
  // 보드 게임 특화 메서드들
  protected getBoardSize(): { width: number; height: number } {
    return { width: 3, height: 3 };
  }

  public initializeBoard(): TicTacToeBoard {
    return [
      [null, null, null],
      [null, null, null], 
      [null, null, null]
    ];
  }

  // 베이스의 보드 관리 메서드들 활용
  // isWithinBounds(), isPositionEmpty(), cloneBoard() 등
}
```

## 🔧 개발자를 위한 실용 팁

### ⚡ 새 게임 개발 시 최소 단계

#### 1단계: 스키마 정의 (5분)
```typescript
// shared/games/my-game/schema.ts
export type MyChoice = 'option1' | 'option2' | 'option3';

export interface MyGameState extends RoundBasedGameState {
  gameType: 'my-game';
  playerChoices: Record<string, MyChoice>;
  targetAnswer?: MyChoice;
}

export const MY_GAME_CONFIG: GameConfig<MyChoice> = {
  name: '내 게임',
  description: '게임 설명',
  choices: ['option1', 'option2', 'option3'] as MyChoice[],
  generateAnswer: () => ['option1', 'option2', 'option3'][Math.floor(Math.random() * 3)] as MyChoice
};
```

#### 2단계: 핸들러 구현 (10분)
```typescript
// server/games/my-game/handler.ts
export class MyGameHandler extends BaseGameHandler<MyGameState, MyChoiceMessage, MyChoice, MyRound> {
  protected getGameType() { return 'my-game'; }
  protected generateAnswer() { return MY_GAME_CONFIG.generateAnswer()!; }
  protected extractChoiceValue(choice: MyChoiceMessage) { return choice.choice; }
  protected isCorrectChoice(playerChoice: MyChoice, targetAnswer: MyChoice) {
    return playerChoice === targetAnswer;
  }
  // createInitialGameState, createRoundHistory 메서드도 구현 필요
}
```

#### 3단계: React 컴포넌트 (15분)
```typescript
// client/src/components/game-play/my-game/MyGame.tsx
export function MyGame({ gameState, onChoiceSelect, selectedChoice, isParticipant }: MyGameProps) {
  const choices = [
    { value: 'option1' as MyChoice, label: 'Option 1' },
    { value: 'option2' as MyChoice, label: 'Option 2' },
    { value: 'option3' as MyChoice, label: 'Option 3' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>내 게임 - 라운드 {gameState.currentRound}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 선택지 버튼들 */}
        <div className="grid grid-cols-3 gap-4">
          {choices.map(choice => (
            <Button
              key={choice.value}
              onClick={() => onChoiceSelect(choice.value)}
              disabled={!isParticipant || gameState.gameStatus !== 'waiting_for_moves'}
              variant={selectedChoice === choice.value ? "default" : "secondary"}
            >
              {choice.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 4단계: 등록 (5분)
```typescript
// server/games/game-registry.ts에 추가
gameFactory.registerGame('my-game', MyGameHandler, { /* metadata */ });

// client/src/lib/game-manager.ts에 추가
this.gameMetadata.set('my-game', { /* metadata */ });

// client/src/pages/game-play.tsx에 추가
case 'my-game':
  return <MyGame {...commonProps} gameState={gameState as MyGameState} />;
```

### 🎯 베이스 클래스 메서드 활용

#### BaseGameHandler 제공 메서드들
```typescript
// 자동으로 제공되는 메서드들 (오버라이드 불필요)
async handlePlayerChoice(roomId: string, playerId: string, choice: TChoice): Promise<void>
async processRound(roomId: string): Promise<void>
async createGame(roomId: string, playerIds: string[]): Promise<TGameState>
async getGameState(roomId: string): Promise<TGameState | null>

// 연결 관리 (자동 처리)
async handlePlayerDisconnect(roomId: string, playerId: string): Promise<void>
async handlePlayerReconnect(roomId: string, playerId: string): Promise<void>
async handlePlayerLeave(roomId: string, playerId: string): Promise<void>
```

#### BaseBoardGameHandler 추가 메서드들
```typescript
// 보드 관리 헬퍼들
protected isWithinBounds(row: number, col: number): boolean
protected isPositionEmpty(board: any[][], row: number, col: number): boolean
protected cloneBoard(board: any[][]): any[][]
protected printBoard(board: any[][]): void  // 디버깅용
```

### 🔍 디버깅 도구들

#### 1. 게임 상태 로깅
```typescript
// 개발 모드에서 상태 추적
console.log('게임 상태 업데이트:', {
  gameType: gameState.gameType,
  status: gameState.gameStatus,
  currentRound: gameState.currentRound,
  playerCount: gameState.playerIds.length,
  disconnectedCount: gameState.disconnectedPlayers?.length || 0
});
```

#### 2. 메시지 검증
```typescript
// MessageBuilder를 통한 안전한 메시지 생성
const message = MessageBuilder.gameState(gameState, gameType, category, roomId);
const errorMessage = MessageBuilder.error('INVALID_MOVE', '잘못된 움직임', details, roomId, userId);
```

#### 3. 타입 검증 도구
```typescript
// 런타임 타입 검증 (개발 시)
if (process.env.NODE_ENV === 'development') {
  if (!isValidGameState(gameState)) {
    console.error('Invalid game state:', gameState);
  }
}
```

## 🚨 주의사항 및 베스트 프랙티스

### ❌ 흔한 실수들

1. **잘못된 베이스 클래스 선택**
   ```typescript
   // ❌ 틱택토인데 라운드 기반 사용
   class TicTacToeHandler extends BaseGameHandler { }
   
   // ✅ 보드 게임이므로 보드 게임 베이스 사용
   class TicTacToeHandler extends BaseBoardGameHandler { }
   ```

2. **타입 불일치**
   ```typescript
   // ❌ 제네릭 타입 누락
   class MyHandler extends BaseGameHandler { }
   
   // ✅ 모든 제네릭 타입 명시
   class MyHandler extends BaseGameHandler<MyState, MyMessage, MyChoice, MyRound> { }
   ```

3. **등록 누락**
   ```typescript
   // ❌ 서버만 등록하고 클라이언트 등록 안함
   // 또는 그 반대
   
   // ✅ 서버/클라이언트 모두 등록
   ```

### ✅ 권장 패턴들

1. **게임별 설정 분리**
   ```typescript
   // ✅ 설정을 별도 상수로 분리
   export const GAME_CONFIG = {
     name: '게임명',
     maxPlayers: 6,
     maxRounds: 3,
     // ...
   };
   ```

2. **에러 처리 일관성**
   ```typescript
   // ✅ 일관된 에러 처리
   try {
     await this.processGameAction();
   } catch (error) {
     console.error(`게임 처리 오류 [${this.getGameType()}]:`, error);
     throw new GameProcessingError(error.message);
   }
   ```

3. **상태 불변성 유지**
   ```typescript
   // ✅ 상태 변경 시 새 객체 생성
   const newGameState = {
     ...gameState,
     currentRound: gameState.currentRound + 1,
     playerChoices: {} // 리셋
   };
   ```

## 📚 코드 예시 모음

### 🎯 실제 동작하는 간단한 게임 예시

아래는 "동전 던지기" 게임의 완전한 구현 예시입니다:

#### 스키마 정의
```typescript
// shared/games/coin-flip/schema.ts
import type { RoundBasedGameState, BaseChoice, BaseRound, GameConfig } from '../base/game-types';

export type CoinChoice = 'heads' | 'tails';

export interface CoinFlipGameState extends RoundBasedGameState {
  gameType: 'coin-flip';
  playerChoices: Record<string, CoinChoice>;
  targetAnswer?: CoinChoice;
  roundHistory: CoinFlipRound[];
}

export interface CoinFlipRound extends BaseRound {
  playerChoices: Record<string, CoinChoice>;
  targetAnswer?: CoinChoice;
}

export interface CoinFlipChoiceMessage extends BaseChoice {
  type: 'coin_flip_choice';
  choice: CoinChoice;
}

export const COIN_FLIP_CONFIG: GameConfig<CoinChoice> = {
  name: '동전 던지기',
  description: '앞면 또는 뒷면을 맞춰보세요!',
  choices: ['heads', 'tails'] as CoinChoice[],
  generateAnswer: () => Math.random() < 0.5 ? 'heads' : 'tails'
};
```

#### 서버 핸들러
```typescript
// server/games/coin-flip/handler.ts
import { BaseGameHandler } from "@shared/games/base/base-game-handler";
import type { 
  CoinChoice, 
  CoinFlipGameState, 
  CoinFlipChoiceMessage, 
  CoinFlipRound 
} from "@shared/games/coin-flip/schema";
import { COIN_FLIP_CONFIG } from "@shared/games/coin-flip/schema";
import type { GameResult } from "@shared/games/base/game-types";

export class CoinFlipHandler extends BaseGameHandler<
  CoinFlipGameState,
  CoinFlipChoiceMessage,
  CoinChoice,
  CoinFlipRound
> {
  protected getGameType(): string {
    return 'coin-flip';
  }

  protected getPlayerChoicesKey(): keyof CoinFlipGameState {
    return 'playerChoices';
  }

  protected getTargetAnswerKey(): keyof CoinFlipGameState {
    return 'targetAnswer';
  }

  protected generateAnswer(): CoinChoice {
    return COIN_FLIP_CONFIG.generateAnswer()!;
  }

  protected extractChoiceValue(choice: CoinFlipChoiceMessage): CoinChoice {
    return choice.choice;
  }

  protected isCorrectChoice(playerChoice: CoinChoice, targetAnswer: CoinChoice): boolean {
    return playerChoice === targetAnswer;
  }

  protected createInitialGameState(roomId: string, playerIds: string[]): CoinFlipGameState {
    const playerScores: Record<string, number> = {};
    playerIds.forEach(playerId => {
      playerScores[playerId] = 0;
    });

    return {
      roomId,
      gameType: 'coin-flip',
      category: 'round-based',
      playerIds,
      playerChoices: {},
      currentRound: 1,
      maxRounds: 3,
      playerScores,
      gameStatus: 'waiting_for_moves',
      roundHistory: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      disconnectedPlayers: []
    };
  }

  protected createRoundHistory(
    round: number,
    playerChoices: Record<string, CoinChoice>,
    targetAnswer: CoinChoice,
    winners: string[],
    playerResults: Record<string, GameResult>
  ): CoinFlipRound {
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
}
```

#### React 컴포넌트
```typescript
// client/src/components/game-play/coin-flip/CoinFlipGame.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CoinChoice, CoinFlipGameState } from '@shared/games/coin-flip/schema';
import type { BaseGameProps } from '@shared/games/base/game-types';

interface CoinFlipGameProps extends BaseGameProps<CoinFlipGameState, CoinChoice> {}

export function CoinFlipGame({
  gameState,
  selectedChoice,
  onChoiceSelect,
  isParticipant,
  moveSubmitted,
  currentUser,
  gamePlayers
}: CoinFlipGameProps) {
  const choices: { value: CoinChoice; label: string; icon: string }[] = [
    { value: 'heads', label: '앞면', icon: '🪙' },
    { value: 'tails', label: '뒷면', icon: '🔄' }
  ];

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-center">
          동전 던지기 - 라운드 {gameState.currentRound} / {gameState.maxRounds}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 게임 선택 UI */}
        {isParticipant && gameState.gameStatus === 'waiting_for_moves' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white text-center">
              동전의 결과를 예측하세요!
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {choices.map((choice) => (
                <Button
                  key={choice.value}
                  onClick={() => onChoiceSelect(choice.value)}
                  disabled={moveSubmitted}
                  variant={selectedChoice === choice.value ? "default" : "secondary"}
                  className="h-20 text-lg flex flex-col gap-2"
                >
                  <span className="text-2xl">{choice.icon}</span>
                  <span>{choice.label}</span>
                </Button>
              ))}
            </div>
            
            {moveSubmitted && (
              <p className="text-center text-yellow-400">
                선택 완료! 다른 플레이어를 기다리는 중...
              </p>
            )}
          </div>
        )}

        {/* 점수 표시 */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">점수</h3>
          <div className="grid grid-cols-2 gap-2">
            {gamePlayers.map((player) => (
              <div
                key={player.userId}
                className={`p-2 rounded ${
                  player.userId === currentUser?.id
                    ? 'bg-blue-600/50 border border-blue-400'
                    : 'bg-slate-700/50'
                }`}
              >
                <div className="text-white font-medium">
                  {player.user.nickname}
                  {player.userId === currentUser?.id && ' (나)'}
                </div>
                <div className="text-slate-300">
                  {gameState.playerScores[player.userId] || 0}점
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 라운드 히스토리 */}
        {gameState.roundHistory.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">히스토리</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {gameState.roundHistory.slice().reverse().map((round) => (
                <div key={round.round} className="bg-slate-700/50 p-3 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">
                      라운드 {round.round}: {round.targetAnswer === 'heads' ? '🪙 앞면' : '🔄 뒷면'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {round.winners.length > 0 
                        ? `승자: ${round.winners.length}명`
                        : '모두 틀림'
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

> 💡 **이 참조 가이드 사용법**: 
> - 새 게임 개발 시 비슷한 카테고리의 예시 코드를 복사하여 시작
> - 베이스 클래스 메서드들을 최대한 활용하여 코드 중복 최소화
> - 타입 시스템을 신뢰하고 모든 제네릭 타입을 명시
> - 등록 단계를 빠뜨리지 않도록 체크리스트 활용