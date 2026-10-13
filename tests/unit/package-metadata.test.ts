import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface PackageMetadata {
    name?: string;
    displayName?: string;
    description?: string;
    version?: string;
    author?: string;
    license?: string;
    homepage?: string;
    repository?: {
        url?: string;
    };
    bin?: Record<string, string>;
    scripts?: Record<string, string>;
    files?: string[];
    bugs?: {
        url?: string;
    };
}

function readPackageMetadata(): PackageMetadata {
    return JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as PackageMetadata;
}

const FORK_URL = "https://github.com/NiceLookinGuy/opencode-hard-orchestration";

describe("package metadata", () => {
    it("carries the fork identity", () => {
        const metadata = readPackageMetadata();

        expect(metadata.name).toBe("opencode-hard-orchestration");
        expect(metadata.displayName).toBe("OpenCode Hard Orchestration");
        expect(metadata.version).toBe("0.1.0");
        expect(metadata.author).toBe("NiceLookinGuy");
    });

    it("describes the hard-orchestration core", () => {
        const metadata = readPackageMetadata();

        expect(metadata.description).toContain("Commander");
        expect(metadata.description).not.toContain("Planner");
        expect(metadata.description).not.toContain("Reviewer");
    });

    it("routes repository, homepage, and support links to the fork", () => {
        const metadata = readPackageMetadata();

        expect(metadata.repository?.url).toBe(`git+${FORK_URL}.git`);
        expect(metadata.homepage).toBe(FORK_URL);
        expect(metadata.bugs?.url).toBe(`${FORK_URL}/issues`);
    });

    it("ships the MIT license", () => {
        const metadata = readPackageMetadata();

        expect(readFileSync(resolve(process.cwd(), "LICENSE"), "utf8")).toContain("MIT License");
        expect(metadata.license).toBe("MIT");
    });

    it("ships only the importable plugin, README, and license", () => {
        const metadata = readPackageMetadata();

        expect(metadata.files).toEqual(["dist", "README.md", "LICENSE"]);
        expect(metadata.bin).toBeUndefined();
    });

    it("keeps only the build and test scripts", () => {
        const metadata = readPackageMetadata();
        const scripts = metadata.scripts ?? {};

        expect(Object.keys(scripts).sort()).toEqual(["build", "test", "test:coverage"]);
    });
});
