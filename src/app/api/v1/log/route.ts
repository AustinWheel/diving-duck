import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { LogEvent, ApiKey, LogType, BucketedEvents, Project } from "@/types/database";
import { checkAlertsForEvent } from "@/lib/alerts/alert-checker";
import { canSendEvent, incrementDailyEvents, getSubscriptionLimits } from "@/lib/subscription";
import { calculateBucketId, calculateBucketTimes } from "@/lib/bucketHelpers";

// Update public stats document
async function updatePublicStats() {
  try {
    const statsRef = adminDb.collection("public").doc("stats");
    
    // Simply increment the total events count
    // FieldValue.increment handles concurrency and creates the field if it doesn't exist
    await statsRef.set({
      totalEvents: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    // Log error but don't fail the request
    console.error("[LOG API] Error updating public stats:", error);
  }
}

interface LogRequestBody {
  type?: LogType; // Optional, defaults to 'text'
  message: string;
  userId?: string;
  timestamp?: string;
  meta?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    // Check for Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalide authorization header");
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 400 },
      );
    }

    // Extract and validate the Bearer token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      console.error("Missing API key");
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }

    // Validate token starts with test_ or prod_
    if (!token.startsWith("test_") && !token.startsWith("prod_")) {
      return NextResponse.json({ error: "Invalid API key format" }, { status: 403 });
    }

    // Validate API key exists in database
    const keysRef = adminDb.collection("keys");
    const keySnapshot = await keysRef.where("key", "==", token).limit(1).get();

    if (keySnapshot.empty) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
    }

    const keyDoc = keySnapshot.docs[0];
    const apiKey = keyDoc.data() as ApiKey;

    // Check if key is active
    if (!apiKey.isActive) {
      return NextResponse.json({ error: "API key is inactive" }, { status: 403 });
    }

    // Check expiration for test keys
    if (apiKey.type === "test" && apiKey.expiresAt) {
      const expirationDate =
        apiKey.expiresAt instanceof admin.firestore.Timestamp
          ? apiKey.expiresAt.toDate()
          : new Date(apiKey.expiresAt);

      if (expirationDate < new Date()) {
        return NextResponse.json({ error: "API key has expired" }, { status: 403 });
      }
    }

    // Parse request body
    let body: LogRequestBody;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Invalid JSON body");
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate required fields
    if (!body.message) {
      console.error("Missing required field: message")
      return NextResponse.json({ error: "Missing required field: message" }, { status: 400 });
    }

    // Get request metadata
    const ip =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    // Check domain whitelist for production keys
    if (apiKey.type === "prod" && apiKey.domain) {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");

      // Check both origin and referer headers
      const requestDomain = origin || referer;

      if (!requestDomain) {
        return NextResponse.json(
          { error: "Access denied: No origin header found" },
          { status: 403 },
        );
      }

      // Parse the domain from the key
      let allowedDomain;
      try {
        const url = new URL(apiKey.domain);
        allowedDomain = url.origin; // This gives us protocol + hostname + port
      } catch (error) {
        console.error("Invalid domain in API key:", apiKey.domain);
        return NextResponse.json({ error: "Invalid API key configuration" }, { status: 500 });
      }

      // Parse the request domain
      let requestOrigin;
      try {
        const url = new URL(requestDomain);
        requestOrigin = url.origin;
      } catch (error) {
        return NextResponse.json({ error: "Invalid origin header" }, { status: 403 });
      }

      // Compare origins
      if (requestOrigin !== allowedDomain) {
        return NextResponse.json(
          { error: "Access denied: Domain not whitelisted", domain: requestOrigin },
          { status: 403 },
        );
      }
    }

    // Validate log type if provided
    const validLogTypes: LogType[] = ["text", "call", "callText", "log", "warn", "error"];
    const logType = body.type || "text";
    if (!validLogTypes.includes(logType)) {
      console.error("Invalid log type");
      return NextResponse.json({ error: "Invalid log type" }, { status: 400 });
    }

    // Check event limits
    const eventCheck = await canSendEvent(apiKey.projectId);
    if (!eventCheck.allowed) {
      const resetTime = new Date();
      resetTime.setUTCDate(resetTime.getUTCDate() + 1);
      resetTime.setUTCHours(0, 0, 0, 0);
      const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));

      return NextResponse.json(
        {
          error: "Daily event limit exceeded",
          message: `You've reached your daily limit of ${eventCheck.limit} events. You've sent ${eventCheck.current} events today.`,
          suggestion: "Upgrade to Pro for 50,000 events per day, or wait for the daily reset.",
          details: {
            limit: eventCheck.limit,
            current: eventCheck.current,
            resetAt: resetTime.toISOString(),
            hoursUntilReset,
            tier: "basic", // We can get this from project if needed
          },
        },
        { status: 429 },
      );
    }

    // Get project details for bucket configuration
    const projectDoc = await adminDb.collection("projects").doc(apiKey.projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const project = projectDoc.data() as Project;

    // Get bucket configuration
    const limits =
      project.subscriptionLimits || getSubscriptionLimits(project.subscriptionTier || "basic");
    const bucketMinutes = limits.eventBucketMinutes;

    // Create event data
    const eventTimestamp = body.timestamp ? new Date(body.timestamp) : new Date();
    const eventData: Omit<LogEvent, "id"> = {
      projectId: apiKey.projectId,
      keyId: keyDoc.id,
      keyType: apiKey.type,
      type: logType,
      message: body.message,
      timestamp: eventTimestamp,
      userId: body.userId,
      meta: body.meta,
      ip: ip,
      userAgent: userAgent,
    };

    // Calculate bucket ID and times
    const bucketId = calculateBucketId(apiKey.projectId, eventTimestamp, bucketMinutes);
    const { start: bucketStart, end: bucketEnd } = calculateBucketTimes(
      eventTimestamp,
      bucketMinutes,
    );

    let eventId: string;

    try {
      // Store event in bucket using transaction
      await adminDb.runTransaction(async (transaction) => {
        const bucketRef = adminDb.collection("bucketedEvents").doc(bucketId);
        const bucketDoc = await transaction.get(bucketRef);

        if (!bucketDoc.exists) {
          // Create new bucket
          const newBucket: BucketedEvents = {
            id: bucketId,
            projectId: apiKey.projectId,
            bucketStart: bucketStart,
            bucketEnd: bucketEnd,
            events: [
              {
                ...eventData,
                timestamp: eventData.timestamp,
              },
            ],
            eventCount: 1,
            lastUpdated: new Date(),
          };

          transaction.set(bucketRef, {
            ...newBucket,
            bucketStart: admin.firestore.Timestamp.fromDate(bucketStart),
            bucketEnd: admin.firestore.Timestamp.fromDate(bucketEnd),
            events: [
              {
                ...eventData,
                timestamp: admin.firestore.Timestamp.fromDate(eventData.timestamp),
              },
            ],
            lastUpdated: admin.firestore.Timestamp.now(),
          });
        } else {
          // Append to existing bucket
          const currentData = bucketDoc.data() as any;
          const updatedEvents = [
            ...currentData.events,
            {
              ...eventData,
              timestamp: admin.firestore.Timestamp.fromDate(eventData.timestamp),
            },
          ];

          transaction.update(bucketRef, {
            events: updatedEvents,
            eventCount: updatedEvents.length,
            lastUpdated: admin.firestore.Timestamp.now(),
          });
        }

        // Generate event ID based on bucket ID and event count
        eventId = `${bucketId}_${bucketDoc.exists ? bucketDoc.data()!.eventCount : 0}`;
      });

      // Update last used timestamp for the API key, increment event counter, and update public stats
      await Promise.all([
        keyDoc.ref.update({
          lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
        incrementDailyEvents(apiKey.projectId),
        updatePublicStats(),
      ]);

      // Check if this event triggers any alerts
      const eventWithId = { ...eventData, id: eventId };
      // Run alert checking asynchronously - don't block the response
      checkAlertsForEvent(eventWithId).catch((error) => {
        console.error("[LOG API] Error checking alerts:", error);
      });

      // Return success response
      return NextResponse.json({ status: "logged", eventId, bucketId }, { status: 200 });
    } catch (error: any) {
      // Handle document size exceeded error
      if (error.code === "failed-precondition" && error.message?.includes("maximum size")) {
        const tierName =
          project.subscriptionTier === "pro"
            ? "Pro"
            : project.subscriptionTier === "enterprise"
              ? "Enterprise"
              : "Basic";
        const upgradeTo =
          project.subscriptionTier === "basic"
            ? "Pro for higher event limits"
            : project.subscriptionTier === "pro"
              ? "Enterprise for even higher limits"
              : "contact support for custom limits";

        return NextResponse.json(
          {
            error: "Event limit exceeded",
            message: `You've exceeded the maximum events for this ${bucketMinutes}-minute period.`,
            suggestion: `Upgrade to ${upgradeTo}.`,
            details: {
              tier: project.subscriptionTier || "basic",
              bucketPeriod: `${bucketMinutes} minutes`,
            },
          },
          { status: 403 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("[LOG API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
