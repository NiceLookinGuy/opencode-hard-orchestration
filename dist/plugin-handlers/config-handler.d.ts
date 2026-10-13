/**
 * Plugin Handlers - Config Handler
 *
 * Registers the Commander agent and unblocks the native subagent types.
 */
import type { Config } from "@opencode-ai/plugin";
type UnknownRecord = Record<string, unknown>;
export declare const COMMANDER_DEFAULT_PERMISSION: {
    readonly "*": "deny";
    readonly task: "allow";
    readonly question: "allow";
};
export declare const NATIVE_SUBAGENT_TYPES: readonly ["explore", "general", "scout"];
export declare const NATIVE_DEMOTED_TYPES: readonly ["plan", "build"];
/**
 * Create config handler for OpenCode
 */
export declare function createConfigHandler(): (config: Config & UnknownRecord) => Promise<void>;
export {};
