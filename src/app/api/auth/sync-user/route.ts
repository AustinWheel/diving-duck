import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { User } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, displayName, photoURL } = body;

    if (!uid || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const usersRef = db.collection('users');
    const userDoc = usersRef.doc(uid);

    // Check if user exists
    const userSnapshot = await userDoc.get();
    
    if (!userSnapshot.exists) {
      // Create new user
      const newUser: Omit<User, 'createdAt' | 'updatedAt'> = {
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

    // Return user data including onboarding status
    const userData = userSnapshot.exists ? userSnapshot.data() : { isOnboarded: false };
    return NextResponse.json({ 
      success: true,
      isOnboarded: userData.isOnboarded || false
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}