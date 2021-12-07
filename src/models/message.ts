/**
 * Opcodes
 * 0 : Event fired
 * 1 : Acknowledges user and gives them heartbeat
 * 10 : Heartbeat
 * 11 : Acknowledges the heartbeat from socket
 */
export type opCodes = 0 | 1 | 10 | 11;

/**
 * Errorcodes
 * 4000 : Invalid payload
 */
export type errorCodes = 4000;

/**
 * Event Names
 * MESSAGE_CREATED : When a new message was made
 */
export type eventNames = "MESSAGE_CREATED";

export interface Message {
	op?: opCodes;
	error?: errorCodes;
	event?: eventNames;
	// TODO: This probably isnt best way to deal with data
	data?: any;
}

export interface ChatMessage {
	content: string;
}
