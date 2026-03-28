import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type ProfileEditScreenProps = {
  onClose: () => void;
  onSave: () => void;
};

export default function ProfileEditScreen({ onClose, onSave }: ProfileEditScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null>(null);
  const [birthdate, setBirthdate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [birthdateFocused, setBirthdateFocused] = useState(false);
  const [heightFocused, setHeightFocused] = useState(false);
  const [weightFocused, setWeightFocused] = useState(false);

  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ Nunito_700Bold });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, sex, birthdate, height_inches, weight_lbs')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setSex(profile.sex || null);

        // Format birthdate from YYYY-MM-DD to MM/DD/YYYY
        if (profile.birthdate) {
          const date = new Date(profile.birthdate);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = date.getFullYear();
          setBirthdate(`${month}/${day}/${year}`);
        }

        setHeight(profile.height_inches ? String(profile.height_inches) : '');
        setWeight(profile.weight_lbs ? String(profile.weight_lbs) : '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

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

    // Validate height if provided
    if (height.trim() && (isNaN(Number(height)) || Number(height) <= 0)) {
      Alert.alert('Invalid Height', 'Please enter a valid height in inches.');
      return;
    }

    // Validate weight if provided
    if (weight.trim() && (isNaN(Number(weight)) || Number(weight) <= 0)) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight in pounds.');
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
      if (height.trim()) profileData.height_inches = Number(height);
      if (weight.trim()) profileData.weight_lbs = Number(weight);

      const { error } = await supabase.from('user_profiles').upsert(profileData);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!');
      onSave();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile information.');
    } finally {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#3db88a" size="large" />
      </View>
    );
  }

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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={28} color="#3db88a" />
            </TouchableOpacity>
            <Text style={[styles.title, fontsLoaded && { fontFamily: 'Nunito_700Bold' }]}>
              Edit Profile
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <Text style={styles.subtitle}>
            All fields are optional. This information helps personalize your experience.
          </Text>

          <View style={styles.form}>
            {/* Name Fields */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Personal Information</Text>
              <TextInput
                style={[styles.input, firstNameFocused && styles.inputFocused]}
                placeholder="First Name"
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
                placeholder="Last Name"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                value={lastName}
                onChangeText={setLastName}
                onFocus={() => setLastNameFocused(true)}
                onBlur={() => setLastNameFocused(false)}
                autoCapitalize="words"
                autoComplete="name-family"
              />
            </View>

            {/* Sex Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Sex</Text>
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

            {/* Birthdate */}
            <View style={styles.section}>
              <Text style={styles.label}>Birthdate</Text>
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

            {/* Body Measurements */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Body Measurements</Text>
              <TextInput
                style={[styles.input, heightFocused && styles.inputFocused]}
                placeholder="Height (inches)"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                value={height}
                onChangeText={setHeight}
                onFocus={() => setHeightFocused(true)}
                onBlur={() => setHeightFocused(false)}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, weightFocused && styles.inputFocused]}
                placeholder="Weight (lbs)"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                value={weight}
                onChangeText={setWeight}
                onFocus={() => setWeightFocused(true)}
                onBlur={() => setWeightFocused(false)}
                keyboardType="decimal-pad"
              />
            </View>

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
                <Text style={styles.buttonText}>Save Changes</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1f2e4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 32,
  },
  form: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3db88a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
