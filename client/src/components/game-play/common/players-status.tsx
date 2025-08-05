import { Badge } from '@/components/ui/badge';
import type { User } from '@shared/schema';

interface PlayersStatusProps {
  gamePlayers: Array<{
    userId: string;
    user: {
      id: string;
      nickname: string;
      isGuest: boolean | null;
    };
  }>;
  currentUser: User | null;
  gameState?: any; // 게임 상태 추가
  // TODO: 실제 접속 상태 추가 시 사용
  // connectedPlayerIds?: string[];
}

export function PlayersStatus({ gamePlayers, currentUser, gameState }: PlayersStatusProps) {
  // 플레이어의 게임 참여 상태 확인
  const isPlayerInGame = (playerId: string) => {
    return gameState && gameState.playerIds.includes(playerId);
  };

  // 연결이 끊긴 플레이어 목록 (WebSocket 연결 상태 기반)
  const disconnectedPlayers = gameState?.disconnectedPlayers || [];

  return (
    <div className="bg-slate-800/30 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">플레이어 ({gamePlayers.length}명)</h3>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {gamePlayers.map((player) => {
          const isCurrentPlayer = player.userId === currentUser?.id;
          const isInGame = isPlayerInGame(player.userId);
          const isDisconnected = disconnectedPlayers.includes(player.userId);
          
          return (
            <div 
              key={player.userId}
              className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg"
            >
              {/* 접속 상태 동그라미 */}
              <div 
                className={`w-3 h-3 rounded-full ${
                  isDisconnected ? 'bg-red-500' : isInGame ? 'bg-green-500' : 'bg-blue-500'
                }`}
                title={isDisconnected ? '연결 해제' : isInGame ? '게임 참여 중' : '게임에서 나감'}
              />
              
              {/* 플레이어 이름 */}
              <span className={`text-sm font-medium ${
                isDisconnected ? 'text-red-300' : isInGame ? 'text-white' : 'text-gray-400'
              }`}>
                {player.user.nickname}
                {isCurrentPlayer && ' (나)'}
              </span>
              
              {/* 게스트 표시 */}
              {player.user.isGuest && (
                <Badge variant="outline" className="text-xs px-1 py-0 !text-white !border-white">
                  게스트
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}