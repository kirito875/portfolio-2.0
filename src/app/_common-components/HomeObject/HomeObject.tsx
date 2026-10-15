"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import "./HomeObject.css";

// three.js is browser-only, so the scene is loaded client-side only.
const HomeObjectScene = dynamic(() => import("./HomeObjectScene"), { ssr: false });

export default function HomeObject() {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div className="home-object">
      {!ready && (
        <div className="home-object__loader" role="status" aria-live="polite">
          <span className="home-object__spinner" aria-hidden="true" />
        </div>
      )}
      <HomeObjectScene onReady={handleReady} />
    </div>
  );
}
