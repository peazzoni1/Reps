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
  const [sex, setSex] = useState<'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null>(null);
  const [birthdate, setBirthdate] = useState('');
  const [saving, setSaving] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [birthdateFocused, setBirthdateFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ Nunito_700Bold });

  const validateDate = (dateStr: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    return regex.test(dateStr);
  };

  const formatDateForDb = (dateStr: string): string => {
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const handleSave = async () => {
    // Validate birthdate format if provided
    if (birthdate.trim() && !validateDate(birthdate)) {
      Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format.');
      return;
    }

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
      if (sex) profileData.sex = sex;
      if (birthdate.trim()) profileData.birthdate = formatDateForDb(birthdate);

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

  const handleBirthdateChange = (text: string) => {
    // Auto-format as user types
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length >= 5) {
      cleaned = cleaned.slice(0, 5) + '/' + cleaned.slice(5);
    }
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(0, 10);
    }
    setBirthdate(cleaned);
  };

  const isFormValid = !birthdate.trim() || validateDate(birthdate);

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
              Tell us a bit about yourself to personalize your experience. All fields are optional.
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

            <View style={styles.section}>
              <Text style={styles.label}>Sex (Optional)</Text>
              <View style={styles.optionRow}>
                {(['male', 'female', 'non-binary', 'prefer-not-to-say'] as const).map((option) => {
                  const label = option === 'prefer-not-to-say'
                    ? 'Prefer not to say'
                    : option === 'non-binary'
                    ? 'Non-binary'
                    : option.charAt(0).toUpperCase() + option.slice(1);

                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.option,
                        sex === option && styles.optionActive,
                      ]}
                      onPress={() => setSex(option)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionText,
                        sex === option && styles.optionTextActive,
                      ]} numberOfLines={1} adjustsFontSizeToFit>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Birthdate (Optional)</Text>
              <TextInput
                style={[styles.input, birthdateFocused && styles.inputFocused]}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                value={birthdate}
                onChangeText={handleBirthdateChange}
                onFocus={() => setBirthdateFocused(true)}
                onBlur={() => setBirthdateFocused(false)}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (!isFormValid || saving) && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isFormValid || saving}
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
  section: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  optionActive: {
    borderColor: '#3db88a',
    backgroundColor: 'rgba(61, 184, 138, 0.15)',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  optionTextActive: {
    color: '#3db88a',
    fontWeight: '600',
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
