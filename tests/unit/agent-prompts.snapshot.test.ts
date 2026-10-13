import { describe, expect, it } from "vitest";
import { AGENTS } from "../../src/agents/definitions.js";
import { AGENT_NAMES } from "../../src/shared/agent/index.js";

/**
 * Prompt drift guard.
 *
 * These snapshots lock the fully-composed system prompt of every generated agent.
 * They ensure edits to the Commander prompt cannot silently change what the
 * agent is told. If a change to prompt wording is intentional, update the
 * snapshot in the same commit.
 */
describe("agent system prompts (drift guard)", () => {
    const names = [
        AGENT_NAMES.COMMANDER,
    ];

    for (const name of names) {
        it(`${name} composed system prompt is stable`, () => {
            const agent = AGENTS[name];
            expect(agent).toBeDefined();
            expect(agent.systemPrompt).toMatchSnapshot();
        });
    }

    it("every agent exposes the expected definition shape", () => {
        for (const name of names) {
            const agent = AGENTS[name];
            expect(agent.id).toBe(name);
            expect(typeof agent.systemPrompt).toBe("string");
            expect(agent.systemPrompt.length).toBeGreaterThan(200);
        }
    });

    it("does not impose an arbitrary line cap on shared project context", () => {
        for (const name of names) {
            expect(AGENTS[name].systemPrompt).not.toMatch(/context\.md[^\n]*<\s*150\s+lines/i);
        }
    });
});
