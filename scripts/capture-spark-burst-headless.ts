// Headless Playwright capture for the isolated spark-burst scene.
//
// Builds the scene, serves it with Vite (strict port, no browser auto-open),
// drives a headless chromium to the page, then deterministically:
//   1. freezes the idle loop,
//   2. emits a burst and captures + measures the BRIGHT additive pixels,
//   3. steps the simulation past the spark lifetime and captures + measures
//      again, asserting the bright cluster DECAYS.
// Saves both PNGs next to the example, plus the canonical render-proof PNG.
//
// Usage: bun run scene:spark:capture
import { spawn } from "node:child_process"
import { join } from "node:path"

import { chromium } from "playwright"

const root = process.cwd()
const exampleDir = join(root, "examples", "spark-burst-standalone")
const scenePath = "/examples/spark-burst-standalone/index.html"
const proofPath = join(exampleDir, "spark-burst-standalone.headless.png")
const emitPath = join(exampleDir, "spark-burst-emit.headless.png")
const decayPath = join(exampleDir, "spark-burst-decay.headless.png")

const host = "127.0.0.1"
const port = Number(process.env.SCENE_PORT ?? "5182")
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
  console.error("Failed to bundle the spark-burst-standalone scene.")
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
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  fail("Vite did not start in time.")
}

await waitForServer()

// Count the bright additive pixels in a captured PNG (decoded from the actual
// renderer output, which is ground truth — WebGL canvas readback is unreliable
// without preserveDrawingBuffer). "Bright" = clearly above the #050505 floor.
const brightAnalysisFn = async (pngBytes: number[]) => {
  const blob = new Blob([new Uint8Array(pngBytes)], { type: "image/png" })
  const bitmap = await createImageBitmap(blob)
  const probe = document.createElement("canvas")
  probe.width = bitmap.width
  probe.height = bitmap.height
  const ctx = probe.getContext("2d")
  if (ctx === null) return { ok: false as const, reason: "no-2d-context" }
  ctx.drawImage(bitmap, 0, 0)
  const { data } = ctx.getImageData(0, 0, probe.width, probe.height)
  let bright = 0
  let total = 0
  let sumX = 0
  let sumY = 0
  const w = probe.width
  for (let i = 0; i < data.length; i += 4) {
    total += 1
    const px = (i / 4) % w
    const py = Math.floor(i / 4 / w)
    // Bright additive spark pixels are well above the dark background.
    if (data[i] > 80 || data[i + 1] > 80 || data[i + 2] > 80) {
      bright += 1
      sumX += px
      sumY += py
    }
  }
  return {
    ok: true as const,
    bright,
    total,
    ratio: total === 0 ? 0 : bright / total,
    centroidX: bright === 0 ? 0 : sumX / bright,
    centroidY: bright === 0 ? 0 : sumY / bright,
    width: probe.width,
    height: probe.height,
  }
}

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } })
  const consoleErrors: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text())
  })
  page.on("pageerror", (e) => consoleErrors.push(String(e)))

  await page.goto(url, { waitUntil: "networkidle" })
  await page.waitForSelector("#scene canvas", { timeout: 10_000 })

  type SparkHook = {
    ready: boolean
    capacity: number
    count: () => number
    freeze: () => void
    burst: (count: number) => void
    step: (delta: number) => void
  }
  const hookName = "__sparkScene"

  const ready = await page.evaluate((name) => {
    const hook = (globalThis as unknown as Record<string, SparkHook>)[name]
    return hook?.ready === true
  }, hookName)
  if (!ready) fail("Spark scene hook not ready.")

  // Freeze the idle loop so the capture fully controls the timeline.
  await page.evaluate((name) => {
    ;(globalThis as unknown as Record<string, SparkHook>)[name].freeze()
  }, hookName)

  // --- EMIT: burst a full pool, then a couple of small steps so sprites have
  // spread out and are mid-life (brightest, largest cluster). ---------------
  const emitCount = await page.evaluate((name) => {
    const hook = (globalThis as unknown as Record<string, SparkHook>)[name]
    hook.burst(120)
    // Tiny steps so sprites move off the origin but stay young/bright.
    hook.step(0.06)
    hook.step(0.06)
    hook.step(0.06)
    hook.step(0.06)
    return hook.count()
  }, hookName)

  const canvasHandle = await page.waitForSelector("#scene canvas")
  const canvasBox = await canvasHandle.boundingBox()
  await page.screenshot({ path: proofPath })
  const emitShot =
    canvasBox === null
      ? await page.screenshot({ path: emitPath })
      : await page.screenshot({ path: emitPath, clip: canvasBox })
  const emit = await page.evaluate(brightAnalysisFn, Array.from(emitShot))
  console.log("EMIT analysis:", JSON.stringify({ emitCount, ...emit }))
  if (!emit.ok) fail("EMIT analysis failed to read pixels.")
  if (emit.bright <= 0) {
    fail(`EMIT produced no bright pixels (${JSON.stringify(emit)}).`)
  }

  // --- DECAY: step well past the spark lifetime (1.2s default). The pool
  // empties; the bright cluster must collapse toward zero. ------------------
  const decayCount = await page.evaluate((name) => {
    const hook = (globalThis as unknown as Record<string, SparkHook>)[name]
    // Several steps summing > lifetime so every spark retires.
    for (let i = 0; i < 30; i += 1) hook.step(0.05)
    return hook.count()
  }, hookName)
  const decayShot =
    canvasBox === null
      ? await page.screenshot({ path: decayPath })
      : await page.screenshot({ path: decayPath, clip: canvasBox })
  const decay = await page.evaluate(brightAnalysisFn, Array.from(decayShot))
  console.log("DECAY analysis:", JSON.stringify({ decayCount, ...decay }))
  if (!decay.ok) fail("DECAY analysis failed to read pixels.")

  if (consoleErrors.length > 0) {
    console.warn("page console/page errors:", consoleErrors)
  }

  // Assertions: emit is a bright cluster; decay is a large drop; pool drained.
  if (decayCount !== 0) {
    fail(`DECAY did not drain the pool (count=${decayCount}).`)
  }
  if (decay.ok && emit.ok && decay.bright >= emit.bright * 0.25) {
    fail(
      `DECAY did not dim enough: emit=${emit.bright} decay=${decay.bright} ` +
        `(expected decay < 25% of emit).`,
    )
  }

  console.log(
    `PASS: spark burst emitted ${emit.bright} bright px (cluster @ ` +
      `${Math.round(emit.centroidX)},${Math.round(emit.centroidY)}) and decayed ` +
      `to ${decay.bright} bright px after lifetime. Proof: ${proofPath}`,
  )
} finally {
  await browser.close()
  vite.kill("SIGTERM")
}
