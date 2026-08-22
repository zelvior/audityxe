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
          background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
        }}
      >
        <svg width="108" height="108" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="#F4F4F5" />
          <path
            d="M12 3a9 9 0 0 1 9 9M12 6.5A5.5 5.5 0 0 1 17.5 12"
            stroke="#F4F4F5"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
