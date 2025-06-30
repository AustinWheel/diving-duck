import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { EventsService } from "@/lib/events";

// GET /api/v1/events - List events for the user's project
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

    // Get query parameters
    const projectId = request.nextUrl.searchParams.get("projectId");
    const timeRange = parseInt(request.nextUrl.searchParams.get("timeRange") || "1"); // Default 1 hour
    const logType = request.nextUrl.searchParams.get("type");
    const search = request.nextUrl.searchParams.get("search");

    let targetProjectId = projectId;

    if (!targetProjectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(targetProjectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data()!;
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    // Calculate time range
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRange * 60 * 60 * 1000);

    // Build filters
    const filters: any = {};
    if (logType) {
      filters.logTypes = [logType];
    }
    if (search) {
      filters.search = search;
    }

    // Query events using EventsService
    const events = await EventsService.queryEvents({
      projectId: targetProjectId,
      startTime,
      endTime,
      filters,
      limit: 1000, // Higher limit for logs page
    });

    // Format events for response
    const formattedEvents = events.map((event) => ({
      id: event.id,
      type: event.type || "text",
      message: event.message,
      timestamp: event.timestamp,
      keyType: event.keyType,
      userId: event.userId,
      meta: event.meta,
      ip: event.ip,
      userAgent: event.userAgent,
    }));

    return NextResponse.json({
      events: formattedEvents,
      total: formattedEvents.length,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        hours: timeRange,
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
