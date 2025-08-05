import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CreateRoomModal } from "@/components/create-room-modal";
import { Header } from "@/components/lobby/header";
import { RoomList } from "@/components/lobby/room-list";
import { Sidebar } from "@/components/lobby/sidebar";
import { useWebSocket } from "@/hooks/use-websocket";
import { getCurrentUser, ensureUserExists } from "@/lib/user-utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { RoomWithPlayers, ServerStats, User } from "@shared/schema";

export default function Lobby() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<RoomWithPlayers[]>([]);
  const [serverStats, setServerStats] = useState<ServerStats>({ 
    totalPlayers: 0, 
    activeRooms: 0, 
    gamesInProgress: 0 
  });
  const [roomCode, setRoomCode] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const { data: roomsData } = useQuery({
    queryKey: ['/api/rooms'],
    refetchInterval: 5000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 5000,
  });

  const { sendMessage } = useWebSocket('/ws', {
    onMessage: (message) => {
      switch (message.type) {
        case 'room_update':
          if (message.data.rooms) {
            setRooms(message.data.rooms);
          }
          break;
        case 'stats_update':
          setServerStats(message.data);
          break;
      }
    },
    onOpen: () => setConnectionStatus('connected'),
    onClose: () => setConnectionStatus('disconnected'),
    onError: () => setConnectionStatus('disconnected'),
  });

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const user = await ensureUserExists();
        setCurrentUser(user);
      } catch (error) {
        toast({
          title: "오류",
          description: "사용자 초기화에 실패했습니다.",
          variant: "destructive",
        });
      }
    };

    initializeUser();
  }, []); // ✅ 빈 의존성 배열 - 컴포넌트 마운트 시 한 번만 실행

  useEffect(() => {
    if (roomsData) {
      setRooms(roomsData as RoomWithPlayers[]);
    }
  }, [roomsData]);

  useEffect(() => {
    if (statsData) {
      setServerStats(statsData as ServerStats);
    }
  }, [statsData]);

  const handleJoinRoom = async (roomId: string) => {
    if (!currentUser) return;

    try {
      await apiRequest('POST', `/api/rooms/${roomId}/join`, { userId: currentUser.id });
      navigate(`/room/${roomId}`);
    } catch (error) {
      toast({
        title: "입장 실패",
        description: error instanceof Error ? error.message : "방에 입장할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleJoinByCode = async () => {
    if (!roomCode.trim() || !currentUser) return;

    try {
      const response = await fetch(`/api/rooms/code/${roomCode.toUpperCase()}`);
      if (!response.ok) {
        throw new Error('방을 찾을 수 없습니다.');
      }
      const room = await response.json();
      await handleJoinRoom(room.id);
    } catch (error) {
      toast({
        title: "입장 실패",
        description: "방 코드가 올바르지 않습니다.",
        variant: "destructive",
      });
    }
  };



  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">사용자 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <Header currentUser={currentUser} connectionStatus={connectionStatus} />
      
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-80px)]">
        <RoomList 
          rooms={rooms}
          onJoinRoom={handleJoinRoom}
          onRefresh={() => window.location.reload()}
        />
        
        <Sidebar 
          serverStats={serverStats}
          roomCode={roomCode}
          onRoomCodeChange={setRoomCode}
          onJoinByCode={handleJoinByCode}
          onCreateRoom={() => setIsCreateModalOpen(true)}
        />
      </div>

      <CreateRoomModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
