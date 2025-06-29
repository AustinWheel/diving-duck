import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: "Project name must be at least 3 characters", available: false },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return NextResponse.json(
        { error: "Project name can only contain letters, numbers, and hyphens", available: false },
        { status: 400 },
      );
    }

    // Check if project name exists
    const projectsRef = adminDb.collection("projects");
    const snapshot = await projectsRef.where("name", "==", name.toLowerCase()).limit(1).get();

    const available = snapshot.empty;

    return NextResponse.json({
      available,
      message: available ? "Project name is available" : "Project name is already taken",
    });
  } catch (error) {
    console.error("Error validating project name:", error);
    return NextResponse.json(
      { error: "Failed to validate project name", available: false },
      { status: 500 },
    );
  }
}
