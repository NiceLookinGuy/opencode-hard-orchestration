/**
 * Plugin Handlers - Config Handler
 *
 * Registers the Commander agent and unblocks the native agent types.
 */

import type { Config } from "@opencode-ai/plugin";
import { AGENTS } from "../agents/definitions.js";
import { AGENT_NAMES } from "../shared/agent/index.js";
import { isRecord } from "../shared/core/guards.js";

type UnknownRecord = Record<string, unknown>;
type PermissionAction = "ask" | "allow" | "deny";
type AgentConfig = UnknownRecord & {
    mode?: "subagent" | "primary" | "all" | string;
    hidden?: boolean;
    permission?: unknown;
};
type MutableConfig = Omit<Config, "agent" | "permission" | "default_agent"> & UnknownRecord & {
    agent?: Record<string, AgentConfig>;
    default_agent?: string;
    permission?: unknown;
};

export const COMMANDER_DEFAULT_PERMISSION = {
    "*": "deny",
    task: "allow",
    question: "allow",
} as const;

export const NATIVE_SUBAGENT_TYPES = ["explore", "general", "scout"] as const;

/**
 * Native types set to mode "all": selectable primary agents that are also
 * valid delegation targets, unlike NATIVE_SUBAGENT_TYPES which stay
 * delegate-only.
 */
export const NATIVE_BIDIRECTIONAL_TYPES = ["plan", "build"] as const;

function isPermissionAction(value: unknown): value is PermissionAction {
    return value === "ask" || value === "allow" || value === "deny";
}

function mergePermission(globalPermission: unknown, agentPermission: unknown): unknown {
    if (agentPermission === undefined) {
        return globalPermission;
    }

    if (isRecord(globalPermission) && isRecord(agentPermission)) {
        return { ...globalPermission, ...agentPermission };
    }

    if (isPermissionAction(globalPermission) && isRecord(agentPermission)) {
        return { "*": globalPermission, ...agentPermission };
    }

    return agentPermission;
}

function defineAgent(
    existing: AgentConfig | undefined,
    defaults: AgentConfig,
    globalPermission: unknown,
): AgentConfig {
    // Precedence: registration defaults (lowest) < global permission < agent-specific.
    const permission = mergePermission(mergePermission(defaults.permission, globalPermission), existing?.permission);
    const agent = {
        ...defaults,
        ...existing,
    };

    if (permission !== undefined) {
        agent.permission = permission;
    }

    return agent;
}

function agentPrompt(name: string): string {
    return AGENTS[name]?.systemPrompt || "";
}

/** Commander (primary), the delegate-only hard-orchestration agent. */
function orchestratorAgentDefaults(): Record<string, AgentConfig> {
    return {
        [AGENT_NAMES.COMMANDER]: {
            description: "Autonomous orchestrator - executes until mission complete",
            mode: "primary",
            prompt: agentPrompt(AGENT_NAMES.COMMANDER),
            permission: COMMANDER_DEFAULT_PERMISSION,
            color: "#ffea98",
        },
    };
}

/**
 * Native OpenCode agent types the orchestrator makes usable: the discovery
 * subagents are unhidden, and plan/build become bidirectional agents
 * (mode "all") so they stay selectable in the TUI agent switcher and remain
 * delegation targets for Commander. Missing plan/build entries are created;
 * v1 config may create agents, v2 may not.
 */
function unblockNativeSubagentTypes(
    existingAgents: Record<string, AgentConfig>,
): Record<string, AgentConfig> {
    const agents: Record<string, AgentConfig> = { ...existingAgents };
    for (const name of [...NATIVE_SUBAGENT_TYPES, ...NATIVE_BIDIRECTIONAL_TYPES]) {
        const agent = agents[name];
        if (agent === undefined) continue;
        const cleaned = { ...agent };
        if (cleaned.hidden === true) delete cleaned.hidden;
        if (cleaned.disable === true) delete cleaned.disable;
        agents[name] = cleaned;
    }
    for (const name of NATIVE_BIDIRECTIONAL_TYPES) {
        agents[name] = { ...(agents[name] ?? {}), mode: "all" };
    }
    return agents;
}

function orchestratorAgents(
    existingAgents: Record<string, AgentConfig>,
    globalPermission: unknown,
): Record<string, AgentConfig> {
    const agents: Record<string, AgentConfig> = {};
    for (const [name, defaults] of Object.entries(orchestratorAgentDefaults())) {
        agents[name] = defineAgent(existingAgents[name], defaults, globalPermission);
    }
    return agents;
}

/**
 * Create config handler for OpenCode
 */
export function createConfigHandler() {
    return async (config: Config & UnknownRecord) => {
        const mutableConfig = config as MutableConfig;

        const existingAgents = mutableConfig.agent ?? {};
        const globalPermission = mutableConfig.permission;
        const processedAgents = unblockNativeSubagentTypes(existingAgents);

        mutableConfig.agent = { ...processedAgents, ...orchestratorAgents(processedAgents, globalPermission) };
        mutableConfig.default_agent = AGENT_NAMES.COMMANDER;

        // Note: console.log removed to prevent TUI corruption
    };
}
