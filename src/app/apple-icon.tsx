import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Fixed light-on-dark, unlike icon.svg: an iOS home-screen icon is painted once against the
// user's wallpaper, so there is no colour scheme to follow and transparency is not honoured.
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
  stroke="#fafafa" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8.59 13.51 15.42 17.49" />
  <path d="M15.41 6.51 8.59 10.49" />
  <circle cx="18" cy="5" r="3.2" fill="#fafafa" />
  <circle cx="6" cy="12" r="3.2" fill="#fafafa" />
  <circle cx="18" cy="19" r="3.2" fill="#fafafa" />
</svg>`;

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
          background: "#171717",
        }}
      >
        <img
          width={112}
          height={112}
          alt=""
          src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`}
        />
      </div>
    ),
    size,
  );
}
