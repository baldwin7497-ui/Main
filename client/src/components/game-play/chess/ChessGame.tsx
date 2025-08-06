import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KickVotePanel } from '@/components/game-play/common/kick-vote-panel';
import type { 
  ChessGameState, 
  ChessMove, 
  ChessPosition,
  ChessPiece,
  ChessColor
} from '@shared/games/chess/schema';
import { CHESS_PIECE_SYMBOLS } from '@shared/games/chess/schema';

interface ChessGameProps {
  gameState: ChessGameState;
  onMakeMove: (move: ChessMove) => void;
  isParticipant: boolean;
  currentUser: any;
  gamePlayers: any[];
  canMakeMove: boolean;
  validMoves?: ChessMove[];
}

export function ChessGame({
  gameState,
  onMakeMove,
  isParticipant,
  currentUser,
  gamePlayers,
  canMakeMove,
  validMoves = []
}: ChessGameProps) {
  const [selectedPosition, setSelectedPosition] = useState<ChessPosition | null>(null);
  const [highlightedMoves, setHighlightedMoves] = useState<ChessPosition[]>([]);

  const playerColor = currentUser?.id ? gameState.playerColors[currentUser.id] : null;
  const isMyTurn = isParticipant && canMakeMove && gameState.currentPlayer === currentUser?.id;
  const currentPlayerName = gamePlayers.find(p => p.userId === gameState.currentPlayer)?.user.nickname || 'Unknown';

  const handleSquareClick = (row: number, col: number) => {
    const disconnectedPlayers = gameState.disconnectedPlayers || [];
    const hasDisconnectedPlayer = disconnectedPlayers.length > 0;
    
    if (!isMyTurn || gameState.gameStatus === 'game_finished' || hasDisconnectedPlayer) return;

    const clickedPosition: ChessPosition = { row, col };
    const piece = gameState.board[row][col];

    // 이미 선택된 말을 다시 클릭한 경우
    if (selectedPosition && selectedPosition.row === row && selectedPosition.col === col) {
      setSelectedPosition(null);
      setHighlightedMoves([]);
      return;
    }

    // 이동할 위치를 클릭한 경우
    if (selectedPosition) {
      const targetMoves = highlightedMoves.filter(pos => pos.row === row && pos.col === col);
      if (targetMoves.length > 0) {
        const move: ChessMove = {
          from: selectedPosition,
          to: clickedPosition,
          piece: gameState.board[selectedPosition.row][selectedPosition.col]!.type
        };
        onMakeMove(move);
        setSelectedPosition(null);
        setHighlightedMoves([]);
        return;
      }
    }

    // 자신의 말을 클릭한 경우
    if (piece && piece.color === playerColor) {
      setSelectedPosition(clickedPosition);
      // 해당 말의 가능한 이동을 표시
      const possibleMoves = validMoves
        .filter(move => move.from.row === row && move.from.col === col)
        .map(move => move.to);
      setHighlightedMoves(possibleMoves);
    } else {
      setSelectedPosition(null);
      setHighlightedMoves([]);
    }
  };

  const renderSquare = (row: number, col: number) => {
    const piece = gameState.board[row][col];
    const isLightSquare = (row + col) % 2 === 0;
    const isSelected = selectedPosition?.row === row && selectedPosition?.col === col;
    const isHighlighted = highlightedMoves.some(pos => pos.row === row && pos.col === col);
    const isClickable = isMyTurn && gameState.gameStatus !== 'game_finished';

    return (
      <Button
        key={`${row}-${col}`}
        variant="ghost"
        className={`
          w-12 h-12 p-0 text-2xl font-bold border-0 rounded-none
          ${isLightSquare ? 'bg-amber-100' : 'bg-amber-700'}
          ${isSelected ? 'ring-4 ring-blue-500' : ''}
          ${isHighlighted ? 'ring-2 ring-green-400' : ''}
          ${isClickable ? 'hover:brightness-110 cursor-pointer' : 'cursor-default'}
        `}
        onClick={() => handleSquareClick(row, col)}
        disabled={!isClickable}
      >
        {piece && (
          <span className={piece.color === 'white' ? 'text-white drop-shadow-md' : 'text-black'}>
            {CHESS_PIECE_SYMBOLS[piece.color][piece.type]}
          </span>
        )}
      </Button>
    );
  };

  const getGameStatusText = () => {
    // 연결 해제된 플레이어가 있는지 확인
    const disconnectedPlayers = gameState.disconnectedPlayers || [];
    const hasDisconnectedPlayer = disconnectedPlayers.length > 0;

    if (gameState.gameStatus === 'game_finished') {
      if (gameState.winners && gameState.winners.length > 0) {
        const winnerName = gamePlayers.find(p => p.userId === gameState.winners![0])?.user.nickname || 'Unknown';
        const winnerColor = gameState.playerColors[gameState.winners[0]];
        const reason = gameState.gameResult?.reason;
        const reasonText = reason === 'resign' ? ' (상대방 포기)' : '';
        return `🎉 ${winnerName} (${winnerColor === 'white' ? '백색' : '흑색'}) 승리!${reasonText}`;
      } else {
        return '🤝 무승부!';
      }
    }

    if (hasDisconnectedPlayer) {
      const disconnectedPlayerName = gamePlayers.find(p => p.userId === disconnectedPlayers[0])?.user.nickname || 'Unknown';
      return `🔌 ${disconnectedPlayerName}님이 연결 해제됨 - 재연결 대기중...`;
    }

    if (gameState.check) {
      const checkColor = gameState.check === 'white' ? '백색' : '흑색';
      return `⚠️ ${checkColor} 체크!`;
    }

    if (isMyTurn) {
      return `🎯 당신의 차례입니다 (${playerColor === 'white' ? '백색' : '흑색'})`;
    } else {
      return `⏳ ${currentPlayerName}의 차례입니다`;
    }
  };

  const getPlayerInfo = (playerId: string) => {
    const player = gamePlayers.find(p => p.userId === playerId);
    const color = gameState.playerColors[playerId];
    const isCurrentPlayer = playerId === gameState.currentPlayer;
    const isMe = playerId === currentUser?.id;
    const isDisconnected = gameState.disconnectedPlayers?.includes(playerId) || false;

    return (
      <div
        key={playerId}
        className={`p-3 rounded-lg ${
          isDisconnected 
            ? 'bg-red-100 border-2 border-red-400'
            : isCurrentPlayer && gameState.gameStatus !== 'game_finished'
            ? 'bg-blue-100 border-2 border-blue-400'
            : 'bg-slate-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 연결 상태 표시 */}
            <div 
              className={`w-3 h-3 rounded-full ${
                isDisconnected ? 'bg-red-500' : 'bg-green-500'
              }`}
              title={isDisconnected ? '연결 해제됨' : '연결됨'}
            />
            <div>
              <div className={`font-medium ${
                isDisconnected ? 'text-red-800' : 'text-slate-800'
              }`}>
                {player?.user.nickname || 'Unknown'}
                {isMe && ' (나)'}
                {isDisconnected && ' (연결 해제)'}
              </div>
              <div className={`text-sm ${
                isDisconnected ? 'text-red-600' : 'text-slate-600'
              }`}>
                {color === 'white' ? '♔ 백색' : '♚ 흑색'} 플레이어
              </div>
            </div>
          </div>
          {isCurrentPlayer && gameState.gameStatus !== 'game_finished' && !isDisconnected && (
            <div className="text-blue-600 font-bold">
              🎯 차례
            </div>
          )}
          {isDisconnected && (
            <div className="text-red-600 font-bold text-sm">
              재연결 대기중...
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCapturedPieces = (color: ChessColor) => {
    const capturedPieces: ChessPiece[] = [];
    
    // 게임 히스토리에서 잡힌 말들을 추출
    gameState.gameHistory.forEach(move => {
      const moveData = move.data as ChessMove;
      if (moveData.capturedPiece && moveData.capturedPiece.color === color) {
        capturedPieces.push(moveData.capturedPiece);
      }
    });

    if (capturedPieces.length === 0) return null;

    return (
      <div className="text-sm">
        <div className="text-slate-600 mb-1">잡힌 말:</div>
        <div className="flex flex-wrap gap-1">
          {capturedPieces.map((piece, index) => (
            <span key={index} className="text-lg">
              {CHESS_PIECE_SYMBOLS[piece.color][piece.type]}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="space-y-6">
        {/* 체스 보드 */}
        <div className="flex justify-center">
          <div className="inline-block border-4 border-amber-900 rounded-lg overflow-hidden">
            {/* 열 라벨 (상단) */}
            <div className="flex bg-amber-900">
              <div className="w-6"></div>
              {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(letter => (
                <div key={letter} className="w-12 h-6 flex items-center justify-center text-white text-sm font-medium">
                  {letter}
                </div>
              ))}
              <div className="w-6"></div>
            </div>

            {/* 체스 보드와 행 라벨 */}
            {gameState.board.map((row, rowIndex) => (
              <div key={rowIndex} className="flex">
                {/* 행 라벨 (좌측) */}
                <div className="w-6 bg-amber-900 flex items-center justify-center text-white text-sm font-medium">
                  {8 - rowIndex}
                </div>
                
                {/* 체스 말들 */}
                {row.map((_, colIndex) => renderSquare(rowIndex, colIndex))}
                
                {/* 행 라벨 (우측) */}
                <div className="w-6 bg-amber-900 flex items-center justify-center text-white text-sm font-medium">
                  {8 - rowIndex}
                </div>
              </div>
            ))}

            {/* 열 라벨 (하단) */}
            <div className="flex bg-amber-900">
              <div className="w-6"></div>
              {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(letter => (
                <div key={letter} className="w-12 h-6 flex items-center justify-center text-white text-sm font-medium">
                  {letter}
                </div>
              ))}
              <div className="w-6"></div>
            </div>
          </div>
        </div>

        {/* 선택된 말의 가능한 이동 안내 */}
        {selectedPosition && highlightedMoves.length > 0 && (
          <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              🎯 {highlightedMoves.length}개의 가능한 이동이 표시되었습니다
            </p>
          </div>
        )}

        {/* 게임 정보 */}
        <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            체스 - 턴 {gameState.turnCount}
          </h3>
          <p className="text-lg font-medium text-slate-800">
            {getGameStatusText()}
          </p>
          {gameState.gameResult?.reason && (
            <p className="text-sm text-slate-600 mt-2">
              종료 사유: {gameState.gameResult.reason}
            </p>
          )}
        </div>

        {/* 플레이어 정보 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-800">플레이어</h3>
          <div className="space-y-2">
            {gameState.playerIds.map(playerId => (
              <div key={playerId}>
                {getPlayerInfo(playerId)}
                {renderCapturedPieces(gameState.playerColors[playerId] === 'white' ? 'black' : 'white')}
              </div>
            ))}
          </div>
        </div>

        {/* 퇴출 투표 UI */}
        <KickVotePanel 
          gameState={gameState} 
          currentUser={currentUser} 
          gamePlayers={gamePlayers} 
        />

        {/* 게임 통계 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="font-medium text-slate-800">이동 수</div>
            <div className="text-lg font-bold text-slate-600">{gameState.fullMoveNumber}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="font-medium text-slate-800">50수 규칙</div>
            <div className="text-lg font-bold text-slate-600">{gameState.halfMoveClock}/100</div>
          </div>
        </div>

        {/* 최근 이동 기록 */}
        {gameState.gameHistory.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800">최근 이동</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {gameState.gameHistory.slice(-5).reverse().map((move, index) => {
                const player = gamePlayers.find(p => p.userId === move.playerId);
                const moveData = move.data as ChessMove;
                const fromNotation = `${String.fromCharCode(97 + moveData.from.col)}${8 - moveData.from.row}`;
                const toNotation = `${String.fromCharCode(97 + moveData.to.col)}${8 - moveData.to.row}`;
                
                return (
                  <div key={index} className="text-sm bg-slate-50 p-2 rounded">
                    <span className="font-medium">{player?.user.nickname}</span>
                    <span className="text-slate-600">
                      {' '}({CHESS_PIECE_SYMBOLS[gameState.playerColors[move.playerId]][moveData.piece]}) {fromNotation} → {toNotation}
                    </span>
                    {moveData.capturedPiece && (
                      <span className="text-red-600"> (잡음: {CHESS_PIECE_SYMBOLS[moveData.capturedPiece.color][moveData.capturedPiece.type]})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 게임 완료 시 */}
        {gameState.gameStatus === 'game_finished' && (
          <div className="text-center pt-4">
            <p className="text-slate-600 text-sm mb-2">
              게임이 종료되었습니다
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}