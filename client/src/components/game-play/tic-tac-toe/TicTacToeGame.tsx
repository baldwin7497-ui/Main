import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { 
  TicTacToeGameState, 
  TicTacToePosition,
  TicTacToeCell,
  TicTacToeSymbol
} from '@shared/games/tic-tac-toe/schema';

interface TicTacToeGameProps {
  gameState: TicTacToeGameState;
  onMoveSelect: (position: TicTacToePosition) => void;
  isParticipant: boolean;
  currentUser: any;
  gamePlayers: any[];
}

export function TicTacToeGame({
  gameState,
  onMoveSelect,
  isParticipant,
  currentUser,
  gamePlayers
}: TicTacToeGameProps) {
  const currentPlayerSymbol = currentUser?.id ? gameState.playerSymbols[currentUser.id] : null;
  const isMyTurn = isParticipant && gameState.currentPlayer === currentUser?.id;
  const currentPlayerName = gamePlayers.find(p => p.userId === gameState.currentPlayer)?.user.nickname || 'Unknown';

  const handleCellClick = (row: number, col: number) => {
    if (!isMyTurn || gameState.gameStatus === 'game_finished') return;
    
    // 이미 채워진 칸인지 확인
    if (gameState.board[row][col] !== null) return;

    onMoveSelect({ row, col });
  };

  const renderCell = (cell: TicTacToeCell, row: number, col: number) => {
    const isEmpty = cell === null;
    const isClickable = isEmpty && isMyTurn && gameState.gameStatus !== 'game_finished';

    return (
      <Button
        key={`${row}-${col}`}
        variant="outline"
        className={`
          w-20 h-20 text-2xl font-bold
          ${isClickable 
            ? 'hover:bg-blue-100 cursor-pointer border-2 border-dashed border-blue-300' 
            : 'cursor-default'
          }
          ${cell === 'X' ? 'text-blue-600 bg-blue-50' : ''}
          ${cell === 'O' ? 'text-red-600 bg-red-50' : ''}
          ${isEmpty ? 'bg-slate-100' : ''}
        `}
        onClick={() => handleCellClick(row, col)}
        disabled={!isClickable}
      >
        {cell || ''}
      </Button>
    );
  };

  const getGameStatusText = () => {
    if (gameState.gameStatus === 'game_finished') {
      if (gameState.winners && gameState.winners.length > 0) {
        const winnerName = gamePlayers.find(p => p.userId === gameState.winners![0])?.user.nickname || 'Unknown';
        const winnerSymbol = gameState.playerSymbols[gameState.winners[0]];
        return `🎉 ${winnerName} (${winnerSymbol}) 승리!`;
      } else {
        return '🤝 무승부!';
      }
    }

    if (isMyTurn) {
      return `🎯 당신의 차례입니다 (${currentPlayerSymbol})`;
    } else {
      return `⏳ ${currentPlayerName}의 차례입니다`;
    }
  };

  const getPlayerInfo = (playerId: string) => {
    const player = gamePlayers.find(p => p.userId === playerId);
    const symbol = gameState.playerSymbols[playerId];
    const isCurrentPlayer = playerId === gameState.currentPlayer;
    const isMe = playerId === currentUser?.id;

    return (
      <div
        key={playerId}
        className={`p-3 rounded-lg ${
          isCurrentPlayer && gameState.gameStatus !== 'game_finished'
            ? 'bg-blue-100 border-2 border-blue-400'
            : 'bg-slate-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-slate-800">
              {player?.user.nickname || 'Unknown'}
              {isMe && ' (나)'}
            </div>
            <div className="text-sm text-slate-600">
              {symbol} 플레이어
            </div>
          </div>
          {isCurrentPlayer && gameState.gameStatus !== 'game_finished' && (
            <div className="text-blue-600 font-bold">
              🎯 차례
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="space-y-6">
        {/* 게임 보드 (최상단으로 이동) */}
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 rounded-lg">
            {gameState.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))
            )}
          </div>
        </div>

        {/* 플레이어 정보 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-800">플레이어</h3>
          <div className="space-y-2">
            {gameState.playerIds.map(playerId => getPlayerInfo(playerId))}
          </div>
        </div>

        {/* 게임 완료 시 다시 시작 버튼 */}
        {gameState.gameStatus === 'game_finished' && (
          <div className="text-center pt-4">
            <p className="text-slate-600 text-sm mb-2">
              게임이 종료되었습니다
            </p>
          </div>
        )}

        {/* 게임 정보 (하단으로 이동) */}
        <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            틱택토 - 턴 {gameState.turnCount}
          </h3>
          <p className="text-lg font-medium text-slate-800">
            {getGameStatusText()}
          </p>
        </div>

        {/* 게임 히스토리 (하단으로 이동) */}
        {gameState.gameHistory.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800">이동 기록</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {gameState.gameHistory.slice().reverse().map((move, index) => {
                const player = gamePlayers.find(p => p.userId === move.playerId);
                const symbol = gameState.playerSymbols[move.playerId];
                const position = move.data.position;
                
                return (
                  <div key={index} className="text-sm bg-slate-50 p-2 rounded">
                    <span className="font-medium">{player?.user.nickname}</span>
                    <span className="text-slate-600">
                      {' '}({symbol}) → ({position.row + 1}, {position.col + 1})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}