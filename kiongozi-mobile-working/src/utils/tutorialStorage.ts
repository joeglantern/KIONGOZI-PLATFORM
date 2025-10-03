import * as SecureStore from 'expo-secure-store';

const TUTORIAL_KEY = 'hasSeenTutorial';

/**
 * Check if the user has already seen the tutorial
 */
export async function hasSeenTutorial(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(TUTORIAL_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking tutorial status:', error);
    return false;
  }
}

/**
 * Mark the tutorial as seen
 */
export async function markTutorialAsSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(TUTORIAL_KEY, 'true');
  } catch (error) {
    console.error('Error marking tutorial as seen:', error);
  }
}

/**
 * Reset tutorial state (for testing or user-initiated replay)
 */
export async function resetTutorial(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TUTORIAL_KEY);
  } catch (error) {
    console.error('Error resetting tutorial:', error);
  }
}
