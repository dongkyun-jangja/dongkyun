import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../src/constants/colors';
import { Notice, useNotices } from '../../../src/hooks/useNotices';

function formatReadAt(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return '방금 열람';
  if (mins < 60) return `${mins}분 전 열람`;
  if (hours < 24) return `${hours}시간 전 열람`;
  if (days === 1) return '어제 열람';

  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mo = date.getMonth() + 1;
  const d = date.getDate();
  return `${mo}/${d} ${ampm} ${h12}:${m} 열람`;
}

// ─── 공지 행 컴포넌트 ───────────────────────────────────────────────
function NoticeRow({
  notice,
  isLast,
  read,
  readDate,
  onOpen,
}: {
  notice: Notice;
  isLast: boolean;
  read: boolean;
  readDate: Date | null;
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = !!(notice.detail);

  const handlePress = useCallback(() => {
    if (hasDetail) {
      setExpanded((v) => !v);
    }
    if (!read) {
      onOpen(notice.id);
    }
  }, [hasDetail, read, notice.id, onOpen]);

  // 탭할 때 읽음 처리 (처음 탭 시)
  const handleFirstTap = useCallback(() => {
    onOpen(notice.id);
    if (hasDetail) setExpanded((v) => !v);
  }, [hasDetail, notice.id, onOpen]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
      onPress={handleFirstTap}
    >
      {/* 읽음 dot */}
      <View style={styles.dotCol}>
        {!read && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.rowContent}>
        {/* 상단: 태그 + 날짜 */}
        <View style={styles.rowTop}>
          <View style={[
            styles.tag,
            notice.tag === '주의' && styles.tagWarn,
            notice.tag === '안내' && styles.tagInfo,
          ]}>
            <Text style={styles.tagText}>{notice.tag}</Text>
          </View>
          <Text style={styles.meta}>{notice.date} {notice.time}</Text>

          {/* 펼치기/접기 아이콘 */}
          {hasDetail && (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.border}
              style={{ marginLeft: 'auto' }}
            />
          )}
        </View>

        {/* 제목 */}
        <Text
          style={[styles.title, read && styles.titleRead]}
          numberOfLines={expanded ? undefined : 2}
        >
          {notice.title}
        </Text>

        {/* 상세 내용 (펼쳐졌을 때) */}
        {expanded && notice.detail && (
          <View style={styles.detailBox}>
            <Text style={styles.detailText}>{notice.detail}</Text>
          </View>
        )}

        {/* 열람 시각 */}
        {read && readDate && (
          <View style={styles.readRow}>
            <Ionicons name="checkmark-circle" size={12} color={colors.green} />
            <Text style={styles.readText}>{formatReadAt(readDate)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── 메인 화면 ──────────────────────────────────────────────────────
export default function NoticesScreen() {
  const { notices, unreadCount, isRead, readAt, markRead, markAllRead, loaded } = useNotices();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleOpen = useCallback((id: string) => {
    markRead(id);
  }, [markRead]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper50} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.push('/(main)/(tabs)/dashboard')}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.orange} />
          <Text style={styles.backBtnText}>홈</Text>
        </Pressable>

        <View style={styles.headerBottom}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>공지사항</Text>
            <Text style={styles.headerSub}>총 {notices.length}건</Text>
          </View>

          <View style={styles.headerRight}>
            {loaded && unreadCount > 0 && (
              <>
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>안읽음 {unreadCount}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.allReadBtn, pressed && { opacity: 0.7 }]}
                  onPress={markAllRead}
                  hitSlop={8}
                >
                  <Text style={styles.allReadBtnText}>모두 읽음</Text>
                </Pressable>
              </>
            )}
            {loaded && unreadCount === 0 && (
              <View style={styles.allReadBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.green} />
                <Text style={styles.allReadBadgeText}>모두 읽음</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      >
        {notices.map((notice, i) => (
          <NoticeRow
            key={notice.id}
            notice={notice}
            isLast={i === notices.length - 1}
            read={isRead(notice.id)}
            readDate={readAt(notice.id)}
            onOpen={handleOpen}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper50 },

  // 헤더
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.orange,
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.black,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: colors.gray,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  unreadBadge: {
    backgroundColor: colors.orange,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  allReadBtn: {
    backgroundColor: colors.paper200,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  allReadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
  },
  allReadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allReadBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green,
  },

  // 리스트
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // 행
  row: {
    flexDirection: 'row',
    paddingVertical: 14,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.paper100,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    borderRadius: 8,
  },

  // 읽음 dot 컬럼
  dotCol: {
    width: 8,
    paddingTop: 18,
    alignItems: 'center',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },

  rowContent: {
    flex: 1,
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // 태그
  tag: {
    backgroundColor: colors.black,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagWarn: { backgroundColor: colors.red },
  tagInfo: { backgroundColor: colors.orange },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },

  // 날짜
  meta: {
    fontSize: 12,
    color: colors.gray,
    fontVariant: ['tabular-nums'],
  },

  // 제목
  title: {
    fontSize: 15,
    color: colors.black,
    lineHeight: 22,
    fontWeight: '500',
  },
  titleRead: {
    color: colors.gray,
  },

  // 상세 내용
  detailBox: {
    backgroundColor: colors.paper100,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
  },
  detailText: {
    fontSize: 13,
    color: colors.black,
    lineHeight: 20,
    fontWeight: '400',
  },

  // 열람 시각
  readRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readText: {
    fontSize: 11,
    color: colors.green,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
