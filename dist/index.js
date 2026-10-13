// src/shared/agent/constants.ts
var AGENT_NAMES = {
  COMMANDER: "Commander"
};

// src/agents/prompts/commander-delegate.ts
var COMMANDER_DELEGATE_PROMPT = `# COMMANDER: THINK AND DELEGATE ONLY

You are the Commander. You can ONLY use the \`task\` tool to delegate work and \`question\` to ask the user.
You CANNOT read files, run commands, edit code, search, or do anything else. Those tools don't exist for you.

## HOW TO USE \`task\`

\`\`\`
task(subagent_type="explore", description="Short label", prompt="Detailed instructions for the agent")
\`\`\`

Parameters:
- \`subagent_type\` \u2014 which agent runs the task (see available agents below)
- \`description\` \u2014 short label shown in task list
- \`prompt\` \u2014 full instructions, be specific and include file paths when you know them
- \`background\` \u2014 optional, true for async, false to wait for result

## AVAILABLE AGENTS

| Agent | Mode | Does | Use when |
|-------|------|------|----------|
| **explore** | subagent | Find files, explore structure, analyze code, answer questions about it | Initial discovery, code understanding |
| **general** | subagent | Research complex questions, execute multi-step tasks | Complex research, multi-file operations, tasks needing reasoning |
| **scout** | subagent | External documentation, dependency research | Library/source research outside the project |
| **plan** | subagent | Deep research, architecture design, create implementation plans | Complex features needing a plan first |
| **build** | subagent | Write code, edit files, implement features | You know exactly what to build |

## DEEP INTERVIEW: Gather Full Context Before Acting

Before delegating ANY work, you MUST conduct a deep interview to gather complete information. Incomplete delegation produces incomplete results.

### 1. Initial Assessment

When the user makes a request, analyze it for completeness before acting:
- Is the goal clear and specific?
- Are the constraints and requirements defined?
- Do you know which files/code are involved?
- Is the expected outcome unambiguous?
- Are edge cases or special conditions addressed?

### 2. Missing Information Detection

Identify gaps in these categories:
- **Scope**: What exactly needs to be built or changed?
- **Requirements**: What are the functional requirements? Non-functional?
- **Context**: Which files, classes, systems are involved?
- **Outcome**: What does "done" look like? How is success measured?
- **Constraints**: Performance, style, compatibility, or other boundaries?
- **Edge Cases**: What could go wrong? What exceptions exist?

### 3. Interview Protocol

When information is missing:
- Ask **ONE focused question at a time** \u2014 do not overwhelm with a list
- Be **specific**, not vague \u2014 ask "Which file needs the change?" not "Can you tell me more?"
- Offer **concrete options** when possible \u2014 "Should we use approach X or approach Y?"
- **Confirm understanding** after each answer before moving on
- Continue until 100% clear on the task

### 4. When to Stop Interviewing

Only proceed to delegation when ALL of these are true:
- All critical requirements are known
- Scope is clearly defined with boundaries
- No ambiguity remains on core aspects
- User has confirmed understanding of the plan
- You can write a precise, actionable prompt for the subagent

**If any doubt remains, ask another question. Delegation without clarity wastes cycles.**

## WORKFLOW

1. Analyze the user's request \u2014 think about what needs to happen
2. Delegate code understanding to \`explore\` \u2014 ask specific questions, it returns findings not raw files
3. For complex research or multi-step tasks, delegate to \`general\`
4. For external documentation or dependency research, delegate to \`scout\`
5. For complex features, delegate planning to \`plan\` first
6. Delegate implementation to \`build\` \u2014 tell it exactly what to build
7. If anything fails, decompose the problem and retry with smaller tasks

## RULES

- NEVER use tools other than \`task\` and \`question\` \u2014 they don't exist for you
- ALWAYS use \`subagent_type\` parameter
- NEVER ask a subagent to return raw file content \u2014 they return FINDINGS, not files
- NEVER analyze code yourself from subagent output \u2014 you command, they reason
- ALWAYS break work into focused subtasks \u2014 one concern per task
- When you know file paths, include them in the prompt

## BOUNDARIES

If you cannot accomplish the task within these rules, do not look for ways to bypass or reinterpret them. The rules are not the problem \u2014 the thinking is. Decompose further, ask a better question, or consult the user.
`;

// src/agents/commander.ts
var commander = {
  id: AGENT_NAMES.COMMANDER,
  description: "Commander - owns the goal, implements, verifies, and delegates when useful",
  systemPrompt: COMMANDER_DELEGATE_PROMPT
};

// src/agents/definitions.ts
var AGENTS = {
  [AGENT_NAMES.COMMANDER]: commander
};

// src/shared/core/guards.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/plugin-handlers/config-handler.ts
var COMMANDER_DEFAULT_PERMISSION = {
  "*": "deny",
  task: "allow",
  question: "allow"
};
var NATIVE_SUBAGENT_TYPES = ["explore", "general", "scout"];
var NATIVE_DEMOTED_TYPES = ["plan", "build"];
function isPermissionAction(value) {
  return value === "ask" || value === "allow" || value === "deny";
}
function mergePermission(globalPermission, agentPermission) {
  if (agentPermission === void 0) {
    return globalPermission;
  }
  if (isRecord(globalPermission) && isRecord(agentPermission)) {
    return { ...globalPermission, ...agentPermission };
  }
  if (isPermissionAction(globalPermission) && isRecord(agentPermission)) {
    return { "*": globalPermission, ...agentPermission };
  }
  return agentPermission;
}
function defineAgent(existing, defaults, globalPermission) {
  const permission = mergePermission(mergePermission(defaults.permission, globalPermission), existing?.permission);
  const agent = {
    ...defaults,
    ...existing
  };
  if (permission !== void 0) {
    agent.permission = permission;
  }
  return agent;
}
function agentPrompt(name) {
  return AGENTS[name]?.systemPrompt || "";
}
function orchestratorAgentDefaults() {
  return {
    [AGENT_NAMES.COMMANDER]: {
      description: "Autonomous orchestrator - executes until mission complete",
      mode: "primary",
      prompt: agentPrompt(AGENT_NAMES.COMMANDER),
      permission: COMMANDER_DEFAULT_PERMISSION,
      color: "#ffea98"
    }
  };
}
function unblockNativeSubagentTypes(existingAgents) {
  const agents = { ...existingAgents };
  for (const name of [...NATIVE_SUBAGENT_TYPES, ...NATIVE_DEMOTED_TYPES]) {
    const agent = agents[name];
    if (agent === void 0) continue;
    const cleaned = { ...agent };
    if (cleaned.hidden === true) delete cleaned.hidden;
    if (cleaned.disable === true) delete cleaned.disable;
    agents[name] = cleaned;
  }
  for (const name of NATIVE_DEMOTED_TYPES) {
    agents[name] = { ...agents[name] ?? {}, mode: "subagent" };
  }
  return agents;
}
function orchestratorAgents(existingAgents, globalPermission) {
  const agents = {};
  for (const [name, defaults] of Object.entries(orchestratorAgentDefaults())) {
    agents[name] = defineAgent(existingAgents[name], defaults, globalPermission);
  }
  return agents;
}
function createConfigHandler() {
  return async (config) => {
    const mutableConfig = config;
    const existingAgents = mutableConfig.agent ?? {};
    const globalPermission = mutableConfig.permission;
    const processedAgents = unblockNativeSubagentTypes(existingAgents);
    mutableConfig.agent = { ...processedAgents, ...orchestratorAgents(processedAgents, globalPermission) };
    mutableConfig.default_agent = AGENT_NAMES.COMMANDER;
  };
}

// src/v2/agent-adapter.ts
function registerV2Agents(context) {
  return context.agent.transform((editor) => {
    for (const [name, definition] of Object.entries(AGENTS)) {
      editor.update(name, (agent) => {
        const primary = name === AGENT_NAMES.COMMANDER;
        agent.description = definition.description;
        agent.system = definition.systemPrompt;
        agent.mode = primary ? "primary" : "subagent";
        agent.hidden = !primary;
      });
    }
    for (const name of NATIVE_SUBAGENT_TYPES) {
      if (!editor.get(name)) continue;
      editor.update(name, (agent) => {
        agent.hidden = false;
      });
    }
    for (const name of NATIVE_DEMOTED_TYPES) {
      if (!editor.get(name)) continue;
      editor.update(name, (agent) => {
        agent.hidden = false;
        agent.mode = "subagent";
      });
    }
    editor.default(AGENT_NAMES.COMMANDER);
  });
}

// src/shared/message/message-guard.ts
var MAX_MESSAGE_PART_CHARS = 2e5;
var TRUNCATION_NOTE = "\n...[truncated by message guard]";
var OMITTED_PAYLOAD_NOTE = "[message guard omitted an oversized inline image/file payload of {size} chars]";
var IMAGE_DATA_URI = /data:image\/[a-z0-9.+-]+;base64,/i;
function omittedPayload(size) {
  return OMITTED_PAYLOAD_NOTE.replace("{size}", String(size));
}
function capText(value) {
  if (value.length <= MAX_MESSAGE_PART_CHARS) return value;
  if (IMAGE_DATA_URI.test(value)) {
    return omittedPayload(value.length);
  }
  return value.slice(0, MAX_MESSAGE_PART_CHARS) + TRUNCATION_NOTE;
}
function capField(target, key) {
  const value = target[key];
  if (typeof value !== "string") return false;
  const capped = capText(value);
  if (capped === value) return false;
  target[key] = capped;
  return true;
}
function capContentArray(value) {
  if (!Array.isArray(value)) return false;
  let changed = false;
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) continue;
    if (item.type === "file" && typeof item.uri === "string" && item.uri.length > MAX_MESSAGE_PART_CHARS) {
      value[index] = { type: "text", text: omittedPayload(item.uri.length) };
      changed = true;
      continue;
    }
    if (capField(item, "text")) changed = true;
  }
  return changed;
}
function capToolResult(result) {
  if (!isRecord(result)) return false;
  if (result.type === "content") return capContentArray(result.value);
  if (typeof result.value === "string") return capField(result, "value");
  if (result.type !== "json" && result.type !== "text" && result.type !== "error") return false;
  const serialized = serializeResult(result.value);
  if (serialized === void 0 || serialized.length <= MAX_MESSAGE_PART_CHARS) return false;
  if (result.type !== "error") result.type = "text";
  result.value = capText(serialized);
  return true;
}
function serializeResult(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return void 0;
  }
}
function capToolState(state) {
  if (!isRecord(state)) return false;
  let changed = capField(state, "output");
  if (capContentArray(state.content)) changed = true;
  return changed;
}
function capPart(part) {
  if (!isRecord(part)) return false;
  switch (part.type) {
    case "text":
    case "reasoning":
      return capField(part, "text");
    case "tool-result":
      return capToolResult(part.result);
    case "tool":
      return capToolState(part.state);
    default:
      return false;
  }
}
function truncateOversizedMessageParts(messages) {
  if (!Array.isArray(messages)) return 0;
  let truncated = 0;
  for (const message of messages) {
    if (!isRecord(message)) continue;
    const parts = Array.isArray(message.parts) ? message.parts : message.content;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (capPart(part)) truncated++;
    }
  }
  return truncated;
}

// src/v2/setup.ts
async function setupV2(contextInput) {
  const context = contextInput;
  const registrations = [];
  try {
    registrations.push(await registerV2Agents(context));
    registrations.push(await registerMessageGuard(context));
  } catch (error) {
    try {
      await disposeV2(registrations);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "OpenCode 2 setup and cleanup failed");
    }
    throw error;
  }
  return () => disposeV2(registrations);
}
async function registerMessageGuard(context) {
  return context.session.hook("context", (input) => {
    truncateOversizedMessageParts(input.messages);
  });
}
async function disposeV2(registrations) {
  const results = await Promise.allSettled(registrations.map(
    (registration) => Promise.resolve().then(() => registration.dispose())
  ));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length === 1) throw failures[0].reason;
  if (failures.length > 1) throw new AggregateError(failures.map((failure) => failure.reason), "OpenCode 2 registration cleanup failed");
}

// src/plugin-handlers/messages-guard-handler.ts
function createMessagesGuardHandler() {
  return async (_input, output) => {
    truncateOversizedMessageParts(output.messages);
  };
}

// src/plugin-handlers/text-complete-handler.ts
var STRAY_THINKING_CLOSER = "</assistant-thinking></think>";
function createTextCompleteHandler(customRendering = true) {
  return async (_input, output) => {
    if (customRendering && output.text.trim() === STRAY_THINKING_CLOSER) output.text = "";
  };
}

// src/index.ts
var HardOrchestrationServerPlugin = async (_input, options) => {
  const customRendering = typeof options?.customRendering === "boolean" ? options.customRendering : true;
  return {
    config: createConfigHandler(),
    "experimental.chat.messages.transform": createMessagesGuardHandler(),
    "experimental.text.complete": createTextCompleteHandler(customRendering)
  };
};
var HardOrchestrationPlugin = {
  id: "opencode-hard-orchestration",
  server: HardOrchestrationServerPlugin,
  setup: setupV2
};
var index_default = HardOrchestrationPlugin;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
