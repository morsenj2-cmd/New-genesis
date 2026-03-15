import { useState, useEffect, useRef, useCallback } from "react";

interface CollaboratorPresence {
  userId: string;
  email: string;
  displayName: string;
  cursorX?: number;
  cursorY?: number;
  color: string;
  lastSeen: number;
}

interface UseCollaborationOptions {
  projectId: string;
  userId: string | null | undefined;
  email: string;
  displayName: string;
  enabled: boolean;
  onHtmlUpdate?: (html: string, fromUserId: string) => void;
  onSettingsUpdate?: (settingsJson: string, fromUserId: string) => void;
  onGenomeUpdate?: (genomeJson: string, layoutJson: string, fromUserId: string) => void;
}

export function useCollaboration({
  projectId,
  userId,
  email,
  displayName,
  enabled,
  onHtmlUpdate,
  onSettingsUpdate,
  onGenomeUpdate,
}: UseCollaborationOptions) {
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<CollaboratorPresence[]>([]);
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; displayName: string; color: string }>>(new Map());
  const [myColor, setMyColor] = useState("#3b82f6");
  const [myRole, setMyRole] = useState<string>("owner");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pingTimerRef = useRef<ReturnType<typeof setInterval>>();

  const connect = useCallback(() => {
    if (!enabled || !userId || !projectId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/collab?projectId=${encodeURIComponent(projectId)}&userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}&displayName=${encodeURIComponent(displayName)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "connected":
            setMyColor(msg.color);
            setMyRole(msg.role);
            setPresence(msg.presence || []);
            break;
          case "user-joined":
            setPresence(msg.presence || []);
            break;
          case "user-left":
            setPresence(msg.presence || []);
            if (msg.userId) {
              setCursors((prev) => {
                const next = new Map(prev);
                next.delete(msg.userId);
                return next;
              });
            }
            break;
          case "cursor-update":
            setCursors((prev) => {
              const next = new Map(prev);
              next.set(msg.userId, { x: msg.x, y: msg.y, displayName: msg.displayName, color: msg.color });
              return next;
            });
            break;
          case "html-update":
            onHtmlUpdate?.(msg.html, msg.userId);
            break;
          case "settings-update":
            onSettingsUpdate?.(msg.settingsJson, msg.userId);
            break;
          case "genome-update":
            onGenomeUpdate?.(msg.genomeJson, msg.layoutJson, msg.userId);
            break;
          case "pong":
            break;
        }
      } catch {}
    };

    ws.onclose = (event) => {
      setConnected(false);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (event.code !== 4010 && enabled) {
        reconnectTimerRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled, userId, projectId, email, displayName, onHtmlUpdate, onSettingsUpdate, onGenomeUpdate]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const lastCursorSendRef = useRef<number>(0);
  const sendCursorMove = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorSendRef.current < 50) return;
    lastCursorSendRef.current = now;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cursor-move", x, y }));
    }
  }, []);

  const sendHtmlUpdate = useCallback((html: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "html-update", html }));
    }
  }, []);

  const sendSettingsUpdate = useCallback((settingsJson: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "settings-update", settingsJson }));
    }
  }, []);

  const sendGenomeUpdate = useCallback((genomeJson: string, layoutJson: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "genome-update", genomeJson, layoutJson }));
    }
  }, []);

  return {
    connected,
    presence,
    cursors,
    myColor,
    myRole,
    sendCursorMove,
    sendHtmlUpdate,
    sendSettingsUpdate,
    sendGenomeUpdate,
  };
}
