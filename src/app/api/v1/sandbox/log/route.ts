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

    // Forward to the main log endpoint
    const baseUrl = request.url.replace(/\/sandbox\/log$/, "/log");
    const logRequest = new Request(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.key}`,
        "Content-Type": "application/json",
        "X-Forwarded-For":
          request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "sandbox",
        "User-Agent": "Warden Dashboard Sandbox",
      },
      body: JSON.stringify({
        type: body.type,
        message: body.message,
        meta: body.meta,
        userId: userId, // Include the user ID who sent from sandbox
      }),
    });

    // Call the main log endpoint
    const response = await fetch(logRequest);
    const responseData = await response.json();

    // Return the response from the main log endpoint
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error("Error in sandbox log:", error);
    return NextResponse.json({ error: "Failed to send log" }, { status: 500 });
  }
}
