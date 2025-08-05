// BluffCard Game Component
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BluffCardNumber, BluffCardGameState } from '@shared/games/bluff-card/schema';
import type { BaseGameProps } from '@shared/games/base/game-types';
import { GameBoard } from './game-board';

interface BluffCardGameProps extends BaseGameProps<BluffCardGameState, BluffCardNumber> {
  onSendMessage?: (message: any) => void;
}

export function BluffCardGame({
  gameState,
  selectedChoice,
  onChoiceSelect,
  isParticipant,
  moveSubmitted,
  room,
  currentUser,
  gamePlayers,
  onSendMessage
}: BluffCardGameProps) {
  const [selectedCardIndices, setSelectedCardIndices] = useState<number[]>([]);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState<number>(0);

  const isCurrentPlayer = gameState.currentPlayerId === currentUser?.id;
  const playerHand = gameState.playerHands[currentUser?.id || '']?.cards || [];

  // 이의제기 타이머
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
    }
  }, [gameState.challengeWindow, gameState.challengeTimeLeft]);

  const handleCardSelect = (cardIndex: number) => {
    if (selectedCardIndices.includes(cardIndex)) {
      setSelectedCardIndices(selectedCardIndices.filter(i => i !== cardIndex));
    } else if (selectedCardIndices.length < 4) {
      setSelectedCardIndices([...selectedCardIndices, cardIndex]);
    }
  };

  const handlePlayCards = () => {
    console.log('🎯 handlePlayCards 실행됨');
    console.log('선택된 카드 인덱스:', selectedCardIndices);
    console.log('현재 플레이어인가?', isCurrentPlayer);
    console.log('이의제기 창 열려있나?', gameState.challengeWindow);
    console.log('onSendMessage 존재하나?', !!onSendMessage);
    
    if (selectedCardIndices.length === 0) {
      console.log('❌ 선택된 카드가 없음');
      return;
    }
    
    const selectedCards = selectedCardIndices.map(index => playerHand[index]);
    console.log('선택된 카드들:', selectedCards);
    
    // 진실인지 확인: 모든 선택한 카드가 타겟 숫자와 같은지
    const isActuallyTruth = selectedCards.every(card => card === gameState.currentTarget);
    console.log('실제 진실 여부:', isActuallyTruth);
    
    const message = {
      type: 'bluff_card_play',
      data: {
        cards: selectedCards,
        cardIndices: selectedCardIndices, // 선택된 카드의 인덱스 추가
        claimedNumber: gameState.currentTarget, // 항상 타겟 숫자로 고정
        claimedCount: selectedCards.length, // 실제 낸 카드 수
        claimedTruth: true, // 항상 진실로 고정
        actualTruth: isActuallyTruth // 실제 진실 여부
      }
    };
    
    console.log('📤 메시지 전송:', message);
    console.log('🔍 디버그 - selectedCardIndices:', selectedCardIndices);
    console.log('🔍 디버그 - message.data:', message.data);
    console.log('🔍 디버그 - message.data.cardIndices:', message.data.cardIndices);
    
    try {
      onSendMessage?.(message);
      console.log('✅ 메시지 전송 성공');
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
    }
    
    setSelectedCardIndices([]);
    console.log('✅ 카드 선택 초기화 완료');
  };

  const handleChallenge = () => {
    onSendMessage?.({
      type: 'bluff_card_challenge',
      data: {
        challenge: true
      }
    });
  };

  // 카드 이모지 제거 - 숫자만 표시

  const getCurrentPlayerName = () => {
    const currentPlayer = gamePlayers.find(p => p.userId === gameState.currentPlayerId);
    return currentPlayer?.user.nickname || '알 수 없음';
  };

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
        
        {/* 플레이어 손패 (자신만 볼 수 있음) - 가장 위로 이동 */}
        {isParticipant && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="mt-4 text-lg font-semibold text-white">
                내 카드 ({playerHand.length}장)
              </h3>
              {/* 카드 플레이 버튼 - 현재 턴 플레이어만 표시 */}
              {isCurrentPlayer && !gameState.challengeWindow && (
                <Button
                  onClick={handlePlayCards}
                  disabled={selectedCardIndices.length === 0}
                  size="sm"
                  className="mt-4"
                >
                  카드 플레이 ({selectedCardIndices.length}장 선택됨)
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {playerHand.map((card, index) => (
                <Button
                  key={`card-${index}`}
                  onClick={() => isCurrentPlayer && !gameState.challengeWindow && handleCardSelect(index)}
                  disabled={!isCurrentPlayer || gameState.challengeWindow}
                  variant={selectedCardIndices.includes(index) ? "default" : "secondary"}
                  className="w-16 h-20 flex flex-col items-center justify-center text-2xl font-bold"
                >
                  {card}
                </Button>
              ))}
            </div>


          </div>
        )}

        {/* 게임 종료 */}
        {gameState.gameStatus === 'game_finished' && gameState.winners && (
          <div className="text-center p-4 bg-green-600/50 rounded-lg border border-green-400">
            <h3 className="text-xl font-bold text-white mb-2">🎉 게임 종료!</h3>
            <p className="text-green-200">
              승자: {gameState.winners.map(id => 
                gamePlayers.find(p => p.userId === id)?.user.nickname || '알 수 없음'
              ).join(', ')}
            </p>
          </div>
        )}
        

      </CardContent>
    </Card>
  );
}