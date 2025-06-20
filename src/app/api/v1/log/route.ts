import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { LogEvent, ApiKey, LogType } from "@/types/database";

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
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 400 },
      );
    }

    // Extract and validate the Bearer token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }

    // Validate token starts with test_ or prod_
    if (!token.startsWith("test_") && !token.startsWith("prod_")) {
      return NextResponse.json({ error: "Invalid API key format" }, { status: 403 });
    }

    // Validate API key exists in database
    const db = admin.firestore();
    const keysRef = db.collection("keys");
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
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate required fields
    if (!body.message) {
      return NextResponse.json({ error: "Missing required field: message" }, { status: 400 });
    }

    // Get request metadata
    const ip =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    // Validate log type if provided
    const validLogTypes: LogType[] = ['text', 'call', 'callText', 'log', 'warn', 'error'];
    const logType = body.type || 'text';
    if (!validLogTypes.includes(logType)) {
      return NextResponse.json({ error: "Invalid log type" }, { status: 400 });
    }

    // Create event document
    const eventData: Omit<LogEvent, "id"> = {
      projectId: apiKey.projectId,
      keyId: keyDoc.id,
      keyType: apiKey.type,
      type: logType,
      message: body.message,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      userId: body.userId,
      meta: body.meta,
      ip: ip,
      userAgent: userAgent,
    };

    // Store event in Firestore
    const eventsRef = db.collection("events");
    const eventDoc = await eventsRef.add({
      ...eventData,
      timestamp: admin.firestore.Timestamp.fromDate(eventData.timestamp),
    });

    // Update last used timestamp for the API key
    await keyDoc.ref.update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log to console for debugging
    console.log("[LOG API] Event stored:", {
      eventId: eventDoc.id,
      projectId: apiKey.projectId,
      keyType: apiKey.type,
      logType: logType,
      message: body.message,
    });

    // Return success response
    return NextResponse.json({ status: "logged", eventId: eventDoc.id }, { status: 200 });
  } catch (error) {
    console.error("[LOG API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
