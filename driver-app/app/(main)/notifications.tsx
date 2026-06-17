import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/colors';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    icon: 'checkmark-circle' as const,
    iconColor: colors.green,
    title: '배송 완료 처리됨',
    body: '홍길동 - GS25 서초점 배송이 완료 처리되었습니다.',
    time: '오늘 11:32',
    read: false,
  },
  {
    id: '2',
    icon: 'alert-circle' as const,
    iconColor: colors.red,
    title: '이슈 신고 접수',
    body: '박민수 - CU 강남점 이슈가 접수되었습니다. 담당자가 확인 중입니다.',
    time: '오늘 09:15',
    read: false,
  },
  {
    id: '3',
    icon: 'map' as const,
    iconColor: colors.orange,
    title: '배송 코스 업데이트',
    body: '오늘 배송 코스가 업데이트되었습니다. 확인 후 출발해 주세요.',
    time: '오늘 07:00',
    read: true,
  },
  {
    id: '4',
    icon: 'megaphone' as const,
    iconColor: colors.gray,
    title: '공지사항',
    body: '이번 주 금요일 물류센터 오후 3시 조기 마감 예정입니다.',
    time: '어제 17:45',
    read: true,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper100} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.black} />
          <Text style={styles.backText}>뒤로</Text>
        </Pressable>
        <Text style={styles.headerTitle}>알림</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {MOCK_NOTIFICATIONS.map((n, i) => (
          <View
            key={n.id}
            style={[
              styles.row,
              !n.read && styles.rowUnread,
              i < MOCK_NOTIFICATIONS.length - 1 && styles.rowBorder,
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${n.iconColor}15` }]}>
              <Ionicons name={n.icon} size={20} color={n.iconColor} />
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{n.title}</Text>
                {!n.read && <View style={styles.dot} />}
              </View>
              <Text style={styles.bodyText} numberOfLines={2}>{n.body}</Text>
              <Text style={styles.time}>{n.time}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.footer}>최근 7일간 알림을 표시합니다</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paper100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 60,
  },
  backText: { fontSize: 15, color: colors.black, fontWeight: '500' },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.black,
  },

  list: { paddingVertical: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    backgroundColor: colors.paper50,
  },
  rowUnread: { backgroundColor: colors.white },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: colors.black },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  bodyText: { fontSize: 13, color: colors.gray, lineHeight: 19 },
  time: { fontSize: 11, color: colors.border, fontWeight: '500', marginTop: 2 },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.border,
    paddingVertical: 24,
  },
});
