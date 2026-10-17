import { describe, expect, it } from "vitest";
import { COMMANDER_GATE, enforceCommanderGate, SCOUT_RULESET } from "../../src/v2/permission-gate.js";

describe("Commander hard gate", () => {
    it("denies every Commander action except delegation and question", () => {
        for (const action of ["shell", "read", "edit", "write", "grep", "glob", "webfetch", "websearch", "external_directory", "browser"]) {
            const evaluation = { agent: "Commander", action, effect: "allow" as const };
            enforceCommanderGate(evaluation);
            expect(evaluation.effect, action).toBe("deny");
        }
    });

    it("attaches a message when forcing deny", () => {
        const evaluation = { agent: "Commander", action: "shell", effect: "allow" as const };
        enforceCommanderGate(evaluation);
        expect(evaluation.message).toContain("subagent");
        expect(evaluation.message).toContain("question");
    });

    it("allows Commander subagent and question evaluations", () => {
        for (const action of ["subagent", "question"]) {
            const evaluation = { agent: "Commander", action, effect: "allow" as const };
            enforceCommanderGate(evaluation);
            expect(evaluation.effect, action).toBe("allow");
            expect(evaluation.message, action).toBeUndefined();
        }
    });

    it("ignores other agents and undefined agents", () => {
        for (const agent of ["explore", "build", undefined]) {
            const evaluation = { agent, action: "shell", effect: "allow" as const };
            enforceCommanderGate(evaluation);
            expect(evaluation.effect, String(agent)).toBe("allow");
            expect(evaluation.message, String(agent)).toBeUndefined();
        }
    });

    it("does not un-deny an already denied evaluation", () => {
        const evaluation = { agent: "Commander", action: "subagent", effect: "deny" as const };
        enforceCommanderGate(evaluation);
        expect(evaluation.effect).toBe("deny");
    });
});

describe("gate rulesets", () => {
    it("pins the Commander gate to the delegation-only shape", () => {
        expect(COMMANDER_GATE).toEqual([
            { action: "*", resource: "*", effect: "deny" },
            { action: "subagent", resource: "*", effect: "allow" },
            { action: "question", resource: "*", effect: "allow" },
        ]);
    });

    it("pins the scout ruleset to research tools with recursion denied", () => {
        expect(SCOUT_RULESET[0]).toEqual({ action: "*", resource: "*", effect: "deny" });
        expect(SCOUT_RULESET).toContainEqual({ action: "subagent", resource: "*", effect: "deny" });
        for (const action of ["read", "grep", "glob", "webfetch", "websearch"]) {
            expect(SCOUT_RULESET).toContainEqual({ action, resource: "*", effect: "allow" });
        }
    });
});
