import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BluffCardGameState } from '@shared/games/bluff-card/schema';
import type { User } from '@shared/schema';

interface GameBoardProps {
  gameState: BluffCardGameState;
  gamePlayers: Array<{
    userId: string;
    user: {
      id: string;
      nickname: string;
      isGuest: boolean | null;
    };
  }>;
  currentUser: User | null;
  onChallenge?: () => void;
}

export function GameBoard({ gameState, gamePlayers, currentUser, onChallenge }: GameBoardProps) {
  const renderPlayerCard = (player: any) => {
    const isCurrentPlayer = player.userId === currentUser?.id;
    const cardCount = gameState.playerHands[player.userId]?.cards.length || 0;
    const isCurrentTurn = gameState.currentPlayerId === player.userId;
    
    return (
      <div
        key={player.userId}
        className={`relative p-3 rounded-lg border-2 ${
          isCurrentTurn
            ? 'bg-blue-600/30 border-blue-400'
            : 'bg-slate-700/30 border-slate-600'
        }`}
      >
        {/* 플레이어 이름 */}
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-white text-sm font-medium">
              {isCurrentPlayer ? '나' : player.user.nickname}
            </span>
            {isCurrentTurn && (
              <Badge variant="outline" className="text-xs !text-yellow-300 !border-yellow-300">
                턴
              </Badge>
            )}
          </div>
        </div>
        
        {/* 전체 카드 표시 (플레이된 카드는 하이라이트) */}
        <div className="flex justify-center mb-2">
          <div className="flex gap-1">
            {Array.from({ length: Math.min(cardCount, 13) }).map((_, index) => {
              // 현재 플레이된 카드 확인
              const hasPlayedCards = gameState.playedCards && gameState.playedCards.playerId === player.userId;
              
              // 이의제기 실패했을 때만 카드 공개 (진실이었을 때만)
              // 이의제기가 발생했고, 실제로 진실이었을 때 (이의제기 실패)
              const hasChallenge = gameState.challengingPlayers.length > 0;
              const isTruth = gameState.playedCards?.actualTruth === true;
              const isBluff = gameState.playedCards?.actualTruth === false;
              const shouldRevealCards = hasPlayedCards && hasChallenge && isTruth;
              const shouldShowBluff = hasPlayedCards && hasChallenge && isBluff;
              
              console.log('🔍 카드 공개 조건:', {
                hasPlayedCards,
                hasChallenge,
                isTruth,
                isBluff,
                shouldRevealCards,
                shouldShowBluff,
                actualTruth: gameState.playedCards?.actualTruth
              });
              
              // 현재 플레이된 카드의 인덱스 확인
              let isPlayedCard = hasPlayedCards && gameState.playedCards?.cardIndices?.includes(index);
              
              console.log('🎴 카드 표시 디버그:', {
                playerId: player.userId,
                index,
                hasPlayedCards,
                hasChallenge: gameState.challengingPlayers.length > 0,
                isTruth: gameState.playedCards?.actualTruth,
                cardIndices: gameState.playedCards?.cardIndices,
                isPlayedCard,
                shouldRevealCards
              });
             
              let cardClass = "w-6 h-8 rounded-sm border flex items-center justify-center text-xs font-bold";
              let cardContent = "";
              let cardTitle = `보유 카드`;
              
              if (isPlayedCard) {
                // 플레이된 카드
                const playedCards = gameState.playedCards;
                
                if (shouldRevealCards) {
                  // 이의제기 실패 후 - 실제 카드 내용과 진실 색상
                  cardClass += " bg-green-100 border-green-400 text-green-800";
                  // 선택된 카드의 실제 값 찾기
                  const cardIndex = playedCards?.cardIndices?.indexOf(index);
                  cardContent = (cardIndex !== undefined && cardIndex >= 0) ? playedCards?.cards[cardIndex]?.toString() || "?" : "?";
                  cardTitle = `플레이된 카드: ${cardContent} (진실)`;
                } else if (shouldShowBluff) {
                  // 이의제기 성공 후 - 빨간색으로 표시하되 카드 내용 숨김
                  cardClass += " bg-red-200 border-red-400 text-red-800";
                  cardContent = "?";
                  cardTitle = "플레이된 카드 (블러핑 성공)";
                } else {
                  // 플레이 직후 - 초록색 하이라이트 (카드 내용 숨김)
                  cardClass += " bg-green-200 border-green-400 text-green-800";
                  cardContent = "?";
                  cardTitle = "플레이된 카드 (이의제기 대기중)";
                }
              } else {
                // 일반 카드
                cardClass += " bg-slate-500 border-slate-400";
                cardTitle = `보유 카드`;
              }
              
              return (
                <div
                  key={index}
                  className={cardClass}
                  title={cardTitle}
                >
                  {cardContent}
                </div>
              );
            })}
            {cardCount > 13 && (
              <div className="w-6 h-8 bg-slate-500 border border-slate-400 rounded-sm flex items-center justify-center">
                <span className="text-xs text-white">+{cardCount - 13}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 카드 수 텍스트 또는 플레이 상태 */}
        <div className="text-center">
          {gameState.playedCards && gameState.playedCards.playerId === player.userId ? (
            <div className="text-xs">
              <span className="text-yellow-400 font-medium">플레이됨</span>
              {gameState.challengingPlayers.length > 0 || gameState.playedCards?.revealed ? (
                <div className={`mt-1 ${gameState.playedCards?.actualTruth ? 'text-green-400' : 'text-red-400'}`}>
                  {gameState.playedCards?.actualTruth ? '진실!' : '거짓!'}
                </div>
              ) : (
                <div className="text-blue-300 mt-1">이의제기 대기</div>
              )}
            </div>
          ) : (
            <span className="text-slate-300 text-xs">{cardCount}장</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-slate-800/30 border-slate-700">
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="text-white font-semibold">게임 현황</h3>
        </div>
        
        {/* 플레이어들 카드 현황 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {gamePlayers
            .filter(player => gameState.playerIds.includes(player.userId)) // 게임에 참여 중인 플레이어만 표시
            .map(renderPlayerCard)}
        </div>

        
        {/* 현재 타겟 숫자 */}
        <div className="text-center mt-4 p-3 bg-slate-600/50 rounded-lg">
          <div className="flex items-center justify-center gap-3">
            <span className="text-slate-300 text-sm">이번 라운드 타겟 숫자</span>
            {/* 이의제기 버튼 - 현재 턴 플레이어는 비활성화, 나머지는 활성화 */}
            {gameState.challengeWindow && 
             gameState.playedCards && 
             onChallenge && (
              <Button
                size="sm"
                variant="destructive"
                className="text-xs px-3 py-1 h-7"
                onClick={onChallenge}
                disabled={gameState.currentPlayerId === currentUser?.id}
              >
                이의제기
              </Button>
            )}
          </div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">
            {gameState.currentTarget}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}