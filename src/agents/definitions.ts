import { AGENT_NAMES } from "../shared/agent/index.js";
import type { AgentDefinition } from "../shared/agent/index.js";
import { commander } from "./commander.js";

export const AGENTS: Record<string, AgentDefinition> = {
  [AGENT_NAMES.COMMANDER]: commander,
};
