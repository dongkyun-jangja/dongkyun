import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { DeliveryStatus } from '../types';

interface Props {
  status: DeliveryStatus;
  deliveredAt?: string;
  size?: 'sm' | 'md';
}

const config: Record<DeliveryStatus, { label: string; bg: string; text: string }> = {
  pending: { label: '대기', bg: colors.paper200, text: colors.gray },
  delivered: { label: '완료', bg: colors.green50, text: colors.green },
  issue: { label: '이슈', bg: colors.red50, text: colors.red },
};

export const StatusBadge = React.memo(function StatusBadge({
  status,
  deliveredAt,
  size = 'sm',
}: Props) {
  const { bg, text } = config[status];
  const label =
    status === 'delivered' && deliveredAt
      ? `완료 ${deliveredAt}`
      : config[status].label;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'md' && styles.md]}>
      <Text style={[styles.text, { color: text }, size === 'md' && styles.mdText]}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  md: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  mdText: {
    fontSize: 14,
  },
});
