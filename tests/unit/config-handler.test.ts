import { describe, expect, it } from "vitest";
import { createConfigHandler } from "../../src/plugin-handlers/config-handler.js";
import { AGENT_NAMES } from "../../src/shared/agent/index.js";

describe("createConfigHandler", () => {
    it("forces Commander as default and makes native plan/build bidirectional agents", async () => {
        const config = {
            default_agent: "plan",
            agent: {
                build: { mode: "primary", hidden: false, model: "user/build" },
                plan: { mode: "primary", hidden: false, prompt: "User planning prompt" },
            },
        };

        await createConfigHandler()(config);

        expect(config.default_agent).toBe(AGENT_NAMES.COMMANDER);
        expect(config.agent.build).toEqual({ mode: "all", hidden: false, model: "user/build" });
        expect(config.agent.plan).toEqual({ mode: "all", hidden: false, prompt: "User planning prompt" });
    });

    it("installs hard orchestrator defaults on a fresh config", async () => {
        const config = {};

        await createConfigHandler()(config);

        expect(config.default_agent).toBe(AGENT_NAMES.COMMANDER);
        expect(config.agent[AGENT_NAMES.COMMANDER]).toMatchObject({
            mode: "primary",
            permission: { "*": "deny", task: "allow", question: "allow" },
        });
        expect(config.agent[AGENT_NAMES.COMMANDER].prompt).toBeTruthy();
        expect(config.agent.plan).toEqual({ mode: "all" });
        expect(config.agent.build).toEqual({ mode: "all" });
    });

    it("uses registration defaults only for absent agent configuration", async () => {
        const commander = {
            mode: "all",
            hidden: true,
            model: "user/commander",
            prompt: "User mission instructions",
            description: "My commander",
            color: "#123456",
        };
        const config = { agent: { [AGENT_NAMES.COMMANDER]: { ...commander } } };

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER]).toEqual({
            ...commander,
            permission: { "*": "deny", task: "allow", question: "allow" },
        });
    });

    it("overlays global permission config onto the Commander gate", async () => {
        const config = {
            permission: {
                question: "allow",
                edit: "deny",
                bash: {
                    "*": "ask",
                    "git status*": "allow",
                },
            },
        };

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER].permission).toEqual({
            "*": "deny",
            task: "allow",
            question: "allow",
            edit: "deny",
            bash: {
                "*": "ask",
                "git status*": "allow",
            },
        });
    });

    it("preserves user model and agent-specific permission overrides", async () => {
        const config = {
            model: "anthropic/claude-sonnet-4-5-20250929",
            permission: {
                question: "allow",
                edit: "deny",
                bash: "ask",
            },
            agent: {
                [AGENT_NAMES.COMMANDER]: {
                    model: "opencode/gpt-5.1-codex",
                    permission: {
                        question: "deny",
                        websearch: "allow",
                    },
                    temperature: 0.2,
                },
            },
        };

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER].mode).toBe("primary");
        expect(config.agent[AGENT_NAMES.COMMANDER].model).toBe("opencode/gpt-5.1-codex");
        expect(config.agent[AGENT_NAMES.COMMANDER].temperature).toBe(0.2);
        expect(config.agent[AGENT_NAMES.COMMANDER].permission).toEqual({
            "*": "deny",
            task: "allow",
            question: "deny",
            edit: "deny",
            bash: "ask",
            websearch: "allow",
        });
    });

    it("merges string global permission with object agent permissions", async () => {
        const config = {
            permission: "allow",
            agent: {
                [AGENT_NAMES.COMMANDER]: {
                    permission: {
                        edit: "deny",
                    },
                },
            },
        };

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER].permission).toEqual({
            "*": "allow",
            edit: "deny",
        });
    });

    it("emits only documented OpenCode agent config fields for the generated agent", async () => {
        const config = {};

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER]).not.toHaveProperty("maxTokens");
        expect(config.agent[AGENT_NAMES.COMMANDER]).not.toHaveProperty("thinking");
        expect(config.agent[AGENT_NAMES.COMMANDER]).not.toHaveProperty("tools");
    });

    it("embeds the delegate-only Commander prompt", async () => {
        const config = {};

        await createConfigHandler()(config);

        const prompt = config.agent[AGENT_NAMES.COMMANDER].prompt;
        expect(prompt).toContain("ONLY use the `task` tool");
        expect(prompt).toContain("NEVER use tools other than `task` and `question`");
        expect(prompt).not.toContain("Handle simple tasks directly");
    });

    it("lets user agent permission override the Commander gate", async () => {
        const config = {
            agent: {
                [AGENT_NAMES.COMMANDER]: {
                    permission: {
                        question: "deny",
                    },
                },
            },
        };

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER].permission).toEqual({
            "*": "deny",
            task: "allow",
            question: "deny",
        });
    });

    it("overlays global record permission over the Commander gate", async () => {
        const config = {
            permission: {
                task: "deny",
                bash: "allow",
            },
        };

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER].permission).toEqual({
            "*": "deny",
            task: "deny",
            question: "allow",
            bash: "allow",
        });
    });

    it("lets a global string permission replace the Commander gate", async () => {
        const config = { permission: "allow" };

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER].permission).toBe("allow");
    });

    it("unblocks the five native agent types and leaves capitalized names alone", async () => {
        const config = {
            agent: {
                explore: { hidden: true, disable: true, model: "user/explore" },
                general: { hidden: true, disable: true },
                scout: { hidden: true, disable: true },
                plan: { hidden: true, disable: true, mode: "primary", prompt: "user/plan" },
                build: { hidden: true, disable: true, mode: "primary" },
                Plan: { hidden: true, disable: true, mode: "primary" },
            },
        };
        const userPlan = structuredClone(config.agent.plan);

        await createConfigHandler()(config);

        expect(config.agent.explore).toEqual({ model: "user/explore" });
        expect(config.agent.general).toEqual({});
        expect(config.agent.scout).toEqual({});
        expect(config.agent.plan).toEqual({ mode: "all", prompt: "user/plan" });
        expect(config.agent.build).toEqual({ mode: "all" });
        expect(config.agent.Plan).toEqual({ hidden: true, disable: true, mode: "primary" });
        expect(config.agent.plan).not.toEqual(userPlan);
    });

    it("leaves unrelated custom agents untouched by native unblocking", async () => {
        const config = {
            agent: {
                "my-custom-agent": { hidden: true, disable: true, mode: "primary" },
            },
        };

        await createConfigHandler()(config);

        expect(config.agent["my-custom-agent"]).toEqual({ hidden: true, disable: true, mode: "primary" });
    });

    it("leaves Claude rule fallback to OpenCode instead of embedding compatibility prompts", async () => {
        const config = {};

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER].prompt).not.toContain("<claude_compatibility>");
        expect(config.agent[AGENT_NAMES.COMMANDER].prompt).not.toContain("<project_rules");
    });

    it("does not treat top-level OpenCode config as orchestrator plugin options", async () => {
        const config = {
            agentConcurrency: {
                commander: 1,
            },
            modelConcurrency: {
                "anthropic/claude-sonnet-4-5-20250929": 2,
            },
            providerConcurrency: {
                anthropic: 3,
            },
            defaultConcurrency: 4,
        };

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER].mode).toBe("primary");
        expect(config.agentConcurrency).toEqual({
            commander: 1,
        });
    });
});
