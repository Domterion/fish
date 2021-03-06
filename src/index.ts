import "dotenv/config";

import { Server } from "./server";

const server = Server.getInstance();

server.startServer();

console.log(
	`Fish started at\nš ws://localhost:${process.env.PORT}\nš http://localhost:${process.env.PORT}`
);
