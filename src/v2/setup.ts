import type { Plugin } from "@opencode/plugin";
import { registerV2Agents } from "./agent-adapter.js";
import { truncateOversizedMessageParts } from "../shared/message/message-guard.js";

type Registration = Awaited<ReturnType<Plugin.Context["agent"]["transform"]>>;

export async function setupV2(contextInput: unknown): Promise<() => Promise<void>> {
    const context = contextInput as Plugin.Context;
    const registrations: Registration[] = [];
    try {
        registrations.push(await registerV2Agents(context));
        registrations.push(await registerMessageGuard(context));
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
 * which carries the outgoing request messages.
 */
async function registerMessageGuard(context: Plugin.Context): Promise<Registration> {
    return context.session.hook("context", input => {
        truncateOversizedMessageParts(input.messages);
    });
}

async function disposeV2(registrations: Registration[]): Promise<void> {
    const results = await Promise.allSettled(registrations.map(registration =>
        Promise.resolve().then(() => registration.dispose()),
    ));
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failures.length === 1) throw failures[0].reason;
    if (failures.length > 1) throw new AggregateError(failures.map(failure => failure.reason), "OpenCode 2 registration cleanup failed");
}
