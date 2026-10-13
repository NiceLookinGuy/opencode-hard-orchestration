/**
 * OpenCode Hard Orchestration Plugin
 *
 * Entry point for the hard-orchestration core: the Commander-only agent
 * registration with its permission hard gate, plus the two safety guards
 * (oversized message truncation and stray thinking-tag cleanup).
 */

import type { Plugin } from "@opencode-ai/plugin";
import { setupV2 } from "./v2/setup.js";
import { createConfigHandler } from "./plugin-handlers/config-handler.js";
import { createMessagesGuardHandler } from "./plugin-handlers/messages-guard-handler.js";
import { createTextCompleteHandler } from "./plugin-handlers/text-complete-handler.js";

const HardOrchestrationServerPlugin: Plugin = async (_input, options) => {
    const customRendering = typeof options?.customRendering === "boolean" ? options.customRendering : true;

    return {
        config: createConfigHandler(),
        "experimental.chat.messages.transform": createMessagesGuardHandler(),
        "experimental.text.complete": createTextCompleteHandler(customRendering),
    };
};

// NOTE: Do NOT export functions from main index.ts!
// OpenCode treats ALL exports as plugin instances and calls them.
// Only default export the plugin.
const HardOrchestrationPlugin = {
    id: "opencode-hard-orchestration",
    server: HardOrchestrationServerPlugin,
    setup: setupV2,
};

export default HardOrchestrationPlugin;
