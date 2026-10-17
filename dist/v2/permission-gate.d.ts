/**
 * V2 permission layer: the Commander hard gate and the scout research ruleset.
 *
 * The agent ruleset is the first enforcement layer. It is not sufficient on
 * its own: session-level rules are merged after agent rules, and config-level
 * rules are appended after both, so a later rule can un-deny an action. The
 * `permission.evaluate` hook therefore re-checks every Commander evaluation
 * and forces `deny` — a hook can only harden, never soften, an effect.
 */
export interface PermissionRule {
    action: string;
    resource: string;
    effect: "allow" | "deny" | "ask";
}
/**
 * Structurally compatible with the `permission.evaluate` hook input from
 * `@opencode/plugin`; only the fields this gate reads or writes are declared.
 */
export interface PermissionEvaluation {
    agent?: string;
    action: string;
    effect: "allow" | "deny" | "ask";
    message?: string;
}
/** Commander may delegate (`subagent`) and ask the user (`question`), nothing else. */
export declare const COMMANDER_GATE: readonly PermissionRule[];
/**
 * Scout action names mirror the live `explore` agent on OpenCode 2.0.32
 * (`read`, `grep`, `glob`, `webfetch`, `websearch`) minus shell, with a
 * deny-by-default first rule. `.env` files keep the native ask/allow
 * behavior, and subagent recursion is denied.
 */
export declare const SCOUT_RULESET: readonly PermissionRule[];
/**
 * Permission evaluate hook body. No-op for every other agent and for
 * Commander's two delegation actions; otherwise forces the effect to deny.
 */
export declare function enforceCommanderGate(evaluation: PermissionEvaluation): void;
