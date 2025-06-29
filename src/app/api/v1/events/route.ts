import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";

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
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const startAfter = request.nextUrl.searchParams.get("startAfter");
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

    // Build query
    let query = adminDb
      .collection("events")
      .where("projectId", "==", targetProjectId)
      .orderBy("timestamp", "desc")
      .limit(Math.min(limit, 100)); // Max 100 per request

    // Add type filter if specified
    if (logType) {
      query = query.where("type", "==", logType);
    }

    // Add pagination if startAfter is provided
    if (startAfter) {
      const startDoc = await adminDb.collection("events").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    // Execute query
    const eventsSnapshot = await query.get();

    // Format events
    const events = eventsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type || "text", // Default to 'text' for old events
        message: data.message,
        timestamp: data.timestamp?.toDate?.() || null,
        keyType: data.keyType,
        userId: data.userId,
        meta: data.meta,
        ip: data.ip,
        userAgent: data.userAgent,
      };
    });

    // Filter by search term if provided (client-side filtering for now)
    let filteredEvents = events;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = events.filter(
        (event) =>
          event.message.toLowerCase().includes(searchLower) ||
          (event.meta && JSON.stringify(event.meta).toLowerCase().includes(searchLower)),
      );
    }

    // Get the last document ID for pagination
    const lastDoc = eventsSnapshot.docs[eventsSnapshot.docs.length - 1];
    const nextCursor = lastDoc?.id || null;

    return NextResponse.json({
      events: filteredEvents,
      nextCursor,
      hasMore: eventsSnapshot.docs.length === limit,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
