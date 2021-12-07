import { WebSocket } from "ws";

export interface FishWebSocket extends WebSocket {
	isAlive: boolean;
}
