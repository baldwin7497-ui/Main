import { Card, CardContent } from '@/components/ui/card';

interface GameLoadingProps {
  room: boolean;
  gameState: boolean;
}

export function GameLoading({ room, gameState }: GameLoadingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <div className="text-lg">게임을 불러오는 중...</div>
          <div className="text-sm text-gray-400 mt-2">
            Room: {room ? '✓' : '✗'} | Game: {gameState ? '✓' : '✗'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}