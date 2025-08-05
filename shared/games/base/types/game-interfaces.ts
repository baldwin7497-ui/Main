// 강화된 게임 인터페이스 및 제네릭 타입 시스템

import type {
  CoreGameState,
  RoundBasedGameState,
  TurnBasedGameState,
  BoardGameState,
  BaseChoice,
  GameMove,
  GameMessage,
  GameCategory
} from './game-types';

// 게임 상태 타입 매핑
export interface GameStateMap {
  'round-based': RoundBasedGameState;
  'turn-based': TurnBasedGameState;
  'board-game': BoardGameState;
  'real-time': CoreGameState;
}

// 게임 액션 타입 매핑
export interface GameActionMap {
  'round-based': BaseChoice;
  'turn-based': GameMove;
  'board-game': GameMove;
  'real-time': any;
}

// 제네릭 게임 인터페이스
export interface IGame<
  TCategory extends GameCategory = GameCategory,
  TState extends GameStateMap[TCategory] = GameStateMap[TCategory],
  TAction extends GameActionMap[TCategory] = GameActionMap[TCategory]
> {
  readonly category: TCategory;
  readonly gameType: string;
  
  // 상태 관리
  getState(): Promise<TState | null>;
  updateState(state: Partial<TState>): Promise<void>;
  resetState(): Promise<void>;
  
  // 액션 처리
  handleAction(userId: string, action: TAction): Promise<void>;
  validateAction(userId: string, action: TAction): Promise<boolean>;
  
  // 플레이어 관리
  addPlayer(userId: string): Promise<void>;
  removePlayer(userId: string): Promise<void>;
  getActivePlayers(): string[];
  
  // 게임 라이프사이클
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  end(reason?: string): Promise<void>;
}

// 라운드 기반 게임 특화 인터페이스
export interface IRoundBasedGame<
  TState extends RoundBasedGameState = RoundBasedGameState,
  TChoice extends BaseChoice = BaseChoice
> extends IGame<'round-based', TState, TChoice> {
  // 라운드 관리
  getCurrentRound(): number;
  getMaxRounds(): number;
  nextRound(): Promise<void>;
  
  // 선택 관리
  submitChoice(userId: string, choice: TChoice): Promise<void>;
  getPlayerChoice(userId: string): TChoice | null;
  hasAllPlayersChosen(): boolean;
  
  // 점수 관리
  getPlayerScores(): Record<string, number>;
  updatePlayerScore(userId: string, score: number): Promise<void>;
}

// 턴 기반 게임 특화 인터페이스
export interface ITurnBasedGame<
  TState extends TurnBasedGameState = TurnBasedGameState,
  TMove extends GameMove = GameMove
> extends IGame<'turn-based', TState, TMove> {
  // 턴 관리
  getCurrentPlayer(): string;
  nextTurn(): Promise<void>;
  canPlayerMakeMove(userId: string): boolean;
  
  // 이동 관리
  makeMove(userId: string, move: TMove): Promise<void>;
  undoMove(): Promise<boolean>;
  getValidMoves(userId: string): TMove[];
  
  // 게임 히스토리
  getGameHistory(): GameMove[];
  getMoveHistory(fromTurn?: number): GameMove[];
}

// 보드 게임 특화 인터페이스
export interface IBoardGame<
  TState extends BoardGameState = BoardGameState,
  TMove extends GameMove = GameMove,
  TBoard = any
> extends ITurnBasedGame<TState, TMove> {
  // 보드 관리
  getBoard(): TBoard;
  getBoardSize(): { width: number; height: number };
  updateBoard(board: TBoard): Promise<void>;
  
  // 위치 검증
  isValidPosition(position: any): boolean;
  getPositionValue(position: any): any;
  setPositionValue(position: any, value: any): Promise<void>;
  
  // 승리 조건
  checkWinCondition(): { winner: string | null; isDraw: boolean };
}

// 실시간 게임 특화 인터페이스
export interface IRealTimeGame<
  TState extends CoreGameState = CoreGameState,
  TAction = any
> extends IGame<'real-time', TState, TAction> {
  // 실시간 액션 처리
  processRealTimeAction(userId: string, action: TAction): Promise<void>;
  broadcastAction(action: TAction, excludeUserId?: string): Promise<void>;
  
  // 타이머 관리
  startTimer(duration: number): Promise<void>;
  stopTimer(): Promise<void>;
  getRemainingTime(): number;
}

// 게임 이벤트 시스템
export interface IGameEventSystem<TEventData = any> {
  // 이벤트 발생
  emit(eventType: string, data: TEventData): void;
  
  // 이벤트 리스너
  on(eventType: string, handler: (data: TEventData) => void): void;
  off(eventType: string, handler: (data: TEventData) => void): void;
  
  // 이벤트 타입들
  onGameStart(handler: (gameState: any) => void): void;
  onGameEnd(handler: (result: any) => void): void;
  onPlayerJoin(handler: (userId: string) => void): void;
  onPlayerLeave(handler: (userId: string) => void): void;
  onStateChange(handler: (newState: any) => void): void;
}

// 게임 검증 시스템
export interface IGameValidator<TAction = any> {
  validateGameState(state: any): { valid: boolean; errors: string[] };
  validateAction(userId: string, action: TAction, gameState: any): { valid: boolean; errors: string[] };
  validatePlayerCount(playerCount: number): { valid: boolean; errors: string[] };
  validateGameConfiguration(config: any): { valid: boolean; errors: string[] };
}

// 게임 AI 인터페이스 (봇 지원용)
export interface IGameAI<TAction = any> {
  calculateBestMove(gameState: any, difficulty: 'easy' | 'medium' | 'hard'): Promise<TAction>;
  evaluatePosition(gameState: any): number;
  canPlayAsBot(): boolean;
}

// 게임 저장/로드 시스템
export interface IGamePersistence<TState = any> {
  saveGame(gameId: string, state: TState): Promise<void>;
  loadGame(gameId: string): Promise<TState | null>;
  deleteGame(gameId: string): Promise<void>;
  listSavedGames(userId?: string): Promise<string[]>;
}

// 게임 통계 시스템
export interface IGameStatistics {
  recordGameStart(gameType: string, playerIds: string[]): Promise<void>;
  recordGameEnd(gameType: string, playerIds: string[], winner?: string, duration?: number): Promise<void>;
  recordPlayerAction(gameType: string, userId: string, actionType: string): Promise<void>;
  
  getPlayerStats(userId: string): Promise<{
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    averageGameDuration: number;
    favoriteGames: string[];
  }>;
  
  getGameStats(gameType: string): Promise<{
    totalGames: number;
    averageDuration: number;
    popularityRank: number;
    averagePlayerCount: number;
  }>;
}

// 멀티플레이어 매칭 시스템
export interface IGameMatchmaking {
  findMatch(userId: string, gameType: string, preferences?: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    maxWaitTime?: number;
    preferredPlayerCount?: number;
  }): Promise<string | null>; // 룸 ID 반환
  
  cancelMatchmaking(userId: string): Promise<void>;
  getMatchmakingStatus(userId: string): Promise<{
    inQueue: boolean;
    estimatedWaitTime?: number;
    currentQueueSize: number;
  }>;
}

// 게임 튜토리얼 시스템
export interface IGameTutorial {
  getTutorialSteps(gameType: string): Promise<{
    id: string;
    title: string;
    description: string;
    interactiveDemo?: boolean;
  }[]>;
  
  recordTutorialProgress(userId: string, gameType: string, stepId: string): Promise<void>;
  getTutorialProgress(userId: string, gameType: string): Promise<string[]>; // 완료된 스텝 ID들
  isNewPlayer(userId: string, gameType: string): Promise<boolean>;
}

// 게임 관찰자 시스템 (관전 기능)
export interface IGameSpectator {
  addSpectator(gameId: string, userId: string): Promise<void>;
  removeSpectator(gameId: string, userId: string): Promise<void>;
  getSpectators(gameId: string): Promise<string[]>;
  broadcastToSpectators(gameId: string, message: GameMessage): Promise<void>;
  canSpectate(gameId: string, userId: string): Promise<boolean>;
}

// 통합 게임 매니저 인터페이스
export interface IGameManager {
  // 게임 생성 및 관리
  createGame<T extends GameCategory>(
    gameType: string, 
    category: T, 
    roomId: string, 
    hostUserId: string
  ): Promise<IGame<T>>;
  
  getGame(roomId: string): Promise<IGame | null>;
  deleteGame(roomId: string): Promise<void>;
  
  // 시스템 컴포넌트
  getValidator(gameType: string): IGameValidator | null;
  getAI(gameType: string): IGameAI | null;
  getPersistence(): IGamePersistence;
  getStatistics(): IGameStatistics;
  getMatchmaking(): IGameMatchmaking;
  getTutorial(): IGameTutorial;
  getSpectator(): IGameSpectator;
  
  // 이벤트 시스템
  getEventSystem(): IGameEventSystem;
}

// 타입 가드 함수들
export function isRoundBasedGame(game: IGame): game is IRoundBasedGame {
  return game.category === 'round-based';
}

export function isTurnBasedGame(game: IGame): game is ITurnBasedGame {
  return game.category === 'turn-based';
}

export function isBoardGame(game: IGame): game is IBoardGame {
  return game.category === 'board-game';
}

export function isRealTimeGame(game: IGame): game is IRealTimeGame {
  return game.category === 'real-time';
}

// 헬퍼 타입들
export type GameStateForCategory<T extends GameCategory> = GameStateMap[T];
export type GameActionForCategory<T extends GameCategory> = GameActionMap[T];
export type GameInterfaceForCategory<T extends GameCategory> = 
  T extends 'round-based' ? IRoundBasedGame :
  T extends 'turn-based' ? ITurnBasedGame :
  T extends 'board-game' ? IBoardGame :
  T extends 'real-time' ? IRealTimeGame :
  never;