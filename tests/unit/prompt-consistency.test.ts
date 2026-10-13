/**
 * Prompt Consistency Guards
 *
 * Structural invariants over the composed Commander prompt and the prompt
 * fragment sources. These exist because prompt defects are invisible to
 * type-checking and snapshots alone: a fragment can be exported but never
 * composed (dead prompt). Each test here encodes an invariant that was
 * violated at least once in the audit that introduced this file.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

import { AGENTS } from "../../src/agents/definitions.js";
import { AGENT_NAMES } from "../../src/shared/agent/index.js";

const SRC_ROOT = fileURLToPath(new URL("../../src", import.meta.url));
const PROMPT_ROOT = join(SRC_ROOT, "agents", "prompts");

function listFiles(directory: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const fullPath = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFiles(fullPath));
        } else if (entry.isFile() && extname(entry.name) === ".ts") {
            files.push(fullPath);
        }
    }
    return files;
}

const ALL_AGENTS = [AGENT_NAMES.COMMANDER] as const;

describe("Prompt Consistency Guards", () => {
    it("does not teach the retired call_agent tool", () => {
        for (const name of ALL_AGENTS) {
            expect(AGENTS[name].systemPrompt, name).not.toContain("call_agent");
        }
    });

    it("has no dead prompt fragments (every exported const is referenced outside its own file)", () => {
        // A fragment that is exported but composed nowhere is a maintenance
        // trap: edits to it silently do nothing. Every exported constant in
        // the prompts tree must be referenced by at least one other source
        // file (an agent composition or another fragment).
        const promptFiles = listFiles(PROMPT_ROOT).filter(
            (f) => basename(f) !== "index.ts" && basename(f) !== "registry.ts",
        );
        const srcFiles = listFiles(SRC_ROOT).filter((f) => basename(f) !== "index.ts");
        const contents = new Map(srcFiles.map((f) => [f, readFileSync(f, "utf8")]));

        const deadExports: string[] = [];
        for (const file of promptFiles) {
            const source = contents.get(file) ?? readFileSync(file, "utf8");
            const exported = [...source.matchAll(/^export (?:const|function) (\w+)/gm)].map(
                (m) => m[1],
            );
            for (const name of exported) {
                const used = srcFiles.some((other) => {
                    if (other === file) return false;
                    const text = contents.get(other)!;
                    return new RegExp(`\\b${name}\\b`).test(text);
                });
                if (!used) deadExports.push(`${basename(file)} ??${name}`);
            }
        }

        expect(
            deadExports,
            `Dead prompt exports (exported but never composed):\n${deadExports.join("\n")}`,
        ).toEqual([]);
    });

    it("uses each XML section tag at most once per composed prompt", () => {
        // The audit found three unrelated fragments all wrapped in
        // <quality_checklist>, producing duplicate same-named sections whose
        // contents had nothing to do with each other.
        for (const name of ALL_AGENTS) {
            const prompt = AGENTS[name].systemPrompt;
            const opens = [...prompt.matchAll(/^<([a-z_]+)>$/gm)].map((m) => m[1]);
            const counts = new Map<string, number>();
            for (const tag of opens) counts.set(tag, (counts.get(tag) ?? 0) + 1);
            const duplicated = [...counts.entries()].filter(([, n]) => n > 1);
            expect(
                duplicated,
                `${name}: duplicated section tags: ${duplicated.map(([t, n]) => `${t}횞${n}`).join(", ")}`,
            ).toEqual([]);
        }
    });

    it("contains no known typos or self-undermining artifacts", () => {
        for (const name of ALL_AGENTS) {
            const prompt = AGENTS[name].systemPrompt;
            expect(prompt, `${name}`).not.toContain("MILRESTONES");
        }
    });

    it("keeps Commander delegate-only", () => {
        const prompt = AGENTS[AGENT_NAMES.COMMANDER].systemPrompt;
        expect(prompt).toContain("ONLY use the `task` tool");
        expect(prompt).toContain("NEVER use tools other than `task` and `question`");
        expect(prompt).not.toMatch(/Handle simple tasks directly|implement (?:the|it) (?:yourself|directly)/i);
    });

    it("keeps prompts compact without compulsory team ceremonies", () => {
        for (const name of ALL_AGENTS) {
            const prompt = AGENTS[name].systemPrompt;
            expect(prompt.length, name).toBeLessThan(6500);
            expect(prompt, name).not.toMatch(/HYPER.PARALLEL|MAXIMIZE parallel|work.stealing|race mode|ONE FILE per session|DELETE the isolated test/i);
            expect(prompt, name).not.toMatch(/cache_docs|codesearch|websearch\(\{|webfetch\(\{/);
        }
    });

    it("routes Commander work through native subagents instead of direct action", () => {
        const prompt = AGENTS[AGENT_NAMES.COMMANDER].systemPrompt;
        expect(prompt).toContain("Delegate code understanding to `explore`");
        expect(prompt).toContain("Delegate implementation to `build`");
        expect(prompt).toContain("ALWAYS break work into focused subtasks");
        expect(prompt).toContain("You CANNOT read files, run commands, edit code");
    });
});
