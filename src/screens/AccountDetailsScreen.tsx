import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { supabase } from '../lib/supabase';
import { Spacing } from '../theme';

export default function AccountDetailsScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ Nunito_700Bold });

  const handleSave = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Build profile data with only provided fields
      const profileData: any = {
        user_id: user.id,
      };

      if (firstName.trim()) profileData.first_name = firstName.trim();
      if (lastName.trim()) profileData.last_name = lastName.trim();

      const { error } = await supabase.from('user_profiles').upsert(profileData);

      if (error) throw error;

      // Trigger a custom event to notify App.tsx to re-check profile
      DeviceEventEmitter.emit('profileUpdated');
      // Navigation will be handled by the App component
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile information.');
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={['#2d4a66', '#1f2e4f', '#16202f']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.inner,
            {
              paddingTop: Math.max(insets.top, 40) + 20,
              paddingBottom: insets.bottom + 40
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={[styles.title, fontsLoaded && { fontFamily: 'Nunito_700Bold' }]}>
              Complete Your Profile
            </Text>
            <Text style={styles.subtitle}>
              Tell us your name to personalize your experience. You can add more details later in your profile settings.
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, firstNameFocused && styles.inputFocused]}
              placeholder="First Name (Optional)"
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              value={firstName}
              onChangeText={setFirstName}
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => setFirstNameFocused(false)}
              autoCapitalize="words"
              autoComplete="name-given"
            />

            <TextInput
              style={[styles.input, lastNameFocused && styles.inputFocused]}
              placeholder="Last Name (Optional)"
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              value={lastName}
              onChangeText={setLastName}
              onFocus={() => setLastNameFocused(true)}
              onBlur={() => setLastNameFocused(false)}
              autoCapitalize="words"
              autoComplete="name-family"
            />

            <TouchableOpacity
              style={[
                styles.button,
                saving && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2e4f',
  },
  flex: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 21,
    color: '#ffffff',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputFocused: {
    borderColor: '#3db88a',
    shadowColor: '#3db88a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    backgroundColor: '#f5a623',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
