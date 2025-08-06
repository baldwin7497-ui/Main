// 기본 게임 컴포넌트 베이스 클래스

import React, { Component, ReactNode } from 'react';
import type { 
  BaseGameProps, 
  RoundBasedGameProps, 
  TurnBasedGameProps,
  TurnBasedGameState
} from '@shared/games/base/types/game-types';

// 기본 게임 컴포넌트 상태
export interface BaseGameComponentState {
  isLoading: boolean;
  error: string | null;
  lastAction: string | null;
  actionTimestamp: number | null;
}

// 게임 컴포넌트 공통 인터페이스
export interface IGameComponent<TProps = any> {
  render(): ReactNode;
  handleAction(action: any): Promise<void>;
  validateAction(action: any): boolean;
  getActionButtons(): ReactNode;
  getGameStatus(): ReactNode;
  onGameStateChange?(newState: any): void;
}

// 추상 기본 게임 컴포넌트
export abstract class BaseGameComponent<
  TProps extends BaseGameProps = BaseGameProps,
  TState extends BaseGameComponentState = BaseGameComponentState
> extends Component<TProps, TState> implements IGameComponent<TProps> {
  
  constructor(props: TProps) {
    super(props);
    this.state = this.getInitialState();
  }

  // 추상 메서드들
  protected abstract getInitialState(): TState;
  protected abstract renderGameBoard(): ReactNode;
  protected abstract renderActionArea(): ReactNode;
  protected abstract getGameSpecificStatus(): ReactNode;

  // 기본 구현 메서드들
  protected getInitialBaseState(): BaseGameComponentState {
    return {
      isLoading: false,
      error: null,
      lastAction: null,
      actionTimestamp: null
    };
  }

  // 액션 처리
  async handleAction(action: any): Promise<void> {
    if (!this.validateAction(action)) {
      this.setState({ error: 'Invalid action' });
      return;
    }

    try {
      this.setState({ isLoading: true, error: null });
      await this.processAction(action);
      this.setState({ 
        lastAction: JSON.stringify(action),
        actionTimestamp: Date.now()
      });
    } catch (error) {
      this.setState({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // 액션 처리 (서브클래스에서 구현)
  protected abstract processAction(action: any): Promise<void>;

  // 액션 검증 (기본 구현)
  validateAction(action: any): boolean {
    return action !== null && action !== undefined;
  }

  // 게임 상태 변경 핸들러
  onGameStateChange?(newState: any): void {
    // 기본 구현: 아무것도 하지 않음
    // 서브클래스에서 필요시 오버라이드
  }

  // 공통 UI 컴포넌트들
  protected renderLoadingSpinner(): ReactNode {
    if (!this.state.isLoading) return null;
    
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">처리 중...</span>
      </div>
    );
  }

  protected renderError(): ReactNode {
    if (!this.state.error) return null;
    
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong className="font-bold">오류:</strong>
        <span className="block sm:inline"> {this.state.error}</span>
        <button 
          onClick={() => this.setState({ error: null })}
          className="float-right text-red-500 hover:text-red-700"
        >
          ×
        </button>
      </div>
    );
  }

  protected renderPlayerList(): ReactNode {
    const { gamePlayers, currentUser, gameState } = this.props;
    
    return (
      <div className="players-list bg-gray-100 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-semibold mb-2">플레이어</h3>
        <div className="space-y-2">
          {gamePlayers.map((player) => {
            const isDisconnected = gameState.disconnectedPlayers?.includes(player.userId) || false;
            
            return (
              <div 
                key={player.userId} 
                className={`flex items-center p-2 rounded ${
                  player.userId === currentUser?.id ? 'bg-blue-100' : 'bg-white'
                }`}
              >
                <div className="flex items-center mr-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                    {player.user.name[0].toUpperCase()}
                  </div>
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      isDisconnected ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    title={isDisconnected ? '연결 해제됨' : '연결됨'}
                  />
                </div>
                <span className={`font-medium ${isDisconnected ? 'text-gray-500' : ''}`}>
                  {player.user.name}
                </span>
                {player.userId === currentUser?.id && (
                  <span className="ml-2 text-blue-600 text-sm">(나)</span>
                )}
                {isDisconnected && (
                  <span className="ml-2 text-red-500 text-sm">(연결 해제)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 기본 상태 표시
  public getGameStatus(): ReactNode {
    const { gameState } = this.props;
    
    return (
      <div className="game-status bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">게임 상태:</span>
          <span className={`px-2 py-1 rounded text-sm ${this.getStatusColor(gameState.gameStatus)}`}>
            {this.getStatusText(gameState.gameStatus)}
          </span>
        </div>
        {this.getGameSpecificStatus()}
      </div>
    );
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'waiting_for_moves': return 'bg-yellow-200 text-yellow-800';
      case 'playing': return 'bg-green-200 text-green-800';
      case 'paused': return 'bg-gray-200 text-gray-800';
      case 'game_finished': return 'bg-blue-200 text-blue-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'waiting_for_moves': return '선택 대기 중';
      case 'playing': return '진행 중';
      case 'paused': return '일시 정지';
      case 'game_finished': return '게임 완료';
      default: return status;
    }
  }

  // 액션 버튼들
  public getActionButtons(): ReactNode {
    const { isParticipant, gameState } = this.props;
    
    if (!isParticipant || gameState.gameStatus === 'game_finished') {
      return null;
    }

    return (
      <div className="action-buttons flex gap-2 mt-4">
        {this.renderActionArea()}
      </div>
    );
  }

  // 메인 렌더 메서드
  render(): ReactNode {
    return (
      <div className="base-game-component">
        {this.renderError()}
        {this.getGameStatus()}
        {this.renderPlayerList()}
        {this.renderGameBoard()}
        {this.getActionButtons()}
        {this.renderLoadingSpinner()}
      </div>
    );
  }
}

// 라운드 기반 게임 컴포넌트
export abstract class RoundBasedGameComponent<
  TProps extends RoundBasedGameProps<any, any> = RoundBasedGameProps<any, any>,
  TState extends BaseGameComponentState = BaseGameComponentState
> extends BaseGameComponent<TProps, TState> {

  protected getGameSpecificStatus(): ReactNode {
    const { gameState } = this.props;
    
    return (
      <div className="round-info mt-2 space-y-1">
        <div className="flex justify-between">
          <span>라운드:</span>
          <span>{gameState.currentRound} / {gameState.maxRounds}</span>
        </div>
        {this.renderScoreBoard()}
      </div>
    );
  }

  protected renderScoreBoard(): ReactNode {
    const { gameState, gamePlayers } = this.props;
    
    return (
      <div className="scoreboard">
        <div className="text-sm font-medium mb-1">점수:</div>
        <div className="space-y-1">
          {gamePlayers.map((player) => (
            <div key={player.userId} className="flex justify-between text-sm">
              <span>{player.user.name}:</span>
              <span className="font-medium">{gameState.playerScores[player.userId] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  protected async processAction(action: any): Promise<void> {
    const { onChoiceSelect } = this.props;
    if (onChoiceSelect) {
      onChoiceSelect(action);
    }
  }
}

// 턴 기반 게임 컴포넌트
export abstract class TurnBasedGameComponent<
  TProps extends TurnBasedGameProps<any, any> = TurnBasedGameProps<any, any>,
  TState extends BaseGameComponentState = BaseGameComponentState
> extends BaseGameComponent<TProps, TState> {

  protected getGameSpecificStatus(): ReactNode {
    const { gameState, currentUser, canMakeMove } = this.props;
    const currentPlayerName = this.getPlayerName(gameState.currentPlayer);
    const isMyTurn = gameState.currentPlayer === currentUser?.id;
    
    return (
      <div className="turn-info mt-2 space-y-1">
        <div className="flex justify-between">
          <span>현재 턴:</span>
          <span className={isMyTurn ? 'font-bold text-blue-600' : ''}>
            {currentPlayerName} {isMyTurn ? '(나)' : ''}
          </span>
        </div>
        <div className="flex justify-between">
          <span>턴 수:</span>
          <span>{gameState.turnCount}</span>
        </div>
        {canMakeMove && (
          <div className="text-green-600 text-sm font-medium">
            당신의 차례입니다!
          </div>
        )}
        {this.renderKickVoteStatus()}
      </div>
    );
  }

  protected getPlayerName(playerId: string): string {
    const { gamePlayers } = this.props;
    const player = gamePlayers.find(p => p.userId === playerId);
    return player?.user.name || 'Unknown';
  }

  protected async processAction(action: any): Promise<void> {
    const { onMakeMove } = this.props;
    if (onMakeMove) {
      onMakeMove(action);
    }
  }

  // 퇴출 투표 상태 렌더링
  protected renderKickVoteStatus(): ReactNode {
    const { gameState, currentUser } = this.props;
    const turnGameState = gameState as TurnBasedGameState;
    
    if (!turnGameState.kickVote) {
      return null;
    }

    const { targetPlayerId, agreeVotes, disagreeVotes, voteEndTime } = turnGameState.kickVote;
    const targetPlayerName = this.getPlayerName(targetPlayerId);
    const hasVotedAgree = agreeVotes.includes(currentUser?.id || '');
    const hasVotedDisagree = disagreeVotes.includes(currentUser?.id || '');
    const hasVoted = hasVotedAgree || hasVotedDisagree;
    const timeLeft = Math.max(0, Math.ceil((voteEndTime - Date.now()) / 1000));
    
    // 연결된 플레이어 수 계산 (투표 대상 제외)
    const connectedPlayers = turnGameState.playerIds.filter(
      id => !turnGameState.disconnectedPlayers.includes(id) && id !== targetPlayerId
    );
    const totalVotes = agreeVotes.length + disagreeVotes.length;

    return (
      <div className="kick-vote-status mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <div className="text-sm font-medium text-yellow-800 mb-2">
          퇴출 투표 진행 중
        </div>
        <div className="text-xs text-yellow-700 space-y-1">
          <div>대상: {targetPlayerName}</div>
          <div>투표 현황: 
            <span className="font-semibold text-red-600 mx-1">찬성 {agreeVotes.length}</span> / 
            <span className="font-semibold text-blue-600 mx-1">반대 {disagreeVotes.length}</span>
            <span className="text-gray-600"> ({totalVotes}/{connectedPlayers.length})</span>
          </div>
          <div>남은 시간: {timeLeft}초</div>
        </div>
        {!hasVoted && currentUser?.id !== targetPlayerId && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => this.handleKickVote(targetPlayerId, 'agree')}
              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex-1"
            >
              찬성 (퇴출)
            </button>
            <button
              onClick={() => this.handleKickVote(targetPlayerId, 'disagree')}
              className="px-3 py-1 border border-blue-500 text-blue-600 text-xs rounded hover:bg-blue-50 flex-1"
            >
              반대 (유지)
            </button>
          </div>
        )}
        {hasVoted && (
          <div className={`mt-2 text-xs font-semibold ${hasVotedAgree ? 'text-red-600' : 'text-blue-600'}`}>
            ✓ {hasVotedAgree ? '찬성' : '반대'} 투표 완료
          </div>
        )}
      </div>
    );
  }

  // 퇴출 투표 처리
  protected handleKickVote = async (targetPlayerId: string, voteType: 'agree' | 'disagree') => {
    try {
      // WebSocket을 통해 투표 메시지 전송
      const websocket = (window as any).gameWebSocket;
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'kick_vote',
          roomId: this.props.room.id,
          userId: this.props.currentUser?.id,
          data: {
            targetPlayerId,
            voteType
          }
        }));
      }
    } catch (error) {
      console.error('Error sending kick vote:', error);
      this.setState({ error: '투표 전송에 실패했습니다.' });
    }
  }

  validateAction(action: any): boolean {
    const { canMakeMove, validMoves } = this.props;
    
    if (!canMakeMove) return false;
    if (!super.validateAction(action)) return false;
    
    // 유효한 이동 목록이 있다면 검증
    if (validMoves && validMoves.length > 0) {
      return validMoves.some(move => 
        JSON.stringify(move) === JSON.stringify(action)
      );
    }
    
    return true;
  }
}

// 보드 게임 컴포넌트
export abstract class BoardGameComponent<
  TGameState extends TurnBasedGameState = TurnBasedGameState,
  TMove = any,
  TProps extends TurnBasedGameProps<TGameState, TMove> = TurnBasedGameProps<TGameState, TMove>,
  TState extends BaseGameComponentState = BaseGameComponentState
> extends TurnBasedGameComponent<TProps, TState> {
  
  protected getGameSpecificStatus(): ReactNode {
    const { gameState } = this.props;
    
    if (!gameState.board) {
      return <div className="text-gray-500">보드 상태를 불러올 수 없습니다.</div>;
    }

    return (
      <div className="text-sm text-gray-600">
        보드 크기: {gameState.boardSize?.width || 'N/A'} x {gameState.boardSize?.height || 'N/A'}
      </div>
    );
  }

  // 보드 클릭 핸들러 (서브클래스에서 오버라이드)
  protected handleBoardClick = (position: any) => {
    // 기본 구현: 아무것도 하지 않음
    // 서브클래스에서 필요시 오버라이드
  };

  // 위치 하이라이트 확인 (서브클래스에서 오버라이드)
  protected isPositionHighlighted(position: any): boolean {
    // 기본 구현: 하이라이트 없음
    // 서브클래스에서 필요시 오버라이드
    return false;
  }
}

// HOC 팩토리 함수들
export function withGameComponent<P extends BaseGameProps>(
  WrappedComponent: React.ComponentType<P>
) {
  return React.forwardRef<any, P>((props, ref) => {
    return <WrappedComponent {...(props as P)} />;
  });
}

export function withErrorBoundary<P extends BaseGameProps>(
  WrappedComponent: React.ComponentType<P>
) {
  return class extends React.Component<P, { hasError: boolean; error?: Error }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Game component error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="error-boundary p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="text-red-800 font-bold">게임 로딩 오류</h3>
            <p className="text-red-600">게임을 로드하는 중 오류가 발생했습니다.</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              다시 시도
            </button>
          </div>
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  };
}