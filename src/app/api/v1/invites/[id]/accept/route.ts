import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { track } from "@vercel/analytics/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: inviteId } = await params;

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
    
    // Add user to project's memberIds array
    const projectRef = adminDb.collection("projects").doc(invite.projectId);
    batch.update(projectRef, {
      memberIds: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user document
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    const userUpdates: any = {
      projectIds: admin.firestore.FieldValue.arrayUnion(invite.projectId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Check if this is a new user signup via invitation
    let isNewUserViaInvite = false;
    
    // Mark as onboarded if needed
    if (userDoc.exists && !userDoc.data()?.isOnboarded) {
      userUpdates.isOnboarded = true;
      isNewUserViaInvite = true;
    }
    
    // Set defaultProjectId if user doesn't have one
    if (userDoc.exists && !userDoc.data()?.defaultProjectId) {
      userUpdates.defaultProjectId = invite.projectId;
    }
    
    batch.update(userRef, userUpdates);

    // Commit all changes atomically
    await batch.commit();

    // Track signup event if this is a new user via invitation
    if (isNewUserViaInvite) {
      await track('Signup', { 
        location: 'invitation',
        projectId: invite.projectId,
        invitedBy: invite.invitedBy
      });
    }

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