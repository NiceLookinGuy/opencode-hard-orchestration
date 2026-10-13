import { describe, it, expect } from "vitest";
import OrchestratorPlugin from "../../src/index.js";

describe("HardOrchestrationPlugin Entry Point", () => {
    it("exports one hybrid module for OpenCode 1 and OpenCode 2", () => {
        expect(OrchestratorPlugin.id).toBe("opencode-hard-orchestration");
        expect(typeof OrchestratorPlugin.server).toBe("function");
        expect(typeof OrchestratorPlugin.setup).toBe("function");
    });

    it("initializes the plugin with only the hard-orchestration hooks", async () => {
        const pluginInstance = await OrchestratorPlugin.server(
            {} as Parameters<typeof OrchestratorPlugin.server>[0],
            {},
        );

        expect(Object.keys(pluginInstance).sort()).toEqual([
            "config",
            "experimental.chat.messages.transform",
            "experimental.text.complete",
        ]);
        expect(typeof pluginInstance.config).toBe("function");
        expect(typeof pluginInstance["experimental.chat.messages.transform"]).toBe("function");
        expect(typeof pluginInstance["experimental.text.complete"]).toBe("function");
    });

    it("removes only a standalone model thinking closer from completed text", async () => {
        const pluginInstance = await OrchestratorPlugin.server(
            {} as Parameters<typeof OrchestratorPlugin.server>[0],
            {},
        );
        const hook = pluginInstance["experimental.text.complete"];
        expect(typeof hook).toBe("function");
        const input = { sessionID: "session-1", messageID: "message-1", partID: "part-1" };
        const cases = [
            { text: "</assistant-thinking></think>", expected: "" },
            { text: "  </assistant-thinking></think>\r\n", expected: "" },
            { text: "</assistant-thinking></think>\nAnswer", expected: "</assistant-thinking></think>\nAnswer" },
            { text: "Answer </assistant-thinking></think>", expected: "Answer </assistant-thinking></think>" },
            { text: "```xml\n</assistant-thinking></think>\n```", expected: "```xml\n</assistant-thinking></think>\n```" },
            { text: "</think>\nAnswer", expected: "</think>\nAnswer" },
        ];
        for (const { text, expected } of cases) {
            const output = { text };
            await hook?.(input, output);
            expect(output.text).toBe(expected);
        }
    });

    it("installs the Commander gate and default through the config hook", async () => {
        const pluginInstance = await OrchestratorPlugin.server(
            {} as Parameters<typeof OrchestratorPlugin.server>[0],
            {},
        );
        const config = {};

        await pluginInstance.config?.(config as Parameters<NonNullable<typeof pluginInstance.config>>[0]);

        expect((config as { default_agent?: string }).default_agent).toBe("Commander");
        expect((config as { agent?: Record<string, unknown> }).agent?.Commander).toMatchObject({
            mode: "primary",
            permission: { "*": "deny", task: "allow", question: "allow" },
        });
        expect((config as { command?: unknown }).command).toBeUndefined();
    });
});
