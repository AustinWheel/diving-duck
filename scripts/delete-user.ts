#!/usr/bin/env tsx

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = join(__dirname, '../service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

interface DeleteStats {
  userDeleted: boolean;
  projectsOwned: number;
  projectsMember: number;
  invitesSent: number;
  invitesReceived: number;
  apiKeys: number;
  events: number;
  alerts: number;
  bucketedEvents: number;
  errors: string[];
}

async function deleteUser(userId: string): Promise<DeleteStats> {
  const stats: DeleteStats = {
    userDeleted: false,
    projectsOwned: 0,
    projectsMember: 0,
    invitesSent: 0,
    invitesReceived: 0,
    apiKeys: 0,
    events: 0,
    alerts: 0,
    bucketedEvents: 0,
    errors: []
  };

  console.log(`Starting deep delete for user: ${userId}`);
  
  try {
    // 1. Get user data first
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error(`User document not found for ID: ${userId}`);
      stats.errors.push('User document not found');
    } else {
      const userData = userDoc.data();
      console.log(`Found user: ${userData?.email || 'Unknown'}`);
    }

    // 2. Find and delete projects where user is owner
    console.log('\n📁 Deleting owned projects...');
    const ownedProjects = await db.collection('projects')
      .where('ownerId', '==', userId)
      .get();
    
    for (const projectDoc of ownedProjects.docs) {
      const projectId = projectDoc.id;
      const projectData = projectDoc.data();
      console.log(`  - Deleting project: ${projectData.displayName} (${projectId})`);
      
      // Delete all API keys for this project
      const keysSnapshot = await db.collection('keys')
        .where('projectId', '==', projectId)
        .get();
      
      for (const keyDoc of keysSnapshot.docs) {
        await keyDoc.ref.delete();
        stats.apiKeys++;
      }
      
      // Delete all events for this project
      const eventsSnapshot = await db.collection('events')
        .where('projectId', '==', projectId)
        .get();
      
      const eventBatch = db.batch();
      let eventCount = 0;
      for (const eventDoc of eventsSnapshot.docs) {
        eventBatch.delete(eventDoc.ref);
        eventCount++;
        if (eventCount % 500 === 0) {
          await eventBatch.commit();
        }
      }
      if (eventCount % 500 !== 0) {
        await eventBatch.commit();
      }
      stats.events += eventCount;
      
      // Delete bucketed events
      const bucketedEventsSnapshot = await db.collection('bucketedEvents')
        .where('projectId', '==', projectId)
        .get();
      
      for (const bucketDoc of bucketedEventsSnapshot.docs) {
        await bucketDoc.ref.delete();
        stats.bucketedEvents++;
      }
      
      // Delete alerts for this project
      const alertsSnapshot = await db.collection('alerts')
        .where('projectId', '==', projectId)
        .get();
      
      for (const alertDoc of alertsSnapshot.docs) {
        await alertDoc.ref.delete();
        stats.alerts++;
      }
      
      // Delete invites for this project
      const invitesSnapshot = await db.collection('invites')
        .where('projectId', '==', projectId)
        .get();
      
      for (const inviteDoc of invitesSnapshot.docs) {
        await inviteDoc.ref.delete();
        stats.invitesSent++;
      }
      
      // Finally, delete the project itself
      await projectDoc.ref.delete();
      stats.projectsOwned++;
    }

    // 3. Remove user from projects where they are a member (but not owner)
    console.log('\n👥 Removing from member projects...');
    const memberProjects = await db.collection('projects')
      .where('memberIds', 'array-contains', userId)
      .get();
    
    for (const projectDoc of memberProjects.docs) {
      const projectData = projectDoc.data();
      if (projectData.ownerId !== userId) {
        console.log(`  - Removing from project: ${projectData.displayName}`);
        
        const updatedMemberIds = (projectData.memberIds || []).filter((id: string) => id !== userId);
        await projectDoc.ref.update({ memberIds: updatedMemberIds });
        stats.projectsMember++;
      }
    }

    // 4. Delete invites sent by this user
    console.log('\n✉️  Deleting sent invites...');
    const sentInvites = await db.collection('invites')
      .where('invitedBy', '==', userId)
      .get();
    
    for (const inviteDoc of sentInvites.docs) {
      await inviteDoc.ref.delete();
      stats.invitesSent++;
    }

    // 5. Delete invites received by this user
    console.log('\n📨 Deleting received invites...');
    const userEmail = userDoc.exists ? userDoc.data()?.email : null;
    if (userEmail) {
      const receivedInvites = await db.collection('invites')
        .where('email', '==', userEmail)
        .get();
      
      for (const inviteDoc of receivedInvites.docs) {
        await inviteDoc.ref.delete();
        stats.invitesReceived++;
      }
    }

    // 6. Delete any API keys created by this user (edge case)
    console.log('\n🔑 Deleting user-created keys...');
    const userKeys = await db.collection('keys')
      .where('createdBy', '==', userId)
      .get();
    
    for (const keyDoc of userKeys.docs) {
      await keyDoc.ref.delete();
      stats.apiKeys++;
    }

    // 7. Delete the user document from Firestore
    console.log('\n🗑️  Deleting user document...');
    if (userDoc.exists) {
      await db.collection('users').doc(userId).delete();
      stats.userDeleted = true;
    }

    // 8. Delete the Firebase Auth user
    console.log('\n🔐 Deleting Firebase Auth user...');
    try {
      await auth.deleteUser(userId);
      console.log('  ✅ Firebase Auth user deleted');
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        console.log('  ⚠️  Firebase Auth user not found (may already be deleted)');
      } else {
        console.error('  ❌ Error deleting Firebase Auth user:', authError.message);
        stats.errors.push(`Auth deletion error: ${authError.message}`);
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error during deletion:', error);
    stats.errors.push(error.message);
  }

  return stats;
}

// Main execution
async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Error: Please provide a user ID as an argument');
    console.error('Usage: npm run delete-user <userId>');
    process.exit(1);
  }

  console.log('🚨 WARNING: This will permanently delete the user and ALL associated data!');
  console.log(`User ID: ${userId}`);
  console.log('\nStarting deletion in 3 seconds... (Ctrl+C to cancel)\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const startTime = Date.now();
  const stats = await deleteUser(userId);
  const duration = Date.now() - startTime;

  console.log('\n📊 Deletion Summary:');
  console.log('===================');
  console.log(`✅ User deleted: ${stats.userDeleted}`);
  console.log(`📁 Projects owned deleted: ${stats.projectsOwned}`);
  console.log(`👥 Removed from projects: ${stats.projectsMember}`);
  console.log(`✉️  Invites sent deleted: ${stats.invitesSent}`);
  console.log(`📨 Invites received deleted: ${stats.invitesReceived}`);
  console.log(`🔑 API keys deleted: ${stats.apiKeys}`);
  console.log(`📝 Events deleted: ${stats.events}`);
  console.log(`📦 Bucketed events deleted: ${stats.bucketedEvents}`);
  console.log(`🚨 Alerts deleted: ${stats.alerts}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log(`\n⏱️  Total time: ${(duration / 1000).toFixed(2)}s`);
  
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});