/**
 * Opcodes
 * 0 : Event fired
 */
export type opCodes = 0;
/**
 * Event Names
 * MESSAGE_CREATED : When a new message was made
 */
export type eventNames = "MESSAGE_CREATED";

export interface Message {
	op: opCodes;
	event: eventNames;
	// TODO: This probably isnt best way to deal with data 
	data: any;
}

export interface ChatMessage {
	content: string;
}
