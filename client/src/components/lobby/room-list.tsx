import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Users, Key, Lock, Clock, RefreshCw } from "lucide-react";
import type { RoomWithPlayers } from "@shared/schema";

interface RoomListProps {
  rooms: RoomWithPlayers[];
  onJoinRoom: (roomId: string) => void;
  onRefresh: () => void;
}

export function RoomList({ rooms, onJoinRoom, onRefresh }: RoomListProps) {
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${Math.floor(diffHours / 24)}일 전`;
  };

  const getStatusBadge = (room: RoomWithPlayers) => {
    if (room.status === 'playing') {
      return <Badge className="bg-yellow-500 text-black">진행중</Badge>;
    }
    return <Badge className="bg-green-500 text-black">대기중</Badge>;
  };

  const canJoinRoom = (room: RoomWithPlayers) => {
    return room.status === 'waiting' && room.currentPlayers < room.maxPlayers;
  };

  return (
    <main className="flex-1 bg-gray-900 overflow-y-auto">
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold">게임 방 목록</h2>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
          >
            <RefreshCw className="mr-1" size={14} />
            새로고침
          </Button>
        </div>

        {/* Room Cards - Full Height Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-3">
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <Card key={room.id} className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-base text-white">{room.name}</h3>
                          <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
                            {room.gameType === 'number-guessing' ? '숫자 맞추기' : room.gameType === 'odd-even' ? '홀짝 맞추기' : room.gameType}
                          </Badge>
                          {getStatusBadge(room)}
                        </div>
                        {room.description && (
                          <p className="text-gray-400 text-xs mb-2">{room.description}</p>
                        )}
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <span>
                            <Users className="inline mr-1" size={12} />
                            {room.currentPlayers}/{room.maxPlayers}
                          </span>
                          <span>
                            {room.isPrivate ? (
                              <>
                                <Lock className="inline mr-1" size={12} />
                                비밀방
                              </>
                            ) : (
                              <>
                                <Key className="inline mr-1" size={12} />
                                공개방
                              </>
                            )}
                          </span>
                          <span>
                            <Clock className="inline mr-1" size={12} />
                            {formatTimeAgo(new Date(room.createdAt!))}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => onJoinRoom(room.id)}
                        disabled={!canJoinRoom(room)}
                        size="sm"
                        className={
                          canJoinRoom(room)
                            ? "bg-blue-500 hover:bg-blue-600 text-white ml-3"
                            : "bg-gray-600 text-gray-400 cursor-not-allowed ml-3"
                        }
                      >
                        {canJoinRoom(room) ? "입장" : "불가"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-16">
                <Gamepad2 className="mx-auto text-4xl text-gray-400 mb-4" size={48} />
                <h3 className="text-base font-medium text-gray-400 mb-2">게임 방이 없습니다</h3>
                <p className="text-gray-500 text-sm">새로운 방을 만들어 게임을 시작해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 