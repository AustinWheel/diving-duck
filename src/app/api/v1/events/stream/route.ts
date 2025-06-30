import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getSubscriptionLimits } from "@/lib/subscription";
import { calculateBucketRange } from "@/lib/bucketHelpers";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get project ID from query params
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data()!;

    // Verify user is a member or owner
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    // Get bucket configuration
    const limits =
      projectData.subscriptionLimits ||
      getSubscriptionLimits(projectData.subscriptionTier || "basic");
    const bucketMinutes = limits.eventBucketMinutes;

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          const event = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(event));
        };

        // Send initial total count
        const totalCount = await getTotalEventCount(projectId, bucketMinutes);
        sendEvent({ type: "total", count: totalCount });

        // Listen for real-time updates on bucketedEvents collection
        const unsubscribe = adminDb
          .collection("bucketedEvents")
          .where("projectId", "==", projectId)
          .onSnapshot(
            async (snapshot) => {
              // When any bucket for this project changes, recalculate total
              const newTotal = await getTotalEventCount(projectId, bucketMinutes);
              sendEvent({ type: "total", count: newTotal });

              // Also send incremental updates for new events
              snapshot.docChanges().forEach((change) => {
                if (change.type === "modified") {
                  const oldData = change.doc.data();
                  const previousCount = oldData.eventCount || 0;
                  // Note: We can't easily get the exact increment without storing previous state
                  // So we just send the new total
                  sendEvent({ type: "update", count: newTotal });
                }
              });
            },
            (error) => {
              console.error("Snapshot error:", error);
              controller.close();
            },
          );

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
          sendEvent({ type: "heartbeat", timestamp: new Date().toISOString() });
        }, 30000); // Every 30 seconds

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          unsubscribe();
          clearInterval(heartbeat);
          controller.close();
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering
      },
    });
  } catch (error) {
    console.error("Error in event stream:", error);
    return NextResponse.json({ error: "Failed to create event stream" }, { status: 500 });
  }
}

async function getTotalEventCount(projectId: string, bucketMinutes: number): Promise<number> {
  // Get all buckets for this project
  const bucketSnapshot = await adminDb
    .collection("bucketedEvents")
    .where("projectId", "==", projectId)
    .get();

  let totalCount = 0;
  bucketSnapshot.forEach((doc) => {
    const data = doc.data();
    totalCount += data.eventCount || 0;
  });

  return totalCount;
}