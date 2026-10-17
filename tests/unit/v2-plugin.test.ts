import type { Plugin } from "@opencode/plugin";
import { describe, expect, it, vi } from "vitest";
import OrchestratorPlugin from "../../src/index.js";
import { MAX_MESSAGE_PART_CHARS } from "../../src/shared/message/message-guard.js";
import { COMMANDER_GATE, SCOUT_RULESET } from "../../src/v2/permission-gate.js";

type PermissionRule = { action: string; resource: string; effect: "allow" | "deny" | "ask" };
type EditorAgent = {
    id: string;
    description?: string;
    system?: string;
    mode: string;
    hidden: boolean;
    permissions?: PermissionRule[];
};
type ContextHookInput = {
    agent: string;
    messages: unknown[];
    tools: Record<string, { description: string; input: unknown }>;
};
type EvaluateHookInput = {
    agent?: string;
    action: string;
    effect: "allow" | "deny" | "ask";
    message?: string;
};

function createV2Context(seededAgents: Map<string, EditorAgent> = new Map()) {
    const registrations: Array<{ dispose: ReturnType<typeof vi.fn> }> = [];
    const agents = seededAgents;
    const defaults: Array<string | undefined> = [];
    const hookNames: string[] = [];
    const hooks: {
        context?: (input: ContextHookInput) => void | Promise<void>;
        evaluate?: (input: EvaluateHookInput) => void | Promise<void>;
    } = {};
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
            hook: vi.fn((name: string, callback: (input: ContextHookInput) => void) => {
                hookNames.push(`session.${name}`);
                if (name === "context") hooks.context = callback;
                return registration();
            }),
        },
        permission: {
            hook: vi.fn((name: string, callback: (input: EvaluateHookInput) => void) => {
                hookNames.push(`permission.${name}`);
                if (name === "evaluate") hooks.evaluate = callback;
                return registration();
            }),
        },
        tool: { transform: toolTransform, hook: vi.fn() },
        command: { transform: commandTransform },
        event: { subscribe: () => emptyEvents() },
    } as unknown as Plugin.Context;
    return { context, agents, defaults, hookNames, hooks, registrations, toolTransform, commandTransform };
}

describe("OpenCode 2 plugin setup", () => {
    it("registers the gated Commander, scout, the message guard, the permission hook, and cleanup", async () => {
        const { context, agents, defaults, hookNames, registrations, toolTransform, commandTransform } = createV2Context();

        const cleanup = await OrchestratorPlugin.setup(context);

        expect([...agents.keys()]).toEqual(["Commander", "scout"]);
        expect(defaults).toEqual(["Commander"]);
        expect(agents.get("Commander")).toMatchObject({ mode: "primary", hidden: false, system: expect.any(String) });
        expect(agents.get("Commander")?.system).toContain("COMMANDER: THINK AND DELEGATE ONLY");
        expect(agents.get("Commander")?.system).toContain("NEVER use tools other than `subagent` and `question`");
        expect(agents.get("Commander")?.system).toContain("subagent(agent=");
        expect(agents.get("Commander")?.system).not.toContain("subagent_type");
        expect(agents.get("Commander")?.system).not.toContain("`task`");
        expect(agents.get("Commander")?.permissions).toEqual([...COMMANDER_GATE]);
        expect(agents.get("scout")).toMatchObject({
            mode: "subagent",
            hidden: false,
            description: "External documentation and dependency research",
            system: expect.any(String),
        });
        expect(agents.get("scout")?.system).toContain("SCOUT: EXTERNAL RESEARCH ONLY");
        expect(agents.get("scout")?.permissions).toEqual([...SCOUT_RULESET]);
        expect(hookNames).toEqual(["session.context", "permission.evaluate"]);
        expect(toolTransform).not.toHaveBeenCalled();
        expect(commandTransform).not.toHaveBeenCalled();
        expect(cleanup).toBeTypeOf("function");
        await cleanup?.();
        expect(registrations).toHaveLength(3);
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
        expect(agents.get("scout")).toMatchObject({ mode: "subagent", hidden: false });
    });

    it("truncates oversized messages on the V2 context hook", async () => {
        const { context, hooks } = createV2Context();

        await OrchestratorPlugin.setup(context);

        const oversized = "a".repeat(MAX_MESSAGE_PART_CHARS * 2);
        const result = { type: "text", value: oversized };
        const request = {
            sessionID: "s1",
            agent: "explore",
            model: { providerID: "p", id: "m" },
            system: [],
            options: {},
            messages: [{ role: "tool", content: [{ type: "tool-result", result }] }],
            tools: {},
        };
        expect(hooks.context).toBeTypeOf("function");
        await hooks.context?.(request);
        expect(result.value).toContain("truncated by message guard");
    });

    it("strips Commander tools down to delegation and question, leaving other agents untouched", async () => {
        const { context, hooks } = createV2Context();

        await OrchestratorPlugin.setup(context);

        const request = {
            sessionID: "s1",
            agent: "Commander",
            model: { providerID: "p", id: "m" },
            system: [],
            options: {},
            messages: [],
            tools: {
                subagent: { description: "delegate", input: {} },
                task: { description: "delegate (alias)", input: {} },
                question: { description: "ask", input: {} },
                shell: { description: "run", input: {} },
                read: { description: "read", input: {} },
                edit: { description: "edit", input: {} },
            },
        };
        await hooks.context?.(request);
        expect(Object.keys(request.tools).sort()).toEqual(["question", "subagent", "task"]);

        const exploreRequest = { ...request, agent: "explore", tools: { shell: { description: "run", input: {} }, read: { description: "read", input: {} } } };
        await hooks.context?.(exploreRequest);
        expect(Object.keys(exploreRequest.tools).sort()).toEqual(["read", "shell"]);
    });

    it("leaves a Commander request without a delegation tool untouched", async () => {
        const { context, hooks } = createV2Context();

        await OrchestratorPlugin.setup(context);

        const request = {
            sessionID: "s1",
            agent: "Commander",
            model: { providerID: "p", id: "m" },
            system: [],
            options: {},
            messages: [],
            tools: {
                question: { description: "ask", input: {} },
                shell: { description: "run", input: {} },
            },
        };
        await hooks.context?.(request);
        expect(Object.keys(request.tools).sort()).toEqual(["question", "shell"]);
    });

    it("denies Commander actions other than subagent and question through the permission hook", async () => {
        const { context, hooks } = createV2Context();

        await OrchestratorPlugin.setup(context);

        const shell = { agent: "Commander", action: "shell", effect: "allow" as const, message: undefined as string | undefined };
        hooks.evaluate?.(shell);
        expect(shell.effect).toBe("deny");
        expect(shell.message).toBeTypeOf("string");

        const subagent = { agent: "Commander", action: "subagent", effect: "allow" as const };
        hooks.evaluate?.(subagent);
        expect(subagent.effect).toBe("allow");

        const other = { agent: "explore", action: "shell", effect: "allow" as const };
        hooks.evaluate?.(other);
        expect(other.effect).toBe("allow");
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
            permission: { hook: vi.fn() },
        } as unknown as Plugin.Context;

        await expect(OrchestratorPlugin.setup(context)).rejects.toBe(failure);
        expect(registrations).toHaveLength(1);
        expect(registrations[0].dispose).toHaveBeenCalledTimes(1);
    });

    it("disposes earlier registrations when the permission hook registration fails", async () => {
        const registrations: Array<{ dispose: ReturnType<typeof vi.fn> }> = [];
        const registration = () => {
            const value = { dispose: vi.fn().mockResolvedValue(undefined) };
            registrations.push(value);
            return Promise.resolve(value);
        };
        const failure = new Error("permission hook rejected");
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
            session: { hook: vi.fn(() => registration()) },
            permission: { hook: vi.fn().mockRejectedValue(failure) },
        } as unknown as Plugin.Context;

        await expect(OrchestratorPlugin.setup(context)).rejects.toBe(failure);
        expect(registrations).toHaveLength(2);
        expect(registrations.every(item => item.dispose.mock.calls.length === 1)).toBe(true);
    });
});

async function* emptyEvents(): AsyncGenerator<never> {
    return;
}
