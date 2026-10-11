import type { Hooks } from "@opencode-ai/plugin";

type TextCompleteHook = NonNullable<Hooks["experimental.text.complete"]>;
const STRAY_THINKING_CLOSER = "</assistant-thinking></think>";

export function createTextCompleteHandler(customRendering = true): TextCompleteHook {
    return async (_input, output) => {
        // Limit issue #50 cleanup to a whole text part so examples stay intact.
        if (customRendering && output.text.trim() === STRAY_THINKING_CLOSER) output.text = "";
    };
}
