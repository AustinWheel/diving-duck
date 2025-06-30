"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, onAuthStateChange } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOnboarded: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isOnboarded: false,
  refreshUserData: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const refreshUserData = async () => {
    if (!user) return;
    
    try {
      const response = await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsOnboarded(data.isOnboarded || false);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Create or update user in Firestore
        try {
          const response = await fetch("/api/auth/sync-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            }),
          });

          if (!response.ok) {
            console.error("Failed to sync user with database");
          } else {
            const data = await response.json();
            setIsOnboarded(data.isOnboarded || false);

            // Check for pending invite
            const pendingInvite = sessionStorage.getItem("pendingInvite");
            if (pendingInvite) {
              window.location.href = `/invite?id=${pendingInvite}`;
              return;
            }

            // Only redirect to onboarding if not already there and not completing onboarding
            const currentPath = window.location.pathname;
            const isOnOnboardingPage = currentPath === "/onboarding";
            const isOnInvitePage = currentPath.startsWith("/invite");
            const isCompletingOnboarding = sessionStorage.getItem("completingOnboarding") === "true";
            
            if (
              !data.isOnboarded &&
              !isOnOnboardingPage &&
              !isOnInvitePage &&
              !isCompletingOnboarding
            ) {
              window.location.href = "/onboarding";
              return;
            }
          }
        } catch (error) {
          console.error("Error syncing user:", error);
        }
      } else {
        setIsOnboarded(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={{ user, loading, isOnboarded, refreshUserData }}>{children}</AuthContext.Provider>;
};
