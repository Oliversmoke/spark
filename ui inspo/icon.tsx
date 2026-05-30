import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 112,
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 80,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000000",
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: -6,
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

