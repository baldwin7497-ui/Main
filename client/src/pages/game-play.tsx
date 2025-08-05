import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { getCurrentUser } from '@/lib/user-utils';
import { gameManager, type GameChoice } from '@/lib/game-manager';
import type { RoomWithPlayers, GameState, User } from '@shared/schema';
import type { NumberGuessGameState } from '@shared/games/number-guessing/schema';
import type { OddEvenGameState } from '@shared/games/odd-even/schema';
import type { TicTacToeGameState } from '@shared/games/tic-tac-toe/schema';
import type { BluffCardGameState } from '@shared/games/bluff-card/schema';
import type { ChessGameState } from '@shared/games/chess/schema';
import { NumberGuessingGame } from '@/components/game-play/number-guessing/NumberGuessingGame';
import { OddEvenGame } from '@/components/game-play/odd-even/OddEvenGame';
import { TicTacToeGame } from '@/components/game-play/tic-tac-toe/TicTacToeGame';
import { BluffCardGame } from '@/components/game-play/bluff-card/BluffCardGame';
import { ChessGame } from '@/components/game-play/chess/ChessGame';
import { GameLoading } from '@/components/game-play/common/game-loading';
import { GameHeader } from '@/components/game-play/common/game-header';
import { PlayersStatus } from '@/components/game-play/common/players-status';

interface GamePlayPageProps {
  roomId: string;
}

export default function GamePlayPage({ roomId }: GamePlayPageProps) {
  const [, setLocation] = useLocation();
  const currentUser = getCurrentUser();
  const [gameState, setGameState] = useState<GameState | null>(null);

  const [selectedChoice, setSelectedChoice] = useState<GameChoice | null>(null);
  const [moveSubmitted, setMoveSubmitted] = useState(false);

  const { data: room } = useQuery<RoomWithPlayers>({
    queryKey: ['/api/rooms', roomId],
    enabled: !!roomId,
  });

  const { data: gameData } = useQuery<GameState>({
    queryKey: ['/api/games', roomId],
    enabled: !!roomId,
  });

  const { sendMessage, isConnected } = useWebSocket('/ws', {
    onMessage: (message: any) => {
      console.log('📨 WebSocket 메시지 수신:', message.type, message.data);
      
      switch (message.type) {
        case 'game_start':
          if (message.data?.gameState) {
            setGameState(message.data.gameState);
          }
          break;
        case 'game_state':
          console.log('🔄 게임 상태 수신:', message.data);
          setGameState(message.data);
          setMoveSubmitted(false);
          break;
        case 'game_update': // 이 케이스 추가!
          console.log('🔄 게임 상태 업데이트:', message.data);
          setGameState(message.data);
          setMoveSubmitted(false);
          break;
        case 'round_result':
          setGameState(message.data);
          setSelectedChoice(null);
          setMoveSubmitted(false);
          break;
        case 'game_end':
          setGameState(message.data);
          break;
        case 'player_left':
          console.log('👤 플레이어가 나감:', message.data);
          // 게임 상태가 업데이트되면 자동으로 반영됨
          break;
        case 'player_reconnected':
          console.log('🔄 플레이어 재연결:', message.data);
          // 게임 상태가 업데이트되면 자동으로 반영됨
          break;
      }
    },
    onOpen: () => {
      if (currentUser) {
        sendMessage({
          type: 'associate_user',
          data: { userId: currentUser.id }
        });
        
        // 재연결 시 방 정보 업데이트 요청
        if (roomId) {
          sendMessage({
            type: 'room_update',
            roomId: roomId,
            data: { roomId: roomId }
          });
        }
      }
    },
    onClose: () => {
      console.log('🔌 WebSocket 연결 해제');
    },
    onError: (error) => {
      console.error('❌ WebSocket 오류:', error);
    }
  });

  useEffect(() => {
    if (!currentUser || !roomId) {
      setLocation('/');
      return;
    }
  }, [currentUser, roomId, setLocation]);

  // 게임 페이지에서 WebSocket에 방 정보 전송
  useEffect(() => {
    if (isConnected && currentUser && roomId) {
      sendMessage({
        type: 'room_update',
        roomId: roomId,
        data: { roomId: roomId }
      });
    }
  }, [isConnected, currentUser, roomId]);

  // 게임 데이터가 로드되면 게임 상태 설정
  useEffect(() => {
    if (gameData) {
      setGameState(gameData);
    }
  }, [gameData]);



  const handleChoiceSelection = (choice: GameChoice) => {
    if (moveSubmitted || !gameState || gameState.gameStatus !== 'waiting_for_moves' || !isParticipant) return;
    
    // 게임 매니저를 통해 선택지 검증
    if (!gameManager.isValidChoice(gameState.gameType, choice)) {
      console.error('Invalid choice for game type:', gameState.gameType, choice);
      return;
    }
    
    setSelectedChoice(choice);
    setMoveSubmitted(true);
    
    // 게임 매니저를 통해 메시지 생성
    const choiceMessage = gameManager.createChoiceMessage(gameState.gameType, choice);
    if (!choiceMessage) {
      console.error('Failed to create choice message for game type:', gameState.gameType);
      return;
    }

    const metadata = gameManager.getGameMetadata(gameState.gameType);
    if (!metadata) {
      console.error('No metadata found for game type:', gameState.gameType);
      return;
    }

    sendMessage({
      type: metadata.messageType as any,
      roomId: roomId!,
      userId: currentUser!.id,
      data: gameState.gameType === 'number-guessing' 
        ? { number: choice } 
        : { choice: choice }
    });
  };

  const handleLeaveGame = () => {
    setLocation('/');
  };



  const getResultText = (result: string, isCurrentUser: boolean) => {
    if (result === 'draw') return '무승부';
    if (isCurrentUser) {
      return result === 'win' ? '승리!' : '패배';
    }
    return result === 'win' ? '패배' : '승리!';
  };

  const renderGameComponent = () => {
    if (!gameState || !room) return null;

    const commonProps = {
      room,
      currentUser,
      isParticipant,
      moveSubmitted,
      onChoiceSelect: handleChoiceSelection,
      gamePlayers,
    };

    switch (gameState.gameType) {
      case 'number-guessing':
        return (
          <NumberGuessingGame
            {...commonProps}
            gameState={gameState as NumberGuessGameState}
            selectedChoice={selectedChoice as any}
          />
        );
      
      case 'odd-even':
        return (
          <OddEvenGame
            {...commonProps}
            gameState={gameState as OddEvenGameState}
            selectedChoice={selectedChoice as any}
          />
        );

      case 'tic-tac-toe':
        return (
          <TicTacToeGame
            gameState={gameState as TicTacToeGameState}
            onMoveSelect={(position) => {
              const metadata = gameManager.getGameMetadata('tic-tac-toe');
              if (metadata) {
                sendMessage({
                  type: metadata.messageType as any,
                  roomId,
                  userId: currentUser?.id,
                  data: { position }
                });
                setMoveSubmitted(true);
              }
            }}
            isParticipant={isParticipant}
            currentUser={currentUser}
            gamePlayers={gamePlayers}
          />
        );

      case 'bluff-card':
        return (
          <BluffCardGame
            gameState={gameState as BluffCardGameState}
            isParticipant={isParticipant}
            moveSubmitted={moveSubmitted}
            room={room}
            currentUser={currentUser}
            gamePlayers={gamePlayers}
            onMakeMove={(move) => {
              // 턴 기반 게임은 move를 직접 메시지로 전송
              sendMessage({
                type: move.type as any,
                roomId,
                userId: currentUser?.id,
                data: move
              });
              setMoveSubmitted(true);
            }}
            canMakeMove={!moveSubmitted && gameState.currentPlayer === currentUser?.id}
            onSendMessage={(message) => {
              sendMessage({
                ...message,
                roomId,
                userId: currentUser?.id
              });
              setMoveSubmitted(true);
            }}
          />
        );

      case 'chess':
        return (
          <ChessGame
            gameState={gameState as ChessGameState}
            onMakeMove={(move) => {
              const metadata = gameManager.getGameMetadata('chess');
              if (metadata) {
                sendMessage({
                  type: metadata.messageType as any,
                  roomId,
                  userId: currentUser?.id,
                  data: { move }
                });
                setMoveSubmitted(true);
              }
            }}
            isParticipant={isParticipant}
            currentUser={currentUser}
            gamePlayers={gamePlayers}
            canMakeMove={!moveSubmitted && gameState.currentPlayer === currentUser?.id}
          />
        );
      
      default:
        return (
          <div className="text-center p-8">
            <p className="text-white">지원하지 않는 게임 타입입니다: {(gameState as any).gameType}</p>
          </div>
        );
    }
  };

  if (!room || !gameState) {
    return (
      <GameLoading 
        room={!!room} 
        gameState={!!gameState} 
      />
    );
  }

  const gamePlayers = room.players.filter(p => gameState.playerIds.includes(p.userId));
  const isParticipant = Boolean(currentUser?.id && gameState.playerIds.includes(currentUser.id));
  
  // 라운드 기반 게임만 점수 계산
  const isRoundBased = 'playerScores' in gameState;
  const currentPlayerScore = isRoundBased && currentUser?.id ? (gameState as any).playerScores[currentUser.id] || 0 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <GameHeader 
          gameState={gameState}
          gamePlayers={gamePlayers}
          isParticipant={isParticipant}
          onLeaveGame={handleLeaveGame}
        />

        {/* Players Status - GameHeader 아래로 이동 */}
        <PlayersStatus 
          gamePlayers={gamePlayers}
          currentUser={currentUser}
          gameState={gameState}
        />

        {/* Game Content - Dynamically rendered based on game type */}
        {renderGameComponent()}
      </div>
    </div>
  );
}