// This file should be in the root utils folder, not in the app folder
// File path: utils/userUtils.js (not app/utils/userUtils.js)

import AuthService from '../app/services/authService';

// Helper function to handle errors
const getErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

// Example: Get user ID for API calls
export const getCurrentUserId = async () => {
  try {
    const userId = await AuthService.getUserId();
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', getErrorMessage(error));
    return null;
  }
};

// Example: Check if user is logged in
export const isUserLoggedIn = async () => {
  try {
    const userData = await AuthService.getUserData();
    return userData !== null;
  } catch (error) {
    console.error('Error checking login status:', getErrorMessage(error));
    return false;
  }
};

// Example: Use in your existing API calls
export const addItemsToStock = async (items) => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }

    const response = await fetch('http://10.158.161.107:3000/process-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: items,
        userId: userId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add items to stock');
    }

    return data;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error('Error adding items to stock:', errorMessage);
    throw new Error(errorMessage);
  }
};
