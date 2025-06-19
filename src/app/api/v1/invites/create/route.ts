import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { sendInviteEmail } from "@/lib/emails/invite";

export async function POST(request: NextRequest) {
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
    const { projectId, emails } = await request.json();

    // Validate input
    if (!projectId || !emails || !Array.isArray(emails)) {
      return NextResponse.json(
        { error: "Project ID and emails array are required" },
        { status: 400 }
      );
    }

    // Check if user is a member of the project
    const memberDoc = await adminDb
      .collection("projectMembers")
      .doc(`${userId}_${projectId}`)
      .get();

    if (!memberDoc.exists) {
      return NextResponse.json(
        { error: "You are not a member of this project" },
        { status: 403 }
      );
    }

    // Get project details
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    const project = projectDoc.data();

    // Get inviter details
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const inviterName = userData?.displayName || userData?.email || "A team member";

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter((email: string) => {
      return typeof email === "string" && emailRegex.test(email);
    });

    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses provided" },
        { status: 400 }
      );
    }

    // Check for existing members
    const existingMembers = await adminDb
      .collection("users")
      .where("email", "in", validEmails)
      .get();

    const existingEmails = new Set(existingMembers.docs.map(doc => doc.data().email));
    
    // Check which users are already members
    const memberChecks = await Promise.all(
      existingMembers.docs.map(async (userDoc) => {
        const memberDoc = await adminDb
          .collection("projectMembers")
          .doc(`${userDoc.id}_${projectId}`)
          .get();
        return {
          email: userDoc.data().email,
          isMember: memberDoc.exists,
        };
      })
    );

    const alreadyMembers = memberChecks
      .filter(check => check.isMember)
      .map(check => check.email);

    const emailsToInvite = validEmails.filter(email => !alreadyMembers.includes(email));

    if (emailsToInvite.length === 0) {
      return NextResponse.json(
        { 
          error: "All provided emails are already project members",
          alreadyMembers 
        },
        { status: 400 }
      );
    }

    // Create invites and send emails
    const results = await Promise.allSettled(
      emailsToInvite.map(async (email) => {
        // Check if invite already exists
        const existingInvite = await adminDb
          .collection("invites")
          .where("projectId", "==", projectId)
          .where("email", "==", email)
          .where("status", "==", "pending")
          .limit(1)
          .get();

        if (!existingInvite.empty) {
          return { email, status: "already_invited" };
        }

        // Create invite
        const inviteRef = adminDb.collection("invites").doc();
        await inviteRef.set({
          id: inviteRef.id,
          projectId,
          email,
          invitedBy: userId,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send email
        try {
          await sendInviteEmail({
            email,
            inviteId: inviteRef.id,
            projectName: project.displayName || project.name,
            inviterName,
          });

          // Update invite with sent timestamp
          await inviteRef.update({
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          return { email, inviteId: inviteRef.id, status: "sent" };
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error);
          // Delete the invite if email fails
          await inviteRef.delete();
          throw new Error(`Failed to send email to ${email}`);
        }
      })
    );

    // Process results
    const successful = results
      .filter(r => r.status === "fulfilled")
      .map(r => (r as any).value);
    
    const failed = results
      .filter(r => r.status === "rejected")
      .map(r => ({
        email: (r as any).reason.message.split(" ").pop(),
        error: (r as any).reason.message,
      }));

    return NextResponse.json({
      sent: successful.filter(s => s.status === "sent").length,
      alreadyInvited: successful.filter(s => s.status === "already_invited").length,
      alreadyMembers: alreadyMembers.length,
      failed: failed.length,
      details: {
        successful,
        alreadyMembers,
        failed,
      },
    });
  } catch (error) {
    console.error("Error creating invites:", error);
    return NextResponse.json(
      { error: "Failed to create invites" },
      { status: 500 }
    );
  }
}