"use client";

import { useEffect, useState } from "react";
import { Text, Flex, Icon, Spinner } from "@once-ui-system/core";
import { useLiveEventCount } from "@/hooks/useLiveEventCount";

interface LiveEventCounterProps {
  projectId: string | null;
}

export default function LiveEventCounter({ projectId }: LiveEventCounterProps) {
  const { count, isConnected, error } = useLiveEventCount({
    projectId,
    enabled: !!projectId,
  });
  const [displayCount, setDisplayCount] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate count changes
  useEffect(() => {
    if (count === null || count === displayCount) return;

    const difference = count - displayCount;
    const duration = 500; // Animation duration in ms
    const steps = 20;
    const stepDuration = duration / steps;
    const increment = difference / steps;

    let currentStep = 0;
    setIsAnimating(true);

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep === steps) {
        setDisplayCount(count);
        setIsAnimating(false);
        clearInterval(interval);
      } else {
        setDisplayCount((prev) => Math.round(prev + increment));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [count]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "rgba(255, 107, 53, 0.05)",
        border: "1px solid rgba(255, 107, 53, 0.2)",
        borderRadius: "16px",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.02) 100%)",
      }}
    >
      {/* Animated background pulse */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%)",
          animation: isAnimating ? "pulse 0.5s ease-out" : "none",
        }}
      />

      <Flex direction="column" gap="12" style={{ position: "relative" }}>
        <Flex gap="8" vertical="center">
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 107, 53, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(255, 107, 53, 0.15)",
            }}
          >
            <Icon name="activity" size="m" color="var(--brand-on-background-strong)" />
          </div>
          <Flex direction="column" gap="2">
            <Text variant="body-default-s" onBackground="neutral-weak">
              Total Events
            </Text>
            <Flex gap="12" vertical="center">
              {count === null ? (
                <div style={{ height: "2.5rem", display: "flex", alignItems: "center" }}>
                  <Spinner size="m" />
                </div>
              ) : (
                <>
                  <Text
                    variant="display-strong-xl"
                    onBackground="neutral-strong"
                    style={{
                      fontSize: "3rem",
                      lineHeight: "1",
                      fontWeight: 800,
                      transition: "all 0.3s ease",
                      transform: isAnimating ? "scale(1.02)" : "scale(1)",
                      color: isAnimating ? "var(--brand-on-background-strong)" : "var(--neutral-on-background-strong)",
                    }}
                  >
                    {formatNumber(displayCount)}
                  </Text>
                  {isConnected && (
                    <Flex gap="4" vertical="center">
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "#22c55e",
                          animation: "pulse-dot 2s infinite",
                        }}
                        title="Live updates active"
                      />
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Live
                      </Text>
                    </Flex>
                  )}
                </>
              )}
            </Flex>
          </Flex>
        </Flex>

        {error && (
          <Text variant="body-default-xs" style={{ color: "#ef4444" }}>
            {error}
          </Text>
        )}

        {!isConnected && !error && count !== null && (
          <Text variant="body-default-xs" onBackground="neutral-weak">
            Reconnecting...
          </Text>
        )}
      </Flex>

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        @keyframes pulse-dot {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}