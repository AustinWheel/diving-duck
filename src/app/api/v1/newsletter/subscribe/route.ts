import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingSubscription = await adminDb
      .collection("newsletterSubscriptions")
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (!existingSubscription.empty) {
      return NextResponse.json(
        { message: "Email already subscribed" },
        { status: 200 }
      );
    }

    // Create new subscription
    const subscriptionRef = adminDb.collection("newsletterSubscriptions").doc();
    await subscriptionRef.set({
      id: subscriptionRef.id,
      email: email.toLowerCase(),
      subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "blog",
      active: true,
    });

    return NextResponse.json({
      message: "Successfully subscribed to newsletter",
      subscribed: true,
    });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}