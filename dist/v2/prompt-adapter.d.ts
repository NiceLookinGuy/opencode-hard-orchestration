/**
 * Commander prompt rewrites for the OpenCode 2 tool surface.
 *
 * The shared Commander prompt targets OpenCode 1, where delegation is the
 * `task` tool with a `subagent_type` parameter. OpenCode 2 renamed the tool to
 * `subagent` and the parameter to `agent` (the old names still execute as
 * deprecated aliases, but teaching them keeps the model on a stale surface).
 * The v1 prompt source stays untouched; the v2 adapter registers this rewrite.
 */
export declare function rewriteCommanderPromptForV2(prompt: string): string;
