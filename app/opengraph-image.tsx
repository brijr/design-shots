import { ImageResponse } from "next/og";

export const alt = "Design Shots — turn a screenshot into a product shot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card is itself a design shot: an artboard on a neutral field, with the
 * hairline the app defaults to. Whatever the product does, the preview of the
 * product should already be doing it.
 */
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
          background: "#f2f2f2",
        }}
      >
        <div
          style={{
            width: 1000,
            height: 450,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
            borderRadius: 14,
            border: "1px solid #e0e0e0",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 68,
                fontWeight: 600,
                letterSpacing: -2,
                color: "#18181b",
              }}
            >
              Design Shots
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 30,
                lineHeight: 1.4,
                color: "#71717a",
                maxWidth: 720,
              }}
            >
              Turn a screenshot into a clean product shot. Four neutral
              backgrounds, a handful of good settings, nothing else.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 22,
              color: "#a1a1aa",
            }}
          >
            <span>design-shots.com</span>
            <span>Free and open source</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
