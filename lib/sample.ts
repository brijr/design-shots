/**
 * A stand-in screenshot for the empty state, painted rather than shipped as a
 * PNG. Someone landing here should see what the tool produces before deciding
 * to hand over a file of their own.
 */

const W = 1440;
const H = 900;
const RAIL = 248;

const INK = "#18181b";
const MUTED = "#71717a";
const LINE = "#e8e8ea";
const FILL = "#e4e4e7";

export function sampleScreenshot(): string {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Left rail
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, RAIL, H);
  ctx.fillStyle = LINE;
  ctx.fillRect(RAIL, 0, 1, H);

  ctx.fillStyle = INK;
  ctx.font = "600 19px ui-sans-serif, -apple-system, Helvetica, Arial";
  ctx.fillText("Ledger", 32, 54);

  const nav = ["Overview", "Revenue", "Customers", "Invoices", "Settings"];
  nav.forEach((item, i) => {
    const y = 104 + i * 44;
    if (i === 1) {
      ctx.fillStyle = "#efeff1";
      roundRect(ctx, 20, y - 22, RAIL - 40, 34, 7);
      ctx.fill();
    }
    ctx.fillStyle = i === 1 ? INK : MUTED;
    ctx.font = `${i === 1 ? 500 : 400} 15px ui-sans-serif, -apple-system, Helvetica, Arial`;
    ctx.fillText(item, 34, y);
  });

  // Header
  const x = RAIL + 56;
  ctx.fillStyle = INK;
  ctx.font = "600 34px ui-sans-serif, -apple-system, Helvetica, Arial";
  ctx.fillText("Revenue", x, 88);

  ctx.fillStyle = MUTED;
  ctx.font = "15px ui-sans-serif, -apple-system, Helvetica, Arial";
  ctx.fillText("Last 7 months", x, 118);

  ctx.fillStyle = LINE;
  ctx.fillRect(x, 148, W - x - 56, 1);

  // Headline figure
  ctx.fillStyle = INK;
  ctx.font = "600 54px ui-sans-serif, -apple-system, Helvetica, Arial";
  ctx.fillText("$48,200", x, 232);

  ctx.fillStyle = MUTED;
  ctx.font = "15px ui-sans-serif, -apple-system, Helvetica, Arial";
  ctx.fillText("+12.4% from June", x, 264);

  // Bars
  const bars = [0.42, 0.55, 0.48, 0.71, 0.63, 0.86, 1];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const base = 720;
  const span = 340;
  const width = 74;
  const gap = 42;

  bars.forEach((value, i) => {
    const bx = x + i * (width + gap);
    const height = Math.round(span * value);
    ctx.fillStyle = i === bars.length - 1 ? INK : FILL;
    roundRect(ctx, bx, base - height, width, height, 5);
    ctx.fill();

    ctx.fillStyle = MUTED;
    ctx.font = "13px ui-sans-serif, -apple-system, Helvetica, Arial";
    ctx.fillText(months[i], bx, base + 28);
  });

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
