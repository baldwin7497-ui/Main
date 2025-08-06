import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { TurnBasedGameState } from '@shared/games/base/types/game-types';

interface KickVotePanelProps {
  gameState: TurnBasedGameState;
  currentUser: any;
  gamePlayers: any[];
}

export function KickVotePanel({ gameState, currentUser, gamePlayers }: KickVotePanelProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // 투표 타이머 관리
  useEffect(() => {
    if (gameState.kickVote && gameState.kickVote.voteEndTime > Date.now()) {
      const voteEndTime = gameState.kickVote.voteEndTime;
      const initialTimeLeft = Math.max(0, Math.ceil((voteEndTime - Date.now()) / 1000));
      setTimeLeft(initialTimeLeft);
      
      const timer = setInterval(() => {
        const newTimeLeft = Math.max(0, Math.ceil((voteEndTime - Date.now()) / 1000));
        setTimeLeft(newTimeLeft);
        
        if (newTimeLeft <= 0) {
          clearInterval(timer);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setTimeLeft(0);
    }
  }, [gameState.kickVote]);

  if (!gameState.kickVote) {
    return null;
  }

  const { targetPlayerId, agreeVotes, disagreeVotes, voteEndTime } = gameState.kickVote;
  const targetPlayer = gamePlayers.find(p => p.userId === targetPlayerId);
  const hasVotedAgree = agreeVotes.includes(currentUser?.id || '');
  const hasVotedDisagree = disagreeVotes.includes(currentUser?.id || '');
  const hasVoted = hasVotedAgree || hasVotedDisagree;
  
  // 연결된 플레이어 수 계산 (투표 대상 제외)
  const connectedPlayers = gameState.playerIds.filter(
    id => !gameState.disconnectedPlayers.includes(id) && id !== targetPlayerId
  );
  const totalVotes = agreeVotes.length + disagreeVotes.length;

  const handleKickVote = (voteType: 'agree' | 'disagree') => {
    try {
      const websocket = (window as any).gameWebSocket;
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'kick_vote',
          roomId: gameState.roomId,
          userId: currentUser?.id,
          data: {
            targetPlayerId,
            voteType
          }
        }));
      }
    } catch (error) {
      console.error('Error sending kick vote:', error);
    }
  };

  return (
    <div className="kick-vote-panel p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="text-sm font-medium text-yellow-800 mb-2">
        ⚠️ 퇴출 투표 진행 중
      </div>
      <div className="text-xs text-yellow-700 space-y-1 mb-3">
        <div>대상: <span className="font-semibold">{targetPlayer?.user.nickname || 'Unknown'}</span></div>
        <div>투표 현황: 
          <span className="font-semibold text-red-600 mx-1">찬성 {agreeVotes.length}</span> / 
          <span className="font-semibold text-blue-600 mx-1">반대 {disagreeVotes.length}</span>
          <span className="text-gray-600"> ({totalVotes}/{connectedPlayers.length})</span>
        </div>
        <div>남은 시간: <span className="font-semibold">{timeLeft}초</span></div>
      </div>
      {!hasVoted && currentUser?.id !== targetPlayerId && (
        <div className="flex gap-2">
          <Button
            onClick={() => handleKickVote('agree')}
            size="sm"
            variant="destructive"
            className="text-xs flex-1"
          >
            찬성 (퇴출)
          </Button>
          <Button
            onClick={() => handleKickVote('disagree')}
            size="sm"
            variant="outline"
            className="text-xs flex-1 border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            반대 (유지)
          </Button>
        </div>
      )}
      {hasVoted && (
        <div className={`text-xs font-semibold ${hasVotedAgree ? 'text-red-600' : 'text-blue-600'}`}>
          ✓ {hasVotedAgree ? '찬성' : '반대'} 투표 완료
        </div>
      )}
    </div>
  );
}