/**
 * Messages Guard Handler
 *
 * Hook: experimental.chat.messages.transform
 *
 * Truncates oversized message parts before the request reaches the model, so a
 * single huge tool result cannot push the request past the model context window
 * and break every later turn. See `message-guard.ts` for the rationale.
 */
import type { Hooks } from "@opencode-ai/plugin";
type MessagesTransformHook = NonNullable<Hooks["experimental.chat.messages.transform"]>;
export type MessagesTransformInput = Parameters<MessagesTransformHook>[0];
export type MessagesTransformOutput = Parameters<MessagesTransformHook>[1];
export declare function createMessagesGuardHandler(): (_input: MessagesTransformInput, output: MessagesTransformOutput) => Promise<void>;
export {};
