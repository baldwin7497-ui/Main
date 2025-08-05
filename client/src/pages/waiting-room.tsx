import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { getCurrentUser } from "@/lib/user-utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { WaitingRoomHeader } from "@/components/waiting-room/waiting-room-header";
import { PlayersList } from "@/components/waiting-room/players-list";
import type { RoomWithPlayers, User } from "@shared/schema";

interface WaitingRoomProps {
  roomId: string;
}

export default function WaitingRoom({ roomId }: WaitingRoomProps) {
  const [, navigate] = useLocation();
  
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [room, setRoom] = useState<RoomWithPlayers | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { data: roomData } = useQuery({
    queryKey: ['/api/rooms', roomId],
    refetchInterval: 2000,
  });

  const { sendMessage, isConnected } = useWebSocket('/ws', {
    onMessage: (message) => {
      switch (message.type) {
        case 'room_update':
          if (message.data.id === roomId) {
            setRoom(message.data);
          }
          break;
        case 'player_joined':
          toast({
            title: "플레이어 입장",
            description: `${message.data.nickname}님이 입장했습니다.`,
          });
          break;
        case 'player_left':
          toast({
            title: "플레이어 퇴장",
            description: `${message.data.nickname}님이 퇴장했습니다.`,
          });
          break;
        case 'game_start':
          toast({
            title: "게임 시작",
            description: "게임이 시작됩니다!",
          });
          navigate(`/game/${roomId}`);
          break;
      }
    },
    onOpen: () => {
      if (currentUser) {
        sendMessage({
          type: 'associate_user',
          data: { userId: currentUser.id }
        });
      }
    },
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate('/');
      return;
    }
    setCurrentUser(user);
  }, [navigate]);

  useEffect(() => {
    if (roomData) {
      const roomWithPlayers = roomData as RoomWithPlayers;
      setRoom(roomWithPlayers);
      // Check if current user is ready
      if (currentUser) {
        const currentPlayer = roomWithPlayers.players.find(p => p.userId === currentUser.id);
        setIsReady(currentPlayer?.isReady || false);
      }
    }
  }, [roomData, currentUser]);

  // 방에 입장할 때 WebSocket에 방 정보 전송 (한 번만)
  useEffect(() => {
    if (isConnected && currentUser && roomId) {
      sendMessage({
        type: 'room_update',
        roomId: roomId,
        data: { roomId: roomId }
      });
    }
  }, [isConnected, currentUser, roomId]);

  const handleLeaveRoom = async () => {
    if (!currentUser || !room) return;

    try {
      const response = await apiRequest('POST', `/api/rooms/${roomId}/leave`, { 
        userId: currentUser.id 
      });
      
      const result = await response.json();
      if (result.roomDeleted) {
        toast({
          title: "방 삭제됨",
          description: "방장이 나가서 방이 삭제되었습니다.",
        });
      }
      
      navigate('/');
    } catch (error) {
      toast({
        title: "오류",
        description: "방을 나가는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleToggleReady = async () => {
    if (!currentUser || !room) return;

    try {
      await apiRequest('POST', `/api/rooms/${roomId}/ready`, {
        userId: currentUser.id,
        isReady: !isReady,
      });
      setIsReady(!isReady);
    } catch (error) {
      toast({
        title: "오류",
        description: "준비 상태를 변경할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleStartGame = async () => {
    if (!currentUser || !room) {
      return;
    }

    // 최소 2명 이상의 플레이어가 필요
    if (room.players.length < 2) {
      toast({
        title: "게임 시작 불가",
        description: "최소 2명의 플레이어가 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    // 모든 플레이어가 준비되었는지 확인
    const allReady = room.players.every(p => p.isReady);
    if (!allReady) {
      toast({
        title: "게임 시작 불가",
        description: "모든 플레이어가 준비되어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest('POST', `/api/rooms/${roomId}/start-game`, {
        userId: currentUser.id
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "게임을 시작할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!currentUser || !room || room.hostId !== currentUser.id) return;

    try {
      await apiRequest('POST', `/api/rooms/${roomId}/leave`, { 
        userId: playerId 
      });
      toast({
        title: "플레이어 강퇴",
        description: "플레이어가 강퇴되었습니다.",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "플레이어를 강퇴할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">방 ID가 없습니다.</div>
      </div>
    );
  }

  if (!currentUser || !room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">방 정보를 불러오는 중...</div>
      </div>
    );
  }

  const isHost = room.hostId === currentUser.id;
  const readyCount = room.players.filter(p => p.isReady).length;
  const canStartGame = isHost && readyCount >= 2 && room.players.length >= 2;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <WaitingRoomHeader
        room={room}
        currentUser={currentUser}
        isConnected={isConnected}
        isHost={isHost}
        isReady={isReady}
        canStartGame={canStartGame}
        readyCount={readyCount}
        onLeaveRoom={handleLeaveRoom}
        onStartGame={handleStartGame}
        onToggleReady={handleToggleReady}
      />

      <div className="p-6 h-[calc(100vh-80px)] flex flex-col">
        <PlayersList
          room={room}
          currentUser={currentUser}
          isHost={isHost}
          onKickPlayer={handleKickPlayer}
        />


      </div>
    </div>
  );
}
