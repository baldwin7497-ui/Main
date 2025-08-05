import { Gamepad2 } from "lucide-react";
import type { User } from "@shared/schema";

interface HeaderProps {
  currentUser: User;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

export function Header({ currentUser, connectionStatus }: HeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-blue-500">
          <Gamepad2 className="inline mr-2" size={24} />
          GameHub
        </h1>
        <div className="flex items-center space-x-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            {connectionStatus === 'connected' ? '연결됨' : '연결 끊김'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-semibold">
            {currentUser.nickname.charAt(0)}
          </div>
          <span className="text-sm font-medium">{currentUser.nickname}</span>
        </div>
      </div>
    </header>
  );
}
