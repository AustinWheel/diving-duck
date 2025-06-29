import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendInviteEmail } from "@/lib/emails/invite";
import admin from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { inviteIds } = await request.json();

    if (!inviteIds || !Array.isArray(inviteIds)) {
      return NextResponse.json({ error: "Invalid invite IDs" }, { status: 400 });
    }

    const results = await Promise.allSettled(
      inviteIds.map(async (inviteId) => {
        // Get invite details
        const inviteDoc = await adminDb.collection("invites").doc(inviteId).get();

        if (!inviteDoc.exists) {
          throw new Error(`Invite ${inviteId} not found`);
        }

        const invite = inviteDoc.data();

        if (invite.status !== "pending") {
          throw new Error(`Invite ${inviteId} is not pending`);
        }

        // Get project details
        const projectDoc = await adminDb.collection("projects").doc(invite.projectId).get();
        if (!projectDoc.exists) {
          throw new Error(`Project ${invite.projectId} not found`);
        }
        const project = projectDoc.data();

        // Get inviter details
        const inviterDoc = await adminDb.collection("users").doc(invite.invitedBy).get();
        const inviter = inviterDoc.data();
        const inviterName = inviter?.displayName || inviter?.email || "A team member";

        // Send email
        await sendInviteEmail({
          email: invite.email,
          inviteId,
          projectName: project.displayName || project.name,
          inviterName,
        });

        // Update invite with sent timestamp
        await adminDb.collection("invites").doc(inviteId).update({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { inviteId, success: true };
      }),
    );

    // Process results
    const successful = results.filter((r) => r.status === "fulfilled").map((r) => (r as any).value);
    const failed = results
      .filter((r) => r.status === "rejected")
      .map((r) => ({
        error: (r as any).reason.message,
      }));

    return NextResponse.json({
      sent: successful.length,
      failed: failed.length,
      results: { successful, failed },
    });
  } catch (error) {
    console.error("Error sending invites:", error);
    return NextResponse.json({ error: "Failed to send invites" }, { status: 500 });
  }
}
