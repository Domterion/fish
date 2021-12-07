import bodyParser from "body-parser";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import { createServer, Server as HttpServer } from "http";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { ChatMessage, Message } from "./models/message";
import { FishWebSocket } from "./models/websocket";

export class Server {
	private static server: Server;

	private http: HttpServer;
	private express: Application;
	private wss: WebSocketServer;
	/**
	 * Heartbeat
	 * The user gets the heartbeat with op 1 when they first connect
	 * The user must send a message with op 10 every heartbeat to keep the connection alive
	 * The websocket will respond with op 11 on successful heartbeat
	 */
	private HEARTBEAT = process.env.HEARTBEAT;

	/**
	 * A private constructor so you cant make new instances as this is meant to be a singleton
	 */
	private constructor() {
		this.express = express();

		this.express.use(bodyParser.urlencoded({ extended: false }));
		this.express.use(bodyParser.json());
		this.express.use(helmet());

		this.http = createServer(this.express);
		this.wss = new WebSocketServer({ server: this.http });
	}

	/**
	 * Gets the server instance or creates a new one and returns that
	 *
	 * @return {Server} Server instance
	 */
	public static getInstance(): Server {
		if (!Server.server) {
			Server.server = new Server();
		}

		return Server.server;
	}

	/**
	 * Starts the server and starts listening for websocket events and http routes
	 */
	public startServer() {
		this.express.post("/messages/new", (req, res) =>
			this.handleHttpMessage(req, res)
		);

		this.wss.on("connection", (ws: FishWebSocket, req) => {
			ws.isAlive = true;

			const payload: Message = {
				op: 1,
				data: {
					heartbeat: this.HEARTBEAT,
				},
			};
			const json = JSON.stringify(payload);

			ws.send(json);

			ws.on("message", (data) => this.handleWsMessage(ws, data));
		});

		const interval = setInterval(() => {
			this.wss.clients.forEach((ws_) => {
				const ws = ws_ as FishWebSocket;

				if (!ws.isAlive) {
					return ws.terminate();
				}

				ws.isAlive = false;
			});
		}, this.HEARTBEAT);

		this.wss.on("close", function close() {
			clearInterval(interval);
		});

		this.http.listen(process.env.PORT);
	}

	/**
	 * Called when a POST is received to /mmessages/new over http
	 *
	 * @param {Request} req The request object
	 * @param {Response} res The response object
	 */
	private handleHttpMessage(req: Request, res: Response) {
		const message: ChatMessage = req.body;

		if (!message.content) {
			return res.json({
				success: false,
				data: { message: "Missing content." },
			});
		}

		this.wss.clients.forEach((ws: WebSocket) => {
			if (ws.readyState === WebSocket.OPEN) {
				const payload: Message = {
					op: 0,
					event: "MESSAGE_CREATED",
					data: {
						content: message.content,
					},
				};

				const json = JSON.stringify(payload);

				ws.send(json);
			}
		});

		res.json({ success: true });
	}

	/**
	 * Called when a pong is received on the websocket
	 *
	 * @param {FishWebSocket} ws The websocket connection to keep alive
	 */
	private handleWsHeartbeat(ws: FishWebSocket) {
		ws.isAlive = true;

		const payload: Message = {
			op: 11,
		};

		const json = JSON.stringify(payload);

		ws.send(json);
	}

	/**
	 * Called when a message is received on the websocket
	 *
	 * @param {FishWebSocket} ws The websocket connection we got the message from
	 * @param {RawData} data The data received in the message
	 */
	private handleWsMessage(ws: FishWebSocket, data: RawData) {
		let message: Message;
		try {
			message = JSON.parse(data.toString());
		} catch {
			// TODO: More informant error handling could be nice
			const payload: Message = {
				error: 4000,
			};
			const json = JSON.stringify(payload);

			return ws.send(json);
		}

		switch (message.op) {
			case 10:
				this.handleWsHeartbeat(ws);
				break;
			default:
				const payload: Message = {
					error: 4000,
				};
				const json = JSON.stringify(payload);

				ws.send(json);
				break;
		}
	}
}
