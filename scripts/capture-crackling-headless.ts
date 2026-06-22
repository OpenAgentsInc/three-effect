// Headless Playwright capture for the isolated crackling-energy scene.
//
// Builds the scene, serves it with Vite (strict port, no browser auto-open),
// drives a headless chromium to the page, lets the animation settle, takes a
// screenshot, and asserts the canvas is NON-BLANK (has pixels that differ from
// the #050505 background). Saves the PNG next to the example.
//
// Usage: bun run scene:crackling:capture
import { spawn } from "node:child_process"
import { join } from "node:path"

import { chromium } from "playwright"

const root = process.cwd()
const exampleDir = join(root, "examples", "crackling-arc-standalone")
const scenePath = "/examples/crackling-arc-standalone/index.html"
const screenshotPath = join(exampleDir, "crackling-arc-standalone.headless.png")

const host = "127.0.0.1"
const port = Number(process.env.SCENE_PORT ?? "5181")
const url = `http://${host}:${port}${scenePath}?portal=1`

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

// Wait for Vite to answer.
const waitForServer = async (): Promise<void> => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://${host}:${port}${scenePath}`)
      if (response.ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  fail("Vite did not start in time.")
}

await waitForServer()

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

  const boot = await page.evaluate(
    () =>
      (globalThis as unknown as { __cracklingScene?: { arcRendered: boolean; portalRendered: boolean } })
        .__cracklingScene,
  )
  console.log("scene boot hook:", JSON.stringify(boot))
  if (!boot?.arcRendered) fail("Scene reported arcRendered=false.")

  // Let several animated frames accumulate before capturing.
  await page.waitForTimeout(1500)

  // Crop the screenshot to the scene canvas (below the header) so the analysis
  // only counts rendered WebGL pixels, not header text. The full screenshot is
  // also saved for human inspection.
  const canvasBox = await (await page.waitForSelector("#scene canvas")).boundingBox()
  await page.screenshot({ path: screenshotPath })
  const sceneShot =
    canvasBox === null
      ? await page.screenshot()
      : await page.screenshot({ clip: canvasBox })

  // Analyze the ACTUAL captured PNG (ground truth). Reading the WebGL canvas
  // back via drawImage is unreliable without preserveDrawingBuffer, so we
  // decode the screenshot the renderer produced instead.
  const analysis = await page.evaluate(async (pngBytes) => {
    const blob = new Blob([new Uint8Array(pngBytes)], { type: "image/png" })
    const bitmap = await createImageBitmap(blob)
    const probe = document.createElement("canvas")
    probe.width = bitmap.width
    probe.height = bitmap.height
    const ctx = probe.getContext("2d")
    if (ctx === null) return { ok: false, reason: "no-2d-context" as const }
    ctx.drawImage(bitmap, 0, 0)
    const { data } = ctx.getImageData(0, 0, probe.width, probe.height)
    const bg = 0x05 // #050505 scene background
    let nonBackground = 0
    let total = 0
    for (let i = 0; i < data.length; i += 4) {
      total += 1
      if (
        Math.abs(data[i] - bg) > 12 ||
        Math.abs(data[i + 1] - bg) > 12 ||
        Math.abs(data[i + 2] - bg) > 12
      ) {
        nonBackground += 1
      }
    }
    return {
      ok: nonBackground > 0,
      reason: "sampled" as const,
      nonBackground,
      total,
      ratio: total === 0 ? 0 : nonBackground / total,
      width: probe.width,
      height: probe.height,
    }
  }, Array.from(sceneShot))

  console.log("scene-canvas analysis:", JSON.stringify(analysis))
  if (consoleErrors.length > 0) {
    console.warn("page console/page errors:", consoleErrors)
  }
  if (!analysis.ok) {
    fail(`Canvas appears blank (${JSON.stringify(analysis)}).`)
  }

  console.log(
    `PASS: non-blank crackling render. ${
      "nonBackground" in analysis ? analysis.nonBackground : "?"
    } non-background pixels. Screenshot: ${screenshotPath}`,
  )
} finally {
  await browser.close()
  vite.kill("SIGTERM")
}
