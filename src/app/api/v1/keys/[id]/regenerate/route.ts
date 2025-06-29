import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { nanoid } from "nanoid";

// POST /api/v1/keys/[id]/regenerate - Regenerate an API key
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id: keyId } = await params;

    // Get the key document
    const keyDoc = await adminDb.collection("keys").doc(keyId).get();
    if (!keyDoc.exists) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const oldKeyData = keyDoc.data()!;

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(oldKeyData.projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data()!;
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    // Generate new key
    const newKey = `${oldKeyData.type}_${nanoid(32)}`;

    // Start batch operation
    const batch = adminDb.batch();

    // Deactivate old key
    batch.update(keyDoc.ref, {
      isActive: false,
      regeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      regeneratedBy: userId,
    });

    // Create new key with same settings
    const newKeyRef = adminDb.collection("keys").doc();
    const newKeyData = {
      id: newKeyRef.id,
      key: newKey,
      type: oldKeyData.type,
      name: oldKeyData.name,
      projectId: oldKeyData.projectId,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      regeneratedFrom: keyId,
    };

    // Add expiration for test keys (2 hours)
    if (oldKeyData.type === "test") {
      newKeyData.expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 2 * 60 * 60 * 1000),
      );
    }

    batch.set(newKeyRef, newKeyData);

    // Commit batch
    await batch.commit();

    return NextResponse.json({
      key: {
        id: newKeyRef.id,
        key: newKey,
        type: oldKeyData.type,
        name: oldKeyData.name,
        createdAt: new Date(),
        expiresAt: oldKeyData.type === "test" ? new Date(Date.now() + 2 * 60 * 60 * 1000) : null,
      },
    });
  } catch (error) {
    console.error("Error regenerating key:", error);
    return NextResponse.json({ error: "Failed to regenerate key" }, { status: 500 });
  }
}
