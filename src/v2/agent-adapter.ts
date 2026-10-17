import type { Plugin } from "@opencode/plugin";
import { AGENTS } from "../agents/definitions.js";
import { scout } from "../agents/scout.js";
import { AGENT_NAMES } from "../shared/agent/index.js";
import { NATIVE_BIDIRECTIONAL_TYPES, NATIVE_SUBAGENT_TYPES } from "../plugin-handlers/config-handler.js";
import { COMMANDER_GATE, SCOUT_RULESET } from "./permission-gate.js";
import { rewriteCommanderPromptForV2 } from "./prompt-adapter.js";

export function registerV2Agents(context: Plugin.Context) {
    return context.agent.transform(editor => {
        for (const [name, definition] of Object.entries(AGENTS)) {
            editor.update(name, agent => {
                const primary = name === AGENT_NAMES.COMMANDER;
                agent.description = definition.description;
                agent.system = primary ? rewriteCommanderPromptForV2(definition.systemPrompt) : definition.systemPrompt;
                agent.mode = primary ? "primary" : "subagent";
                agent.hidden = !primary;
                if (primary) agent.permissions = [...COMMANDER_GATE];
            });
        }
        // scout has no host-native definition, so it is upserted here; the
        // editor creates missing agents from the host default (Agent.Info.default).
        editor.update(scout.id, agent => {
            agent.description = scout.description;
            agent.system = scout.systemPrompt;
            agent.mode = "subagent";
            agent.hidden = false;
            agent.permissions = [...SCOUT_RULESET];
        });
        // Native types are host-owned: update only the ones this host exposes
        // so a host without them never gets a fabricated native agent.
        for (const name of NATIVE_SUBAGENT_TYPES) {
            if (!editor.get(name)) continue;
            editor.update(name, agent => { agent.hidden = false; });
        }
        for (const name of NATIVE_BIDIRECTIONAL_TYPES) {
            if (!editor.get(name)) continue;
            editor.update(name, agent => {
                agent.hidden = false;
                agent.mode = "all";
            });
        }
        editor.default(AGENT_NAMES.COMMANDER);
    });
}
