/**
 * Runtime type guards shared by every layer.
 */
/** A plain object usable as a string-keyed record; arrays and null are excluded. */
export declare function isRecord(value: unknown): value is Record<string, unknown>;
