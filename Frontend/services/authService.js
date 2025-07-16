import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.33.19.24:3000';

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
  constructor() {
    this.sessionData = null;
  }

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

  async getUserData() {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', handleError(error));
      return null;
    }
  }

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

      if (data.user) {
        await this.storeUserData(data.user);
        console.log('User data stored successfully:', data.user);
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
        body: JSON.stringify({ email }),
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

  // Regular OTP verification (for signup)
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

  async sendPasswordResetOTP(email) {
    try {
      console.log('Sending password reset OTP to:', email);
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset OTP');
      }

      console.log('Password reset OTP sent successfully');
      return data;
    } catch (error) {
      const errorMessage = handleError(error);
      console.error('Send reset OTP error:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  async verifyPasswordResetOTP(email, otp) {
    try {
      console.log('Verifying password reset OTP for:', email);
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-otp`, {
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

      // Store reset token instead of session data
      this.resetToken = data.reset_token;

      console.log('Password reset OTP verified successfully, reset token stored');

      return data;
    } catch (error) {
      const errorMessage = handleError(error);
      console.error('Password reset OTP verification error:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  async resetPassword(email, newPassword) {
    try {
      if (!this.resetToken) {
        throw new Error('No valid reset token. Please verify OTP first.');
      }

      console.log('Resetting password...');

      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword,
          reset_token: this.resetToken
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      // Clear reset token after successful password reset
      this.resetToken = null;
      console.log('Password reset successfully');

      return data;
    } catch (error) {
      console.error('Reset password error:', error.message);
      throw error;
    }
  }

  async signOut() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await this.clearUserData();

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sign out failed');
      }

      return { message: 'Signed out successfully' };
    } catch (error) {
      await this.clearUserData();
      const errorMessage = handleError(error);
      console.error('Sign out error:', errorMessage);
      throw new Error(errorMessage);
    }
  }
}

export default new AuthService();
