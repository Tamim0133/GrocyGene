
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
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import AuthService from '../services/authService'; // Updated import path

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

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    otp: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string | any[]) => {
    return password.length >= 6;
  };

  const handleNextStep = async () => {
    if (step === 1) {
      // Validate form data
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }
      if (!formData.email.trim()) {
        Alert.alert('Error', 'Please enter your email address');
        return;
      }
      if (!validateEmail(formData.email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }
      if (!formData.password) {
        Alert.alert('Error', 'Please enter a password');
        return;
      }
      if (!validatePassword(formData.password)) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return;
      }

      setLoading(true);
      try {

      await AuthService.sendOTP(formData.email);
      Alert.alert('OTP Sent', 'Check your email for the 6-digit OTP', [
        { text: 'OK', onPress: () => setStep(2) },
      ]);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  } else if (step === 2) {
    // STEP 2: Validate OTP and complete signup
    if (!formData.otp || formData.otp.length !== 6) {
      return Alert.alert('Error', 'Please enter a valid 6-digit OTP');
    }

    setLoading(true);
    try {

      await AuthService.verifyOTP(formData.email, formData.otp);

        await AuthService.signUp(formData.email, formData.password, formData.name);
        Alert.alert(
          'Success', 
          'Account created successfully!.',
          [{ text: 'OK', onPress: () => router.push('/profile-setup') }]
        );
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    } 
  };

const handleResendOTP = async () => {
  setLoading(true);
  try {
    await AuthService.sendOTP(formData.email);
    Alert.alert('Success', 'A new OTP has been sent to your email');
  } catch (error) {
    Alert.alert('Error', getErrorMessage(error));
  } finally {
    setLoading(false);
  }
};

  const renderStepOne = () => (
    <Animated.View entering={FadeInUp.delay(200)} style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.appName}>GrocyGenie</Text>
        <Text style={styles.subtitle}>Your smart grocery companion 🌱</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholderTextColor="#A0AEC0"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
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
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWithIcon}>
            <Lock size={20} color="#A0AEC0" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIconText]}
              placeholder="Create a strong password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry={!showPassword}
              placeholderTextColor="#A0AEC0"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff size={20} color="#A0AEC0" />
              ) : (
                <Eye size={20} color="#A0AEC0" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderStepTwo = () => (
    <Animated.View entering={FadeInUp.delay(200)} style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to{'\n'}
          <Text style={styles.emailText}>{formData.email}</Text>
        </Text>
      </View>

      <View style={styles.otpContainer}>
        <Text style={styles.inputLabel}>Enter OTP Code</Text>
        <TextInput
          style={styles.otpInput}
          placeholder="000000"
          value={formData.otp}
          onChangeText={(value) => handleInputChange('otp', value)}
          keyboardType="numeric"
          maxLength={6}
          textAlign="center"
          placeholderTextColor="#A0AEC0"
          editable={!loading}
        />
        <TouchableOpacity 
          style={styles.resendButton} 
          onPress={handleResendOTP}
          disabled={loading}
        >
          <Text style={styles.resendText}>
            {loading ? 'Sending...' : "Didn't receive code? Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: step === 1 ? '50%' : '100%' },
              ]}
            />
          </View>
          <Text style={styles.progressText}>Step {step} of 2</Text>
        </View>

        {step === 1 ? renderStepOne() : renderStepTwo()}

        <Animated.View entering={FadeInDown.delay(400)} style={styles.buttonContainer}>
          <AnimatedTouchableOpacity
            style={[styles.nextButton, loading && styles.disabledButton]}
            onPress={handleNextStep}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {step === 1 ? 'Send OTP' : 'Get Started'}
                </Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </>
            )}
          </AnimatedTouchableOpacity>

          {step === 1 && (
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/login')}
              disabled={loading}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Your existing styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6BCF7F',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#718096',
    fontFamily: 'Inter-Medium',
  },
  stepContainer: {
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    marginBottom: 4,
  },
  appName: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#6BCF7F',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  emailText: {
    color: '#6BCF7F',
    fontFamily: 'Inter-SemiBold',
  },
  formContainer: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#FFFFFF',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  },
  otpContainer: {
    alignItems: 'center',
    gap: 24,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#6BCF7F',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    backgroundColor: '#F0FDF4',
    minWidth: 220,
    letterSpacing: 8,
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  resendButton: {
    marginTop: 12,
  },
  resendText: {
    fontSize: 14,
    color: '#6BCF7F',
    fontFamily: 'Inter-SemiBold',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    gap: 20,
  },
  nextButton: {
    backgroundColor: '#6BCF7F',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#718096',
    fontFamily: 'Inter-Regular',
  },
  loginLinkBold: {
    color: '#6BCF7F',
    fontFamily: 'Inter-SemiBold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});