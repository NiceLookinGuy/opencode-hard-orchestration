import type { AgentDefinition } from "../shared/agent/index.js";
import { SCOUT_RESEARCH_PROMPT } from "./prompts/scout-research.js";

/**
 * Lowercase id because OpenCode 2 native agent ids are lowercase and the v2
 * adapter upserts this agent under that id (see permission-gate.ts for its
 * ruleset). The v1 config path never registers it.
 */
export const scout: AgentDefinition = {
    id: "scout",
    description: "External documentation and dependency research",
    systemPrompt: SCOUT_RESEARCH_PROMPT,
};
