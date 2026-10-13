import type { Hooks } from "@opencode-ai/plugin";
type TextCompleteHook = NonNullable<Hooks["experimental.text.complete"]>;
export declare function createTextCompleteHandler(customRendering?: boolean): TextCompleteHook;
export {};
