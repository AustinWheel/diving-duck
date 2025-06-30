import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { User } from "@/types/database";
import { track } from "@vercel/analytics/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, displayName, photoURL } = body;

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = admin.firestore();
    const usersRef = db.collection("users");
    const userDoc = usersRef.doc(uid);

    // Check if user exists
    const userSnapshot = await userDoc.get();

    if (!userSnapshot.exists) {
      // Create new user
      const newUser: Omit<User, "createdAt" | "updatedAt"> = {
        id: uid,
        email,
        displayName: displayName || null,
        photoURL: photoURL || null,
        isOnboarded: false, // New users need onboarding
      };

      await userDoc.set({
        ...newUser,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Track signup event
      await track("Signup", {
        location: "auth_sync",
        method: email.includes("@gmail.com") ? "google" : "github",
      });

      // Don't create a default project - user will create one during onboarding
    } else {
      // Update existing user
      await userDoc.update({
        email,
        displayName: displayName || null,
        photoURL: photoURL || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Get the latest user data from the database
    const latestUserDoc = await userDoc.get();
    const latestUserData = latestUserDoc.data();
    
    return NextResponse.json({
      success: true,
      isOnboarded: latestUserData?.isOnboarded || false,
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
