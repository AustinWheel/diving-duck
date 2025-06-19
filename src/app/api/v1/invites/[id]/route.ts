import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const inviteId = await params.id;

    // Get invite details
    const inviteDoc = await adminDb.collection("invites").doc(inviteId).get();
    
    if (!inviteDoc.exists) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    const invite = inviteDoc.data()
    
    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Get project details
    const projectDoc = await adminDb.collection("projects").doc(invite.projectId).get();
    
    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectDoc.data();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Return invite and project info (only what's needed for the invite page)
    return NextResponse.json({
      invite: {
        id: inviteDoc.id,
        email: invite.email,
        status: invite.status,
        projectId: invite.projectId,
        invitedBy: invite.invitedBy,
      },
      project: {
        id: project.id,
        name: project.name,
        displayName: project.displayName,
      },
    });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json(
      { error: "Failed to fetch invite details" },
      { status: 500 }
    );
  }
}