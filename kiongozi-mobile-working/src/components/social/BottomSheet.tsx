import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface SheetAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: SheetAction[];
}

export function BottomSheet({ visible, onClose, title, subtitle, actions }: BottomSheetProps) {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const sheetY = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      sheetY.setValue(300);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 300, duration: 180, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={styles.handle} />

          {(title || subtitle) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          )}

          {actions.map((action, i) => (
            <React.Fragment key={action.label}>
              {i > 0 && actions[i - 1].destructive !== action.destructive && (
                <View style={styles.divider} />
              )}
              <TouchableOpacity
                style={[styles.item, action.disabled && styles.itemDisabled]}
                onPress={() => { if (!action.disabled) { onClose(); action.onPress(); } }}
                activeOpacity={0.7}
              >
                <Ionicons name={action.icon} size={22} color={action.destructive ? T.error : action.disabled ? T.textMuted : T.text} />
                <Text style={[styles.itemLabel, action.destructive && { color: T.error }, action.disabled && { color: T.textMuted }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}

          <View style={styles.divider} />
          <TouchableOpacity style={styles.item} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close-outline" size={22} color={T.textSub} />
            <Text style={[styles.itemLabel, { color: T.textSub }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: T.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
      paddingTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 20,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: T.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: T.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      color: T.textSub,
      lineHeight: 18,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    itemDisabled: { opacity: 0.45 },
    itemLabel: {
      fontSize: 16,
      color: T.text,
      fontWeight: '500',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: T.border,
      marginHorizontal: 16,
      marginVertical: 4,
    },
  });
}
