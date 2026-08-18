import { ImageResponse } from "next/og";

export const alt = "Design Pixels — pattern-led pixel illustration";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = ["#6579d8", "#2d7b68", "#8bd06a", "#9b753b", "#c7815e", "#f0b98f"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 72,
          background: "#eeeeee",
          color: "#171717",
        }}
      >
        <div
          style={{
            width: 390,
            height: 390,
            display: "flex",
            flexWrap: "wrap",
            alignContent: "flex-start",
            padding: 24,
            border: "1px solid #30313b",
            background: "#090b12",
          }}
        >
          {Array.from({ length: 144 }, (_, index) => (
            <span
              key={index}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS[(index * 7 + Math.floor(index / 12)) % COLORS.length],
                fontSize: 18,
              }}
            >
              {(index + Math.floor(index / 12)) % 3 === 0 ? "+" : "·"}
            </span>
          ))}
        </div>
        <div style={{ width: 520, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 600, letterSpacing: -2 }}>Design Pixels</div>
          <div style={{ marginTop: 22, fontSize: 30, lineHeight: 1.4, color: "#71717a" }}>
            Block shapes. Texture them. Decorate with tiny motifs. Refine every pixel.
          </div>
          <div style={{ marginTop: 54, fontSize: 22, color: "#a1a1aa" }}>Free · browser-only · indexed color</div>
        </div>
      </div>
    ),
    size,
  );
}
