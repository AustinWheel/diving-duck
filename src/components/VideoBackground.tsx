"use client";

import { useEffect, useRef } from "react";

export function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75; // Slightly slower for more dramatic effect
    }
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        zIndex: -1,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          height: "100%",
          maxWidth: "auto",
          maxHeight: "auto",
          objectFit: "cover",
        }}
      >
        <source src="/abstract-light.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay for better text readability */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(circle at center, 
              rgba(0,0,0,0) 0%, 
              rgba(0,0,0,0.2) 30%, 
              rgba(0,0,0,0.6) 60%, 
              rgba(0,0,0,0.85) 100%
            )
          `,
        }}
      />
    </div>
  );
}
