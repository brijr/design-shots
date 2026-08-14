import { existsSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import puppeteer, { type Browser } from "puppeteer-core";
import { displayUrl, isPrivateHost, normalizeUrl } from "@/lib/url";

export const runtime = "nodejs";
export const maxDuration = 60;

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
} as const;

type ViewportId = keyof typeof VIEWPORTS;

const LOCAL_CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function localChromePath(): string | null {
  const configured = process.env.CHROME_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) return configured;
  return LOCAL_CHROME.find((p) => existsSync(p)) ?? null;
}

async function launch(): Promise<Browser> {
  const local = process.env.VERCEL ? null : localChromePath();
  if (local) {
    return puppeteer.launch({
      executablePath: local,
      headless: true,
      args: ["--hide-scrollbars", "--no-sandbox", "--font-render-hinting=none"],
    });
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    args: [...chromium.args, "--hide-scrollbars"],
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: { url?: string; viewport?: ViewportId; fullPage?: boolean };
  try {
    body = await request.json();
  } catch {
    return fail("Malformed request.");
  }

  const url = normalizeUrl(body.url ?? "");
  if (!url) return fail("That does not look like a web address.");
  if (isPrivateHost(url.hostname)) return fail("That address is not reachable.");

  try {
    const { address } = await lookup(url.hostname);
    if (isPrivateHost(address)) return fail("That address is not reachable.");
  } catch {
    return fail("That domain could not be found.");
  }

  const viewport = VIEWPORTS[body.viewport ?? "desktop"] ?? VIEWPORTS.desktop;

  let browser: Browser | null = null;
  try {
    browser = await launch();
    const page = await browser.newPage();
    await page.setViewport({ ...viewport, deviceScaleFactor: 2 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    );

    const response = await page.goto(url.toString(), {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    if (!response) return fail("The page did not respond.", 502);

    // Let webfonts settle and give lazy hero imagery a moment to arrive.
    await page.evaluate(() => document.fonts?.ready);
    await new Promise((r) => setTimeout(r, 600));

    const shot = await page.screenshot({
      type: "png",
      fullPage: body.fullPage === true,
      encoding: "base64",
      captureBeyondViewport: body.fullPage === true,
    });

    return NextResponse.json({
      image: `data:image/png;base64,${shot}`,
      label: displayUrl(url),
    });
  } catch (error) {
    const message =
      error instanceof Error && /timeout/i.test(error.message)
        ? "The page took too long to load."
        : "Could not capture that page.";
    return fail(message, 502);
  } finally {
    await browser?.close().catch(() => {});
  }
}
