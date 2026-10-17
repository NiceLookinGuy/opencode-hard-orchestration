import { describe, expect, it } from "vitest";
import { COMMANDER_DELEGATE_PROMPT } from "../../src/agents/prompts/commander-delegate.js";
import { rewriteCommanderPromptForV2 } from "../../src/v2/prompt-adapter.js";

describe("Commander prompt rewrite for OpenCode 2", () => {
    const rewritten = rewriteCommanderPromptForV2(COMMANDER_DELEGATE_PROMPT);

    it("rewrites the task call to the v2 subagent call", () => {
        expect(rewritten).toContain('subagent(agent="explore"');
        expect(rewritten).not.toContain("task(subagent_type=");
    });

    it("removes every subagent_type reference", () => {
        expect(rewritten).not.toContain("subagent_type");
        expect(rewritten).toContain("`agent` — which agent runs the task");
    });

    it("replaces backtick-quoted task tool references with subagent", () => {
        expect(rewritten).toContain("ONLY use the `subagent` tool");
        expect(rewritten).toContain("NEVER use tools other than `subagent` and `question`");
        expect(rewritten).toContain("## HOW TO USE `subagent`");
        expect(rewritten).not.toContain("`task`");
    });

    it("keeps the rest of the prompt intact", () => {
        expect(rewritten).toContain("COMMANDER: THINK AND DELEGATE ONLY");
        expect(rewritten).toContain("DEEP INTERVIEW: Gather Full Context Before Acting");
        expect(rewritten).toContain("| **scout** | subagent |");
        expect(rewritten.split("\n")).toHaveLength(COMMANDER_DELEGATE_PROMPT.split("\n").length);
    });

    it("leaves the shared v1 prompt source untouched", () => {
        expect(COMMANDER_DELEGATE_PROMPT).toContain('task(subagent_type="explore"');
        expect(COMMANDER_DELEGATE_PROMPT).toContain("`task` tool");
    });

    it("is idempotent", () => {
        expect(rewriteCommanderPromptForV2(rewritten)).toBe(rewritten);
    });
});
