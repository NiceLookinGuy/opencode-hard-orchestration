/**
 * Plugin API conformance.
 *
 * The plugin talks to OpenCode across a plain-string surface: an unknown hook
 * key is simply never called. TypeScript does not catch that, because the keys
 * are plain strings.
 *
 * This test pins every hook name we depend on to the authoritative declaration
 * that ships in `node_modules`, so a dependency bump that moves one is a test
 * failure instead of a feature that quietly stops working.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SRC_ROOT = join(ROOT, "src");

const PLUGIN_TYPES = readFileSync(
    join(ROOT, "node_modules/@opencode-ai/plugin/dist/index.d.ts"), "utf8");

/** Hook keys returned by the plugin entrypoint. */
function registeredHooks(): string[] {
    const index = readFileSync(join(SRC_ROOT, "index.ts"), "utf8");
    const body = index.slice(index.indexOf("return {"));
    const keys: string[] = [];
    for (const m of body.matchAll(/^ {8}(?:"([^"]+)"|([a-zA-Z]+)):/gm)) {
        const key = m[1] ?? m[2];
        if (key) keys.push(key);
    }
    return [...new Set(keys)];
}

/** Hook keys declared by the installed @opencode-ai/plugin. */
function declaredHooks(): string[] {
    const start = PLUGIN_TYPES.indexOf("export interface Hooks");
    expect(start, "Hooks interface not found in @opencode-ai/plugin").toBeGreaterThan(-1);
    return [...new Set(
        [...PLUGIN_TYPES.slice(start).matchAll(/^ {4}"?([a-zA-Z][a-zA-Z0-9.]*)"?\??:/gm)]
            .map(m => m[1]),
    )];
}

describe("plugin API conformance", () => {
    it("registers only hooks the installed plugin package declares", () => {
        const declared = declaredHooks();
        const mine = registeredHooks();

        expect(mine.length, "no hooks parsed — the scan is broken, not the code")
            .toBeGreaterThan(0);

        const unknown = mine.filter(hook => !declared.includes(hook));
        expect(unknown, `hook keys OpenCode never calls: ${unknown.join(", ")}`).toEqual([]);
    });
});
