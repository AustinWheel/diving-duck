import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { Project } from "@/types/database";

const adminDb = admin.firestore();

export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    // Verify the ID token
    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get user document to check projectIds
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const userProjectIds = userData.projectIds || [];

    // Fetch all projects where user is owner or member
    const projects: any[] = [];

    // Get projects where user is owner
    const ownedProjectsSnapshot = await adminDb
      .collection("projects")
      .where("ownerId", "==", userId)
      .get();

    ownedProjectsSnapshot.forEach((doc) => {
      const data = doc.data() as Project;
      projects.push({
        id: doc.id,
        name: data.name,
        displayName: data.displayName,
        type: data.type,
        role: "owner",
        memberCount: (data.memberIds?.length || 0) + 1, // members + owner
        createdAt: data.createdAt,
      });
    });

    // Get projects where user is member (but not owner)
    if (userProjectIds.length > 0) {
      // We need to fetch all projects in userProjectIds and then filter
      const memberProjectsSnapshot = await adminDb
        .collection("projects")
        .where(admin.firestore.FieldPath.documentId(), "in", userProjectIds)
        .get();

      memberProjectsSnapshot.forEach((doc) => {
        const data = doc.data() as Project;
        // Filter out projects where user is owner (already added above)
        if (data.ownerId !== userId) {
          projects.push({
            id: doc.id,
            name: data.name,
            displayName: data.displayName,
            type: data.type,
            role: "member",
            memberCount: (data.memberIds?.length || 0) + 1,
            createdAt: data.createdAt,
          });
        }
      });
    }

    // Sort projects by creation date (newest first)
    projects.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      projects,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
