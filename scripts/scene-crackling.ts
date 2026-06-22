// Standalone runner for the isolated Khala "crackling energy" scene.
//
// Builds examples/crackling-arc-standalone/src/main.ts -> dist/main.js with the
// browser target, starts Vite from the repo root, and opens the browser to the
// dedicated scene page. Follows the existing dev:demo:* / build:demo:* pattern.
//
// Usage: bun run scene:crackling
import { spawn } from "node:child_process"
import { join } from "node:path"

const root = process.cwd()
const exampleDir = join(root, "examples", "crackling-arc-standalone")
const scenePath = "/examples/crackling-arc-standalone/index.html"

const build = await Bun.build({
  entrypoints: [join(exampleDir, "src", "main.ts")],
  outdir: join(exampleDir, "dist"),
  target: "browser",
  sourcemap: "none",
  minify: false,
  splitting: false,
})

if (!build.success) {
  console.error("Failed to bundle the crackling-arc-standalone scene.")
  for (const log of build.logs) console.error(log)
  process.exit(1)
}

console.log(
  `Bundled crackling scene: ${build.outputs.length} output(s) -> examples/crackling-arc-standalone/dist`,
)

const host = "127.0.0.1"
const port = Number(process.env.SCENE_PORT ?? "5179")

const vite = spawn(
  "vite",
  ["--host", host, "--port", String(port), "--strictPort"],
  { cwd: root, stdio: "inherit" },
)

const url = `http://${host}:${port}${scenePath}`

const openBrowser = (): void => {
  if (process.env.SCENE_NO_OPEN === "1") {
    console.log(`Scene served (browser auto-open disabled): ${url}`)
    return
  }
  const opener =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "explorer"
        : "xdg-open"
  spawn(opener, [url], { stdio: "ignore", detached: true }).unref()
  console.log(`Opening crackling scene: ${url}`)
}

// Give Vite a moment to bind before opening the browser.
setTimeout(openBrowser, 1200)

const shutdown = (): void => {
  vite.kill("SIGTERM")
  process.exit(0)
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

vite.on("exit", (code) => process.exit(code ?? 0))
