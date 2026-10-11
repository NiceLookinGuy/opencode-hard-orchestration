import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Plugin } from "@opencode/plugin";
import { describe, expect, it } from "vitest";
import OrchestratorPlugin from "../../src/index.js";

const SESSION_ID = "rendering-session";
const THINKING_CLOSER = "  </assistant-thinking></think>\n";
const CASES = [false, true, undefined];

describe("custom rendering option at host boundaries (issue #52)", () => {
    it.each(CASES)("honors %s in OpenCode 1 tool and text hooks", async customRendering => {
        const directory = mkdtempSync(path.join(tmpdir(), "oco-render-v1-"));
        const instance = await OrchestratorPlugin.server(
            { directory, client: {} } as Parameters<typeof OrchestratorPlugin.server>[0], { customRendering },
        );
        const chat = instance["chat.message"]!;
        try {
            await chat({ sessionID: SESSION_ID, agent: "Commander" }, {
                message: {}, parts: [{ type: "text", text: "/task Verify rendering" }],
            } as Parameters<typeof chat>[1]);
            const output = { title: "fixture", output: '{"ok":true}', metadata: { fixture: true } };
            await instance["tool.execute.after"]!({ sessionID: SESSION_ID, tool: "fixture", callID: "call-1", args: {} }, output);
            expect(output.output.startsWith('{"ok":true}')).toBe(true);
            expect(output.output.includes("Step 2")).toBe(customRendering !== false);
            if (customRendering === false) expect(output.output).toBe('{"ok":true}');
            expect(output.metadata).toEqual({ fixture: true });
            const text = { text: THINKING_CLOSER };
            await instance["experimental.text.complete"]!({ sessionID: SESSION_ID, messageID: "m1", partID: "p1" }, text);
            expect(text.text).toBe(customRendering === false ? THINKING_CLOSER : "");
        } finally {
            await chat({ sessionID: SESSION_ID }, { message: {}, parts: [{ type: "text", text: "/stop" }] } as Parameters<typeof chat>[1]);
            await instance.dispose?.();
            rmSync(directory, { recursive: true, force: true });
        }
    });

    it.each(CASES)("honors %s in OpenCode 2 without losing file content", async customRendering => {
        const directory = mkdtempSync(path.join(tmpdir(), "oco-render-v2-"));
        const { context, hooks } = createV2Host(directory, customRendering);
        const cleanup = await OrchestratorPlugin.setup(context);
        try {
            await hooks.get("prompt")!({ sessionID: SESSION_ID, prompt: { text: "/task Verify rendering" } });
            const result = { content: [
                { type: "text", text: '{"ok":true}' },
                { type: "file", uri: "file:///tmp/report.txt", mime: "text/plain" },
            ], metadata: { fixture: true } };
            const snapshot = structuredClone(result);
            await hooks.get("execute.after")!({
                sessionID: SESSION_ID, tool: "fixture", id: "call-1", input: {}, status: "completed", result,
            });
            expect(result.content[0].text?.includes("Step 2")).toBe(customRendering !== false);
            expect(result.content[1]).toEqual(snapshot.content[1]);
            expect(result.metadata).toEqual(snapshot.metadata);
            if (customRendering === false) expect(result).toEqual(snapshot);
        } finally {
            await hooks.get("prompt")!({ sessionID: SESSION_ID, prompt: { text: "/stop" } });
            await cleanup();
            rmSync(directory, { recursive: true, force: true });
        }
    });
});

function createV2Host(directory: string, customRendering: boolean | undefined) {
    const hooks = new Map<string, (input: unknown) => Promise<void>>();
    const registration = async () => ({ dispose: async () => {} });
    const hook = async (name: string, callback: (input: unknown) => Promise<void>) => {
        hooks.set(name, callback);
        return registration();
    };
    const context = {
        location: { directory, project: { directory } }, options: { customRendering },
        agent: { list: async () => [], transform: registration },
        session: { hook }, tool: { hook, transform: registration },
        command: { transform: registration }, event: { subscribe: async function* () {} },
    } as unknown as Plugin.Context;
    return { context, hooks };
}
