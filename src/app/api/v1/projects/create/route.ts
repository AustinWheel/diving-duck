import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { nanoid } from "nanoid";
import { getSubscriptionLimits } from "@/lib/subscription";

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
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const { name, displayName } = await request.json();

    // Validate input
    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Project name and display name are required" },
        { status: 400 },
      );
    }

    // Validate project name format
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return NextResponse.json(
        { error: "Project name can only contain letters, numbers, and hyphens" },
        { status: 400 },
      );
    }

    if (name.length < 3 || name.length > 50) {
      return NextResponse.json(
        { error: "Project name must be between 3 and 50 characters" },
        { status: 400 },
      );
    }

    // Check if project name already exists
    const existingProject = await adminDb
      .collection("projects")
      .where("name", "==", name.toLowerCase())
      .limit(1)
      .get();

    if (!existingProject.empty) {
      return NextResponse.json({ error: "Project name already taken" }, { status: 409 });
    }

    // Create the project with basic tier
    const projectRef = adminDb.collection("projects").doc();
    const tier = "basic";
    const limits = getSubscriptionLimits(tier);
    
    // Initialize usage tracking
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    const projectData = {
      id: projectRef.id,
      name: name.toLowerCase(),
      displayName,
      ownerId: userId,
      memberIds: [userId], // Owner is also a member
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionTier: tier,
      subscriptionLimits: limits,
      usage: {
        dailyEvents: 0,
        dailyEventsResetAt: admin.firestore.Timestamp.fromDate(tomorrow),
        dailyAlerts: 0,
        dailyAlertsResetAt: admin.firestore.Timestamp.fromDate(tomorrow),
        totalTestAlerts: 0,
        lastUpdated: admin.firestore.Timestamp.now(),
      },
      alertConfig: {
        enabled: false,
        phoneNumbers: [],
        alertRules: [],
      },
    };

    // Start a batch write
    const batch = adminDb.batch();

    // Create the project
    batch.set(projectRef, projectData);

    // Add user as project owner
    const memberRef = adminDb.collection("projectMembers").doc(`${userId}_${projectRef.id}`);
    batch.set(memberRef, {
      projectId: projectRef.id,
      userId,
      role: "owner",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user's projectIds array and set defaultProjectId if this is their first project
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    batch.update(userRef, {
      projectIds: admin.firestore.FieldValue.arrayUnion(projectRef.id),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create initial API keys (one test, one prod)
    const testKey = `test_${nanoid(32)}`;
    const prodKey = `prod_${nanoid(32)}`;

    // Create test key (expires in 2 hours)
    const testKeyRef = adminDb.collection("keys").doc();
    batch.set(testKeyRef, {
      id: testKeyRef.id,
      key: testKey,
      type: "test",
      projectId: projectRef.id,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)),
      isActive: true,
      name: "Initial Test Key",
    });

    // Create production key (no expiration)
    const prodKeyRef = adminDb.collection("keys").doc();
    batch.set(prodKeyRef, {
      id: prodKeyRef.id,
      key: prodKey,
      type: "prod",
      projectId: projectRef.id,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      name: "Initial Production Key",
    });

    // Commit all changes atomically
    await batch.commit();

    return NextResponse.json({
      project: {
        id: projectRef.id,
        name: name.toLowerCase(),
        displayName,
      },
      keys: {
        test: { id: testKeyRef.id, key: testKey },
        prod: { id: prodKeyRef.id, key: prodKey },
      },
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
