"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Flex,
  Text,
  Button,
  Avatar,
  Column,
  Icon,
  Background,
  Spinner,
  Row,
} from "@once-ui-system/core";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { signOut } from "@/lib/auth";
import { PanelRight, PanelLeft, ChevronsUpDown, CircleCheck, Circle } from "lucide-react";
import { Dropdown, ConfigProvider } from "antd";
import type { MenuProps } from "antd";

const navigationItems = [
  { icon: "grid", label: "Overview", href: "/dashboard" },
  { icon: "key", label: "API Keys", href: "/dashboard/keys" },
  { icon: "list", label: "Event Logs", href: "/dashboard/logs" },
  { icon: "bell", label: "Alerts", href: "/dashboard/alerts" },
  { icon: "lightbulb", label: "Features", href: "/features" },
  { icon: "settings", label: "Settings", href: "/dashboard/settings" },
  { icon: "user", label: "Team", href: "/dashboard/team" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const {
    projects,
    currentProject,
    currentProjectId,
    loading: projectsLoading,
    switchProject,
  } = useProject();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const navItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Set sidebar open on desktop, closed on mobile
  useEffect(() => {
    const checkScreenSize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };

    // Check on mount
    checkScreenSize();

    // Check on resize
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Clear loading path when navigation completes
  useEffect(() => {
    if (!isPending) {
      setLoadingPath(null);
    }
  }, [isPending]);

  // Update indicator position when pathname changes
  useEffect(() => {
    const updateIndicatorPosition = () => {
      const activeIndex = navigationItems.findIndex((item) => {
        return (
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
        );
      });

      if (activeIndex !== -1 && navItemsRef.current[activeIndex] && navContainerRef.current) {
        const activeItem = navItemsRef.current[activeIndex];
        const container = navContainerRef.current;
        const itemRect = activeItem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const top = itemRect.top - containerRect.top;

        setIndicatorStyle({
          transform: `translateY(${top}px)`,
          height: `${itemRect.height}px`,
          opacity: 1,
        });
      } else {
        setIndicatorStyle({
          opacity: 0,
        });
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(updateIndicatorPosition, 50);

    // Update on window resize
    window.addEventListener("resize", updateIndicatorPosition);
    return () => window.removeEventListener("resize", updateIndicatorPosition);
  }, [pathname, sidebarOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Project dropdown items
  const projectItems: MenuProps["items"] = projects.map((project) => ({
    key: project.id,
    label: (
      <Row vertical="center" horizontal="space-between" fillWidth gap="12">
        <Text variant="body-default-m">{project.displayName}</Text>
        <Row vertical="center" gap="8">
          <Text variant="body-default-xs" onBackground="neutral-weak" style={{ opacity: 0.6 }}>
            {project.role === "owner" ? "Owner" : "Member"}
          </Text>
          {project.id === currentProjectId ? (
            <CircleCheck size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
          ) : (
            <Circle size={16} style={{ color: "rgba(255, 255, 255, 0.3)", flexShrink: 0 }} />
          )}
        </Row>
      </Row>
    ),
    onClick: () => {
      switchProject(project.id);
      router.refresh();
    },
    style: {
      backgroundColor: project.id === currentProjectId ? "rgba(255, 107, 53, 0.08)" : "transparent",
      padding: "4px 12px",
      minHeight: "28px",
    },
  }));

  // User menu items
  const userMenuItems: MenuProps["items"] = [
    {
      key: "signout",
      label: (
        <Flex gap="12" center>
          <Icon name="logout" size="s" />
          <Text>Sign out</Text>
        </Flex>
      ),
      onClick: handleSignOut,
      danger: true,
    },
  ];

  return (
    <Flex
      fillWidth
      style={{ minHeight: "100vh", background: "var(--page-background)", position: "relative" }}
    >
      {/* Background Effect */}
      <Background
        position="absolute"
        mask={{
          cursor: false,
          x: 50,
          y: 0,
          radius: 100,
        }}
        gradient={{
          display: true,
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          tilt: 0,
          colorStart: "brand-background-strong",
          colorEnd: "static-transparent",
          opacity: 30,
        }}
        dots={{
          display: true,
          size: "2",
          color: "brand-on-background-weak",
          opacity: 40,
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          width: sidebarOpen ? "280px" : "60px",
          height: "100vh",
          position: "sticky",
          top: 0,
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          transition: "width 0.3s ease",
          display: "flex",
          flexDirection: "column",
          zIndex: 1,
        }}
      >
        {/* Logo and Toggle */}
        <Flex
          padding="24"
          gap="12"
          vertical="center"
          horizontal={sidebarOpen ? "space-between" : "center"}
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            minHeight: "80px",
          }}
        >
          {sidebarOpen && (
            <Flex gap="12" vertical="center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brand-on-background-strong)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M15 19v-2a3 3 0 0 0 -6 0v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-14h4v3h3v-3h4v3h3v-3h4v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                <path d="M3 11l18 0" />
              </svg>
              <Text variant="heading-strong-m" onBackground="neutral-strong">
                Warden
              </Text>
            </Flex>
          )}

          {/* Sidebar Toggle - Only show in header when sidebar is open */}
          <div
            onClick={() => setSidebarOpen((sidebar) => !sidebar)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "transparent",
              color: "var(--neutral-on-background-weak)",
              borderRadius: "8px",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
              e.currentTarget.style.color = "var(--neutral-on-background-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--neutral-on-background-weak)";
            }}
          >
            <PanelLeft size={20} />
          </div>
        </Flex>

        {/* Project Selector */}
        {sidebarOpen && (
          <div style={{ padding: "16px" }}>
            {projectsLoading ? (
              <Flex fillWidth padding="16" center>
                <Spinner size="s" />
              </Flex>
            ) : projects.length === 0 ? (
              <Text
                variant="body-default-s"
                onBackground="neutral-weak"
                style={{ textAlign: "center", padding: "16px" }}
              >
                No projects yet
              </Text>
            ) : (
              <ConfigProvider
                theme={{
                  token: {
                    colorBgElevated: "rgba(20, 20, 20, 0.98)",
                    colorBorder: "rgba(255, 255, 255, 0.08)",
                    colorText: "rgba(255, 255, 255, 0.9)",
                    colorTextSecondary: "rgba(255, 255, 255, 0.6)",
                    borderRadius: 8,
                    controlItemBgHover: "rgba(255, 255, 255, 0.08)",
                    controlItemBgActive: "rgba(255, 107, 53, 0.08)",
                    controlPaddingHorizontal: 0,
                    padding: 4,
                  },
                }}
              >
                <Dropdown
                  menu={{ items: projectItems }}
                  trigger={["click"]}
                  placement="bottomLeft"
                  overlayStyle={{
                    minWidth: "248px",
                  }}
                  popupRender={(menu) => (
                    <div
                      style={{
                        backgroundColor: "rgba(20, 20, 20, 0.98)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "8px",
                        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                      }}
                    >
                      {menu}
                    </div>
                  )}
                >
                  <button
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      color: "var(--neutral-on-background-strong)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    }}
                  >
                    <Text variant="body-default-m" onBackground="neutral-strong">
                      {currentProject?.displayName || "Select Project"}
                    </Text>
                    <ChevronsUpDown size={16} />
                  </button>
                </Dropdown>
              </ConfigProvider>
            )}
          </div>
        )}

        {/* Navigation */}
        <Column ref={navContainerRef} style={{ flex: 1, padding: "8px", position: "relative" }}>
          {/* Sliding Indicator */}
          <div
            style={{
              position: "absolute",
              left: "4px",
              top: 0,
              width: "calc(100% - 8px)",
              height: "40px",
              backgroundColor: "rgba(255, 107, 53, 0.1)",
              borderRadius: "8px",
              transition:
                "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, height 0.3s ease",
              pointerEvents: "none",
              ...indicatorStyle,
            }}
          />

          {navigationItems.map((item, index) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setLoadingPath(item.href);
                  startTransition(() => {
                    // Navigation will happen automatically
                  });
                }}
                style={{
                  textDecoration: "none",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                <div
                  ref={(el) => {
                    navItemsRef.current[index] = el;
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    padding: sidebarOpen ? "12px 16px" : "12px",
                    backgroundColor: "transparent",
                    color: isActive
                      ? "var(--brand-on-background-strong)"
                      : "var(--neutral-on-background-weak)",
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    opacity: isPending && loadingPath === item.href ? 0.6 : 1,
                    position: "relative",
                    zIndex: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "var(--neutral-on-background-strong)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "var(--neutral-on-background-weak)";
                    }
                  }}
                >
                  <Flex gap="16" vertical="center" fillWidth horizontal="space-between">
                    <Flex gap="16" vertical="center">
                      {isPending && loadingPath === item.href && !sidebarOpen ? (
                        <Spinner size="m" />
                      ) : (
                        <Icon name={item.icon as any} size="s" />
                      )}
                      {sidebarOpen && <Text>{item.label}</Text>}
                    </Flex>
                    {isPending && loadingPath === item.href && sidebarOpen && <Spinner size="m" />}
                  </Flex>
                </div>
              </Link>
            );
          })}
        </Column>

        {/* User Profile */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <ConfigProvider
            theme={{
              token: {
                colorBgElevated: "rgba(20, 20, 20, 0.98)",
                colorBorder: "rgba(255, 255, 255, 0.08)",
                colorText: "rgba(255, 255, 255, 0.9)",
                colorTextSecondary: "rgba(255, 255, 255, 0.6)",
                borderRadius: 8,
                controlItemBgHover: "rgba(255, 255, 255, 0.08)",
                colorError: "rgba(255, 59, 48, 1)",
                colorErrorHover: "rgba(255, 59, 48, 0.8)",
                colorErrorBg: "rgba(255, 59, 48, 0.1)",
                controlPaddingHorizontal: 0,
                padding: 4,
              },
            }}
          >
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={["click"]}
              placement="topLeft"
              popupRender={(menu) => (
                <div
                  style={{
                    backgroundColor: "rgba(20, 20, 20, 0.98)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                  }}
                >
                  {menu}
                </div>
              )}
            >
              <button
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: sidebarOpen ? "8px" : "0px",
                  cursor: "pointer",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Avatar
                  src={user?.photoURL || undefined}
                  fallback={user?.displayName?.charAt(0) || user?.email?.charAt(0) || "?"}
                  size="m"
                />
                {sidebarOpen && (
                  <Column gap="2" style={{ flex: 1, textAlign: "left" }}>
                    <Text variant="body-strong-s" onBackground="neutral-strong">
                      {user?.displayName || "User"}
                    </Text>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {user?.email}
                    </Text>
                  </Column>
                )}
              </button>
            </Dropdown>
          </ConfigProvider>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>{children}</div>
    </Flex>
  );
}
