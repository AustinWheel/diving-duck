"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, onAuthStateChange } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
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

            // Check for pending invite
            const pendingInvite = sessionStorage.getItem("pendingInvite");
            if (pendingInvite) {
              window.location.href = `/invite?id=${pendingInvite}`;
              return;
            }

            // Redirect to onboarding if not onboarded
            if (
              !data.isOnboarded &&
              window.location.pathname !== "/onboarding" &&
              !window.location.pathname.startsWith("/invite")
            ) {
              window.location.href = "/onboarding";
              return;
            }
          }
        } catch (error) {
          console.error("Error syncing user:", error);
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};
