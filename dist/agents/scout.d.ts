import type { AgentDefinition } from "../shared/agent/index.js";
/**
 * Lowercase id because OpenCode 2 native agent ids are lowercase and the v2
 * adapter upserts this agent under that id (see permission-gate.ts for its
 * ruleset). The v1 config path never registers it.
 */
export declare const scout: AgentDefinition;
