// BluffCard Game Board Component - 게임 현황 및 플레이어 상태 표시
import { useMemo, useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BluffCardGameState } from '@shared/games/bluff-card/schema';

interface GameBoardProps {
  gameState: BluffCardGameState;
  gamePlayers: any[];
  currentUser: any;
  onChallenge: () => void;
}

/**
 * 블러프 카드 게임 보드 컴포넌트
 * 
 * 기능:
 * - 각 플레이어별 카드 상태 표시
 * - 플레이한 카드 시각적 표시 (선택된 카드: 초록색, 이의제기 실패시: 빨간색)
 * - 이의제기 버튼 및 카운트다운
 * - 게임 진행 상황 표시
 */
export function GameBoard({ gameState, gamePlayers, currentUser, onChallenge }: GameBoardProps) {
  const [challengeTimeLeft, setChallengeTimeLeft] = useState<number>(0);

  // ============================================================================
  // 이의제기 타이머 관리
  // ============================================================================

  useEffect(() => {
    if (gameState.challengeWindow && gameState.challengeTimeLeft > 0) {
      setChallengeTimeLeft(gameState.challengeTimeLeft);
      const timer = setInterval(() => {
        setChallengeTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setChallengeTimeLeft(0);
    }
  }, [gameState.challengeWindow, gameState.challengeTimeLeft]);

  // ============================================================================
  // Memoized 값들
  // ============================================================================
  
  const playersData = useMemo(() => {
    return gamePlayers.map(player => {
      const isCurrentPlayer = player.userId === currentUser?.id;
      const playerHand = gameState.playerHands[player.userId];
      const cardCount = playerHand?.cards.length || 0;
      const isCurrentTurn = gameState.currentPlayer === player.userId;
      const isDisconnected = gameState.disconnectedPlayers.includes(player.userId);
      
      return {
        ...player,
        isCurrentPlayer,
        playerHand,
        cardCount,
        isCurrentTurn,
        isDisconnected,
        displayName: isCurrentPlayer ? '나' : player.user.nickname
      };
    });
  }, [gamePlayers, currentUser?.id, gameState.playerHands, gameState.currentPlayer, gameState.disconnectedPlayers]);

  const challengeInfo = useMemo(() => {
    // 플레이된 카드가 있고, (이의제기 창이 열려있거나 이의제기 결과가 있을 때)
    if (!gameState.playedCards) return null;
    
    const hasChallengeResult = gameState.currentChallengeResult;
    
    if (!gameState.challengeWindow && !hasChallengeResult) return null;
    
    const playedByPlayer = gamePlayers.find(p => p.userId === gameState.playedCards?.playerId);
    const challengingPlayers = gameState.challengingPlayers.map(playerId => 
      gamePlayers.find(p => p.userId === playerId)?.user.nickname || '알 수 없음'
    );
    
    // 게임 상태에서 이의제기 결과 확인
    const currentChallengeResult = gameState.currentChallengeResult;
    
    const result = {
      playerName: playedByPlayer?.user.nickname || '알 수 없음',
      playerId: gameState.playedCards!.playerId,
      cards: gameState.playedCards!.cards,
      cardIndices: gameState.playedCards!.cardIndices,
      claimedCount: gameState.playedCards!.claimedCount,
      revealed: gameState.playedCards!.revealed,
      challengingPlayers,
      wasBluff: currentChallengeResult?.wasBluff,
      challengeResolved: !!currentChallengeResult,
      penalizedPlayer: currentChallengeResult?.penalizedPlayer
    };
    
    // 디버깅을 위한 콘솔 로그
    console.log('Challenge Info Debug:', {
      currentChallengeResult,
      gameStateCurrentChallengeResult: gameState.currentChallengeResult,
      wasBluff: currentChallengeResult?.wasBluff,
      challengeResolved: !!currentChallengeResult,
      result
    });
    
    return result;
  }, [gameState.challengeWindow, gameState.playedCards, gameState.challengingPlayers, gameState.gameHistory, gameState.currentChallengeResult, gamePlayers]);

  const canChallenge = useMemo(() => {
    return gameState.challengeWindow && 
           gameState.currentPlayer !== currentUser?.id &&
           !gameState.challengingPlayers.includes(currentUser?.id || '');
  }, [gameState.challengeWindow, gameState.currentPlayer, gameState.challengingPlayers, currentUser?.id]);

  // ============================================================================
  // 렌더링 함수들
  // ============================================================================

  const renderPlayerCard = useCallback((playerData: any) => {
    const { 
      userId, 
      displayName, 
      playerHand,
      cardCount, 
      isCurrentTurn, 
      isCurrentPlayer, 
      isDisconnected 
    } = playerData;

    const isPlayedBy = challengeInfo?.playerId === userId;
    const hasChallenged = gameState.challengingPlayers.includes(userId);

    return (
      <div
        key={userId}
        className={`relative p-2 rounded-lg border transition-all ${
          hasChallenged
            ? 'bg-orange-600/40 border-orange-400 shadow-md animate-pulse'
            : isCurrentTurn
            ? 'bg-blue-600/30 border-blue-400 shadow-md'
            : 'bg-slate-700/30 border-slate-600'
        } ${isDisconnected ? 'opacity-50' : ''}`}
      >
        {/* 플레이어 이름 */}
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-1">
            <span className={`text-xs font-medium ${
              isCurrentPlayer ? 'text-yellow-300' : 'text-white'
            }`}>
              {displayName}
            </span>
            {isCurrentTurn && !hasChallenged && (
              <Badge variant="outline" className="text-xs !text-yellow-300 !border-yellow-300 px-1 py-0">
                턴
              </Badge>
            )}
            {hasChallenged && (
              <Badge variant="outline" className="text-xs !text-orange-300 !border-orange-300 animate-bounce px-1 py-0">
                🚨
              </Badge>
            )}
            {isDisconnected && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                연결해제
              </Badge>
            )}
          </div>
        </div>

        {/* 플레이어의 카드들 표시 */}
        <div className="flex flex-wrap justify-center gap-1">
          {playerHand?.cards.map((card: number, index: number) => {
            let cardStyle = 'bg-slate-600 text-slate-200 border-slate-500';
            
            // 패널티 카드인지 확인 (이의제기 결과가 있을 때만)
            if (gameState.currentChallengeResult && playerHand?.penaltyCardIndices?.includes(index)) {
              cardStyle = 'bg-blue-500 text-white border-blue-400';
            }
            
            // 플레이된 카드인지 확인 (패널티 카드보다 우선)
            if (isPlayedBy && challengeInfo?.cardIndices.includes(index)) {
              // 이의제기 창이 열려있을 때는 초록색, 결과가 있으면 결과에 따라 색상 변경
              if (gameState.challengeWindow) {
                cardStyle = 'bg-green-500 text-white border-green-400';
              } else if (gameState.currentChallengeResult) {
                if (gameState.currentChallengeResult.wasBluff) {
                  // 블러핑이었음 (이의제기 성공) - 빨간색으로 표시
                  cardStyle = 'bg-red-500 text-white border-red-400';
                } else {
                  // 진실이었음 (이의제기 실패) - 초록색으로 표시
                  cardStyle = 'bg-green-500 text-white border-green-400';
                }
              }
            }

            return (
              <div
                key={`${userId}-card-${index}`}
                className={`w-6 h-8 text-xs rounded border flex items-center justify-center font-bold transition-all ${cardStyle}`}
              >
                {isCurrentPlayer ? card : 
                 (isPlayedBy && challengeInfo?.cardIndices.includes(index) && !gameState.challengeWindow && gameState.currentChallengeResult && !gameState.currentChallengeResult.wasBluff) ? card : 
                 (isPlayedBy && challengeInfo?.cardIndices.includes(index)) ? '?' : '?'}
              </div>
            );
          })}
        </div>

        {/* 승리 표시 */}
        {cardCount === 0 && (
          <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
            승리!
          </div>
        )}
      </div>
    );
  }, [challengeInfo, gameState.challengingPlayers]);

  const renderChallengeSection = () => {
    // 이의제기 창이 열려있거나 이의제기 결과가 있을 때만 표시
    if ((!gameState.challengeWindow && !gameState.currentChallengeResult) || !challengeInfo) return null;

    // 이의제기 결과가 있으면 결과만 표시
    if (gameState.currentChallengeResult) {
      return (
        <div className="space-y-4 p-4 bg-orange-600/20 rounded-lg border border-orange-400">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-orange-300">
              이의제기 결과
            </h3>
            <p className="text-sm text-orange-200">
              {challengeInfo.playerName}가 {challengeInfo.claimedCount}장의 타겟 카드를 냈다고 주장
            </p>
          </div>

          {/* 이의제기 결과 표시 */}
          <div className={`text-center p-3 rounded-lg border-2 animate-pulse ${
            gameState.currentChallengeResult.wasBluff 
              ? 'bg-green-600/40 border-green-400 text-green-100' 
              : 'bg-red-600/40 border-red-400 text-red-100'
          }`}>
            <div className="text-lg font-bold mb-1">
              {gameState.currentChallengeResult.wasBluff ? '🎉 이의제기 성공!' : '❌ 이의제기 실패!'}
            </div>
            <div className="text-sm">
              {gameState.currentChallengeResult.wasBluff 
                ? `${challengeInfo?.playerName || '플레이어'}이(가) 블러핑했습니다!`
                : `${challengeInfo?.playerName || '플레이어'}이(가) 진실을 말했습니다!`
              }
            </div>
            <div className="text-xs mt-1 opacity-90">
              {gameState.currentChallengeResult.wasBluff
                ? '카드가 공개되지 않고 빨간색으로 표시됩니다'
                : '카드가 공개되고 초록색으로 표시됩니다'
              }
            </div>
          </div>
        </div>
      );
    }

    // 이의제기 결과가 없으면 이의제기 창 표시
    return (
      <div className="space-y-4 p-4 bg-orange-600/20 rounded-lg border border-orange-400">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-orange-300">
              이의제기 진행 중
            </h3>
            <p className="text-sm text-orange-200">
              {challengeInfo.playerName}가 {challengeInfo.claimedCount}장의 타겟 카드를 냈다고 주장
            </p>
          </div>
          {canChallenge && (
            <Button
              size="sm"
              variant="destructive"
              className="text-xs px-3 py-1 h-7 animate-pulse"
              onClick={onChallenge}
            >
              이의제기
            </Button>
          )}
        </div>

        {challengeInfo.challengingPlayers.length > 0 && (
          <div className="text-center text-sm text-orange-300">
            이의제기: {challengeInfo.challengingPlayers.join(', ')}
          </div>
        )}
        
        <div className="text-center text-sm text-orange-200">
          {challengeTimeLeft > 0 
            ? `${challengeTimeLeft}초 남음`
            : '처리 중...'
          }
        </div>
      </div>
    );
  };

  const renderTargetInfo = () => (
    <div className="text-center space-y-2">
      <h3 className="text-lg font-semibold text-white">타겟 숫자</h3>
      <div className="text-4xl font-bold text-yellow-400 bg-slate-700/50 rounded-lg py-2">
        {gameState.currentTarget}
      </div>
      <p className="text-xs text-slate-400">
        이 숫자와 같은 카드를 내야 합니다
      </p>
    </div>
  );

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <Card className="bg-slate-900/50 border-slate-600">
      <CardHeader className="pb-4">
        <CardTitle className="text-center text-white">게임 현황</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 플레이어 상태 */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3 text-center">
            플레이어 카드 현황
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {playersData.map(renderPlayerCard)}
          </div>
        </div>

        {/* 타겟 정보 */}
        {renderTargetInfo()}

        {/* 이의제기 섹션 */}
        {renderChallengeSection()}

        {/* 게임 통계 */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-slate-700/30 rounded-lg">
            <div className="text-lg font-bold text-white">{gameState.turnCount}</div>
            <div className="text-xs text-slate-400">턴</div>
          </div>
          <div className="p-3 bg-slate-700/30 rounded-lg">
            <div className="text-lg font-bold text-white">
              {playersData.filter(p => !p.isDisconnected).length}
            </div>
            <div className="text-xs text-slate-400">활성 플레이어</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}