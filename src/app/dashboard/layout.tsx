"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Flex, Text, Button, Avatar, Column, Icon, Select } from "@once-ui-system/core";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";

const navigationItems = [
  { icon: "grid", label: "Overview", href: "/dashboard" },
  { icon: "key", label: "API Keys", href: "/dashboard/keys" },
  { icon: "list", label: "Event Logs", href: "/dashboard/logs" },
  { icon: "bell", label: "Alerts", href: "/dashboard/alerts" },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Set sidebar open on desktop, closed on mobile
  useEffect(() => {
    const checkScreenSize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    
    // Check on mount
    checkScreenSize();
    
    // Check on resize
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const userMenu = document.querySelector('[data-user-menu]');
      const userButton = document.querySelector('[data-user-button]');
      
      if (userMenu && !userMenu.contains(target) && userButton && !userButton.contains(target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);
      
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showUserMenu]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Flex fillWidth style={{ minHeight: "100vh", background: "var(--page-background)" }}>
      {/* Sidebar */}
      <div
        style={{
          width: sidebarOpen ? "280px" : "60px",
          height: "100vh",
          position: "sticky",
          top: 0,
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(10, 10, 12, 0.95)",
          transition: "width 0.3s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo */}
        <Flex
          padding="24"
          gap="12"
          vertical="center"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            minHeight: "80px",
          }}
        >
          {sidebarOpen && (
            <>
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
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M15 19v-2a3 3 0 0 0 -6 0v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-14h4v3h3v-3h4v3h3v-3h4v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/>
                <path d="M3 11l18 0"/>
              </svg>
              <Text variant="heading-strong-m" onBackground="neutral-strong">
                Warden
              </Text>
            </>
          )}
        </Flex>

        {/* Project Selector */}
        {sidebarOpen && (
          <div style={{ padding: "16px" }}>
            <Select
              label="Project"
              id="1"
              options={[
                { value: "project-1", label:"My Project" },
              ]}
              value="project-1"
              onChange={() => {}}
            />
          </div>
        )}

        {/* Navigation */}
        <Column style={{ flex: 1, padding: "8px" }}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            
            return (
              <Button
                key={item.href}
                href={item.href}
                variant="tertiary"
                size="m"
                fillWidth
                style={{
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "12px 16px" : "12px",
                  backgroundColor: isActive ? "rgba(255, 107, 53, 0.1)" : "transparent",
                  color: isActive ? "var(--brand-on-background-strong)" : "var(--neutral-on-background-weak)",
                  borderRadius: "8px",
                  marginBottom: "4px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                    e.currentTarget.style.color = "var(--neutral-on-background-strong)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--neutral-on-background-weak)";
                  }
                }}
              >
                <Flex gap="16" vertical="center" fillWidth>
                  <Icon name={item.icon as any} size="s" />
                  {sidebarOpen && <Text>{item.label}</Text>}
                </Flex>
              </Button>
            );
          })}
        </Column>

        {/* User Profile */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            position: "relative",
          }}
        >
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
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
            data-user-button
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

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "16px",
                right: "16px",
                backgroundColor: "rgba(20, 20, 20, 0.98)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "8px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(24px)",
                minWidth: "120px",
              }}
              data-user-menu
            >
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="s"
                fillWidth
                style={{
                  justifyContent: "flex-start",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  color: "var(--danger-on-background-weak)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 59, 48, 0.1)";
                  e.currentTarget.style.color = "var(--danger-on-background-strong)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--danger-on-background-weak)";
                }}
              >
                <Flex gap="12" vertical="center">
                  <Icon name="logout" size="s" />
                  <Text>Sign out</Text>
                </Flex>
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar Toggle */}
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          variant="ghost"
          size="s"
          style={{
            position: "absolute",
            right: "-20px",
            top: "24px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: "var(--page-background)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <Icon 
            name={sidebarOpen ? "chevronLeft" : "chevronRight"} 
            size="s" 
          />
        </Button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {children}
      </div>
    </Flex>
  );
}