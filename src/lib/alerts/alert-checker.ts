import admin from "@/lib/firebaseAdmin";
const adminDb = admin.firestore();
import { Project, LogEvent, Alert, AlertRule, LogType, BucketedEvents } from "@/types/database";
import { canSendAlert, incrementDailyAlerts, getSubscriptionLimits } from "@/lib/subscription";
import { calculateBucketRange } from "@/lib/bucketHelpers";

export async function checkAlertsForEvent(event: LogEvent) {
  try {
    // Get project with alert configuration
    const projectDoc = await adminDb.collection("projects").doc(event.projectId).get();
    if (!projectDoc.exists) {
      console.error("[ALERT CHECKER] Project not found:", event.projectId);
      return;
    }

    const project = projectDoc.data() as Project;

    // Skip if alerts are disabled or not configured
    if (!project.alertConfig?.enabled || !project.alertConfig?.alertRules?.length) {
      return;
    }

    // Check each alert rule
    for (const rule of project.alertConfig.alertRules) {
      await checkAlertRule(event, project, rule);
    }
  } catch (error) {
    console.error("[ALERT CHECKER] Error checking alerts:", error);
  }
}

async function checkAlertRule(event: LogEvent, project: Project, rule: AlertRule) {
  const now = new Date();

  // Get bucket configuration
  const limits = project.subscriptionLimits || getSubscriptionLimits(project.subscriptionTier || "basic");
  const bucketMinutes = limits.eventBucketMinutes;

  // Check global limit first
  if (rule.globalLimit?.enabled) {
    const windowStart = new Date(now.getTime() - rule.globalLimit.windowMinutes * 60 * 1000);

    // Get all bucket IDs for the time window
    const bucketIds = calculateBucketRange(event.projectId, windowStart, now, bucketMinutes);

    // Query all relevant buckets
    const bucketPromises = bucketIds.map(bucketId => 
      adminDb.collection("bucketedEvents").doc(bucketId).get()
    );
    
    const bucketDocs = await Promise.all(bucketPromises);

    // Count all events in the window
    let eventCount = 0;
    const eventIds: string[] = [];
    
    for (const bucketDoc of bucketDocs) {
      if (bucketDoc.exists) {
        const bucketData = bucketDoc.data() as any;
        if (bucketData.events) {
          // Filter events within the exact time window
          const eventsInWindow = bucketData.events.filter((e: any) => {
            const timestamp = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
            return timestamp >= windowStart && timestamp <= now;
          });
          eventCount += eventsInWindow.length;
          
          // Generate event IDs
          eventsInWindow.forEach((e: any, index: number) => {
            eventIds.push(`${bucketDoc.id}_${index}`);
          });
        }
      }
    }

    if (eventCount >= rule.globalLimit.maxAlerts) {
      // Check if we already have a recent alert for this threshold
      const recentAlert = await checkRecentAlert(
        project.id,
        "global",
        "",
        rule.globalLimit.windowMinutes,
      );

      if (!recentAlert) {
        await createAlert({
          projectId: project.id,
          rule: rule,
          triggerType: "global",
          message: `Global threshold exceeded: ${eventCount} events in ${rule.globalLimit.windowMinutes} minutes`,
          eventCount: eventCount,
          windowStart: windowStart,
          windowEnd: now,
          eventIds: eventIds,
        });
      }
    }
  }

  // Check message-specific rules
  if (rule.messageRules?.length) {
    for (const messageRule of rule.messageRules) {
      // Skip if this event's message doesn't match
      if (event.message !== messageRule.message) {
        continue;
      }

      // Skip if log types are specified and this event's type doesn't match
      if (messageRule.logTypes?.length && !messageRule.logTypes.includes(event.type)) {
        continue;
      }

      const windowStart = new Date(now.getTime() - messageRule.windowMinutes * 60 * 1000);

      // Get all bucket IDs for the time window
      const bucketIds = calculateBucketRange(event.projectId, windowStart, now, bucketMinutes);

      // Query all relevant buckets
      const bucketPromises = bucketIds.map(bucketId => 
        adminDb.collection("bucketedEvents").doc(bucketId).get()
      );
      
      const bucketDocs = await Promise.all(bucketPromises);

      // Count matching events in the window
      let eventCount = 0;
      const eventIds: string[] = [];
      
      for (const bucketDoc of bucketDocs) {
        if (bucketDoc.exists) {
          const bucketData = bucketDoc.data() as any;
          if (bucketData.events) {
            // Filter events that match criteria
            const matchingEvents = bucketData.events.filter((e: any) => {
              const timestamp = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
              const timeMatch = timestamp >= windowStart && timestamp <= now;
              const messageMatch = e.message === messageRule.message;
              const typeMatch = !messageRule.logTypes?.length || messageRule.logTypes.includes(e.type);
              
              return timeMatch && messageMatch && typeMatch;
            });
            
            eventCount += matchingEvents.length;
            
            // Generate event IDs for matching events
            matchingEvents.forEach((e: any) => {
              const eventIndex = bucketData.events.indexOf(e);
              eventIds.push(`${bucketDoc.id}_${eventIndex}`);
            });
          }
        }
      }

      if (eventCount >= messageRule.maxAlerts) {
        // Check if we already have a recent alert for this message
        const recentAlert = await checkRecentAlert(
          project.id,
          "message",
          messageRule.message,
          messageRule.windowMinutes,
        );

        if (!recentAlert) {
          await createAlert({
            projectId: project.id,
            rule: rule,
            triggerType: "message",
            message: `Message threshold exceeded for "${messageRule.message}": ${eventCount} events in ${messageRule.windowMinutes} minutes`,
            eventCount: eventCount,
            windowStart: windowStart,
            windowEnd: now,
            eventIds: eventIds,
          });
        }
      }
    }
  }
}

async function checkRecentAlert(
  projectId: string,
  triggerType: "global" | "message",
  message: string,
  windowMinutes: number,
): Promise<boolean> {
  // Don't send duplicate alerts within the same window
  const cooldownPeriod = Math.min(windowMinutes * 60 * 1000, 3600000); // Max 1 hour cooldown
  const since = new Date(Date.now() - cooldownPeriod);

  let query = adminDb
    .collection("alerts")
    .where("projectId", "==", projectId)
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(since))
    .limit(1);

  // For message-specific alerts, check if we already alerted for this message
  if (triggerType === "message") {
    query = query.where("message", "==", message);
  }

  const snapshot = await query.get();
  return !snapshot.empty;
}

interface CreateAlertParams {
  projectId: string;
  rule: AlertRule;
  triggerType: "global" | "message";
  message: string;
  eventCount: number;
  windowStart: Date;
  windowEnd: Date;
  eventIds: string[];
}

async function createAlert(params: CreateAlertParams) {
  // Check if we can send more alerts today
  const alertCheck = await canSendAlert(params.projectId, false);
  if (!alertCheck.allowed) {
    console.log("[ALERT LIMIT REACHED]", {
      projectId: params.projectId,
      reason: alertCheck.reason,
      limit: alertCheck.limit,
      current: alertCheck.current,
    });
    return;
  }

  const alert: Omit<Alert, "id"> = {
    projectId: params.projectId,
    status: "pending",
    notificationType: params.rule.notificationType,
    message: params.message,
    eventIds: params.eventIds,
    eventCount: params.eventCount,
    windowStart: params.windowStart,
    windowEnd: params.windowEnd,
    createdAt: new Date(),
  };

  try {
    // Create alert record
    const alertDoc = await adminDb.collection("alerts").add({
      ...alert,
      windowStart: admin.firestore.Timestamp.fromDate(alert.windowStart),
      windowEnd: admin.firestore.Timestamp.fromDate(alert.windowEnd),
      createdAt: admin.firestore.Timestamp.fromDate(alert.createdAt),
    });

    console.log("[ALERT TRIGGERED]", {
      alertId: alertDoc.id,
      projectId: params.projectId,
      type: params.rule.notificationType,
      message: params.message,
      eventCount: params.eventCount,
      triggerType: params.triggerType,
    });

    // Get project to get phone numbers
    const projectDoc = await adminDb.collection("projects").doc(params.projectId).get();
    const project = projectDoc.data() as Project;

    if (!project.alertConfig?.phoneNumbers?.length) {
      await alertDoc.update({
        status: "failed",
        error: "No phone numbers configured",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Send SMS via Textbelt
    if (params.rule.notificationType === "text") {
      await sendSMS(alertDoc.id, project.alertConfig.phoneNumbers, params.message);
    } else if (params.rule.notificationType === "call") {
      // For now, calls are not supported - just send SMS with "URGENT" prefix
      await sendSMS(
        alertDoc.id,
        project.alertConfig.phoneNumbers,
        `URGENT CALL ALERT: ${params.message}`,
      );
    }
  } catch (error) {
    console.error("[ALERT CREATION ERROR]", error);
  }
}

async function sendSMS(alertId: string, phoneNumbers: string[], message: string) {
  const textbeltKey = process.env.TEXTBELT_API_KEY;
  if (!textbeltKey) {
    console.error("[SMS] Textbelt API key not configured");
    await adminDb.collection("alerts").doc(alertId).update({
      status: "failed",
      error: "SMS service not configured",
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  const successfulNumbers: string[] = [];
  const errors: string[] = [];

  // Send to each phone number
  for (const phoneNumber of phoneNumbers) {
    try {
      const response = await fetch("https://textbelt.com/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          phone: phoneNumber,
          message: message,
          key: textbeltKey,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[SMS] Sent to ${phoneNumber}:`, result);
        successfulNumbers.push(phoneNumber);
      } else {
        console.error(`[SMS] Failed to send to ${phoneNumber}:`, result);
        errors.push(`${phoneNumber}: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error(`[SMS] Error sending to ${phoneNumber}:`, error);
      errors.push(`${phoneNumber}: ${error instanceof Error ? error.message : "Network error"}`);
    }
  }

  // Update alert record with results
  if (successfulNumbers.length > 0) {
    await adminDb
      .collection("alerts")
      .doc(alertId)
      .update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentTo: successfulNumbers,
        error: errors.length > 0 ? `Partial failure: ${errors.join(", ")}` : null,
      });
    
    // Increment daily alert counter
    const alertDoc = await adminDb.collection("alerts").doc(alertId).get();
    const alertData = alertDoc.data();
    if (alertData?.projectId) {
      await incrementDailyAlerts(alertData.projectId);
    }
  } else {
    await adminDb
      .collection("alerts")
      .doc(alertId)
      .update({
        status: "failed",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        error: `Failed to send to all numbers: ${errors.join(", ")}`,
      });
  }
}
