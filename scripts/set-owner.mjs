/**
 * scripts/set-owner.mjs
 * 
 * Script to promote any registered user to OWNER in Cloud Firestore.
 * 
 * IMPORTANT:
 * - This script preserves the user's real email, name, and profile data untouched.
 * - It only elevates their role to 'owner' and activates their account status with multi-lodge access.
 * - Accepts either a Firebase Auth UID or the user's registered Email address.
 * 
 * Usage:
 *   node scripts/set-owner.mjs <USER_UID_OR_EMAIL>
 * 
 * Examples:
 *   node scripts/set-owner.mjs user@example.com
 *   node scripts/set-owner.mjs 4aB8c9DeF0123
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB1e2vKMoWVAE-wS_0jlbkqSdhA2FiE6IE",
  authDomain: "lemonwood-lodge.firebaseapp.com",
  projectId: "lemonwood-lodge",
  storageBucket: "lemonwood-lodge.firebasestorage.app",
  messagingSenderId: "371488536263",
  appId: "1:371488536263:web:24b5b0d66a198a90d3f0e2"
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
===========================================================
  LemonWood Lodge Management - Promote User to Owner
===========================================================
Usage:
  npm run set-owner <USER_UID_OR_EMAIL>

Examples:
  npm run set-owner myemail@example.com
  npm run set-owner 4aB8c9DeF0123xyz

Note:
  - The user must already have registered in the app.
  - Their real name, email, and phone will remain untouched.
  - Only 'role', 'accountStatus', and lodge access are updated.
===========================================================
  `);
  process.exit(1);
}

const targetIdentifier = args[0].trim();

async function main() {
  console.log(`\nConnecting to Firebase project [${firebaseConfig.projectId}]...`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  let targetUid = null;
  let existingData = null;
  let userRef = null;

  // Check if identifier is an email address
  if (targetIdentifier.includes('@')) {
    const searchEmail = targetIdentifier.toLowerCase();
    console.log(`Searching Firestore for registered user with email: ${searchEmail}...`);
    
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', searchEmail));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error(`
❌ ERROR: No registered user found with email "${searchEmail}".
-----------------------------------------------------------
Please register in the app first using that email address,
then run this command again to promote the account to Owner.
      `);
      process.exit(1);
    }

    const matchedDoc = snapshot.docs[0];
    targetUid = matchedDoc.id;
    existingData = matchedDoc.data();
    userRef = doc(db, 'users', targetUid);
  } else {
    // Identifier is a UID
    targetUid = targetIdentifier;
    userRef = doc(db, 'users', targetUid);
    console.log(`Fetching user document at users/${targetUid}...`);
    
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      console.error(`
❌ ERROR: No user document found for UID "${targetUid}".
-----------------------------------------------------------
Please sign up in the app first so your account document is
created, then run this command again.
      `);
      process.exit(1);
    }

    existingData = snap.data();
  }

  const userRealName = existingData.name || '(Not yet set)';
  const userRealEmail = existingData.email || '(None)';
  const now = new Date().toISOString();

  console.log(`\nFound User:`);
  console.log(` - UID   : ${targetUid}`);
  console.log(` - Name  : ${userRealName} (Will NOT be modified)`);
  console.log(` - Email : ${userRealEmail} (Will NOT be modified)`);
  console.log(` - Current Role   : ${existingData.role || 'none'}`);
  console.log(` - Current Status : ${existingData.accountStatus || existingData.status || 'pending'}`);

  // Query actual existing properties from Firestore
  let assignedProps = [];
  try {
    const propsSnapshot = await getDocs(collection(db, 'properties'));
    assignedProps = propsSnapshot.docs.map((d) => d.id);
  } catch (err) {
    console.warn('Notice: Could not list properties collection:', err.message);
  }

  if (assignedProps.length === 0 && Array.isArray(existingData.propertyIds) && existingData.propertyIds.length > 0) {
    assignedProps = existingData.propertyIds;
  }

  // Only update RBAC and status fields; preserve name, email, phone, and metadata untouched
  const updates = {
    role: 'owner',
    accountStatus: 'active',
    status: 'active',
    isActive: true,
    organizationId: existingData.organizationId || 'org_lemonwood',
    propertyIds: assignedProps,
    designation: existingData.designation || 'Owner',
    updatedAt: now,
  };

  console.log(`\nPromoting to OWNER with active access...`);
  await updateDoc(userRef, updates);

  console.log(`
===========================================================
  SUCCESS! User is now promoted to OWNER.
-----------------------------------------------------------
  UID            : ${targetUid}
  Name           : ${userRealName} (preserved)
  Email          : ${userRealEmail} (preserved)
  Role           : owner
  Account Status : active
  Assigned Lodges: ${assignedProps.length > 0 ? assignedProps.join(', ') : 'None created yet'}
===========================================================
When this user logs in with their credentials, they will be
redirected to /owner/dashboard with complete owner access.
  `);

  process.exit(0);
}

main().catch((err) => {
  console.error('\nError updating user role:', err);
  process.exit(1);
});
