import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/lib/types/preferences';

/**
 * GET /api/user/preferences
 * Fetch user preferences from Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Try to fetch existing preferences
    const prefsRef = doc(db, 'userPreferences', userId);
    const prefsDoc = await getDoc(prefsRef);

    if (prefsDoc.exists()) {
      const preferences = prefsDoc.data() as UserPreferences;

      // Update last seen timestamp
      await updateDoc(prefsRef, {
        lastSeen: serverTimestamp(),
      });

      return NextResponse.json(preferences);
    }

    // Create default preferences for new user
    const newPreferences: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      userId,
      email: email || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSeen: new Date(),
    };

    // Save to Firestore
    await setDoc(prefsRef, {
      ...newPreferences,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });

    console.log(`✅ Created default preferences for user: ${userId}`);
    return NextResponse.json(newPreferences);

  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/preferences
 * Update user preferences in Firestore
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences data is required' },
        { status: 400 }
      );
    }

    const prefsRef = doc(db, 'userPreferences', userId);

    // Check if document exists
    const prefsDoc = await getDoc(prefsRef);

    if (prefsDoc.exists()) {
      // Update existing preferences
      await updateDoc(prefsRef, {
        ...preferences,
        updatedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });

      console.log(`✅ Updated preferences for user: ${userId}`);
    } else {
      // Create new preferences document
      await setDoc(prefsRef, {
        ...DEFAULT_USER_PREFERENCES,
        ...preferences,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });

      console.log(`✅ Created preferences for user: ${userId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/preferences
 * Partially update specific preference fields
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, path, value } = body;

    if (!userId || !path) {
      return NextResponse.json(
        { error: 'User ID and path are required' },
        { status: 400 }
      );
    }

    const prefsRef = doc(db, 'userPreferences', userId);

    // Build the update object with nested path support
    const updateData: any = {};
    updateData[path] = value;
    updateData.updatedAt = serverTimestamp();
    updateData.lastSeen = serverTimestamp();

    await updateDoc(prefsRef, updateData);

    console.log(`✅ Updated preference ${path} for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Preference ${path} updated successfully`,
      path,
      value,
    });

  } catch (error) {
    console.error('Error updating user preference:', error);
    return NextResponse.json(
      { error: 'Failed to update user preference' },
      { status: 500 }
    );
  }
}