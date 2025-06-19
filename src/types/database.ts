// Database type definitions for Firestore collections

export type KeyType = "test" | "prod";
export type ProjectType = "personal" | "team";
export type AlertStatus = "pending" | "sent" | "failed";
export type MemberRole = "owner" | "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "expired";

// User document in 'users' collection
export interface User {
  id: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  phoneNumber?: string; // For SMS alerts
  defaultProjectId?: string;
  isOnboarded?: boolean; // Whether user has completed onboarding
}

// Project document in 'projects' collection
export interface Project {
  id: string;
  name: string; // Unique identifier (lowercase, hyphens)
  displayName: string; // Display name (original case)
  type?: ProjectType;
  ownerId: string; // User ID
  memberIds?: string[]; // Array of User IDs
  createdAt: Date;
  updatedAt: Date;

  // Alert configuration
  alertConfig?: {
    smsEnabled: boolean;
    phoneNumbers: string[];
    thresholds: {
      count: number; // Number of events
      windowMinutes: number; // Time window in minutes
    };
  };
}

// API Key document in 'keys' collection
export interface ApiKey {
  id: string;
  key: string; // The actual API key (test_xxx or prod_xxx)
  type: KeyType;
  projectId: string;
  createdBy: string; // User ID
  createdAt: Date;
  expiresAt?: Date; // For test keys (2 hours)
  lastUsedAt?: Date;
  isActive: boolean;
  name?: string; // Optional friendly name
}

// Event document in 'events' collection
export interface LogEvent {
  id: string;
  projectId: string;
  keyId: string;
  keyType: KeyType;
  message: string;
  userId?: string; // User ID from the console.text() call
  timestamp: Date;
  meta?: Record<string, any>;
  ip?: string; // IP address of the request
  userAgent?: string;
}

// Alert document in 'alerts' collection
export interface Alert {
  id: string;
  projectId: string;
  status: AlertStatus;
  message: string;
  eventCount: number; // Number of events that triggered this alert
  windowStart: Date;
  windowEnd: Date;
  sentAt?: Date;
  sentTo?: string[]; // Phone numbers or emails
  error?: string; // Error message if sending failed
  createdAt: Date;
}

// Project member document in 'projectMembers' subcollection
export interface ProjectMember {
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  invitedBy: string; // User ID
}

// Config document in 'config' collection (for global settings)
export interface GlobalConfig {
  id: "global";
  maxTestKeyDurationHours: number;
  defaultAlertThreshold: {
    count: number;
    windowMinutes: number;
  };
  rateLimits: {
    test: {
      requestsPerMinute: number;
    };
    prod: {
      requestsPerMinute: number;
    };
  };
}

// Invite document in 'invites' collection
export interface Invite {
  id: string;
  projectId: string;
  email: string;
  invitedBy: string; // User ID
  status: InviteStatus;
  createdAt: Date;
  sentAt?: Date; // When the email was sent
  acceptedAt?: Date;
  acceptedBy?: string; // User ID
  updatedAt?: Date;
}
