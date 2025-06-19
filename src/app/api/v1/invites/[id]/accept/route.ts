import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

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
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const inviteId =  await params.id;

    // Get invite details
    const inviteRef = adminDb.collection("invites").doc(inviteId);
    const inviteDoc = await inviteRef.get();
    
    if (!inviteDoc.exists) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    const invite = inviteDoc.data()!;

    // Check if invite is still pending
    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const memberDocId = `${userId}_${invite.projectId}`;
    const memberDoc = await adminDb.collection("projectMembers").doc(memberDocId).get();
    
    if (memberDoc.exists) {
      return NextResponse.json(
        { error: "You are already a member of this project" },
        { status: 400 }
      );
    }

    // Start a batch write
    const batch = adminDb.batch();

    // Add user as project member
    const memberRef = adminDb.collection("projectMembers").doc(memberDocId);
    batch.set(memberRef, {
      projectId: invite.projectId,
      userId,
      role: "member",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      invitedBy: invite.invitedBy,
    });

    // Update invite status
    batch.update(inviteRef, {
      status: "accepted",
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      acceptedBy: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Check if user needs to be marked as onboarded
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists && !userDoc.data()?.isOnboarded) {
      batch.update(userRef, {
        isOnboarded: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Commit all changes atomically
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Invite accepted successfully",
      projectId: invite.projectId,
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}