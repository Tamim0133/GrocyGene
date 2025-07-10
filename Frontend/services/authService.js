
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.0.114:3000'; // Your server IP

// Helper function to handle errors properly
const handleError = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

class AuthService {
  // Store user data in AsyncStorage
  async storeUserData(userData) {
    try {
      await AsyncStorage.setItem('user_id', userData.id);
      await AsyncStorage.setItem('user_email', userData.email);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));

    } catch (error) {
      console.error('Error storing user data:', handleError(error));
      throw new Error('Failed to store user data');
    }
  }

  // Get user data from AsyncStorage
  async getUserData() {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', handleError(error));
      return null;
    }
  }

  // Get user ID from AsyncStorage
  async getUserId() {
    try {
      const user_id = await AsyncStorage.getItem('user_id');
      console.log('Fetching user ID from AsyncStorage:', user_id);
      return user_id ? user_id : null;
    } catch (error) {
      console.error('Error getting user ID:', handleError(error));
      return null;
    }
  }

  // Clear user data from AsyncStorage
  async clearUserData() {
    try {
      await AsyncStorage.multiRemove(['user_data', 'user_id', 'user_email']);
    } catch (error) {
      console.error('Error clearing user data:', handleError(error));
      throw new Error('Failed to clear user data');
    }
  }

  async signUp(email, password, name) {
  try {
    console.log('Signing up with email:', email, 'and name:', name);
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Server response is not valid JSON');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }
    console.log('Signup successful:', data);
    // Store user data after successful signup
    if (data.user) {
      await this.storeUserData(data.user);
      console.log('User data stored successfully:', data.user);
      console.log('User ID:', data.user.id);
      console.log('User Email:', data.user.email);
    }

    return data;
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('Signup error:', errorMessage);
    throw new Error(errorMessage);
  }
}

 async sendOTP(email) {
  try {
    console.log('Sending OTP to email:', email);
    const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email}),
    });

    const text = await response.text();
    console.log('Raw send OTP response:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Server response is not valid JSON');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send OTP');
    }

    return data;
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('Send OTP error:', errorMessage);
    throw new Error(errorMessage);
  }
}

  // Verify OTP
  async verifyOTP(email, otp) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      // Store user data after successful verification
      if (data.user) {
        await this.storeUserData(data.user);
      }

      return data;
    } catch (error) {
      const errorMessage = handleError(error);
      console.error('OTP verification error:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Sign in user
  async signIn(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign in failed');
      }

      // Store user data after successful sign in
      if (data.user) {
        await this.storeUserData(data.user);
      }

      return data;
    } catch (error) {
      const errorMessage = handleError(error);
      console.error('Sign in error:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Resend OTP
  async resendOTP(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      return data;
    } catch (error) {
      const errorMessage = handleError(error);
      console.error('Resend OTP error:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Sign out user
  async signOut() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Clear local storage regardless of server response
      await this.clearUserData();

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sign out failed');
      }

      return { message: 'Signed out successfully' };
    } catch (error) {
      // Still clear local data even if server request fails
      await this.clearUserData();
      const errorMessage = handleError(error);
      console.error('Sign out error:', errorMessage);
      throw new Error(errorMessage);
    }
  }
}

export default new AuthService();