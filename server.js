/**
 * Local-path plugin entry for OpenCode 2.
 *
 * When the config lists this repository by absolute directory path, the v2
 * plugin host resolves `<directory>/server` first (or `<directory>/index`),
 * not the package entrypoint. Without this file such an entry is dropped
 * silently. Git installs resolve the package entry (`dist/index.js` via
 * package.json exports) and never need this shim.
 */
export { default } from "./dist/index.js";
