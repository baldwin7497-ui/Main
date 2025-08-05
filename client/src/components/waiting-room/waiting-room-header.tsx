import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DoorOpen, Gamepad2, Play, Check } from "lucide-react";
import type { RoomWithPlayers, User } from "@shared/schema";

interface WaitingRoomHeaderProps {
  room: RoomWithPlayers;
  currentUser: User;
  isConnected: boolean;
  isHost: boolean;
  isReady: boolean;
  canStartGame: boolean;
  readyCount: number;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onToggleReady: () => void;
}

export function WaitingRoomHeader({ 
  room, 
  currentUser, 
  isConnected,
  isHost,
  isReady,
  canStartGame,
  readyCount,
  onLeaveRoom,
  onStartGame,
  onToggleReady
}: WaitingRoomHeaderProps) {
  return (
    <>
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-blue-500">
            <Gamepad2 className="inline mr-2" size={24} />
            GameHub
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-400">
              {isConnected ? '연결됨' : '연결 안됨'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-semibold">
              {currentUser.nickname.charAt(0)}
            </div>
            <span className="text-sm font-medium">{currentUser.nickname}</span>
          </div>
        </div>
      </header>

      {/* Room Header */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold mb-1 text-white">{room.name}</h2>
              <p className="text-gray-400 text-sm">
                방 코드: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{room.code}</span>
              </p>
            </div>
            <div className="flex space-x-2">
              {isHost ? (
                <Button
                  onClick={onStartGame}
                  disabled={!canStartGame}
                  className={`px-6 py-3 font-medium ${
                    canStartGame 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Play className="mr-2" size={16} />
                  게임 시작 ({readyCount}/{room.players.length})
                </Button>
              ) : (
                <Button
                  onClick={onToggleReady}
                  className={`px-6 py-3 font-medium ${
                    isReady 
                      ? "bg-gray-600 hover:bg-gray-700 text-white" 
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  <Check className="mr-2" size={16} />
                  {isReady ? "준비 취소" : "준비완료"}
                </Button>
              )}
              <Button
                onClick={onLeaveRoom}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <DoorOpen className="mr-1" size={16} />
                나가기
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}