import { describe, expect, it } from "vitest";
import OrchestratorPlugin from "../../src/index.js";

const THINKING_CLOSER = "  </assistant-thinking></think>\n";
const CASES = [false, true, undefined];

describe("custom rendering option at host boundaries (issue #52)", () => {
    it.each(CASES)("honors %s in the OpenCode 1 text hook", async customRendering => {
        const instance = await OrchestratorPlugin.server(
            {} as Parameters<typeof OrchestratorPlugin.server>[0], { customRendering },
        );
        const text = { text: THINKING_CLOSER };
        await instance["experimental.text.complete"]!(
            { sessionID: "rendering-session", messageID: "m1", partID: "p1" }, text,
        );
        expect(text.text).toBe(customRendering === false ? THINKING_CLOSER : "");
    });
});
