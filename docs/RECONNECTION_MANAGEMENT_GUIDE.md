# 재연결 관리 로직 가이드

이 문서는 게임 로비 시스템의 재연결 관리 로직을 담당하는 각 파일들의 역할과 주요 함수들을 정리합니다.

## 📁 파일 구조 및 역할

### 1. 서버 측 재연결 관리

#### `server/routes.ts`
**역할**: WebSocket 연결 관리 및 재연결 감지 처리

**주요 함수들**:
- `handleWebSocketMessage()`: WebSocket 메시지 처리
  - `associate_user` 케이스: 사용자 연결 시 재연결 감지
  - 게임 중인 방에서 연결 해제된 플레이어 재연결 처리
- `handleUserDisconnect()`: 사용자 연결 해제 처리
  - 게임 진행 중인 경우 게임 핸들러에 연결 해제 알림
- `broadcastToRoom()`: 방 내 모든 클라이언트에게 메시지 브로드캐스트

**재연결 처리 흐름**:
1. 클라이언트가 `associate_user` 메시지 전송
2. 서버에서 해당 사용자가 게임 중인 방에 있는지 확인
3. 연결 해제된 상태라면 게임 핸들러의 `handlePlayerReconnect` 호출
4. 방 상태 업데이트 브로드캐스트

#### `shared/games/base/handlers/base-game-handler.ts`
**역할**: 모든 게임의 공통 재연결 관리 로직

**주요 함수들**:
- `handlePlayerDisconnect(roomId, playerId)`: 플레이어 연결 해제 처리
  - 게임 상태 유효성 검사
  - `disconnectedPlayers` 배열에 플레이어 추가
  - 게임별 특수 처리 (`onPlayerDisconnect`) 호출
  - 클라이언트들에게 상태 업데이트 브로드캐스트

- `handlePlayerReconnect(roomId, playerId)`: 플레이어 재연결 처리
  - 게임 상태 유효성 검사
  - `disconnectedPlayers` 배열에서 플레이어 제거
  - 게임별 특수 처리 (`onPlayerReconnect`) 호출
  - 클라이언트들에게 상태 업데이트 브로드캐스트

- `onPlayerDisconnect()`: 게임별 연결 해제 처리 (오버라이드 가능)
- `onPlayerReconnect()`: 게임별 재연결 처리 (오버라이드 가능)

**상태 관리**:
- `disconnectedPlayers`: 연결 해제된 플레이어 ID 배열
- `lastUpdated`: 마지막 업데이트 시간

### 2. 클라이언트 측 재연결 관리

#### `client/src/hooks/use-websocket.tsx`
**역할**: WebSocket 연결 관리 및 자동 재연결

**주요 함수들**:
- `useWebSocket()`: WebSocket 훅
  - 자동 재연결 로직
  - 연결 상태 관리
  - 메시지 전송/수신

**재연결 설정**:
- `reconnect`: 재연결 활성화/비활성화 (기본: true)
- `reconnectInterval`: 재연결 간격 (기본: 3000ms)
- `maxReconnectAttempts`: 최대 재연결 시도 횟수 (기본: 5회)

**주요 기능**:
- 연결 해제 시 자동 재연결 시도
- 정상 종료(코드 1000) 시에는 재연결하지 않음
- 재연결 시도 횟수 제한
- 연결 상태 실시간 업데이트

#### `client/src/pages/game-play.tsx`
**역할**: 게임 페이지에서의 재연결 처리

**주요 함수들**:
- WebSocket 메시지 핸들러:
  - `game_state`: 게임 상태 업데이트
  - `game_update`: 게임 상태 업데이트
  - `player_left`: 플레이어 나가기 처리
  - `player_reconnected`: 플레이어 재연결 처리

- `onOpen` 콜백:
  - 사용자 연결 시 `associate_user` 메시지 전송
  - 재연결 시 방 정보 업데이트 요청

**재연결 처리**:
- 페이지 로드 시 사용자 연결 확인
- 게임 상태 실시간 업데이트
- 연결 해제된 플레이어 상태 표시

## 🔄 재연결 처리 흐름

### 1. 연결 해제 시
```
클라이언트 연결 해제
    ↓
서버에서 handleUserDisconnect 호출
    ↓
게임 핸들러의 handlePlayerDisconnect 호출
    ↓
disconnectedPlayers 배열에 플레이어 추가
    ↓
클라이언트들에게 상태 업데이트 브로드캐스트
```

### 2. 재연결 시
```
클라이언트 재연결
    ↓
associate_user 메시지 전송
    ↓
서버에서 재연결 감지
    ↓
게임 핸들러의 handlePlayerReconnect 호출
    ↓
disconnectedPlayers 배열에서 플레이어 제거
    ↓
클라이언트들에게 상태 업데이트 브로드캐스트
```

## 🎮 게임별 특수 처리

각 게임은 `BaseGameHandler`를 상속받아 다음 메서드들을 오버라이드할 수 있습니다:

- `onPlayerDisconnect()`: 게임별 연결 해제 처리
- `onPlayerReconnect()`: 게임별 재연결 처리

예시:
```typescript
// 틱택토 게임의 경우
protected async onPlayerReconnect(gameState: TicTacToeGameState, playerId: string): Promise<void> {
  // 재연결된 플레이어의 턴 복원 로직
  if (gameState.currentPlayer === playerId) {
    // 턴 복원 처리
  }
}
```

## 📊 상태 관리

### 서버 측 상태
- `disconnectedPlayers`: 연결 해제된 플레이어 ID 배열
- `lastUpdated`: 마지막 업데이트 시간
- `gameState`: 전체 게임 상태

### 클라이언트 측 상태
- `isConnected`: WebSocket 연결 상태
- `reconnectAttempts`: 재연결 시도 횟수
- `gameState`: 현재 게임 상태

## 🔧 설정 옵션

### WebSocket 재연결 설정
```typescript
const { sendMessage, isConnected } = useWebSocket('/ws', {
  reconnect: true,              // 재연결 활성화
  reconnectInterval: 3000,      // 재연결 간격 (ms)
  maxReconnectAttempts: 5,      // 최대 재연결 시도 횟수
  onMessage: handleMessage,     // 메시지 처리 함수
  onOpen: handleOpen,          // 연결 성공 시 처리
  onClose: handleClose,        // 연결 해제 시 처리
  onError: handleError         // 오류 시 처리
});
```

## 🚨 주의사항

1. **게임 상태 일관성**: 재연결 시 게임 상태가 올바르게 복원되는지 확인
2. **중복 처리 방지**: 같은 플레이어의 중복 재연결 처리 방지
3. **타임아웃 처리**: 재연결 시도 횟수 제한으로 무한 루프 방지
4. **메모리 누수 방지**: WebSocket 연결 정리 및 이벤트 리스너 제거

## 📝 로그 확인

재연결 처리 과정은 상세한 로그를 통해 추적할 수 있습니다:

- `🔍`: 재연결 감지 및 처리 시작
- `✅`: 성공적인 처리 완료
- `❌`: 오류 발생
- `⚠️`: 주의사항 (중복 처리 등)
- `📢`: 브로드캐스트 전송
- `🔄`: 재연결 시도

이 구조를 통해 게임 중 네트워크 연결이 끊어져도 플레이어가 안전하게 재연결할 수 있으며, 게임 상태가 올바르게 복원됩니다.
