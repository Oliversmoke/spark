import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 32,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000000",
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: -2,
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif",
          }}
        >
          9A
        </div>
      </div>
    ),
    { ...size }
  );
}

