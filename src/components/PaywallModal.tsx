import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases } from '../services/subscriptions';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  variant: 'soft' | 'hard'; // soft = dismissible, hard = must upgrade or close app
}

export default function PaywallModal({ visible, onClose, onSuccess, variant }: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  const loadOfferings = async () => {
    setLoading(true);
    const offers = await getOfferings();
    setPackages(offers);
    if (offers.length > 0) {
      // Default to first package (or yearly if available)
      const yearlyPkg = offers.find(pkg =>
        pkg.identifier.toLowerCase().includes('year') ||
        pkg.identifier.toLowerCase().includes('annual')
      );
      setSelectedPackage(yearlyPkg || offers[0]);
    }
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setPurchasing(true);
    try {
      const result = await purchasePackage(selectedPackage);
      if (result) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    }
    setPurchasing(false);
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      await restorePurchases();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Restore error:', error);
      alert('No purchases found to restore.');
    }
    setPurchasing(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={variant === 'soft' ? onClose : undefined}
    >
      <View style={styles.modalOverlay}>
        {variant === 'soft' && (
          <Pressable style={styles.modalBackdrop} onPress={onClose} />
        )}
        {variant === 'hard' && <View style={styles.modalBackdrop} />}

        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHandle} />

          {variant === 'soft' && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          )}

          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Get unlimited AI check-ins and advanced features
          </Text>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            {[
              { icon: '✨', title: 'Unlimited AI Check-Ins', desc: 'Get personalized insights every day' },
              { icon: '📊', title: 'Advanced Analytics', desc: 'Track progress and trends over time' },
              { icon: '🎯', title: 'Goal Tracking', desc: 'Set and achieve your fitness goals' },
              { icon: '💬', title: 'Priority Support', desc: 'Get help when you need it' },
            ].map((benefit, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDesc}>{benefit.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Package Selection */}
          {loading ? (
            <ActivityIndicator color="#3db88a" size="large" style={{ marginVertical: 20 }} />
          ) : packages.length === 0 ? (
            <Text style={styles.errorText}>
              Unable to load subscriptions. Please try again later.
            </Text>
          ) : packages.length === 1 ? (
            // Single package - show simple display
            <View style={styles.singlePackageContainer}>
              <Text style={styles.singlePackagePrice}>
                {packages[0].product.priceString}
              </Text>
              <Text style={styles.singlePackagePeriod}>
                {packages[0].identifier.toLowerCase().includes('month') ? '/month' : '/year'}
              </Text>
            </View>
          ) : (
            // Multiple packages - show selection
            <View style={styles.packagesContainer}>
              {packages.map((pkg) => {
                const isYearly = pkg.identifier.toLowerCase().includes('year') ||
                               pkg.identifier.toLowerCase().includes('annual');
                const isSelected = selectedPackage?.identifier === pkg.identifier;

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                    onPress={() => setSelectedPackage(pkg)}
                    activeOpacity={0.7}
                  >
                    {isYearly && (
                      <View style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>SAVE 17%</Text>
                      </View>
                    )}
                    <Text style={styles.packageTitle}>
                      {isYearly ? 'Yearly' : 'Monthly'}
                    </Text>
                    <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                    <Text style={styles.packagePeriod}>
                      {isYearly ? '/year' : '/month'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Purchase Button */}
          {!loading && packages.length > 0 && (
            <TouchableOpacity
              style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
              onPress={handlePurchase}
              disabled={purchasing || !selectedPackage}
              activeOpacity={0.8}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.purchaseButtonText}>Start Premium</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Restore Button */}
          {!loading && (
            <TouchableOpacity onPress={handleRestore} style={styles.restoreButton} disabled={purchasing}>
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.disclaimer}>
            Subscriptions auto-renew. Cancel anytime in App Store settings.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalSheet: {
    backgroundColor: '#1f2e4f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
    alignSelf: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  benefitsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  singlePackageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(61, 184, 138, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3db88a',
  },
  singlePackagePrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#3db88a',
  },
  singlePackagePeriod: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  packagesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  packageCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  packageCardSelected: {
    borderColor: '#3db88a',
    backgroundColor: 'rgba(61, 184, 138, 0.1)',
  },
  saveBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#f5a623',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3db88a',
  },
  packagePeriod: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  purchaseButton: {
    backgroundColor: '#3db88a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 14,
    color: '#3db88a',
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginVertical: 20,
  },
});
