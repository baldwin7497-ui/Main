import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users } from 'lucide-react';
import { GAME_INFO } from '@shared/schema';
import type { GameState, RoomWithPlayers } from '@shared/schema';

interface GameHeaderProps {
  gameState: GameState;
  gamePlayers: Array<{
    userId: string;
    user: {
      id: string;
      nickname: string;
      isGuest: boolean | null;
    };
  }>;
  isParticipant: boolean;
  onLeaveGame: () => void;
}

export function GameHeader({ gameState, gamePlayers, isParticipant, onLeaveGame }: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <Button
        variant="outline"
        onClick={onLeaveGame}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        로비로 돌아가기
      </Button>
      <h1 className="text-2xl font-bold text-white">
        {GAME_INFO[gameState?.gameType || 'number-guessing'].name}
      </h1>
      <div className="flex items-center gap-2 text-white">
        <Users className="w-4 h-4" />
        <span>{gamePlayers.length}명 참여 중</span>
        {!isParticipant && (
          <Badge variant="outline" className="text-xs">관전</Badge>
        )}
      </div>
    </div>
  );
}