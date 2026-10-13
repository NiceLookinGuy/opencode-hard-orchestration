import type { Plugin } from "@opencode/plugin";
import { AGENTS } from "../agents/definitions.js";
import { AGENT_NAMES } from "../shared/agent/index.js";
import { NATIVE_DEMOTED_TYPES, NATIVE_SUBAGENT_TYPES } from "../plugin-handlers/config-handler.js";

export function registerV2Agents(context: Plugin.Context) {
    return context.agent.transform(editor => {
        for (const [name, definition] of Object.entries(AGENTS)) {
            editor.update(name, agent => {
                const primary = name === AGENT_NAMES.COMMANDER;
                agent.description = definition.description;
                agent.system = definition.systemPrompt;
                agent.mode = primary ? "primary" : "subagent";
                agent.hidden = !primary;
            });
        }
        // V2 transforms cannot create agents, so absent native types are skipped.
        for (const name of NATIVE_SUBAGENT_TYPES) {
            if (!editor.get(name)) continue;
            editor.update(name, agent => { agent.hidden = false; });
        }
        for (const name of NATIVE_DEMOTED_TYPES) {
            if (!editor.get(name)) continue;
            editor.update(name, agent => {
                agent.hidden = false;
                agent.mode = "subagent";
            });
        }
        editor.default(AGENT_NAMES.COMMANDER);
    });
}
