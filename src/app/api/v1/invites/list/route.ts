import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { Project, Invite } from '@/types/database';

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

    // Get project ID from query params
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data() as Project;

    // Check if user is a member or owner
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json(
        { error: 'Access denied to this project' },
        { status: 403 }
      );
    }

    // Get all pending invites for this project
    const invitesSnapshot = await adminDb
      .collection('invites')
      .where('projectId', '==', projectId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    const invites: any[] = [];
    
    for (const inviteDoc of invitesSnapshot.docs) {
      const inviteData = inviteDoc.data() as Invite;
      
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

      // Convert Firestore timestamps to ISO strings
      const sentAt = inviteData.sentAt?.toDate ? inviteData.sentAt.toDate().toISOString() : inviteData.sentAt;
      const createdAt = inviteData.createdAt?.toDate ? inviteData.createdAt.toDate().toISOString() : inviteData.createdAt;
      
      invites.push({
        id: inviteDoc.id,
        email: inviteData.email,
        status: inviteData.status,
        invitedBy: inviterName,
        sentAt,
        createdAt,
      });
    }

    return NextResponse.json({
      invites,
      project: {
        id: projectId,
        name: projectData.name,
        displayName: projectData.displayName,
      }
    });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}