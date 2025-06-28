import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { Project, User, ProjectMember } from '@/types/database';

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

    // Get all member IDs (including owner)
    const allMemberIds = [...(projectData.memberIds || [])];
    if (!allMemberIds.includes(projectData.ownerId)) {
      allMemberIds.push(projectData.ownerId);
    }

    // Batch get user documents
    const members: any[] = [];
    
    // Process in batches of 10 (Firestore limit for 'in' queries)
    for (let i = 0; i < allMemberIds.length; i += 10) {
      const batch = allMemberIds.slice(i, i + 10);
      const usersSnapshot = await adminDb
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get();

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as User;
        
        // Get member role from projectMembers collection
        const memberDoc = await adminDb
          .collection('projectMembers')
          .doc(`${userDoc.id}_${projectId}`)
          .get();
        
        const memberData = memberDoc.data() as ProjectMember | undefined;
        
        // Convert Firestore timestamp to ISO string
        const joinedTimestamp = memberData?.joinedAt || userData.createdAt;
        const joinedAt = joinedTimestamp?.toDate ? joinedTimestamp.toDate().toISOString() : joinedTimestamp;
        
        members.push({
          id: userDoc.id,
          email: userData.email,
          displayName: userData.displayName || userData.email,
          photoURL: userData.photoURL,
          role: memberData?.role || (userDoc.id === projectData.ownerId ? 'owner' : 'member'),
          joinedAt,
        });
      }
    }

    // Sort by role (owner first) then by join date
    members.sort((a, b) => {
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (a.role !== 'owner' && b.role === 'owner') return 1;
      if (a.role === 'admin' && b.role === 'member') return -1;
      if (a.role === 'member' && b.role === 'admin') return 1;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    return NextResponse.json({
      members,
      project: {
        id: projectId,
        name: projectData.name,
        displayName: projectData.displayName,
      }
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}