// 게임 생성 및 스캐폴딩 도구

import type { 
  GameCategory, 
  ExtendedGameConfig, 
  GameMetadata,
  GameDifficulty 
} from './game-types';

// 게임 템플릿 타입
export interface GameTemplate {
  id: string;
  name: string;
  category: GameCategory;
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
  files: GameTemplateFile[];
  dependencies?: string[];
}

// 템플릿 파일 정의
export interface GameTemplateFile {
  path: string;
  content: string;
  type: 'schema' | 'handler' | 'component' | 'test' | 'config';
}

// 게임 생성 옵션
export interface GameGenerationOptions {
  gameId: string;
  gameName: string;
  description: string;
  category: GameCategory;
  difficulty: GameDifficulty;
  minPlayers: number;
  maxPlayers: number;
  estimatedDuration: number;
  customSettings?: Record<string, any>;
  tags?: string[];
  includeTests?: boolean;
  includeUI?: boolean;
}

// 게임 생성기 클래스
export class GameGenerator {
  private templates = new Map<string, GameTemplate>();

  constructor() {
    this.initializeDefaultTemplates();
  }

  // 기본 템플릿 초기화
  private initializeDefaultTemplates(): void {
    // 라운드 기반 게임 템플릿
    this.registerTemplate({
      id: 'round-based-basic',
      name: 'Basic Round-Based Game',
      category: 'round-based',
      description: 'Simple round-based game with player choices',
      complexity: 'simple',
      files: [
        this.createSchemaTemplate('round-based'),
        this.createHandlerTemplate('round-based'),
        this.createComponentTemplate('round-based')
      ]
    });

    // 턴 기반 게임 템플릿
    this.registerTemplate({
      id: 'turn-based-basic',
      name: 'Basic Turn-Based Game',
      category: 'turn-based',
      description: 'Sequential turn-based game',
      complexity: 'moderate',
      files: [
        this.createSchemaTemplate('turn-based'),
        this.createHandlerTemplate('turn-based'),
        this.createComponentTemplate('turn-based')
      ]
    });

    // 보드 게임 템플릿
    this.registerTemplate({
      id: 'board-game-basic',
      name: 'Basic Board Game',
      category: 'board-game',
      description: 'Grid-based board game',
      complexity: 'complex',
      files: [
        this.createSchemaTemplate('board-game'),
        this.createHandlerTemplate('board-game'),
        this.createComponentTemplate('board-game')
      ]
    });
  }

  // 템플릿 등록
  registerTemplate(template: GameTemplate): void {
    this.templates.set(template.id, template);
  }

  // 템플릿 조회
  getTemplate(templateId: string): GameTemplate | null {
    return this.templates.get(templateId) || null;
  }

  // 카테고리별 템플릿 목록
  getTemplatesByCategory(category: GameCategory): GameTemplate[] {
    return Array.from(this.templates.values()).filter(template => 
      template.category === category
    );
  }

  // 모든 템플릿 목록
  getAllTemplates(): GameTemplate[] {
    return Array.from(this.templates.values());
  }

  // 게임 생성
  async generateGame(options: GameGenerationOptions, templateId?: string): Promise<{
    config: ExtendedGameConfig;
    files: GameTemplateFile[];
  }> {
    const template = templateId 
      ? this.getTemplate(templateId)
      : this.selectDefaultTemplate(options.category);

    if (!template) {
      throw new Error(`No template found for category: ${options.category}`);
    }

    // 메타데이터 생성
    const metadata: GameMetadata = {
      id: options.gameId,
      name: options.gameName,
      description: options.description,
      category: options.category,
      minPlayers: options.minPlayers,
      maxPlayers: options.maxPlayers,
      estimatedDuration: options.estimatedDuration,
      difficulty: options.difficulty,
      tags: options.tags || []
    };

    // 게임 설정 생성
    const config: ExtendedGameConfig = {
      name: options.gameName,
      description: options.description,
      metadata,
      rules: this.generateDefaultRules(options),
      version: '1.0.0',
      customSettings: options.customSettings
    };

    // 파일 생성 (템플릿 기반으로 변수 치환)
    const files = template.files.map(file => ({
      ...file,
      content: this.processTemplate(file.content, options),
      path: this.processTemplate(file.path, options)
    }));

    // 테스트 파일 추가 (옵션)
    if (options.includeTests) {
      files.push(this.createTestTemplate(options));
    }

    return { config, files };
  }

  // 기본 템플릿 선택
  private selectDefaultTemplate(category: GameCategory): GameTemplate | null {
    const templates = this.getTemplatesByCategory(category);
    return templates.find(t => t.complexity === 'simple') || templates[0] || null;
  }

  // 기본 규칙 생성
  private generateDefaultRules(options: GameGenerationOptions): string[] {
    const baseRules = [
      `게임은 ${options.minPlayers}-${options.maxPlayers}명이 참여할 수 있습니다.`,
      `예상 플레이 시간은 약 ${options.estimatedDuration}분입니다.`
    ];

    switch (options.category) {
      case 'round-based':
        baseRules.push(
          '각 라운드마다 플레이어는 선택을 해야 합니다.',
          '모든 플레이어가 선택을 완료하면 라운드 결과가 공개됩니다.'
        );
        break;
      case 'turn-based':
        baseRules.push(
          '플레이어는 순서대로 턴을 가집니다.',
          '자신의 턴에만 행동할 수 있습니다.'
        );
        break;
      case 'board-game':
        baseRules.push(
          '보드 위에서 말을 움직이거나 배치합니다.',
          '특정 조건을 만족하면 승리합니다.'
        );
        break;
      case 'real-time':
        baseRules.push(
          '실시간으로 진행되는 게임입니다.',
          '빠른 반응속도가 중요합니다.'
        );
        break;
    }

    return baseRules;
  }

  // 템플릿 처리 (변수 치환)
  private processTemplate(template: string, options: GameGenerationOptions): string {
    return template
      .replace(/\{\{gameId\}\}/g, options.gameId)
      .replace(/\{\{gameName\}\}/g, options.gameName)
      .replace(/\{\{GameName\}\}/g, this.toPascalCase(options.gameName))
      .replace(/\{\{GAME_NAME\}\}/g, this.toConstantCase(options.gameName))
      .replace(/\{\{description\}\}/g, options.description)
      .replace(/\{\{category\}\}/g, options.category)
      .replace(/\{\{minPlayers\}\}/g, options.minPlayers.toString())
      .replace(/\{\{maxPlayers\}\}/g, options.maxPlayers.toString())
      .replace(/\{\{estimatedDuration\}\}/g, options.estimatedDuration.toString())
      .replace(/\{\{difficulty\}\}/g, options.difficulty);
  }

  // 스키마 템플릿 생성
  private createSchemaTemplate(category: GameCategory): GameTemplateFile {
    let content = '';

    switch (category) {
      case 'round-based':
        content = `import type { 
  RoundBasedGameState, 
  BaseChoice, 
  GameConfig 
} from '@shared/games/base/game-types';

// {{GameName}} 게임 선택 타입
export interface {{GameName}}Choice extends BaseChoice {
  type: '{{gameId}}';
  // TODO: 게임별 선택 필드 추가
}

// {{GameName}} 게임 상태
export interface {{GameName}}GameState extends RoundBasedGameState {
  // TODO: 게임별 상태 필드 추가
}

// {{GameName}} 게임 설정
export const {{GAME_NAME}}_CONFIG: GameConfig<{{GameName}}Choice> = {
  name: '{{gameName}}',
  description: '{{description}}',
  choices: [], // TODO: 선택 옵션 정의
  generateAnswer: () => ({ type: '{{gameId}}' }) // TODO: 답 생성 로직 구현
};`;
        break;

      case 'turn-based':
        content = `import type { 
  TurnBasedGameState, 
  GameConfig 
} from '@shared/games/base/game-types';

// {{GameName}} 게임 이동
export interface {{GameName}}Move {
  // TODO: 게임별 이동 필드 정의
}

// {{GameName}} 게임 상태
export interface {{GameName}}GameState extends TurnBasedGameState {
  // TODO: 게임별 상태 필드 추가
}

// {{GameName}} 게임 설정
export const {{GAME_NAME}}_CONFIG: GameConfig = {
  name: '{{gameName}}',
  description: '{{description}}'
};`;
        break;

      case 'board-game':
        content = `import type { 
  BoardGameState, 
  GameConfig 
} from '@shared/games/base/game-types';

// {{GameName}} 보드 셀
export interface {{GameName}}Cell {
  // TODO: 셀 타입 정의
}

// {{GameName}} 게임 이동
export interface {{GameName}}Move {
  position: { x: number; y: number };
  // TODO: 추가 이동 데이터
}

// {{GameName}} 게임 상태
export interface {{GameName}}GameState extends BoardGameState {
  board: {{GameName}}Cell[][];
  // TODO: 게임별 상태 필드 추가
}

// {{GameName}} 게임 설정
export const {{GAME_NAME}}_CONFIG: GameConfig = {
  name: '{{gameName}}',
  description: '{{description}}'
};`;
        break;

      default:
        content = `// {{GameName}} 게임 스키마
export const {{GAME_NAME}}_CONFIG = {
  name: '{{gameName}}',
  description: '{{description}}'
};`;
    }

    return {
      path: `shared/games/{{gameId}}/schema.ts`,
      content,
      type: 'schema'
    };
  }

  // 핸들러 템플릿 생성
  private createHandlerTemplate(category: GameCategory): GameTemplateFile {
    let content = '';

    switch (category) {
      case 'round-based':
        content = `import { BaseGameHandler } from '@shared/games/base/base-game-handler';
import type { 
  {{GameName}}GameState, 
  {{GameName}}Choice 
} from './schema';

export class {{GameName}}Handler extends BaseGameHandler<
  {{GameName}}GameState,
  {{GameName}}Choice,
  any, // TODO: 답 타입 정의
  any  // TODO: 라운드 타입 정의
> {
  protected getGameType(): string {
    return '{{gameId}}';
  }

  protected getPlayerChoicesKey(): keyof {{GameName}}GameState {
    return 'playerChoices' as keyof {{GameName}}GameState;
  }

  protected getTargetAnswerKey(): keyof {{GameName}}GameState {
    return 'targetAnswer' as keyof {{GameName}}GameState;
  }

  protected generateAnswer(): any {
    // TODO: 답 생성 로직 구현
    return null;
  }

  protected extractChoiceValue(choice: {{GameName}}Choice): any {
    // TODO: 선택값 추출 로직 구현
    return choice;
  }

  protected isCorrectChoice(playerChoice: any, targetAnswer: any): boolean {
    // TODO: 정답 확인 로직 구현
    return false;
  }

  protected createInitialGameState(roomId: string, playerIds: string[]): {{GameName}}GameState {
    // TODO: 초기 게임 상태 생성
    return {
      roomId,
      gameType: this.getGameType(),
      category: 'round-based',
      playerIds,
      gameStatus: 'waiting_for_moves',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      disconnectedPlayers: [],
      currentRound: 1,
      maxRounds: 5, // TODO: 설정 가능하게 변경
      playerScores: Object.fromEntries(playerIds.map(id => [id, 0]))
    };
  }

  protected createRoundHistory(
    round: number,
    playerChoices: Record<string, any>,
    targetAnswer: any,
    winners: string[],
    playerResults: Record<string, any>
  ): any {
    // TODO: 라운드 히스토리 생성
    return {
      round,
      playerChoices,
      targetAnswer,
      winners,
      playerResults
    };
  }

  protected getMaxRounds(): number {
    return 5; // TODO: 설정 가능하게 변경
  }
}`;
        break;

      case 'turn-based':
        content = `import { BaseTurnGameHandler } from '@shared/games/base/turn-based-game-handler';
import type { 
  {{GameName}}GameState, 
  {{GameName}}Move 
} from './schema';

export class {{GameName}}Handler extends BaseTurnGameHandler<
  {{GameName}}GameState,
  {{GameName}}Move
> {
  protected getGameType(): string {
    return '{{gameId}}';
  }

  validateMove(gameState: {{GameName}}GameState, userId: string, move: {{GameName}}Move): boolean {
    // TODO: 이동 유효성 검증
    return true;
  }

  applyMove(gameState: {{GameName}}GameState, userId: string, move: {{GameName}}Move): {{GameName}}GameState {
    // TODO: 이동 적용 로직
    return { ...gameState };
  }

  checkGameEnd(gameState: {{GameName}}GameState): { ended: boolean; reason?: string; winner?: string } {
    // TODO: 게임 종료 조건 확인
    return { ended: false };
  }

  getValidMoves(gameState: {{GameName}}GameState, userId: string): {{GameName}}Move[] {
    // TODO: 유효한 이동 목록 반환
    return [];
  }

  protected createInitialGameState(roomId: string, playerIds: string[]): {{GameName}}GameState {
    // TODO: 초기 게임 상태 생성
    return {
      roomId,
      gameType: this.getGameType(),
      category: 'turn-based',
      playerIds,
      gameStatus: 'playing',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      disconnectedPlayers: [],
      currentPlayer: playerIds[0],
      turnCount: 1,
      gameHistory: []
    };
  }
}`;
        break;

      case 'board-game':
        content = `import { BaseBoardGameHandler } from '@shared/games/base/board-game-handler';
import type { 
  {{GameName}}GameState, 
  {{GameName}}Move,
  {{GameName}}Cell 
} from './schema';

export class {{GameName}}Handler extends BaseBoardGameHandler<
  {{GameName}}GameState,
  {{GameName}}Move
> {
  protected getGameType(): string {
    return '{{gameId}}';
  }

  initializeBoard(boardSize: { width: number; height: number }): {{GameName}}Cell[][] {
    // TODO: 보드 초기화
    return Array(boardSize.height).fill(null).map(() => 
      Array(boardSize.width).fill(null).map(() => ({}))
    );
  }

  validatePosition(position: any, boardSize: { width: number; height: number }): boolean {
    // TODO: 보드 위치 유효성 검증
    return position.x >= 0 && position.x < boardSize.width &&
           position.y >= 0 && position.y < boardSize.height;
  }

  getBoardState(gameState: {{GameName}}GameState): {{GameName}}Cell[][] {
    return gameState.board;
  }

  validateMove(gameState: {{GameName}}GameState, userId: string, move: {{GameName}}Move): boolean {
    // TODO: 이동 유효성 검증
    return this.validatePosition(move.position, gameState.boardSize);
  }

  applyMove(gameState: {{GameName}}GameState, userId: string, move: {{GameName}}Move): {{GameName}}GameState {
    // TODO: 이동 적용 로직
    return { ...gameState };
  }

  checkGameEnd(gameState: {{GameName}}GameState): { ended: boolean; reason?: string; winner?: string } {
    // TODO: 게임 종료 조건 확인
    return { ended: false };
  }

  getValidMoves(gameState: {{GameName}}GameState, userId: string): {{GameName}}Move[] {
    // TODO: 유효한 이동 목록 반환
    return [];
  }

  protected createInitialGameState(roomId: string, playerIds: string[]): {{GameName}}GameState {
    const boardSize = { width: 8, height: 8 }; // TODO: 설정 가능하게 변경
    
    return {
      roomId,
      gameType: this.getGameType(),
      category: 'board-game',
      playerIds,
      gameStatus: 'playing',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      disconnectedPlayers: [],
      currentPlayer: playerIds[0],
      turnCount: 1,
      gameHistory: [],
      board: this.initializeBoard(boardSize),
      boardSize
    };
  }
}`;
        break;

      default:
        content = `// {{GameName}} 핸들러 구현
export class {{GameName}}Handler {
  // TODO: 핸들러 구현
}`;
    }

    return {
      path: `server/games/{{gameId}}/handler.ts`,
      content,
      type: 'handler'
    };
  }

  // 컴포넌트 템플릿 생성
  private createComponentTemplate(category: GameCategory): GameTemplateFile {
    const content = `import React from 'react';
import type { {{GameName}}GameState } from '@shared/games/{{gameId}}/schema';
import type { BaseGameProps } from '@shared/games/base/game-types';

interface {{GameName}}GameProps extends BaseGameProps<{{GameName}}GameState> {
  // TODO: 게임별 Props 추가
}

export function {{GameName}}Game({
  room,
  currentUser,
  isParticipant,
  moveSubmitted,
  onChoiceSelect,
  gamePlayers,
  gameState,
  selectedChoice
}: {{GameName}}GameProps) {
  // TODO: 게임 UI 구현
  
  return (
    <div className="{{gameId}}-game">
      <h2>{{gameName}}</h2>
      <p>{{description}}</p>
      
      {/* TODO: 게임 인터페이스 구현 */}
      <div className="game-board">
        게임 보드 영역
      </div>
      
      {/* TODO: 플레이어 액션 버튼 */}
      {isParticipant && (
        <div className="game-actions">
          액션 버튼 영역
        </div>
      )}
    </div>
  );
}`;

    return {
      path: `client/src/components/game-play/{{gameId}}/{{GameName}}Game.tsx`,
      content,
      type: 'component'
    };
  }

  // 테스트 템플릿 생성
  private createTestTemplate(options: GameGenerationOptions): GameTemplateFile {
    const content = `import { describe, it, expect, beforeEach } from 'vitest';
import { {{GameName}}Handler } from '../handler';
import { MemStorage } from '../../../storage';

describe('{{GameName}}Handler', () => {
  let handler: {{GameName}}Handler;
  let storage: MemStorage;
  let broadcastToRoom: jest.Mock;

  beforeEach(() => {
    storage = new MemStorage();
    broadcastToRoom = jest.fn();
    handler = new {{GameName}}Handler(storage, broadcastToRoom);
  });

  describe('게임 생성', () => {
    it('should create a new game', async () => {
      const roomId = 'test-room';
      const playerIds = ['player1', 'player2'];
      
      const gameState = await handler.createGame(roomId, playerIds);
      
      expect(gameState.roomId).toBe(roomId);
      expect(gameState.playerIds).toEqual(playerIds);
      expect(gameState.gameType).toBe('{{gameId}}');
    });
  });

  // TODO: 추가 테스트 케이스 작성
});`;

    return {
      path: `server/games/{{gameId}}/handler.test.ts`,
      content,
      type: 'test'
    };
  }

  // 문자열 변환 유틸리티
  private toPascalCase(str: string): string {
    return str.replace(/(?:^|\s|-)([a-z])/g, (_, char) => char.toUpperCase()).replace(/[-\s]/g, '');
  }

  private toConstantCase(str: string): string {
    return str.replace(/[A-Z]/g, '_$&').toUpperCase().replace(/^_/, '').replace(/[-\s]/g, '_');
  }
}

// 싱글톤 인스턴스
export const gameGenerator = new GameGenerator();

// 헬퍼 함수들
export function generateNewGame(options: GameGenerationOptions, templateId?: string) {
  return gameGenerator.generateGame(options, templateId);
}

export function getAvailableTemplates() {
  return gameGenerator.getAllTemplates();
}

export function getTemplatesByCategory(category: GameCategory) {
  return gameGenerator.getTemplatesByCategory(category);
}