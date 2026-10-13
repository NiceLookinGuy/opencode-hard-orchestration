import type { Plugin } from "@opencode/plugin";
import { describe, expect, it, vi } from "vitest";
import OrchestratorPlugin from "../../src/index.js";
import { MAX_MESSAGE_PART_CHARS } from "../../src/shared/message/message-guard.js";

type EditorAgent = { id: string; description?: string; system?: string; mode: string; hidden: boolean };

function createV2Context(seededAgents: Map<string, EditorAgent> = new Map()) {
    const registrations: Array<{ dispose: ReturnType<typeof vi.fn> }> = [];
    const agents = seededAgents;
    const defaults: Array<string | undefined> = [];
    const hookNames: string[] = [];
    const toolTransform = vi.fn();
    const commandTransform = vi.fn();
    const registration = () => {
        const value = { dispose: vi.fn().mockResolvedValue(undefined) };
        registrations.push(value);
        return Promise.resolve(value);
    };
    const context = {
        location: { directory: "/tmp/oco-v2-test", project: { directory: "/tmp/oco-v2-test" } },
        options: {},
        agent: {
            list: vi.fn().mockResolvedValue([]),
            transform: vi.fn((callback: (editor: {
                get: (id: string) => EditorAgent | undefined;
                default: (id: string | undefined) => void;
                update: (id: string, edit: (agent: EditorAgent) => void) => void;
            }) => void) => {
                callback({
                    get: id => agents.get(id),
                    default: id => { defaults.push(id); },
                    update: (id, edit) => {
                        const agent = agents.get(id) ?? { id, mode: "all", hidden: false };
                        edit(agent);
                        agents.set(id, agent);
                    },
                });
                return registration();
            }),
        },
        session: {
            hook: vi.fn((name: string) => { hookNames.push(`session.${name}`); return registration(); }),
        },
        tool: { transform: toolTransform, hook: vi.fn() },
        command: { transform: commandTransform },
        event: { subscribe: () => emptyEvents() },
    } as unknown as Plugin.Context;
    return { context, agents, defaults, hookNames, registrations, toolTransform, commandTransform };
}

describe("OpenCode 2 plugin setup", () => {
    it("registers the Commander agent, the message guard, and cleanup", async () => {
        const { context, agents, defaults, hookNames, registrations, toolTransform, commandTransform } = createV2Context();

        const cleanup = await OrchestratorPlugin.setup(context);

        expect([...agents.keys()]).toEqual(["Commander"]);
        expect(defaults).toEqual(["Commander"]);
        expect(agents.get("Commander")).toMatchObject({ mode: "primary", hidden: false, system: expect.any(String) });
        expect(agents.get("Commander")?.system).toContain("COMMANDER: THINK AND DELEGATE ONLY");
        expect(agents.get("Commander")?.system).toContain("NEVER use tools other than `task` and `question`");
        expect(hookNames).toEqual(["session.context"]);
        expect(toolTransform).not.toHaveBeenCalled();
        expect(commandTransform).not.toHaveBeenCalled();
        expect(cleanup).toBeTypeOf("function");
        await cleanup?.();
        expect(registrations.every(item => item.dispose.mock.calls.length === 1)).toBe(true);
    });

    it("unblocks present native agent types and skips absent ones", async () => {
        const seeded = new Map<string, EditorAgent>([
            ["explore", { id: "explore", mode: "subagent", hidden: true }],
            ["general", { id: "general", mode: "subagent", hidden: true }],
            ["plan", { id: "plan", mode: "primary", hidden: true }],
        ]);
        const { context, agents, defaults } = createV2Context(seeded);

        await OrchestratorPlugin.setup(context);

        expect(defaults).toEqual(["Commander"]);
        expect(agents.get("explore")).toMatchObject({ mode: "subagent", hidden: false });
        expect(agents.get("general")).toMatchObject({ mode: "subagent", hidden: false });
        expect(agents.get("plan")).toMatchObject({ mode: "subagent", hidden: false });
        expect(agents.has("build")).toBe(false);
        expect(agents.has("scout")).toBe(false);
    });

    it("truncates oversized messages on the V2 context hook", async () => {
        const hooks = new Map<string, (input: unknown) => Promise<void>>();
        const registration = async () => ({ dispose: async () => {} });
        const context = {
            location: { directory: "/tmp/oco-v2-guard", project: { directory: "/tmp/oco-v2-guard" } },
            options: {},
            agent: { list: async () => [], transform: registration },
            session: { hook: async (name: string, callback: (input: unknown) => Promise<void>) => {
                hooks.set(name, callback);
                return registration();
            } },
        } as unknown as Plugin.Context;

        await OrchestratorPlugin.setup(context);

        const oversized = "a".repeat(MAX_MESSAGE_PART_CHARS * 2);
        const result = { type: "text", value: oversized };
        const request = {
            sessionID: "s1",
            agent: "Commander",
            model: { providerID: "p", id: "m" },
            system: [],
            options: {},
            messages: [{ role: "tool", content: [{ type: "tool-result", result }] }],
        };
        expect(hooks.has("context")).toBe(true);
        await hooks.get("context")!(request);
        expect(result.value).toContain("truncated by message guard");
    });

    it("disposes earlier registrations when a later setup step fails", async () => {
        const registrations: Array<{ dispose: ReturnType<typeof vi.fn> }> = [];
        const registration = () => {
            const value = { dispose: vi.fn().mockResolvedValue(undefined) };
            registrations.push(value);
            return Promise.resolve(value);
        };
        const failure = new Error("context hook rejected");
        const context = {
            location: { directory: "/tmp/oco-v2-fail", project: { directory: "/tmp/oco-v2-fail" } },
            options: {},
            agent: { list: async () => [], transform: vi.fn((callback: (editor: {
                get: (id: string) => EditorAgent | undefined;
                default: (id: string | undefined) => void;
                update: (id: string, edit: (agent: EditorAgent) => void) => void;
            }) => void) => {
                callback({
                    get: () => undefined,
                    default: () => {},
                    update: () => {},
                });
                return registration();
            }) },
            session: { hook: vi.fn().mockRejectedValue(failure) },
        } as unknown as Plugin.Context;

        await expect(OrchestratorPlugin.setup(context)).rejects.toBe(failure);
        expect(registrations).toHaveLength(1);
        expect(registrations[0].dispose).toHaveBeenCalledTimes(1);
    });
});

async function* emptyEvents(): AsyncGenerator<never> {
    return;
}
