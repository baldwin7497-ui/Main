import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { NumberGuessGameState, NumberGuess } from '@shared/games/number-guessing/schema';
import { NUMBER_GUESSING_CONFIG } from '@shared/games/number-guessing/schema';
import type { RoomWithPlayers, User } from '@shared/schema';

interface NumberGuessingGameProps {
  gameState: NumberGuessGameState;
  room: RoomWithPlayers;
  currentUser: User | null;
  isParticipant: boolean;
  moveSubmitted: boolean;
  selectedChoice: NumberGuess | null;
  onChoiceSelect: (choice: NumberGuess) => void;
  gamePlayers: Array<{
    userId: string;
    user: {
      id: string;
      nickname: string;
      isGuest: boolean | null;
    };
  }>;
}

export function NumberGuessingGame({
  gameState,
  room,
  currentUser,
  isParticipant,
  moveSubmitted,
  selectedChoice,
  onChoiceSelect,
  gamePlayers
}: NumberGuessingGameProps) {
  
  return (
    <>
      {/* Game Controls (최상단으로 이동) */}
      {gameState.gameStatus === 'waiting_for_moves' && isParticipant && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {NUMBER_GUESSING_CONFIG.description}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {NUMBER_GUESSING_CONFIG.choices!.map((number) => (
                <Button
                  key={number}
                  variant={selectedChoice === number ? 'default' : 'outline'}
                  size="lg"
                  className="h-24 text-4xl"
                  onClick={() => onChoiceSelect(number)}
                  disabled={moveSubmitted}
                >
                  <div className="text-center">
                    <div className="text-4xl font-bold">{number}</div>
                  </div>
                </Button>
              ))}
            </div>
            {moveSubmitted && (
              <p className="text-center mt-4 text-muted-foreground">
                다른 플레이어들의 선택을 기다리는 중...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Round History (하단으로 이동) */}
      {gameState.roundHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>라운드 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gameState.roundHistory.map((round, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">라운드 {round.round}</Badge>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">
                        정답: {round.targetNumber}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {gamePlayers.map(player => {
                          const playerNumber = round.playerNumbers[player.userId];
                          const isCorrect = playerNumber === round.targetNumber;
                          const isCurrentPlayer = player.userId === currentUser?.id;
                          
                          return (
                            <div key={player.userId} className="text-center">
                              <div className="text-xs text-muted-foreground truncate max-w-16">
                                {isCurrentPlayer ? '당신' : player.user.nickname}
                              </div>
                              <span className={`text-lg font-bold ${
                                isCorrect ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {playerNumber}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {round.winners.length === 0 ? (
                      <Badge variant="secondary">무승부</Badge>
                    ) : round.winners.length === gamePlayers.length ? (
                      <Badge variant="secondary">전원 정답</Badge>
                    ) : (
                      <Badge variant={round.winners.includes(currentUser?.id || '') ? 'default' : 'destructive'}>
                        {round.winners.includes(currentUser?.id || '') ? '승리!' : '패배'}
                      </Badge>
                    )}
                    {round.winners.length > 0 && round.winners.length < gamePlayers.length && (
                      <div className="text-xs text-muted-foreground">
                        {round.winners.length}명 정답
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}