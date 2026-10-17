import type { Plugin } from "@opencode/plugin";
import { registerV2Agents } from "./agent-adapter.js";
import { enforceCommanderGate } from "./permission-gate.js";
import { truncateOversizedMessageParts } from "../shared/message/message-guard.js";
import { AGENT_NAMES } from "../shared/agent/index.js";

type Registration = Awaited<ReturnType<Plugin.Context["agent"]["transform"]>>;

const COMMANDER_ALLOWED_TOOLS = new Set(["subagent", "task", "question"]);

export async function setupV2(contextInput: unknown): Promise<() => Promise<void>> {
    const context = contextInput as Plugin.Context;
    const registrations: Registration[] = [];
    try {
        registrations.push(await registerV2Agents(context));
        registrations.push(await registerMessageGuard(context));
        registrations.push(await context.permission.hook("evaluate", enforceCommanderGate));
    } catch (error) {
        try {
            await disposeV2(registrations);
        } catch (cleanupError) {
            throw new AggregateError([error, cleanupError], "OpenCode 2 setup and cleanup failed");
        }
        throw error;
    }
    return () => disposeV2(registrations);
}

/**
 * V2 has no text-complete hook; the message guard runs on the context hook,
 * which carries the outgoing request messages and tool list.
 */
async function registerMessageGuard(context: Plugin.Context): Promise<Registration> {
    return context.session.hook("context", input => {
        truncateOversizedMessageParts(input.messages);
        restrictCommanderTools(input);
    });
}

/**
 * Removes every tool the Commander request would offer except delegation and
 * asking the user. The permission gate already denies other tools; dropping
 * them from the request keeps the model from planning around tools it cannot
 * use. Skips requests where the host exposes no delegation tool at all, since
 * stripping there would leave the Commander unable to act.
 */
function restrictCommanderTools(input: { agent: string; tools?: Record<string, unknown> }): void {
    const tools = input.tools;
    if (input.agent !== AGENT_NAMES.COMMANDER || tools === undefined) return;
    if (!("subagent" in tools) && !("task" in tools)) return;
    for (const name of Object.keys(tools)) {
        if (!COMMANDER_ALLOWED_TOOLS.has(name)) delete tools[name];
    }
}

async function disposeV2(registrations: Registration[]): Promise<void> {
    const results = await Promise.allSettled(registrations.map(registration =>
        Promise.resolve().then(() => registration.dispose()),
    ));
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failures.length === 1) throw failures[0].reason;
    if (failures.length > 1) throw new AggregateError(failures.map(failure => failure.reason), "OpenCode 2 registration cleanup failed");
}
