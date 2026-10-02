"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("@/jr/App"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", color: "#f8f3e6", fontFamily: "Jua, sans-serif", fontSize: 22 }}>
      고물 레이서즈 불러오는 중…
    </div>
  ),
});

export default function GameClient() {
  return (
    <div id="root">
      <App />
    </div>
  );
}
