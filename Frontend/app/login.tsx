import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Lock, Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import authService from '@/services/authService';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Helper function to handle errors
const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [resetData, setResetData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResetInputChange = (field: string, value: string) => {
    setResetData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await authService.signIn(formData.email, formData.password);
      
      Alert.alert('Success', 'Login successful!', [
        {
          text: 'OK',
          onPress: () => router.push('/(tabs)'),
        },
      ]);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetOTP = async () => {
    if (!resetData.email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await authService.sendPasswordResetOTP(resetData.email);
      
      Alert.alert(
        'Success',
        'A password reset OTP has been sent to your email. Please check your inbox.',
        [
          {
            text: 'OK',
            onPress: () => setResetStep(2),
          },
        ]
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

const handleVerifyOTP = async () => {
  if (!resetData.otp || resetData.otp.length !== 6) {
    Alert.alert('Error', 'Please enter the valid 6 digit OTP sent to your email');
    return;
  }

  setIsLoading(true);
  
  try {
    // Use the new password reset OTP verification method
    await authService.verifyPasswordResetOTP(resetData.email, resetData.otp);
    
    Alert.alert(
      'Success',
      'OTP verified successfully. Please enter your new password.',
      [
        {
          text: 'OK',
          onPress: () => setResetStep(3),
        },
      ]
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    Alert.alert('Error', errorMessage);
  } finally {
    setIsLoading(false);
  }
};

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleResetPassword = async () => {
    if (!resetData.newPassword || !resetData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (resetData.newPassword !== resetData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const passwordError = validatePassword(resetData.newPassword);
    if (passwordError) {
      Alert.alert('Error', passwordError);
      return;
    }

    setIsLoading(true);
    
    try {
      await authService.resetPassword(resetData.email, resetData.newPassword);
      
      Alert.alert(
        'Success',
        'Your password has been reset successfully. You can now log in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowForgotPassword(false);
              setResetStep(1);
              setResetData({
                email: '',
                otp: '',
                newPassword: '',
                confirmPassword: '',
              });
            },
          },
        ]
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert('Social Login', `${provider} login would be implemented here`);
  };

  const goBackToLogin = () => {
    setShowForgotPassword(false);
    setResetStep(1);
    setResetData({
      email: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  // Reset Email Step
  if (showForgotPassword && resetStep === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.delay(200)} style={styles.content}>
            <TouchableOpacity style={styles.backButtonTop} onPress={goBackToLogin}>
              <ArrowLeft size={24} color="#6BCF7F" />
            </TouchableOpacity>
            
            <View style={styles.header}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a verification code
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWithIcon}>
                  <Mail size={20} color="#A0AEC0" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIconText]}
                    placeholder="Enter your email"
                    value={resetData.email}
                    onChangeText={(value) => handleResetInputChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#A0AEC0"
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>

            <Animated.View entering={FadeInDown.delay(400)} style={styles.buttonContainer}>
              <AnimatedTouchableOpacity
                style={[styles.primaryButton, isLoading && styles.disabledButton]}
                onPress={handleSendResetOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                )}
              </AnimatedTouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // OTP Verification Step
  if (showForgotPassword && resetStep === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.delay(200)} style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to {resetData.email}
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="000000"
                  value={resetData.otp}
                  onChangeText={(value) => handleResetInputChange('otp', value)}
                  keyboardType="numeric"
                  maxLength={6}
                  placeholderTextColor="#A0AEC0"
                  editable={!isLoading}
                />
              </View>
            </View>

            <Animated.View entering={FadeInDown.delay(400)} style={styles.buttonContainer}>
              <AnimatedTouchableOpacity
                style={[styles.primaryButton, isLoading && styles.disabledButton]}
                onPress={handleVerifyOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify Code</Text>
                )}
              </AnimatedTouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={handleSendResetOTP}
                disabled={isLoading}
              >
                <Text style={styles.backButtonText}>Resend Code</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // New Password Step
  if (showForgotPassword && resetStep === 3) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.delay(200)} style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>
                Your new password must be different from your previous password
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputWithIcon}>
                  <Lock size={20} color="#A0AEC0" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIconText]}
                    placeholder="Enter new password"
                    value={resetData.newPassword}
                    onChangeText={(value) => handleResetInputChange('newPassword', value)}
                    secureTextEntry
                    placeholderTextColor="#A0AEC0"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWithIcon}>
                  <Lock size={20} color="#A0AEC0" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIconText]}
                    placeholder="Confirm new password"
                    value={resetData.confirmPassword}
                    onChangeText={(value) => handleResetInputChange('confirmPassword', value)}
                    secureTextEntry
                    placeholderTextColor="#A0AEC0"
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>

            <Animated.View entering={FadeInDown.delay(400)} style={styles.buttonContainer}>
              <AnimatedTouchableOpacity
                style={[styles.primaryButton, isLoading && styles.disabledButton]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Reset Password</Text>
                )}
              </AnimatedTouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main Login Screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200)} style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.appName}>GrocyGenie</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWithIcon}>
                <Mail size={20} color="#A0AEC0" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIconText]}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#A0AEC0"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWithIcon}>
                <Lock size={20} color="#A0AEC0" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIconText]}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#A0AEC0"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#A0AEC0" />
                  ) : (
                    <Eye size={20} color="#A0AEC0" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => setShowForgotPassword(true)}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <Animated.View entering={FadeInDown.delay(400)} style={styles.buttonContainer}>
            <AnimatedTouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </AnimatedTouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('Google')}
                disabled={isLoading}
              >
                <Text style={styles.socialButtonText}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('Facebook')}
                disabled={isLoading}
              >
                <Text style={styles.socialButtonText}>f</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.signUpLink}
              onPress={() => router.push('/onboarding')}
              disabled={isLoading}
            >
              <Text style={styles.signUpLinkText}>
                Don't have an account? <Text style={styles.signUpLinkBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#6BCF7F',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    gap: 24,
    marginBottom: 40,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    color: '#2D3748',
  },
  inputWithIcon: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWithIconText: {
    paddingLeft: 52,
    paddingRight: 52,
  },
  inputIcon: {
    position: 'absolute',
    left: 18,
    zIndex: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: 18,
    zIndex: 1,
    padding: 4,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#6BCF7F',
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 20,
    paddingBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#6BCF7F',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
    shadowOpacity: 0,
    elevation: 0,
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButtonText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 14,
    color: '#718096',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  socialButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 60,
  },
  socialButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A5568',
  },
  signUpLink: {
    alignItems: 'center',
  },
  signUpLinkText: {
    fontSize: 14,
    color: '#718096',
  },
  signUpLinkBold: {
    color: '#6BCF7F',
    fontWeight: '600',
  },
});
