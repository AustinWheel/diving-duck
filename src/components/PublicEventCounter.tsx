"use client";

import { useEffect, useState } from "react";
import { Text, Flex, Spinner } from "@once-ui-system/core";
import { usePublicStats } from "@/hooks/usePublicStats";

export default function PublicEventCounter() {
  const { stats, loading, error } = usePublicStats();
  const [displayCount, setDisplayCount] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate count changes
  useEffect(() => {
    if (!stats || stats.totalEvents === displayCount) return;

    const difference = stats.totalEvents - displayCount;
    const duration = 1000; // Animation duration in ms
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = difference / steps;

    let currentStep = 0;
    setIsAnimating(true);

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep === steps) {
        setDisplayCount(stats.totalEvents);
        setIsAnimating(false);
        clearInterval(interval);
      } else {
        setDisplayCount((prev) => Math.round(prev + increment));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [stats?.totalEvents]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <Flex direction="column" gap="24" align="center" style={{ marginTop: "60px", marginBottom: "40px" }}>
        <Spinner size="m" />
      </Flex>
    );
  }

  if (error || !stats) {
    return null; // Silently fail if stats aren't available
  }

  return (
    <Flex
      direction="column"
      gap="24"
      align="center"
      style={{
        marginTop: "60px",
        marginBottom: "40px",
      }}
    >
      <Flex direction="column" gap="8" align="center">
        <Text variant="body-default-s" onBackground="neutral-weak">
          Trusted by developers worldwide
        </Text>
        <Flex gap="16" vertical="center">
          <Text
            variant="display-strong-l"
            onBackground="neutral-strong"
            style={{
              fontSize: "3.5rem",
              lineHeight: "1",
              fontWeight: 800,
              transition: "all 0.3s ease",
              transform: isAnimating ? "scale(1.02)" : "scale(1)",
              color: isAnimating ? "var(--brand-on-background-strong)" : "var(--neutral-on-background-strong)",
            }}
          >
            {formatNumber(displayCount)}
          </Text>
          <Flex direction="column" gap="4" align="start">
            <Text variant="heading-strong-m" onBackground="neutral-weak">
              events logged
            </Text>
            <Flex gap="8" vertical="center">
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                  animation: "pulse-dot 2s infinite",
                }}
              />
              <Text padding="2" variant="body-default-xs" onBackground="neutral-weak">
                and counting
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Flex>

      <style jsx>{`
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
    </Flex>
  );
}