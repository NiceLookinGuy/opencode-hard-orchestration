/**
 * OpenCode Hard Orchestration Plugin
 *
 * Entry point for the hard-orchestration core: the Commander-only agent
 * registration with its permission hard gate, plus the two safety guards
 * (oversized message truncation and stray thinking-tag cleanup).
 */
import type { Plugin } from "@opencode-ai/plugin";
import { setupV2 } from "./v2/setup.js";
declare const HardOrchestrationPlugin: {
    id: string;
    server: Plugin;
    setup: typeof setupV2;
};
export default HardOrchestrationPlugin;
