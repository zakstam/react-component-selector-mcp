import { z } from 'zod';
import { SelectionDataSchema } from './schemas.js';

/**
 * WebSocket message types for browser <-> CLI communication
 */

// Message type enum
export const MessageTypeSchema = z.enum([
  'selection',
  'ping',
  'pong',
  'connect',
  'disconnect',
  'error',
  'selectionMode',
]);

export type MessageType = z.infer<typeof MessageTypeSchema>;

// Base message structure
const BaseMessageSchema = z.object({
  type: MessageTypeSchema,
  timestamp: z.number(),
});

// Selection message - browser -> CLI
export const SelectionMessageSchema = BaseMessageSchema.extend({
  type: z.literal('selection'),
  payload: SelectionDataSchema,
});

// Ping/Pong for keepalive
export const PingMessageSchema = BaseMessageSchema.extend({
  type: z.literal('ping'),
});

export const PongMessageSchema = BaseMessageSchema.extend({
  type: z.literal('pong'),
});

// Connection status messages
export const ConnectMessageSchema = BaseMessageSchema.extend({
  type: z.literal('connect'),
  payload: z.object({
    clientId: z.string(),
    userAgent: z.string().optional(),
  }),
});

export const DisconnectMessageSchema = BaseMessageSchema.extend({
  type: z.literal('disconnect'),
  payload: z.object({
    clientId: z.string(),
    reason: z.string().optional(),
  }),
});

// Error message
export const ErrorMessageSchema = BaseMessageSchema.extend({
  type: z.literal('error'),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// Selection mode toggle - CLI -> browser
export const SelectionModeMessageSchema = BaseMessageSchema.extend({
  type: z.literal('selectionMode'),
  payload: z.object({
    enabled: z.boolean(),
    message: z.string().optional(),
  }),
});

// Union of all message types
export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  SelectionMessageSchema,
  PingMessageSchema,
  PongMessageSchema,
  ConnectMessageSchema,
  DisconnectMessageSchema,
  ErrorMessageSchema,
  SelectionModeMessageSchema,
]);

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type SelectionMessage = z.infer<typeof SelectionMessageSchema>;
export type PingMessage = z.infer<typeof PingMessageSchema>;
export type PongMessage = z.infer<typeof PongMessageSchema>;
export type ConnectMessage = z.infer<typeof ConnectMessageSchema>;
export type DisconnectMessage = z.infer<typeof DisconnectMessageSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
export type SelectionModeMessage = z.infer<typeof SelectionModeMessageSchema>;

// Helper to create messages with overloads for type safety
export function createMessage(type: 'ping'): PingMessage;
export function createMessage(type: 'pong'): PongMessage;
export function createMessage(type: 'selection', payload: SelectionMessage['payload']): SelectionMessage;
export function createMessage(type: 'connect', payload: ConnectMessage['payload']): ConnectMessage;
export function createMessage(type: 'disconnect', payload: DisconnectMessage['payload']): DisconnectMessage;
export function createMessage(type: 'error', payload: ErrorMessage['payload']): ErrorMessage;
export function createMessage(type: 'selectionMode', payload: SelectionModeMessage['payload']): SelectionModeMessage;
export function createMessage(type: MessageType, payload?: unknown): WebSocketMessage {
  const base = { type, timestamp: Date.now() };
  if (payload !== undefined) {
    return { ...base, payload } as WebSocketMessage;
  }
  return base as WebSocketMessage;
}
