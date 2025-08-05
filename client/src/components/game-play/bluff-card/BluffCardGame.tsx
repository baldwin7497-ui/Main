// BluffCard Game Component - 턴 기반 블러핑 카드 게임
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { 
  BluffCardNumber, 
  BluffCardGameState, 
  BluffCardPlayMessage,
  BluffCardChallengeMessage 
} from '@shared/games/bluff-card/schema';
import type { TurnBasedGameProps } from '@shared/games/base/types/game-types';
import { GameBoard } from './game-board';

interface BluffCardGameProps extends TurnBasedGameProps<BluffCardGameState, BluffCardPlayMessage | BluffCardChallengeMessage> {
  onSendMessage?: (message: any) => void;
}

/**
 * 블러프 카드 게임 메인 컴포넌트
 * 
 * 기능:
 * - 플레이어의 손패 표시 및 카드 선택
 * - 카드 플레이 및 이의제기 UI
 * - 게임 상태 및 턴 정보 표시
 * - 게임 히스토리 및 결과 표시
 */
export function BluffCardGame({
  gameState,
  isParticipant,
  moveSubmitted,
  room,
  currentUser,
  gamePlayers,
  onSendMessage,
  onMakeMove,
  canMakeMove
}: BluffCardGameProps) {
  const [selectedCardIndices, setSelectedCardIndices] = useState<number[]>([]);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState<number>(0);

  const isCurrentPlayer = gameState.currentPlayer === currentUser?.id;
  const playerHand = gameState.playerHands[currentUser?.id || '']?.cards || [];

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
  // 카드 선택 및 플레이 핸들러
  // ============================================================================

  const handleCardSelect = useCallback((cardIndex: number) => {
    if (!isCurrentPlayer || gameState.challengeWindow || !canMakeMove) return;
    
    setSelectedCardIndices(prev => {
      if (prev.includes(cardIndex)) {
        return prev.filter(i => i !== cardIndex);
      } else if (prev.length < 4) {
        return [...prev, cardIndex];
      }
      return prev;
    });
  }, [isCurrentPlayer, gameState.challengeWindow, canMakeMove]);

  const handlePlayCards = useCallback(() => {
    if (selectedCardIndices.length === 0) return;
    
    const selectedCards = selectedCardIndices.map(index => playerHand[index]);
    const isActuallyTruth = selectedCards.every(card => card === gameState.currentTarget);
    
    const move: BluffCardPlayMessage = {
      type: 'bluff_card_play',
      cards: selectedCards,
      cardIndices: selectedCardIndices,
      claimedNumber: gameState.currentTarget,
      claimedCount: selectedCards.length,
      claimedTruth: true, // 현재는 항상 진실로 주장
      actualTruth: isActuallyTruth
    };
    
    const message = {
      type: 'bluff_card_play',
      data: move
    };
    
    onSendMessage?.(message);
    setSelectedCardIndices([]);
  }, [selectedCardIndices, playerHand, gameState.currentTarget, onSendMessage]);

  const handleChallenge = useCallback(() => {
    const move: BluffCardChallengeMessage = {
      type: 'bluff_card_challenge',
      challenge: true
    };

    onSendMessage?.({
      type: 'bluff_card_challenge',
      data: move
    });
  }, [onSendMessage]);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const getCurrentPlayerName = useCallback(() => {
    const currentPlayer = gamePlayers.find(p => p.userId === gameState.currentPlayer);
    return currentPlayer?.user.nickname || '알 수 없음';
  }, [gamePlayers, gameState.currentPlayer]);

  const getPlayerName = useCallback((userId: string) => {
    const player = gamePlayers.find(p => p.userId === userId);
    return player?.user.nickname || '알 수 없음';
  }, [gamePlayers]);

  // ============================================================================
  // 렌더링 함수들
  // ============================================================================

  const renderPlayerHand = () => {
    if (!isParticipant) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            내 카드 ({playerHand.length}장)
          </h3>
          {isCurrentPlayer && !gameState.challengeWindow && canMakeMove && (
            <Button
              onClick={handlePlayCards}
              disabled={selectedCardIndices.length === 0}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              카드 플레이 ({selectedCardIndices.length}장 선택됨)
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {playerHand.map((card, index) => (
            <Button
              key={`card-${index}`}
              onClick={() => handleCardSelect(index)}
              disabled={!isCurrentPlayer || gameState.challengeWindow || !canMakeMove}
              variant={selectedCardIndices.includes(index) ? "default" : "secondary"}
              className={`w-16 h-20 flex flex-col items-center justify-center text-2xl font-bold transition-all ${
                selectedCardIndices.includes(index) 
                  ? 'bg-blue-600 text-white scale-105 shadow-lg' 
                  : 'hover:scale-105'
              }`}
            >
              {card}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderTurnInfo = () => (
    <div className="text-center p-4 bg-blue-600/50 rounded-lg border border-blue-400">
      <h3 className="text-lg font-semibold text-white">
        현재 턴: {getCurrentPlayerName()}
        {isCurrentPlayer && " (나)"}
      </h3>
      <p className="text-blue-200">
        타겟 숫자: <span className="text-xl font-bold text-yellow-300">{gameState.currentTarget}</span> | 
        턴: {gameState.turnCount}
      </p>
      {gameState.challengeWindow && challengeTimeLeft > 0 && (
        <p className="text-yellow-300 font-bold animate-pulse">
          이의제기 시간: {challengeTimeLeft}초
        </p>
      )}
    </div>
  );

  const renderGameEnd = () => {
    if (gameState.gameStatus !== 'game_finished' || !gameState.winners) return null;

    return (
      <div className="text-center p-4 bg-green-600/50 rounded-lg border border-green-400">
        <h3 className="text-xl font-bold text-white mb-2">🎉 게임 종료!</h3>
        <p className="text-green-200">
          승자: {gameState.winners.map(id => getPlayerName(id)).join(', ')}
        </p>
        {gameState.gameResult && (
          <p className="text-green-300 text-sm mt-1">
            사유: {gameState.gameResult.reason}
          </p>
        )}
      </div>
    );
  };

  const renderGameHistory = () => {
    if (!gameState.gameHistory || gameState.gameHistory.length === 0) return null;

    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">게임 히스토리</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {gameState.gameHistory.slice().reverse().map((move, index) => (
            <div key={`move-${move.moveNumber}-${index}`} className="bg-slate-700/50 p-3 rounded">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">
                  턴 {move.moveNumber}: {getPlayerName(move.playerId)}
                </span>
                <span className="text-xs text-slate-400">
                  {move.data?.type === 'challenge_result' 
                    ? `이의제기 ${move.data.wasBluff ? '성공' : '실패'}`
                    : move.data?.type || 'move'
                  }
                </span>
              </div>
              {move.data?.type === 'challenge_result' && (
                <div className="text-xs text-slate-400 mt-1">
                  패널티: {getPlayerName(move.data.penalizedPlayer)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="space-y-6">
        {/* 게임 보드 - 게임 현황 표시 */}
        <GameBoard 
          gameState={gameState}
          gamePlayers={gamePlayers}
          currentUser={currentUser}
          onChallenge={handleChallenge}
        />
        
        {/* 턴 정보 */}
        {renderTurnInfo()}
        
        {/* 플레이어 손패 */}
        {renderPlayerHand()}

        {/* 게임 종료 */}
        {renderGameEnd()}

        {/* 게임 히스토리 */}
        {renderGameHistory()}
      </CardContent>
    </Card>
  );
}