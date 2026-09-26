/**
 * Directory entrypoint kept for V1 compatibility.
 *
 * OpenCode V2 auto-discovers every top-level file in this directory
 * (ecc-hooks.ts, dotenv.ts), so this module is a harmless no-op there.
 * V1 runtimes that load the `./plugins` directory resolve this entry; the
 * named exports below keep the original V1 plugins available.
 */

export * from "./ecc-hooks.js"
export { dotenvPlugin } from "./dotenv.js"

export default {
  id: "ecc.index",
  async setup(): Promise<() => void> {
    return () => {}
  },
  /** V1 object entrypoint compatibility. */
  async server(): Promise<Record<string, unknown>> {
    return {}
  },
}
