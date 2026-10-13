import { AGENT_NAMES, type AgentDefinition } from "../shared/agent/index.js";
import { COMMANDER_DELEGATE_PROMPT } from "./prompts/commander-delegate.js";

export const commander: AgentDefinition = {
    id: AGENT_NAMES.COMMANDER,
    description: "Commander - owns the goal, implements, verifies, and delegates when useful",
    systemPrompt: COMMANDER_DELEGATE_PROMPT,
    canWrite: true,
    canBash: true,
};
