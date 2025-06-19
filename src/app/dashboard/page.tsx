"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Column, Heading, Text } from '@once-ui-system/core';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

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
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setCheckingOnboarding(false);
    }
  };

  if (loading || checkingOnboarding) {
    return (
      <>
        <Navbar />
        <Column fillWidth minHeight="100vh" align="center" horizontal="center">
          <Text>Loading...</Text>
        </Column>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navbar />
      <Column 
        fillWidth 
        padding="xl" 
        style={{ 
          paddingTop: "144px",
          minHeight: "100vh" 
        }}
      >
        <Column maxWidth="xl" gap="xl">
          <Heading variant="display-strong-l">
            Welcome back, {user.displayName || user.email}!
          </Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Dashboard functionality coming soon...
          </Text>
        </Column>
      </Column>
    </>
  );
}