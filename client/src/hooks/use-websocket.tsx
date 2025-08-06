import { useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "@shared/schema";

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectEnabledRef = useRef(reconnect);

  const connect = () => {
    // 수동 연결 시에는 재연결 활성화
    reconnectEnabledRef.current = reconnect;
    
    // 이미 연결 중이거나 연결되어 있으면 return
    if (socketRef.current?.readyState === WebSocket.CONNECTING || 
        socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔄 WebSocket 이미 연결 중이거나 연결됨');
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      
      // 개발 환경에서는 직접 Express 서버에 연결
      const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
      let wsUrl: string;
      
      if (isDevelopment) {
        // 개발 환경: Express 서버에 직접 연결 (포트 5000)
        wsUrl = `${protocol}//localhost:5000${url}`;
      } else {
        // 프로덕션 환경: 같은 호스트의 프록시 경로 사용
        wsUrl = `${protocol}//${window.location.host}${url}`;
      }
      
      console.log('🔌 WebSocket 연결 시도:', wsUrl, 'isDevelopment:', isDevelopment);
      
      // 기존 연결이 있으면 정리
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      socketRef.current = new WebSocket(wsUrl);

      // 글로벌 WebSocket 참조 설정 (게임 컴포넌트에서 사용)
      (window as any).gameWebSocket = socketRef.current;

      socketRef.current.onopen = () => {
        console.log('✅ WebSocket 연결 성공');
        setIsConnected(true);
        setReconnectAttempts(0);
        onOpen?.();
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          onMessage?.(message);
        } catch (error) {
          console.warn('⚠️ WebSocket 메시지 파싱 실패:', error);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log('🔌 WebSocket 연결 해제, code:', event.code, 'reason:', event.reason);
        setIsConnected(false);
        onClose?.();

        // 정상적인 종료(1000)가 아니고 재연결이 활성화된 경우만 재연결 시도
        if (event.code !== 1000 && reconnectEnabledRef.current && reconnectAttempts < maxReconnectAttempts) {
          console.log(`🔄 WebSocket 재연결 시도 ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ WebSocket 오류:', error);
        onError?.(error);
      };
    } catch (error) {
      console.error('❌ WebSocket 연결 실패:', error);
    }
  };

  const disconnect = (permanent = false) => {
    console.log('🔌 WebSocket 수동 연결 해제', permanent ? '(영구)' : '(임시)');
    
    // 영구 종료일 때만 재연결 비활성화
    if (permanent) {
      reconnectEnabledRef.current = false;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      // 정상 종료 코드로 연결 해제
      if (socketRef.current.readyState === WebSocket.OPEN || 
          socketRef.current.readyState === WebSocket.CONNECTING) {
        socketRef.current.close(1000, 'Manual disconnect');
      }
      socketRef.current = null;
    }
    setIsConnected(false);
    setReconnectAttempts(0);
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ WebSocket 메시지 전송 실패:', error);
      }
    } else {
      console.warn('⚠️ WebSocket이 연결되지 않아 메시지를 전송할 수 없습니다:', message);
    }
  };

  useEffect(() => {
    // 컴포넌트 mount 시 연결 활성화
    reconnectEnabledRef.current = reconnect;
    connect();

    return () => {
      // 컴포넌트 unmount 시 정리 (영구 종료)
      disconnect(true);
    };
  }, [url]); // url 변경 시에만 재연결

  // reconnect 옵션이 변경되면 ref 업데이트
  useEffect(() => {
    reconnectEnabledRef.current = reconnect;
  }, [reconnect]);

  return {
    isConnected,
    sendMessage,
    connect,
    disconnect: (permanent?: boolean) => disconnect(permanent),
    reconnectAttempts,
  };
}
