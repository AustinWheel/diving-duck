import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { FeatureRequest } from "@/types/database";

// GET /api/v1/features - List all feature requests (public)
export async function GET(request: NextRequest) {
  try {
    const featuresSnapshot = await adminDb
      .collection("featureRequests")
      .orderBy("upvoteCount", "desc")
      .orderBy("createdAt", "desc")
      .get();

    const features = featuresSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    })) as FeatureRequest[];

    return NextResponse.json({ features });
  } catch (error) {
    console.error("Error fetching features:", error);
    return NextResponse.json({ error: "Failed to fetch features" }, { status: 500 });
  }
}

// POST /api/v1/features - Create new feature request (authenticated)
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
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email || "Anonymous";
    const userName = decodedToken.name || undefined;

    // Parse request body
    const body = await request.json();
    const { title, description } = body;

    // Validate input
    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    // Create feature request
    const newFeature: Omit<FeatureRequest, "id"> = {
      title: title.trim(),
      description: description.trim(),
      status: "submitted",
      createdBy: userId,
      createdByEmail: userEmail,
      createdByName: userName,
      upvotedBy: [userId], // Creator automatically upvotes
      upvoteCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection("featureRequests").add({
      ...newFeature,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const feature: FeatureRequest = {
      id: docRef.id,
      ...newFeature,
    };

    return NextResponse.json({ feature }, { status: 201 });
  } catch (error) {
    console.error("Error creating feature:", error);
    return NextResponse.json({ error: "Failed to create feature request" }, { status: 500 });
  }
}