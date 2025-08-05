// 기본 게임 타입과 인터페이스 정의

// 게임 카테고리 정의
export type GameCategory = 'round-based' | 'turn-based' | 'board-game' | 'real-time';
export type GameStatus = 'waiting_for_moves' | 'round_finished' | 'game_finished' | 'playing' | 'paused';
export type GameResult = 'win' | 'lose' | 'draw';
export type GameDifficulty = 'easy' | 'medium' | 'hard';

// 게임 메타데이터 인터페이스
export interface GameMetadata {
  id: string;
  name: string;
  description: string;
  category: GameCategory;
  minPlayers: number;
  maxPlayers: number;
  estimatedDuration: number; // 예상 게임 시간 (분)
  difficulty: GameDifficulty;
  tags: string[];
}

// 핵심 게임 상태 인터페이스 (모든 게임의 최소 요구사항)
export interface CoreGameState {
  roomId: string;
  gameType: string;
  category: GameCategory;
  playerIds: string[];
  gameStatus: GameStatus;
  winners?: string[];
  createdAt: number;
  lastUpdated: number;
  // 연결 관리 필드
  disconnectedPlayers: string[];
  // 게임 설정
  gameSettings?: Record<string, any>;
}

// 라운드 기반 게임 상태 (기존 게임들)
export interface RoundBasedGameState extends CoreGameState {
  currentRound: number;
  maxRounds: number;
  playerScores: Record<string, number>;
}

// 턴 기반 게임 상태 (체스, 틱택토 등)
export interface TurnBasedGameState extends CoreGameState {
  currentPlayer: string;
  turnCount: number;
  gameHistory: GameMove[];
  gameResult?: {
    winner?: string;
    reason: 'checkmate' | 'stalemate' | 'timeout' | 'resign' | 'draw_offer' | 'three_line' | 'other';
  };
}

// 보드 게임 상태 (체스, 틱택토, 바둑 등)
export interface BoardGameState extends TurnBasedGameState {
  board: any; // 게임별로 구체적 타입 지정
  boardSize: { width: number; height: number };
}

// 기본 게임 상태 (하위 호환성)
export interface BaseGameState extends RoundBasedGameState {}

// 게임 이동/액션 인터페이스
export interface GameMove {
  playerId: string;
  moveNumber: number;
  timestamp: number;
  data: any; // 게임별 이동 데이터
}

// 라운드 기반 게임용 라운드 인터페이스
export interface BaseRound {
  round: number;
  winners: string[];
  playerResults: Record<string, GameResult>;
}

// 턴 기반 게임용 턴 인터페이스
export interface GameTurn {
  turnNumber: number;
  playerId: string;
  move: GameMove;
  gameState?: any; // 해당 턴 후 게임 상태
}

// 기본 플레이어 선택 인터페이스
export interface BaseChoice {
  type: string;
}

// 게임 설정 인터페이스
export interface GameConfig<TChoice = any> {
  name: string;
  description: string;
  choices?: TChoice[];
  generateAnswer?: () => TChoice;
  customSettings?: Record<string, any>;
}

// 확장된 게임 설정 인터페이스
export interface ExtendedGameConfig extends GameConfig {
  metadata: GameMetadata;
  rules: string[];
  tutorial?: string;
  version: string;
}

// WebSocket 메시지 인터페이스
export interface GameMessage<TData = any> {
  type: string;
  roomId?: string;
  userId?: string;
  data?: TData;
  timestamp?: number;
}

// 게임별 메시지 타입 정의
export interface GameActionMessage<TAction = any> extends GameMessage<TAction> {
  type: 'game_action';
  action: string;
}

export interface GameStateMessage<TState = any> extends GameMessage<TState> {
  type: 'game_state' | 'game_update';
}

export interface GameEventMessage<TEvent = any> extends GameMessage<TEvent> {
  type: 'game_event';
  event: string;
}

// 핵심 게임 핸들러 인터페이스
export interface CoreGameHandlers<TGameState extends CoreGameState> {
  createGame: (roomId: string, playerIds: string[]) => Promise<TGameState>;
  getGameState: (roomId: string) => Promise<TGameState | null>;
  endGame: (roomId: string, reason?: string) => Promise<void>;
  // 연결 관리 메서드 추가
  handlePlayerDisconnect?: (roomId: string, playerId: string) => Promise<void>;
  handlePlayerReconnect?: (roomId: string, playerId: string) => Promise<void>;
  handlePlayerLeave?: (roomId: string, playerId: string) => Promise<void>;
}

// 라운드 기반 게임 핸들러 인터페이스 (기존)
export interface RoundGameHandlers<TGameState extends RoundBasedGameState, TChoice extends BaseChoice> 
  extends CoreGameHandlers<TGameState> {
  handleChoice: (roomId: string, userId: string, choice: TChoice) => Promise<void>;
  processRound: (roomId: string) => Promise<void>;
}

// 턴 기반 게임 핸들러 인터페이스
export interface TurnGameHandlers<TGameState extends TurnBasedGameState, TMove> 
  extends CoreGameHandlers<TGameState> {
  makeMove: (roomId: string, userId: string, move: TMove) => Promise<void>;
  validateMove: (gameState: TGameState, userId: string, move: TMove) => boolean;
  applyMove: (gameState: TGameState, userId: string, move: TMove) => TGameState;
  checkGameEnd: (gameState: TGameState) => { ended: boolean; reason?: string; winner?: string };
  getValidMoves: (gameState: TGameState, userId: string) => TMove[];
}

// 보드 게임 핸들러 인터페이스
export interface BoardGameHandlers<TGameState extends BoardGameState, TMove> 
  extends TurnGameHandlers<TGameState, TMove> {
  initializeBoard: (boardSize: { width: number; height: number }) => any;
  validatePosition: (position: any, boardSize: { width: number; height: number }) => boolean;
  getBoardState: (gameState: TGameState) => any;
}

// 기본 게임 핸들러 (하위 호환성)
export interface BaseGameHandlers<TGameState extends BaseGameState, TChoice extends BaseChoice> 
  extends RoundGameHandlers<TGameState, TChoice> {}

// 게임 컴포넌트 공통 Props
export interface BaseGameProps<TGameState extends CoreGameState = CoreGameState, TChoice = any> {
  room: any; // RoomWithPlayers 타입
  currentUser: any; // User 타입
  isParticipant: boolean;
  moveSubmitted: boolean;
  onChoiceSelect?: (choice: TChoice) => void;
  gamePlayers: any[]; // (RoomPlayer & { user: User })[] 타입
  gameState: TGameState;
  selectedChoice?: TChoice | null;
}

// 라운드 기반 게임 Props
export interface RoundBasedGameProps<TGameState extends RoundBasedGameState, TChoice> extends BaseGameProps<TGameState, TChoice> {
  onChoiceSelect: (choice: TChoice) => void;
  selectedChoice: TChoice | null;
}

// 턴 기반 게임 Props
export interface TurnBasedGameProps<TGameState extends TurnBasedGameState, TMove> extends BaseGameProps<TGameState, TMove> {
  onMakeMove: (move: TMove) => void;
  canMakeMove: boolean;
  validMoves?: TMove[];
}

// 보드 게임 Props
export interface BoardGameProps<TGameState extends BoardGameState, TMove> extends TurnBasedGameProps<TGameState, TMove> {
  onPositionClick?: (position: any) => void;
  highlightedPositions?: any[];
}