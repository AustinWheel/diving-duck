import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { nanoid } from "nanoid";
import { countActiveKeys, getSubscriptionLimits, isWithinLimit } from "@/lib/subscription";

// GET /api/v1/keys - List all keys for the user's default project
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

    // Get project ID from query params or user's default
    const projectId = request.nextUrl.searchParams.get("projectId");
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

    // Get all keys for this project
    const keysSnapshot = await adminDb
      .collection("keys")
      .where("projectId", "==", targetProjectId)
      .orderBy("createdAt", "desc")
      .get();

    const keys = keysSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        createdAt: data.createdAt?.toDate?.() || null,
        lastUsedAt: data.lastUsedAt?.toDate?.() || null,
        expiresAt: data.expiresAt?.toDate?.() || null,
        isActive: data.isActive,
        // Only show masked version of the key
        maskedKey: data.key,
        domain: data.domain || null,
      };
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("Error fetching keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/v1/keys - Create a new API key
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
    const { name, type, projectId, domain } = await request.json();

    // Validate input
    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    if (!["test", "prod"].includes(type)) {
      return NextResponse.json({ error: "Type must be 'test' or 'prod'" }, { status: 400 });
    }

    // Validate domain if provided
    if (domain && typeof domain === "string") {
      try {
        const url = new URL(domain);
        // Ensure it's http or https
        if (!["http:", "https:"].includes(url.protocol)) {
          return NextResponse.json(
            { error: "Domain must use http or https protocol" },
            { status: 400 },
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid domain format. Must be a valid URL (e.g., https://warden.sh)" },
          { status: 400 },
        );
      }
    }

    // Get target project ID
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const userData = userDoc.data()!;
      targetProjectId = userData.defaultProjectId || userData.projectIds?.[0];
    }

    if (!targetProjectId) {
      return NextResponse.json(
        { error: "No project specified or default project set" },
        { status: 400 },
      );
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

    // Check subscription limits
    const limits =
      projectData.subscriptionLimits ||
      getSubscriptionLimits(projectData.subscriptionTier || "basic");
    const currentActiveKeys = await countActiveKeys(targetProjectId, type);
    const keyLimit = type === "test" ? limits.activeTestKeys : limits.activeProdKeys;

    if (!isWithinLimit(currentActiveKeys, keyLimit)) {
      const tierName = projectData.subscriptionTier === "pro" ? "Pro" : "Basic";
      const upgradeTo =
        projectData.subscriptionTier === "basic" ? "Pro for 5" : "Enterprise for unlimited";

      return NextResponse.json(
        {
          error: `${type === "test" ? "Test" : "Production"} key limit reached`,
          message: `Your ${tierName} plan allows ${keyLimit} active ${type} key${keyLimit !== 1 ? "s" : ""}. You currently have ${currentActiveKeys} active.`,
          suggestion: `Delete or deactivate an existing ${type} key, or upgrade to ${upgradeTo} ${type} keys.`,
          details: {
            currentActiveKeys,
            limit: keyLimit,
            keyType: type,
            tier: projectData.subscriptionTier || "basic",
          },
        },
        { status: 403 },
      );
    }

    // Generate new key
    const newKey = `${type}_${nanoid(32)}`;

    // Create key document
    const keyRef = adminDb.collection("keys").doc();
    const keyData = {
      id: keyRef.id,
      key: newKey,
      type,
      name,
      projectId: targetProjectId,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    };

    // Add expiration for test keys (2 hours)
    if (type === "test") {
      keyData.expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 2 * 60 * 60 * 1000),
      );
    }

    // Add domain for production keys if provided
    if (type === "prod" && domain) {
      keyData.domain = domain;
    }

    await keyRef.set(keyData);

    return NextResponse.json({
      key: {
        id: keyRef.id,
        key: newKey,
        type,
        name,
        createdAt: new Date(),
        expiresAt: type === "test" ? new Date(Date.now() + 2 * 60 * 60 * 1000) : null,
      },
    });
  } catch (error) {
    console.error("Error creating key:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
