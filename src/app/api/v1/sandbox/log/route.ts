import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { LogType } from "@/types/database";

interface SandboxLogRequest {
  keyId: string;
  type: LogType;
  message: string;
  meta?: Record<string, any>;
}

export async function POST(request: NextRequest) {
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
    const body: SandboxLogRequest = await request.json();

    // Validate request
    if (!body.keyId || !body.message || !body.type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the API key details
    const keyDoc = await adminDb.collection("keys").doc(body.keyId).get();
    if (!keyDoc.exists) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const apiKey = keyDoc.data()!;

    // Verify user has access to this key's project
    const projectDoc = await adminDb.collection("projects").doc(apiKey.projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data()!;
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

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

    // Create event document
    const eventData = {
      projectId: apiKey.projectId,
      keyId: body.keyId,
      keyType: apiKey.type,
      type: body.type,
      message: body.message,
      timestamp: admin.firestore.Timestamp.now(),
      userId: userId, // Log which user sent from sandbox
      meta: body.meta || {},
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "sandbox",
      userAgent: "Warden Dashboard Sandbox",
    };

    // Store event in Firestore
    const eventDoc = await adminDb.collection("events").add(eventData);

    // Update last used timestamp for the API key
    await keyDoc.ref.update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      status: "logged",
      eventId: eventDoc.id,
    });
  } catch (error) {
    console.error("Error in sandbox log:", error);
    return NextResponse.json({ error: "Failed to send log" }, { status: 500 });
  }
}
