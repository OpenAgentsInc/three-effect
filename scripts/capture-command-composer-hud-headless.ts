// Headless Playwright capture for the command composer HUD primitive.
//
// Builds the standalone scene, serves it with Vite, freezes animation through
// the scene hook, captures the actual WebGL canvas, and asserts the HUD is
// visible, broad, and framed. Saves a PNG next to the example.
//
// Usage: bun run scene:composer-hud:capture
import { spawn } from "node:child_process"
import { join } from "node:path"

import { chromium } from "playwright"

const root = process.cwd()
const exampleDir = join(root, "examples", "command-composer-hud")
const scenePath = "/examples/command-composer-hud/index.html"
const screenshotPath = join(exampleDir, "command-composer-hud.headless.png")

const host = "127.0.0.1"
const port = Number(process.env.SCENE_PORT ?? "5183")
const url = `http://${host}:${port}${scenePath}`

const build = await Bun.build({
  entrypoints: [join(exampleDir, "src", "main.ts")],
  outdir: join(exampleDir, "dist"),
  target: "browser",
  sourcemap: "none",
  minify: false,
  splitting: false,
})
if (!build.success) {
  console.error("Failed to bundle the command-composer-hud scene.")
  for (const log of build.logs) console.error(log)
  process.exit(1)
}

const vite = spawn(
  "vite",
  ["--host", host, "--port", String(port), "--strictPort"],
  { cwd: root, stdio: "inherit" },
)

const fail = (message: string): never => {
  console.error(message)
  vite.kill("SIGTERM")
  process.exit(1)
}

const waitForServer = async (): Promise<void> => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://${host}:${port}${scenePath}`)
      if (response.ok) return
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  fail("Vite did not start in time.")
}

await waitForServer()

const analyzeHudPixels = async (pngBytes: number[]) => {
  const blob = new Blob([new Uint8Array(pngBytes)], { type: "image/png" })
  const bitmap = await createImageBitmap(blob)
  const probe = document.createElement("canvas")
  probe.width = bitmap.width
  probe.height = bitmap.height
  const ctx = probe.getContext("2d")
  if (ctx === null) return { ok: false as const, reason: "no-2d-context" }
  ctx.drawImage(bitmap, 0, 0)
  const { data } = ctx.getImageData(0, 0, probe.width, probe.height)
  const bg = 0x05
  let nonBackground = 0
  let minX = probe.width
  let minY = probe.height
  let maxX = 0
  let maxY = 0
  const edgeThreshold = 20
  const width = probe.width

  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % width
    const y = Math.floor(i / 4 / width)
    const visible =
      Math.abs(data[i] - bg) > edgeThreshold ||
      Math.abs(data[i + 1] - bg) > edgeThreshold ||
      Math.abs(data[i + 2] - bg) > edgeThreshold
    if (!visible) continue
    nonBackground += 1
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  const spanX = maxX - minX
  const spanY = maxY - minY
  let leftBand = 0
  let rightBand = 0
  let topBand = 0
  let bottomBand = 0
  if (nonBackground > 0) {
    const band = 18
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width
      const y = Math.floor(i / 4 / width)
      const visible =
        Math.abs(data[i] - bg) > edgeThreshold ||
        Math.abs(data[i + 1] - bg) > edgeThreshold ||
        Math.abs(data[i + 2] - bg) > edgeThreshold
      if (!visible) continue
      if (Math.abs(x - minX) <= band) leftBand += 1
      if (Math.abs(x - maxX) <= band) rightBand += 1
      if (Math.abs(y - minY) <= band) topBand += 1
      if (Math.abs(y - maxY) <= band) bottomBand += 1
    }
  }

  return {
    ok: true as const,
    nonBackground,
    width: probe.width,
    height: probe.height,
    minX,
    minY,
    maxX,
    maxY,
    spanX,
    spanY,
    ratio: nonBackground / (probe.width * probe.height),
    leftBand,
    rightBand,
    topBand,
    bottomBand,
  }
}

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } })
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => consoleErrors.push(String(error)))

  await page.goto(url, { waitUntil: "networkidle" })
  await page.waitForSelector("#scene canvas", { timeout: 10_000 })

  type Hook = {
    ready: boolean
    freeze: () => void
    step: (delta: number) => void
    setReducedMotion: (enabled: boolean) => void
  }
  const hookName = "__commandComposerHudScene"
  const ready = await page.evaluate((name) => {
    const hook = (globalThis as unknown as Record<string, Hook>)[name]
    return hook?.ready === true
  }, hookName)
  if (!ready) fail("Command composer HUD hook not ready.")

  await page.evaluate((name) => {
    const hook = (globalThis as unknown as Record<string, Hook>)[name]
    hook.freeze()
    hook.setReducedMotion(false)
    hook.step(0.24)
    hook.step(0.24)
  }, hookName)

  const canvasHandle = await page.waitForSelector("#scene canvas")
  const canvasBox = await canvasHandle.boundingBox()
  const sceneShot =
    canvasBox === null
      ? await page.screenshot({ path: screenshotPath })
      : await page.screenshot({ path: screenshotPath, clip: canvasBox })
  const analysis = await page.evaluate(
    analyzeHudPixels,
    Array.from(sceneShot),
  )
  console.log("command-composer-hud analysis:", JSON.stringify(analysis))

  if (consoleErrors.length > 0) {
    console.warn("page console/page errors:", consoleErrors)
  }
  if (!analysis.ok) fail(`Pixel analysis failed: ${JSON.stringify(analysis)}`)
  if (analysis.nonBackground < 1_500) {
    fail(`HUD appears blank or too faint: ${JSON.stringify(analysis)}`)
  }
  if (analysis.spanX < analysis.width * 0.65 || analysis.spanY < analysis.height * 0.22) {
    fail(`HUD does not span a framed composer rect: ${JSON.stringify(analysis)}`)
  }
  if (
    analysis.leftBand <= 0 ||
    analysis.rightBand <= 0 ||
    analysis.topBand <= 0 ||
    analysis.bottomBand <= 0
  ) {
    fail(`HUD frame bands are incomplete: ${JSON.stringify(analysis)}`)
  }

  console.log(
    `PASS: command composer HUD visible (${analysis.nonBackground} pixels), ` +
      `framed ${analysis.spanX}x${analysis.spanY}. Screenshot: ${screenshotPath}`,
  )
} finally {
  await browser.close()
  vite.kill("SIGTERM")
}
