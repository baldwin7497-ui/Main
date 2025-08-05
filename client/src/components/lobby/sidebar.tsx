import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowRight, UserPlus, DoorOpen, Trophy } from "lucide-react";
import type { ServerStats } from "@shared/schema";

interface SidebarProps {
  serverStats: ServerStats;
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
  onJoinByCode: () => void;
  onCreateRoom: () => void;
}

export function Sidebar({ 
  serverStats, 
  roomCode, 
  onRoomCodeChange, 
  onJoinByCode, 
  onCreateRoom 
}: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-800 border-l border-gray-700 overflow-y-auto">
      <div className="p-4">
        {/* Quick Actions - Top Priority */}
        <div className="mb-4">
          <Button
            onClick={onCreateRoom}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 mb-3"
            size="sm"
          >
            <Plus className="mr-2" size={14} />
            새 방 만들기
          </Button>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400">방 코드 입장</label>
            <div className="flex space-x-1">
              <Input
                type="text"
                placeholder="코드입력"
                value={roomCode}
                onChange={(e) => onRoomCodeChange(e.target.value.toUpperCase())}
                className="flex-1 bg-gray-700 border-gray-600 text-white focus:border-blue-500 text-sm h-8"
                maxLength={6}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onJoinByCode();
                  }
                }}
              />
              <Button
                onClick={onJoinByCode}
                disabled={!roomCode.trim()}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white h-8 px-2"
              >
                <ArrowRight size={12} />
              </Button>
            </div>
          </div>
        </div>

        {/* Server Statistics - Compact */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 text-gray-300">서버 현황</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-700 rounded text-xs">
              <span className="text-gray-400">접속자</span>
              <span className="font-semibold text-green-500">{serverStats.totalPlayers}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-700 rounded text-xs">
              <span className="text-gray-400">활성방</span>
              <span className="font-semibold text-blue-500">{serverStats.activeRooms}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-700 rounded text-xs">
              <span className="text-gray-400">진행중</span>
              <span className="font-semibold text-yellow-500">{serverStats.gamesInProgress}</span>
            </div>
          </div>
        </div>

        {/* Recent Activities - Compact */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-300">최근 활동</h3>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
              <UserPlus className="text-green-500" size={12} />
              <span className="text-gray-400">새 플레이어 접속</span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
              <DoorOpen className="text-blue-500" size={12} />
              <span className="text-gray-400">새 방 생성됨</span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
              <Trophy className="text-yellow-500" size={12} />
              <span className="text-gray-400">게임 완료됨</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
} 