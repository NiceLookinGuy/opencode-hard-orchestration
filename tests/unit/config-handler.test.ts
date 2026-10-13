import { describe, expect, it } from "vitest";
import { createConfigHandler } from "../../src/plugin-handlers/config-handler.js";
import { AGENT_NAMES } from "../../src/shared/index.js";

describe("createConfigHandler", () => {
    it("preserves user command collisions and emits only supported command fields", async () => {
        const plan = { template: "User plan $ARGUMENTS", agent: "plan", subtask: false };
        const config = { command: { plan } };
        await createConfigHandler()(config);
        expect(config.command.plan).toEqual(plan);
        expect(config.command.task).toBeDefined();
        expect(config.command.task).not.toHaveProperty("argumentHint");
    });

    it("forces Commander as default and demotes native plan/build agents", async () => {
        const config = {
            default_agent: "plan",
            agent: {
                build: { mode: "primary", hidden: false, model: "user/build" },
                plan: { mode: "primary", hidden: false, prompt: "User planning prompt" },
            },
        };

        await createConfigHandler()(config);

        expect(config.default_agent).toBe(AGENT_NAMES.COMMANDER);
        expect(config.agent.build).toEqual({ mode: "subagent", hidden: false, model: "user/build" });
        expect(config.agent.plan).toEqual({ mode: "subagent", hidden: false, prompt: "User planning prompt" });
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
        expect(config.agent.plan).toEqual({ mode: "subagent" });
        expect(config.agent.build).toEqual({ mode: "subagent" });
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

    it("inherits global permission config for every orchestrator agent", async () => {
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

        for (const agentName of Object.values(AGENT_NAMES)) {
            if (agentName === AGENT_NAMES.COMMANDER) {
                expect(config.agent[agentName].permission).toEqual({
                    "*": "deny",
                    task: "allow",
                    question: "allow",
                    edit: "deny",
                    bash: {
                        "*": "ask",
                        "git status*": "allow",
                    },
                });
                continue;
            }
            expect(config.agent[agentName].permission).toEqual(config.permission);
        }
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
                [AGENT_NAMES.WORKER]: {
                    model: "anthropic/claude-opus-4-5-20251101",
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
        expect(config.agent[AGENT_NAMES.WORKER].model).toBe("anthropic/claude-opus-4-5-20251101");
        expect(config.agent[AGENT_NAMES.WORKER].permission).toEqual(config.permission);
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
        expect(config.agent[AGENT_NAMES.PLANNER].permission).toBe("allow");
    });

    it("emits only documented OpenCode agent config fields for generated agents", async () => {
        const config = {};

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.COMMANDER]).not.toHaveProperty("maxTokens");
        expect(config.agent[AGENT_NAMES.COMMANDER]).not.toHaveProperty("thinking");
        expect(config.agent[AGENT_NAMES.COMMANDER]).not.toHaveProperty("tools");
        expect(config.agent[AGENT_NAMES.PLANNER]).not.toHaveProperty("maxTokens");
        expect(config.agent[AGENT_NAMES.PLANNER]).not.toHaveProperty("tools");
        expect(config.agent[AGENT_NAMES.WORKER]).not.toHaveProperty("tools");
        expect(config.agent[AGENT_NAMES.REVIEWER]).not.toHaveProperty("tools");
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

    it("unblocks the five native subagent types and leaves capitalized names alone", async () => {
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
        expect(config.agent.plan).toEqual({ mode: "subagent", prompt: "user/plan" });
        expect(config.agent.build).toEqual({ mode: "subagent" });
        expect(config.agent.Plan).toEqual({ hidden: true, disable: true, mode: "primary" });
        expect(config.agent.plan).not.toEqual(userPlan);
    });

    it("leaves orchestrator roles and unrelated custom agents untouched by native unblocking", async () => {
        const config = {
            agent: {
                [AGENT_NAMES.PLANNER]: { hidden: true, disable: true },
                "my-custom-agent": { hidden: true, disable: true, mode: "primary" },
            },
        };

        await createConfigHandler()(config);

        expect(config.agent[AGENT_NAMES.PLANNER]).toMatchObject({ mode: "subagent", hidden: true, disable: true });
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
                planner: 10,
                worker: 10,
                reviewer: 10,
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
            planner: 10,
            worker: 10,
            reviewer: 10,
        });
    });
});
