import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, UserX } from "lucide-react";
import type { RoomWithPlayers, User } from "@shared/schema";

interface PlayersListProps {
  room: RoomWithPlayers;
  currentUser: User;
  isHost: boolean;
  onKickPlayer: (playerId: string) => void;
}

export function PlayersList({ 
  room, 
  currentUser, 
  isHost, 
  onKickPlayer 
}: PlayersListProps) {
  return (
    <Card className="flex-1 bg-gray-800 border-gray-700 mb-6">
      <CardContent className="p-4 h-full flex flex-col">
        <h3 className="text-lg font-semibold mb-4 text-white">
          플레이어 ({room.currentPlayers}/{room.maxPlayers})
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {room.players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  player.userId === room.hostId ? 'bg-blue-500' : 'bg-gray-600'
                }`}>
                  {player.user.nickname.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-white">{player.user.nickname}</span>
                    {player.userId === room.hostId && (
                      <Badge className="bg-yellow-500 text-black">
                        <Crown className="mr-1" size={12} />
                        방장
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">온라인</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={player.isReady ? "bg-green-500 text-black" : "bg-gray-600 text-gray-400"}>
                  {player.isReady ? "준비완료" : "대기중"}
                </Badge>
                {isHost && player.userId !== currentUser.id && (
                  <Button
                    onClick={() => onKickPlayer(player.userId)}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-600/20"
                  >
                    <UserX size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}