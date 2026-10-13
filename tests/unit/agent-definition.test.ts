/**
 * Agent Definition Tests
 *
 * Tests for:
 * - Agent definition structure
 * - System prompt composition
 */

import { describe, it, expect } from "vitest";

import { AGENTS } from "../../src/agents/definitions";
import { commander } from "../../src/agents/commander";
import { AGENT_NAMES } from "../../src/shared/agent";

describe("Agent Definitions", () => {
    describe("AGENTS registry", () => {
        it("should export the Commander agent", () => {
            expect(AGENTS[AGENT_NAMES.COMMANDER]).toBeDefined();
        });

        it("should have exactly 1 agent", () => {
            expect(Object.keys(AGENTS)).toHaveLength(1);
        });
    });

    describe("agent definition structure", () => {
        const agentNames = Object.keys(AGENTS);

        it("should have required fields for all agents", () => {
            for (const name of agentNames) {
                const agent = AGENTS[name];
                expect(agent.id, `Missing id for ${name}`).toBeDefined();
                expect(agent.description, `Missing description for ${name}`).toBeDefined();
                expect(agent.systemPrompt, `Missing systemPrompt for ${name}`).toBeDefined();
            }
        });

        it("should have non-empty system prompts", () => {
            for (const name of agentNames) {
                const agent = AGENTS[name];
                expect(agent.systemPrompt.length).toBeGreaterThan(100);
            }
        });

        it("should have matching id and registry key", () => {
            for (const [key, agent] of Object.entries(AGENTS)) {
                expect(agent.id).toBe(key);
            }
        });
    });

    describe("Commander agent", () => {
        it("should be the main orchestrator", () => {
            expect(commander.id).toBe(AGENT_NAMES.COMMANDER);
        });

        it("should use the delegate-only Commander prompt", () => {
            expect(commander.systemPrompt).toContain("COMMANDER: THINK AND DELEGATE ONLY");
            expect(commander.systemPrompt).toContain("You CANNOT read files, run commands, edit code");
            expect(commander.systemPrompt).toContain("ONLY use the `task` tool");
        });

        it("should delegate discovery and implementation to native subagents", () => {
            expect(commander.systemPrompt).toContain("Delegate code understanding to `explore`");
            expect(commander.systemPrompt).toContain("Delegate implementation to `build`");
            expect(commander.systemPrompt).toContain("ALWAYS break work into focused subtasks");
        });

        it("should present plan and build as subagent types", () => {
            expect(commander.systemPrompt).toContain("| **plan** | subagent |");
            expect(commander.systemPrompt).toContain("| **build** | subagent |");
        });

        it("should NOT use parallel scouts (delegated discovery instead)", () => {
            expect(commander.systemPrompt).not.toContain("LAUNCH Parallel Scouts");
            expect(commander.systemPrompt).not.toContain("Handle simple tasks directly");
        });
    });

    describe("system prompt quality", () => {
        it("should have reasonable prompt sizes", () => {
            for (const [name, agent] of Object.entries(AGENTS)) {
                expect(agent.systemPrompt.length, `${name} prompt too short`).toBeGreaterThan(500);
                expect(agent.systemPrompt.length, `${name} prompt too long`).toBeLessThan(50000);
            }
        });

        it("should not have duplicate content", () => {
            for (const [name, agent] of Object.entries(AGENTS)) {
                const lines = agent.systemPrompt.split("\n").filter(l => l.trim().length > 50);
                const uniqueLines = new Set(lines);
                const dupeRatio = lines.length / uniqueLines.size;
                expect(dupeRatio, `${name} has too many duplicate lines`).toBeLessThan(1.5);
            }
        });
    });
});
