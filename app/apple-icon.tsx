import { ImageResponse } from "next/og";

// iOS home-screen icon. Generated as PNG via ImageResponse (no raster toolchain
// needed) since iOS ignores the web manifest's SVG icons.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b0b0b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 124,
            height: 124,
            borderRadius: "50%",
            background: "#f5c518",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0b0b0b",
            fontSize: 96,
            fontWeight: 700,
          }}
        >
          C
        </div>
      </div>
    ),
    { ...size }
  );
}
