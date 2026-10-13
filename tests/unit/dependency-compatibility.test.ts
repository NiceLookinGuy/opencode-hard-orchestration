import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface PackageManifest {
    engines?: {
        node?: string;
    };
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    exports?: Record<string, unknown>;
}

function readManifest(): PackageManifest {
    return JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as PackageManifest;
}

describe("dependency compatibility", () => {
    it("pins the OpenCode plugin contract used by the entrypoint", () => {
        const manifest = readManifest();

        expect(manifest.dependencies?.["@opencode-ai/plugin"]).toBe("1.18.34");
    });

    it("pins the OpenCode 2 plugin contract used by the hybrid entrypoint", () => {
        const manifest = readManifest();
        expect(manifest.devDependencies?.["@opencode/plugin"]).toBe("2.0.22");
    });

    it("exposes the importable entrypoint for git installs", () => {
        const manifest = readManifest();
        const rootExport = manifest.exports?.["."] as Record<string, string> | undefined;

        expect(rootExport?.import).toBe("./dist/index.js");
        expect(rootExport?.types).toBe("./dist/index.d.ts");
        expect(manifest.exports?.["./server"]).toBeUndefined();
    });

    it("requires the Node.js release supported by the OpenCode dependency graph", () => {
        const manifest = readManifest();
        expect(manifest.engines?.node).toBe(">=24.15.0");
    });

    it("drops dependencies removed with the stripped subsystems", () => {
        const manifest = readManifest();
        const all = { ...manifest.dependencies, ...manifest.devDependencies };

        for (const removed of ["@opencode-ai/sdk", "jsonc-parser", "zod", "shx"]) {
            expect(all[removed], removed).toBeUndefined();
        }
    });
});
