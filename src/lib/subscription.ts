import { SubscriptionTier, SubscriptionLimits, ProjectUsage } from "@/types/database";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

// Define tier configurations
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionLimits> = {
  basic: {
    teamMembers: 2, // Owner + 1 invite = 2 total members
    dailyAlerts: 1, // 1 alert per day
    testAlerts: 5, // 5 total test alerts
    dailyEvents: 500, // 500 events per day
    phoneNumbers: 2, // 2 phone numbers
    alertRules: 1, // 1 alert rule
    activeTestKeys: 1, // 1 active test key
    activeProdKeys: 1, // 1 active production key
    eventBucketMinutes: 60, // 1 hour buckets
  },
  pro: {
    teamMembers: 11, // Owner + 10 invites = 11 total members
    dailyAlerts: 100,
    testAlerts: -1, // Unlimited
    dailyEvents: 50000,
    phoneNumbers: 10,
    alertRules: 10,
    activeTestKeys: 5,
    activeProdKeys: 5,
    eventBucketMinutes: 20, // 20 minute buckets
  },
  enterprise: {
    teamMembers: -1, // Unlimited
    dailyAlerts: -1, // Unlimited
    testAlerts: -1, // Unlimited
    dailyEvents: -1, // Unlimited
    phoneNumbers: -1, // Unlimited
    alertRules: -1, // Unlimited
    activeTestKeys: -1, // Unlimited
    activeProdKeys: -1, // Unlimited
    eventBucketMinutes: 5, // 5 minute buckets
  },
};

/**
 * Get subscription limits for a tier
 */
export function getSubscriptionLimits(tier: SubscriptionTier): SubscriptionLimits {
  return SUBSCRIPTION_TIERS[tier];
}

/**
 * Check if a usage value is within limit (-1 means unlimited)
 */
export function isWithinLimit(current: number, limit: number): boolean {
  return limit === -1 || current < limit;
}

/**
 * Get or initialize project usage
 */
export async function getProjectUsage(projectId: string): Promise<ProjectUsage> {
  const projectDoc = await adminDb.collection("projects").doc(projectId).get();
  const project = projectDoc.data();

  if (!project) {
    throw new Error("Project not found");
  }

  // Initialize usage if it doesn't exist
  if (!project.usage) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const usage: ProjectUsage = {
      dailyEvents: 0,
      dailyEventsResetAt: tomorrow,
      dailyAlerts: 0,
      dailyAlertsResetAt: tomorrow,
      totalTestAlerts: 0,
      lastUpdated: now,
    };

    await adminDb.collection("projects").doc(projectId).update({
      usage: {
        dailyEvents: 0,
        dailyEventsResetAt: admin.firestore.Timestamp.fromDate(tomorrow),
        dailyAlerts: 0,
        dailyAlertsResetAt: admin.firestore.Timestamp.fromDate(tomorrow),
        totalTestAlerts: 0,
        lastUpdated: admin.firestore.Timestamp.now(),
      },
    });

    return usage;
  }

  // Check if daily counters need to be reset
  const usage = project.usage;
  const now = new Date();
  let needsUpdate = false;
  const updates: any = {};

  // Convert Firestore timestamps to Dates
  const dailyEventsResetAt = usage.dailyEventsResetAt?.toDate ? usage.dailyEventsResetAt.toDate() : new Date(usage.dailyEventsResetAt);
  const dailyAlertsResetAt = usage.dailyAlertsResetAt?.toDate ? usage.dailyAlertsResetAt.toDate() : new Date(usage.dailyAlertsResetAt);

  // Reset daily events if needed
  if (now >= dailyEventsResetAt) {
    usage.dailyEvents = 0;
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    usage.dailyEventsResetAt = tomorrow;
    
    updates["usage.dailyEvents"] = 0;
    updates["usage.dailyEventsResetAt"] = admin.firestore.Timestamp.fromDate(tomorrow);
    needsUpdate = true;
  }

  // Reset daily alerts if needed
  if (now >= dailyAlertsResetAt) {
    usage.dailyAlerts = 0;
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    usage.dailyAlertsResetAt = tomorrow;
    
    updates["usage.dailyAlerts"] = 0;
    updates["usage.dailyAlertsResetAt"] = admin.firestore.Timestamp.fromDate(tomorrow);
    needsUpdate = true;
  }

  if (needsUpdate) {
    updates["usage.lastUpdated"] = admin.firestore.Timestamp.now();
    await adminDb.collection("projects").doc(projectId).update(updates);
  }

  return {
    dailyEvents: usage.dailyEvents || 0,
    dailyEventsResetAt: usage.dailyEventsResetAt instanceof Date ? usage.dailyEventsResetAt : dailyEventsResetAt,
    dailyAlerts: usage.dailyAlerts || 0,
    dailyAlertsResetAt: usage.dailyAlertsResetAt instanceof Date ? usage.dailyAlertsResetAt : dailyAlertsResetAt,
    totalTestAlerts: usage.totalTestAlerts || 0,
    lastUpdated: usage.lastUpdated?.toDate ? usage.lastUpdated.toDate() : new Date(usage.lastUpdated || now),
  };
}

/**
 * Increment daily event count
 */
export async function incrementDailyEvents(projectId: string): Promise<void> {
  await adminDb.collection("projects").doc(projectId).update({
    "usage.dailyEvents": admin.firestore.FieldValue.increment(1),
    "usage.lastUpdated": admin.firestore.Timestamp.now(),
  });
}

/**
 * Increment daily alert count
 */
export async function incrementDailyAlerts(projectId: string): Promise<void> {
  await adminDb.collection("projects").doc(projectId).update({
    "usage.dailyAlerts": admin.firestore.FieldValue.increment(1),
    "usage.lastUpdated": admin.firestore.Timestamp.now(),
  });
}

/**
 * Increment total test alerts
 */
export async function incrementTestAlerts(projectId: string): Promise<void> {
  await adminDb.collection("projects").doc(projectId).update({
    "usage.totalTestAlerts": admin.firestore.FieldValue.increment(1),
    "usage.lastUpdated": admin.firestore.Timestamp.now(),
  });
}

/**
 * Check if project can send more events today
 */
export async function canSendEvent(projectId: string): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  const projectDoc = await adminDb.collection("projects").doc(projectId).get();
  const project = projectDoc.data();

  if (!project) {
    return { allowed: false, reason: "Project not found" };
  }

  const limits = project.subscriptionLimits || getSubscriptionLimits(project.subscriptionTier || "basic");
  const usage = await getProjectUsage(projectId);

  if (!isWithinLimit(usage.dailyEvents, limits.dailyEvents)) {
    return {
      allowed: false,
      reason: `Daily event limit reached (${limits.dailyEvents} events per day)`,
      limit: limits.dailyEvents,
      current: usage.dailyEvents,
    };
  }

  return { allowed: true };
}

/**
 * Check if project can send more alerts today
 */
export async function canSendAlert(projectId: string, isTest: boolean = false): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  const projectDoc = await adminDb.collection("projects").doc(projectId).get();
  const project = projectDoc.data();

  if (!project) {
    return { allowed: false, reason: "Project not found" };
  }

  const limits = project.subscriptionLimits || getSubscriptionLimits(project.subscriptionTier || "basic");
  const usage = await getProjectUsage(projectId);

  // Check test alert limits
  if (isTest && !isWithinLimit(usage.totalTestAlerts, limits.testAlerts)) {
    return {
      allowed: false,
      reason: `Test alert limit reached (${limits.testAlerts} total test alerts)`,
      limit: limits.testAlerts,
      current: usage.totalTestAlerts,
    };
  }

  // Check daily alert limits
  if (!isWithinLimit(usage.dailyAlerts, limits.dailyAlerts)) {
    return {
      allowed: false,
      reason: `Daily alert limit reached (${limits.dailyAlerts} alerts per day)`,
      limit: limits.dailyAlerts,
      current: usage.dailyAlerts,
    };
  }

  return { allowed: true };
}

/**
 * Count active keys by type
 */
export async function countActiveKeys(projectId: string, keyType: "test" | "prod"): Promise<number> {
  const snapshot = await adminDb
    .collection("keys")
    .where("projectId", "==", projectId)
    .where("type", "==", keyType)
    .where("isActive", "==", true)
    .get();

  return snapshot.size;
}

/**
 * Count team members (total including owner)
 */
export async function countTeamMembers(projectId: string): Promise<number> {
  const projectDoc = await adminDb.collection("projects").doc(projectId).get();
  const project = projectDoc.data();

  if (!project) {
    return 0;
  }

  // Return total memberIds count (includes owner)
  return project.memberIds?.length || 1;
}