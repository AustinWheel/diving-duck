import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { Invite, Project, User } from '@/types/database';

const adminDb = admin.firestore();

export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Verify the ID token
    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Get user's email
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() as User;
    const userEmail = userData.email;

    // Get all pending invites for this user's email
    const invitesSnapshot = await adminDb
      .collection('invites')
      .where('email', '==', userEmail)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    const invites: any[] = [];
    
    for (const inviteDoc of invitesSnapshot.docs) {
      const inviteData = inviteDoc.data() as Invite;
      
      // Get project details
      const projectDoc = await adminDb.collection('projects').doc(inviteData.projectId).get();
      if (!projectDoc.exists) {
        continue; // Skip if project doesn't exist
      }
      
      const projectData = projectDoc.data() as Project;
      
      // Get inviter details
      let inviterName = 'Unknown';
      try {
        const inviterDoc = await adminDb.collection('users').doc(inviteData.invitedBy).get();
        if (inviterDoc.exists) {
          const inviterData = inviterDoc.data();
          inviterName = inviterData?.displayName || inviterData?.email || 'Unknown';
        }
      } catch (error) {
        console.error('Error fetching inviter details:', error);
      }

      // Convert timestamps to ISO strings
      const sentAt = inviteData.sentAt?.toDate ? inviteData.sentAt.toDate().toISOString() : inviteData.sentAt;
      const createdAt = inviteData.createdAt?.toDate ? inviteData.createdAt.toDate().toISOString() : inviteData.createdAt;

      invites.push({
        id: inviteDoc.id,
        projectId: inviteData.projectId,
        projectName: projectData.displayName || projectData.name,
        invitedBy: inviterName,
        sentAt,
        createdAt,
      });
    }

    return NextResponse.json({
      invites,
    });
  } catch (error) {
    console.error('Error fetching user invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}