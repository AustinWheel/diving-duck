"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flex, Column, Heading, Text, Icon, Spinner, Button } from '@once-ui-system/core';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [stats, setStats] = useState({
    events: 0,
    alerts: 0,
    apiKeys: 0,
    teamMembers: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
      return;
    }

    if (user) {
      checkOnboardingStatus();
    }
  }, [user, loading, router]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.isOnboarded) {
        router.push('/onboarding');
      } else {
        setCheckingOnboarding(false);
        // Load dashboard stats
        loadDashboardStats();
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setCheckingOnboarding(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true);
      
      // Get the current user's ID token
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      
      // Fetch stats from API
      const response = await fetch('/api/v1/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      console.log(data)
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || checkingOnboarding) {
    return (
      <Flex fillWidth fillHeight center style={{ minHeight: "100vh" }}>
        <Spinner size="l" />
      </Flex>
    );
  }

  if (!user) {
    return null;
  }

  // Stats card component
  const StatCard = ({ icon, label, value, color }: { icon: any; label: string; value: string | number; color?: string }) => (
    <div
      style={{
        flex: 1,
        padding: "24px",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        minWidth: "200px",
      }}
    >
      <Flex gap="16" vertical="center" style={{ marginBottom: "16px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            backgroundColor: color ? `${color}20` : "rgba(255, 107, 53, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size="m" color={color || "var(--brand-on-background-strong)"} />
        </div>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {label}
        </Text>
      </Flex>
      <Text variant="heading-strong-xl" onBackground="neutral-strong">
        {value}
      </Text>
    </div>
  );

  return (
    <Column fillWidth padding="32" gap="32">
      {/* Header */}
      <Column gap="8">
        <Heading variant="display-strong-l">
          Welcome back, {user.displayName || user.email}!
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Monitor your application events and manage alerts
        </Text>
      </Column>

      {/* Stats Cards */}
      <Flex gap="24" wrap style={{ marginTop: "16px" }}>
        <StatCard icon="zap" label="Events (24h)" value={loadingStats ? "..." : stats.events} />
        <StatCard icon="bell" label="Active Alerts" value={loadingStats ? "..." : stats.alerts} color="var(--danger-on-background-strong)" />
        <StatCard icon="key" label="API Keys" value={loadingStats ? "..." : stats.apiKeys} color="var(--success-on-background-strong)" />
        <StatCard icon="user" label="Team Members" value={loadingStats ? "..." : stats.teamMembers} color="var(--info-on-background-strong)" />
      </Flex>

      {/* Recent Events Section */}
      <Column gap="16" style={{ marginTop: "24px" }}>
        <Flex fillWidth horizontal="space-between" vertical="center">
          <Text variant="heading-strong-m" onBackground="neutral-strong">
            Recent Events
          </Text>
          <Button href="/dashboard/logs" variant="ghost" size="s">
            View All
          </Button>
        </Flex>
        
        <div
          style={{
            padding: "48px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            textAlign: "center",
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Icon name="folder" size="l" color="var(--neutral-on-background-weak)"/>
          <Text variant="body-default-m" onBackground="neutral-weak" padding="8">
            No events logged yet
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak" style={{ marginTop: "8px" }}>
            Start using console.text() in your application to see events here
          </Text>
        </div>
      </Column>

      {/* Quick Actions */}
      <Column gap="16" style={{ marginTop: "24px" }}>
        <Text variant="heading-strong-m" onBackground="neutral-strong">
          Quick Actions
        </Text>
        <Flex gap="16" wrap>
          <Button href="/dashboard/keys" variant="secondary" size="m">
            <Icon name="key" size="s" padding="8" />
            <Text padding="8">Manage API Keys</Text>
          </Button>
          <Button href="/dashboard/team" variant="secondary" size="m">
            <Icon name="userPlus" size="s" padding="8" /> 
            <Text padding="8">Invite Team Member</Text>
          </Button>
          <Button href="/dashboard/settings" variant="secondary" size="m">
            <Icon name="settings" size="s" padding="8" />
            <Text padding="8">Configure Alerts</Text>
          </Button>
        </Flex>
      </Column>
    </Column>
  );
}