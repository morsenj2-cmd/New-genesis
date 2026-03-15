import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { storage } from "./storage";

interface CollaboratorPresence {
  userId: string;
  email: string;
  displayName: string;
  cursorX?: number;
  cursorY?: number;
  color: string;
  lastSeen: number;
}

interface RoomState {
  projectId: string;
  clients: Map<string, { ws: WebSocket; presence: CollaboratorPresence }>;
}

const rooms = new Map<string, RoomState>();

const CURSOR_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899",
];

function getColorForUser(projectId: string, userId: string): string {
  const room = rooms.get(projectId);
  if (!room) return CURSOR_COLORS[0];
  const existingColors = new Set<string>();
  room.clients.forEach((c) => existingColors.add(c.presence.color));
  for (const color of CURSOR_COLORS) {
    if (!existingColors.has(color)) return color;
  }
  return CURSOR_COLORS[Math.abs(hashCode(userId)) % CURSOR_COLORS.length];
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function broadcastToRoom(projectId: string, message: any, excludeUserId?: string) {
  const room = rooms.get(projectId);
  if (!room) return;
  const data = JSON.stringify(message);
  room.clients.forEach((client, uid) => {
    if (uid !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function getPresenceList(projectId: string): CollaboratorPresence[] {
  const room = rooms.get(projectId);
  if (!room) return [];
  return Array.from(room.clients.values()).map((c) => c.presence);
}

export function setupWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/collab" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const projectId = url.searchParams.get("projectId");
    const userId = url.searchParams.get("userId");
    const email = url.searchParams.get("email") || "";
    const displayName = url.searchParams.get("displayName") || email.split("@")[0];

    if (!projectId || !userId) {
      ws.close(4000, "Missing projectId or userId");
      return;
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      ws.close(4001, "Project not found");
      return;
    }

    const isOwner = project.userId === userId;
    const collabRole = await storage.getCollaboratorRole(projectId, userId);
    if (!isOwner && !collabRole) {
      ws.close(4003, "Not authorized");
      return;
    }

    const role = isOwner ? "owner" : collabRole!;

    if (!rooms.has(projectId)) {
      rooms.set(projectId, { projectId, clients: new Map() });
    }
    const room = rooms.get(projectId)!;

    if (room.clients.has(userId)) {
      const existing = room.clients.get(userId)!;
      if (existing.ws.readyState === WebSocket.OPEN) {
        existing.ws.close(4010, "Replaced by new connection");
      }
    }

    const color = getColorForUser(projectId, userId);
    const presence: CollaboratorPresence = {
      userId,
      email,
      displayName,
      color,
      lastSeen: Date.now(),
    };

    room.clients.set(userId, { ws, presence });

    ws.send(JSON.stringify({
      type: "connected",
      userId,
      role,
      color,
      presence: getPresenceList(projectId),
    }));

    broadcastToRoom(projectId, {
      type: "user-joined",
      user: presence,
      presence: getPresenceList(projectId),
    }, userId);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const client = room.clients.get(userId);
        if (!client) return;

        switch (msg.type) {
          case "cursor-move": {
            client.presence.cursorX = msg.x;
            client.presence.cursorY = msg.y;
            client.presence.lastSeen = Date.now();
            broadcastToRoom(projectId, {
              type: "cursor-update",
              userId,
              x: msg.x,
              y: msg.y,
              displayName,
              color,
            }, userId);
            break;
          }
          case "html-update": {
            if (role === "viewer") return;
            broadcastToRoom(projectId, {
              type: "html-update",
              userId,
              displayName,
              html: msg.html,
              timestamp: Date.now(),
            }, userId);
            break;
          }
          case "settings-update": {
            if (role === "viewer") return;
            broadcastToRoom(projectId, {
              type: "settings-update",
              userId,
              displayName,
              settingsJson: msg.settingsJson,
              timestamp: Date.now(),
            }, userId);
            break;
          }
          case "genome-update": {
            if (role === "viewer") return;
            broadcastToRoom(projectId, {
              type: "genome-update",
              userId,
              displayName,
              genomeJson: msg.genomeJson,
              layoutJson: msg.layoutJson,
              timestamp: Date.now(),
            }, userId);
            break;
          }
          case "ping": {
            client.presence.lastSeen = Date.now();
            ws.send(JSON.stringify({ type: "pong" }));
            break;
          }
        }
      } catch (e) {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      const current = room.clients.get(userId);
      if (current && current.ws === ws) {
        room.clients.delete(userId);
        if (room.clients.size === 0) {
          rooms.delete(projectId);
        } else {
          broadcastToRoom(projectId, {
            type: "user-left",
            userId,
            presence: getPresenceList(projectId),
          });
        }
      }
    });

    ws.on("error", () => {
      const current = room.clients.get(userId);
      if (current && current.ws === ws) {
        room.clients.delete(userId);
        if (room.clients.size === 0) {
          rooms.delete(projectId);
        }
      }
    });
  });

  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, projectId) => {
      room.clients.forEach((client, userId) => {
        if (now - client.presence.lastSeen > 120000) {
          client.ws.close(4002, "Timeout");
          room.clients.delete(userId);
        }
      });
      if (room.clients.size === 0) rooms.delete(projectId);
    });
  }, 30000);

  return wss;
}
