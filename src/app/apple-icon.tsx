import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: "white",
            lineHeight: 1,
            marginTop: -4,
          }}
        >
          S
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
