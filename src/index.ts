import "dotenv/config";

import { Server } from "./server";

const server = Server.getInstance();

server.startServer();

console.log(
	`Fish started at\n🚀 ws://localhost:${process.env.PORT}\n🌐 http://localhost:${process.env.PORT}`
);
