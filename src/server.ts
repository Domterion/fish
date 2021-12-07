import bodyParser from "body-parser";
import express, {
	Application,
	Request,
	Response,
} from "express";
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
	// The heartbeat in milliseconds
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

			ws.on("pong", () => this.handleWsPong(ws));
			ws.on("message", (data) => this.handleWsMessage(ws, data));
		});

		// TODO: This needs proper testing, no testing has been done to confirm connection termination
		const interval = setInterval(() => {
			this.wss.clients.forEach((ws_) => {
				const ws = ws_ as FishWebSocket;

				if (!ws.isAlive) {
					ws.send("terminating");
					return ws.terminate();
				}

				ws.isAlive = false;
				ws.ping();
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
		let message: ChatMessage = req.body;

		if (!message.content) {
			return res.json({
				success: false,
				data: { message: "Missing content." },
			});
		}

		this.wss.clients.forEach(function each(ws: WebSocket) {
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
	private handleWsPong(ws: FishWebSocket) {
		ws.send("thanks for the pong");
		ws.isAlive = true;
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
			const json = JSON.stringify({
				success: false,
				data: {
					message: "Invalid JSON body",
				},
			});
			return ws.send(json);
		}

		console.log(`Got message\nMessage: ${message.op}`);

		const json = JSON.stringify({
			success: true,
			data: {
				message: `Did opcode ${message.op}`,
				heartbeat: this.HEARTBEAT,
			},
		});
		return ws.send(json);
	}
}
