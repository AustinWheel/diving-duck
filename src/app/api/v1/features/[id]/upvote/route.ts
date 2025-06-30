import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

// POST /api/v1/features/[id]/upvote - Add upvote
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
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
    const featureId = params.id;

    // Get the feature
    const featureRef = adminDb.collection("featureRequests").doc(featureId);
    const featureDoc = await featureRef.get();

    if (!featureDoc.exists) {
      return NextResponse.json({ error: "Feature request not found" }, { status: 404 });
    }

    const featureData = featureDoc.data();
    const upvotedBy = featureData?.upvotedBy || [];

    // Check if user already upvoted
    if (upvotedBy.includes(userId)) {
      return NextResponse.json({ error: "Already upvoted" }, { status: 400 });
    }

    // Add upvote
    await featureRef.update({
      upvotedBy: admin.firestore.FieldValue.arrayUnion(userId),
      upvoteCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding upvote:", error);
    return NextResponse.json({ error: "Failed to add upvote" }, { status: 500 });
  }
}

// DELETE /api/v1/features/[id]/upvote - Remove upvote
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
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
    const featureId = params.id;

    // Get the feature
    const featureRef = adminDb.collection("featureRequests").doc(featureId);
    const featureDoc = await featureRef.get();

    if (!featureDoc.exists) {
      return NextResponse.json({ error: "Feature request not found" }, { status: 404 });
    }

    const featureData = featureDoc.data();
    const upvotedBy = featureData?.upvotedBy || [];

    // Check if user has upvoted
    if (!upvotedBy.includes(userId)) {
      return NextResponse.json({ error: "Not upvoted" }, { status: 400 });
    }

    // Remove upvote
    await featureRef.update({
      upvotedBy: admin.firestore.FieldValue.arrayRemove(userId),
      upvoteCount: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing upvote:", error);
    return NextResponse.json({ error: "Failed to remove upvote" }, { status: 500 });
  }
}