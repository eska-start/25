import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "고물 레이서즈 - Junk Racers",
    short_name: "고물 레이서즈",
    description: "고물을 모아 차를 만들고 페인트 배틀에서 가장 넓은 영역을 차지하세요.",
    start_url: "/",
    display: "fullscreen",
    orientation: "any",
    background_color: "#18332e",
    theme_color: "#203e35",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
