/**
 * Global .env loader plugin for OpenCode
 *
 * Loads `~/.config/opencode/.env` (or `$OPENCODE_CONFIG_DIR/.env` when set)
 * into the OpenCode process environment at startup, and injects those
 * variables into every shell/tool subprocess via the `shell.env` hook.
 *
 * This lets globally-installed tools (Strix, browser-use, Playwright, MCP
 * servers, ECC scripts, ...) pick up their credentials and settings without
 * being exported in each shell profile.
 *
 * Rules:
 * - A value is applied only if the variable is NOT already set in the real
 *   process environment, so a shell/daemon-managed value always wins.
 * - Never overrides existing environment variables.
 */

import type { PluginInput } from "@opencode-ai/plugin"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"

/** Track the variables we actually applied from .env. */
const appliedEnvKeys = new Set<string>()

export function resolveDotEnvPath(): string {
  if (process.env.OPENCODE_CONFIG_DIR) {
    return path.join(process.env.OPENCODE_CONFIG_DIR, ".env")
  }
  const xdg = process.env.XDG_CONFIG_HOME
  if (xdg) {
    return path.join(xdg, "opencode", ".env")
  }
  return path.join(os.homedir(), ".config", "opencode", ".env")
}

/**
 * Minimal dependency-free .env parser.
 * Supports: blank lines, `#` comments, optional `export ` prefix,
 * double/single quotes, and inline `#` comments (space-prefixed).
 */
export function parseDotEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = content.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const cleaned = line.startsWith("export ") ? line.slice("export ".length).trim() : line

    const eqIndex = cleaned.indexOf("=")
    if (eqIndex === -1) continue

    let key = cleaned.slice(0, eqIndex).trim()
    let value = cleaned.slice(eqIndex + 1).trim()

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue

    // Strip inline comment: `KEY=value # comment`
    const commentMatch = value.match(/\s+#.*$/)
    if (commentMatch) value = value.slice(0, commentMatch.index!).trim()

    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    out[key] = value
  }
  return out
}

export function loadGlobalDotEnv(): Record<string, string> {
  const envPath = resolveDotEnvPath()
  try {
    if (!fs.existsSync(envPath)) return {}
    const vars = parseDotEnv(fs.readFileSync(envPath, "utf8"))
    for (const [key, value] of Object.entries(vars)) {
      if (process.env[key] === undefined) {
        process.env[key] = value
        appliedEnvKeys.add(key)
      }
    }
    return vars
  } catch {
    return {}
  }
}

type DotEnvPluginFn = (input: PluginInput) => Promise<Record<string, unknown>>

export const dotenvPlugin: DotEnvPluginFn = async () => {
  loadGlobalDotEnv()

  return {
    /**
     * Inject variables loaded from the global `.env` into the environment of
     * every shell/tool subprocess OpenCode spawns.
     */
    "shell.env": async () => {
      const env: Record<string, string> = {}
      for (const key of appliedEnvKeys) {
        const value = process.env[key]
        if (value !== undefined) env[key] = value
      }
      return env
    },
  }
}

export default dotenvPlugin