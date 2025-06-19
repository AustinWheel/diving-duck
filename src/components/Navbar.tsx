"use client";

import { Flex, Text, Button, Avatar, Card, Column, Icon } from "@once-ui-system/core";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const dropdown = document.querySelector('[data-dropdown]');
      const avatar = document.querySelector('[data-avatar]');
      
      if (dropdown && !dropdown.contains(target) && avatar && !avatar.contains(target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);
      
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDropdown]);

  const isDashboard = pathname.startsWith("/dashboard");
  const isHome = pathname === "/";

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "16px",
        pointerEvents: "none",
      }}
    >
    <Flex
      as="nav"
      style={{
        height: "64px",
        borderRadius: "16px",
        backdropFilter: isScrolled || !isHome ? "blur(20px) saturate(180%)" : "blur(10px) saturate(180%)",
        backgroundColor: isScrolled || !isHome ? "rgba(2, 2, 5, 0.85)" : "rgba(2, 2, 5, 0.7)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        transition: "all 0.3s ease",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        pointerEvents: "auto",
        overflow: "visible",
      }}
    >
    <Flex
      fillWidth
      height="64"
      horizontal="space-between"
      vertical="center"
      paddingX="xl"
    >
      {/* Logo */}
      <Flex href="/" gap="s" vertical="center" as="a" style={{ textDecoration: "none", flexShrink: 0 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-on-background-strong)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M15 19v-2a3 3 0 0 0 -6 0v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-14h4v3h3v-3h4v3h3v-3h4v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/>
          <path d="M3 11l18 0"/>
        </svg>
        <Text variant="heading-strong-m" onBackground="neutral-strong">Warden</Text>
      </Flex>

      {/* Desktop Navigation - Hidden on small screens */}
      <Flex gap="24" vertical="center" hide="s" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
        <Button href="/docs" variant="tertiary" size="s" style={{ color: "var(--neutral-on-background-weak)" }}>
          Docs
        </Button>
        <Button href="/pricing" variant="tertiary" size="s" style={{ color: "var(--neutral-on-background-weak)" }}>
          Pricing
        </Button>
        <Button href="/blog" variant="tertiary" size="s" style={{ color: "var(--neutral-on-background-weak)" }}>
          Blog
        </Button>
        <Button href="/changelog" variant="tertiary" size="s" style={{ color: "var(--neutral-on-background-weak)" }}>
          Changelog
        </Button>
      </Flex>

      {/* Right side actions */}
      <Flex gap="s" vertical="center">
        {user ? (
          <>
            <Button href="/dashboard" variant={isDashboard ? "secondary" : "primary"} size="s" hide="s">
              Dashboard
            </Button>
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                data-avatar
              >
                <Avatar
                  src={user.photoURL || undefined}
                  fallback={user.displayName?.charAt(0) || user.email?.charAt(0) || "?"}
                  size="m"
                />
              </button>
              {showDropdown && (
                <Card
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    minWidth: "240px",
                    zIndex: 1000,
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8)",
                    backdropFilter: "blur(24px)",
                    backgroundColor: "rgba(10, 10, 12, 0.98)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "8px",
                  }}
                  data-dropdown
                >
                  <Column gap="4">
                    {/* User Info Section */}
                    <Flex 
                      fillWidth 
                      direction="column" 
                      gap="4"
                      padding="12"
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <Text variant="body-strong-s" onBackground="neutral-strong">
                        {user.displayName || "User"}
                      </Text>
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        {user.email}
                      </Text>
                    </Flex>
                    
                    {/* Menu Items */}
                    <Column gap="2" padding="4">
                      <Button
                        href="/dashboard"
                        variant="ghost"
                        size="s"
                        fillWidth
                        style={{
                          justifyContent: "flex-start",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          color: "var(--neutral-on-background-weak)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                          e.currentTarget.style.color = "var(--neutral-on-background-strong)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--neutral-on-background-weak)";
                        }}
                      >
                        <Flex gap="12" vertical="center">
                          <Icon name="grid" size="s" />
                          <Text>Dashboard</Text>
                        </Flex>
                      </Button>
                      
                      <Button
                        href="/dashboard/settings"
                        variant="ghost"
                        size="s"
                        fillWidth
                        style={{
                          justifyContent: "flex-start",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          color: "var(--neutral-on-background-weak)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                          e.currentTarget.style.color = "var(--neutral-on-background-strong)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--neutral-on-background-weak)";
                        }}
                      >
                        <Flex gap="12" vertical="center">
                          <Icon name="settings" size="s" />
                          <Text>Settings</Text>
                        </Flex>
                      </Button>
                    </Column>
                    
                    {/* Sign Out Section */}
                    <Column 
                      gap="2" 
                      padding="4"
                      style={{
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
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
                          transition: "all 0.2s ease",
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
                    </Column>
                  </Column>
                </Card>
              )}
            </div>
          </>
        ) : (
          <>
            <Button href="/auth/signin" variant="tertiary" size="s" style={{ color: "var(--neutral-on-background-weak)" }} hide="s">
              Log in
            </Button>
            <Button 
              href="/auth/signin" 
              variant="primary" 
              size="s"
              style={{ 
                backgroundColor: "var(--brand-background-strong)",
                color: "var(--brand-on-background-strong)",
                fontWeight: 500,
                border: "1px solid var(--brand-border-medium)",
              }}
            >
              <span className="mobile-hide">Sign Up</span>
              <span className="mobile-show">Join</span>
            </Button>
          </>
        )}
      </Flex>
    </Flex>
    </Flex>
    </div>
  );
}
