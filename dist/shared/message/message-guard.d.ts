/**
 * Message size guard.
 *
 * A single tool result can be enormous. Reading a screenshot, for example,
 * stores the image as one inline data URI of nearly two megabytes. Replaying
 * that part pushes the next request past the model context window, and from
 * then on every turn fails with an upstream error or an invalid-request
 * rejection, even after switching models.
 *
 * This guard truncates oversized parts right before the request is sent and
 * tells the model the payload was omitted. It is shape-agnostic: it walks both
 * the legacy message form (`parts`) and the current one (`content`).
 */
/** Parts longer than this are truncated. */
export declare const MAX_MESSAGE_PART_CHARS = 200000;
/**
 * Truncate oversized parts across a message list, in place. Returns the number
 * of parts that changed. Never throws on unexpected input.
 */
export declare function truncateOversizedMessageParts(messages: unknown): number;
