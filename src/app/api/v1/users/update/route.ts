import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

// Allowed fields that users can update
const ALLOWED_UPDATE_FIELDS = [
  "displayName",
  "phoneNumber",
];

export async function PATCH(request: NextRequest) {
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
    const updates = await request.json();

    // Check if user exists
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Filter out non-allowed fields
    const allowedUpdates: Record<string, any> = {};
    let hasValidUpdates = false;

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (field in updates) {
        allowedUpdates[field] = updates[field];
        hasValidUpdates = true;
      }
    }

    if (!hasValidUpdates) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Validate specific fields
    if ("displayName" in allowedUpdates) {
      const displayName = allowedUpdates.displayName;
      if (typeof displayName !== "string" || displayName.length === 0) {
        return NextResponse.json(
          { error: "Display name must be a non-empty string" },
          { status: 400 }
        );
      }
      if (displayName.length > 100) {
        return NextResponse.json(
          { error: "Display name must be less than 100 characters" },
          { status: 400 }
        );
      }
    }

    if ("phoneNumber" in allowedUpdates) {
      const phoneNumber = allowedUpdates.phoneNumber;
      if (phoneNumber !== null && phoneNumber !== "") {
        // Basic phone number validation (E.164 format)
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
          return NextResponse.json(
            { error: "Phone number must be in E.164 format (e.g., +1234567890)" },
            { status: 400 }
          );
        }
      } else {
        // Allow clearing the phone number
        allowedUpdates.phoneNumber = null;
      }
    }

    // Project validation removed - defaultProjectId no longer supported

    // Add updatedAt timestamp
    allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Update the user document
    await userRef.update(allowedUpdates);

    // If displayName was updated, also update it in Firebase Auth
    if ("displayName" in allowedUpdates) {
      try {
        await getAuth().updateUser(userId, {
          displayName: allowedUpdates.displayName,
        });
      } catch (error) {
        console.error("Failed to update displayName in Firebase Auth:", error);
        // Continue anyway - Firestore is our source of truth
      }
    }

    // Get the updated user data
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      user: {
        id: userId,
        email: updatedData?.email,
        displayName: updatedData?.displayName,
        phoneNumber: updatedData?.phoneNumber,
        isOnboarded: updatedData?.isOnboarded,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}