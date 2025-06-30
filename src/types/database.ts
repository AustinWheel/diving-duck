// Database type definitions for Firestore collections

export type KeyType = "test" | "prod";
export type ProjectType = "personal" | "team";
export type AlertStatus = "pending" | "sent" | "failed" | "acknowledged";
export type MemberRole = "owner" | "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "expired";
export type NotificationType = "text" | "call";
export type SubscriptionTier = "basic" | "pro" | "enterprise";

// Subscription limits for each tier
export interface SubscriptionLimits {
  teamMembers: number; // Max total team members (including owner)
  dailyAlerts: number; // Max alerts per day
  testAlerts: number; // Total test alerts allowed
  dailyEvents: number; // Max events per day
  phoneNumbers: number; // Max phone numbers for alerts
  alertRules: number; // Max alert rules
  activeTestKeys: number; // Max active test keys
  activeProdKeys: number; // Max active production keys
  eventBucketMinutes: number; // Time bucket duration for event storage
}

// Usage tracking for subscription limits
export interface ProjectUsage {
  dailyEvents: number; // Events sent today
  dailyEventsResetAt: Date; // When to reset daily counter
  dailyAlerts: number; // Alerts sent today
  dailyAlertsResetAt: Date; // When to reset daily counter
  totalTestAlerts: number; // Total test alerts sent all-time
  lastUpdated: Date; // Last time usage was updated
}

// Alert configuration types
export interface GlobalAlertLimit {
  enabled: boolean;
  windowMinutes: number; // Time window for event counting
  maxAlerts: number; // Number of events within window that triggers an alert
  logTypes?: LogType[]; // Optional: specific log types to match (default: all)
}

export interface MessageAlertRule {
  message: string; // Message content to match
  windowMinutes: number; // Time window for event counting
  maxAlerts: number; // Number of events with this message within window that triggers an alert
  logTypes?: LogType[]; // Optional: specific log types to match (default: all)
}

export interface AlertRule {
  globalLimit: GlobalAlertLimit;
  messageRules: MessageAlertRule[];
  notificationType: NotificationType; // text or call
}

// User document in 'users' collection
export interface User {
  id: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  phoneNumber?: string; // For SMS alerts
  projectIds?: string[]; // Array of project IDs user is member of
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

  // Subscription
  subscriptionTier: SubscriptionTier; // Current subscription tier
  subscriptionLimits: SubscriptionLimits; // Cached limits for quick access
  usage?: ProjectUsage; // Usage tracking

  // Alert configuration
  alertConfig?: {
    enabled: boolean;
    phoneNumbers: string[]; // Phone numbers to send alerts to
    alertRules: AlertRule[]; // Array of alert rules (text first, then call if needed)
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
  domain?: string; // Optional domain whitelist for production keys (e.g., "https://warden.sh")
}

// Log types supported
export type LogType = "text" | "call" | "callText" | "log" | "warn" | "error";

// Event document in 'events' collection
export interface LogEvent {
  id: string;
  projectId: string;
  keyId: string;
  keyType: KeyType;
  type: LogType; // Type of console method used
  message: string;
  userId?: string; // User ID from the console call
  timestamp: Date;
  meta?: Record<string, any>;
  ip?: string; // IP address of the request
  userAgent?: string;
}

// Bucketed events document in 'bucketedEvents' collection
export interface BucketedEvents {
  id: string; // Format: projectId_YYYYMMDD_HHmm
  projectId: string;
  bucketStart: Date;
  bucketEnd: Date;
  events: Omit<LogEvent, "id">[]; // Events without individual IDs
  eventCount: number;
  lastUpdated: Date;
}

// Alert document in 'alerts' collection
export interface Alert {
  id: string;
  projectId: string;
  status: AlertStatus;
  notificationType: NotificationType;
  message: string;
  eventIds: string[]; // IDs of events that triggered this alert
  eventCount: number; // Number of events that triggered this alert
  windowStart: Date;
  windowEnd: Date;
  sentAt?: Date;
  sentTo?: string[]; // Phone numbers or emails
  error?: string; // Error message if sending failed
  createdAt: Date;

  // For callText escalation tracking
  textAlertId?: string; // Reference to the text alert (for call escalations)
  acknowledgedAt?: Date; // When the alert was acknowledged
  acknowledgedBy?: string; // User ID who acknowledged
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

// Feature request status
export type FeatureRequestStatus = "submitted" | "in_progress" | "implemented" | "denied";

// Feature request document in 'featureRequests' collection
export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: FeatureRequestStatus;
  createdBy: string; // User ID
  createdByEmail: string; // User email for display
  createdByName?: string; // User display name for display
  upvotedBy: string[]; // Array of User IDs who upvoted
  upvoteCount: number; // Cached count for performance
  createdAt: Date;
  updatedAt: Date;
}
