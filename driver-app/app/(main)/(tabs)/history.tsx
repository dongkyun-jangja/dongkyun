import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { colors } from '../../../src/constants/colors';
import { useDelivery } from '../../../src/context/DeliveryContext';
import { Course, Store } from '../../../src/types';

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// 코스 집계
function calcCourseSummary(course: Course) {
  const delivered = course.stores.filter(s => s.status === 'delivered').length;
  const issues = course.stores.filter(s => s.status === 'issue').length;
  const total = course.stores.length;
  const totalBoxes = course.stores.reduce((sum, s) =>
    sum + s.items.reduce((b, i) => b + (i.boxUnit > 0 ? Math.floor(i.quantity / i.boxUnit) : 0), 0), 0);
  const totalKinds = course.stores.reduce((sum, s) => sum + s.items.length, 0);
  return { delivered, issues, total, totalBoxes, totalKinds, allDone: delivered === total };
}

// 달력 한 달 구성
function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ─── 달력 셀 ────────────────────────────────────────────────────────
function CalendarDay({
  day, date, courseForDay, isToday, isSelected, onPress,
}: {
  day: number | null;
  date: Date | null;
  courseForDay: { course: Course; index: number } | null;
  isToday: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  if (!day || !date) return <View style={calStyles.dayCell} />;

  const { delivered, total, issues, allDone } = courseForDay
    ? calcCourseSummary(courseForDay.course)
    : { delivered: 0, total: 0, issues: 0, allDone: false };

  return (
    <Pressable
      style={({ pressed }) => [
        calStyles.dayCell,
        isSelected && calStyles.dayCellSelected,
        pressed && courseForDay && { opacity: 0.75 },
      ]}
      onPress={courseForDay ? onPress : undefined}
      disabled={!courseForDay}
    >
      <View style={[calStyles.dayCircle, isToday && calStyles.dayCircleToday]}>
        <Text style={[
          calStyles.dayText,
          isToday && calStyles.dayTextToday,
          isSelected && calStyles.dayTextSelected,
          !courseForDay && calStyles.dayTextDisabled,
        ]}>
          {day}
        </Text>
      </View>
      {courseForDay && (
        <View style={calStyles.dotRow}>
          <View style={[calStyles.dot, { backgroundColor: allDone ? colors.green : colors.orange }]} />
          {issues > 0 && <View style={[calStyles.dot, { backgroundColor: colors.red }]} />}
        </View>
      )}
    </Pressable>
  );
}

// ─── 펼쳐진 매장 행 (전표 형태) ────────────────────────────────────
function StoreDetailRow({
  store,
  isLast,
  onPress,
}: {
  store: Store;
  isLast: boolean;
  onPress: () => void;
}) {
  const isDelivered = store.status === 'delivered';
  const isIssue = store.status === 'issue';
  const totalBags = store.items.reduce((s, i) => s + (i.bags ?? 0), 0);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.storeRow,
        !isLast && styles.storeRowBorder,
        isIssue && styles.storeRowIssue,
        pressed && { backgroundColor: colors.paper100 },
      ]}
      onPress={onPress}
    >
      {/* 순서 원 */}
      <View style={[
        styles.orderCircle,
        isDelivered && styles.orderCircleDone,
        isIssue && styles.orderCircleIssue,
      ]}>
        {isDelivered
          ? <Ionicons name="checkmark" size={12} color={colors.white} />
          : isIssue
          ? <Ionicons name="alert" size={10} color={colors.white} />
          : <Text style={styles.orderText}>{store.order}</Text>
        }
      </View>

      {/* 내용 */}
      <View style={styles.storeDetailContent}>
        {/* 매장명 + 상태 */}
        <View style={styles.storeNameRow}>
          <Text style={[
            styles.storeName,
            isDelivered && styles.storeNameDone,
          ]} numberOfLines={1}>
            {store.name}
          </Text>
          <StatusBadge status={store.status} deliveredAt={store.deliveredAt} />
        </View>

        {/* 주소 */}
        <Text style={styles.storeAddress} numberOfLines={1}>{store.address}</Text>

        {/* 상품 목록 */}
        <View style={styles.itemList}>
          {store.items.map((item) => {
            const boxes = item.boxUnit > 0 ? Math.floor(item.quantity / item.boxUnit) : 0;
            return (
              <View key={item.code} style={styles.itemLine}>
                <View style={styles.itemDot} />
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name.split('(')[0].trim()}
                </Text>
                <Text style={styles.itemQty}>
                  {boxes > 0 ? `${boxes}박스` : `${item.quantity}개`}
                </Text>
                {(item.bags ?? 0) > 0 && (
                  <View style={styles.bagMini}>
                    <Text style={styles.bagMiniText}>🛍{item.bags}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* 특이사항 */}
        {store.driverNote ? (
          <View style={styles.noteRow}>
            <Ionicons name="create-outline" size={11} color={colors.gray} />
            <Text style={styles.noteText} numberOfLines={2}>{store.driverNote}</Text>
          </View>
        ) : null}

        {/* 배송 메모 */}
        {store.memo ? (
          <View style={styles.memoRow}>
            <Ionicons name="warning" size={11} color={colors.black} />
            <Text style={styles.memoText} numberOfLines={1}>{store.memo}</Text>
          </View>
        ) : null}

        {/* 이슈 안내 */}
        {isIssue && (
          <View style={styles.issueRow}>
            <Ionicons name="alert-circle" size={12} color={colors.red} />
            <Text style={styles.issueRowText}>이슈 신고됨 — 담당자 확인 필요</Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={14} color={colors.border} />
    </Pressable>
  );
}

// ─── 메인 화면 ──────────────────────────────────────────────────────
export default function HistoryScreen() {
  const { allCourses, goToDate } = useDelivery();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'store'>('list');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const reversed = useMemo(
    () => [...allCourses].map((c, i) => ({ course: c, index: i })).reverse(),
    [allCourses],
  );

  const courseByDate = useMemo(() => {
    const map: Record<string, { course: Course; index: number }> = {};
    allCourses.forEach((c, i) => { map[c.date] = { course: c, index: i }; });
    return map;
  }, [allCourses]);

  const storeMap = useMemo(() => {
    const map = new Map<string, {
      storeId: string;
      storeName: string;
      storeAddress: string;
      totalVisits: number;
      completedVisits: number;
      issueVisits: number;
      visits: Array<{ date: string; status: string; deliveredAt?: string; driverNote?: string }>;
    }>();
    allCourses.forEach((c) => {
      c.stores.forEach((s) => {
        const key = s.name;
        const existing = map.get(key);
        const entry = { date: c.date, status: s.status, deliveredAt: s.deliveredAt, driverNote: s.driverNote };
        if (existing) {
          existing.totalVisits += 1;
          if (s.status === 'delivered') existing.completedVisits += 1;
          if (s.status === 'issue') existing.issueVisits += 1;
          existing.visits.push(entry);
          existing.storeId = s.id;
        } else {
          map.set(key, {
            storeId: s.id,
            storeName: s.name,
            storeAddress: s.address,
            totalVisits: 1,
            completedVisits: s.status === 'delivered' ? 1 : 0,
            issueVisits: s.status === 'issue' ? 1 : 0,
            visits: [entry],
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalVisits - a.totalVisits);
  }, [allCourses]);

  const todayIndex = allCourses.length - 1;

  const handleDatePress = useCallback((index: number) => {
    goToDate(index);
    setExpandedIndex(prev => prev === index ? null : index);
  }, [goToDate]);

  const minMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const canGoPrev = new Date(calYear, calMonth, 1) > minMonth;
  const canGoNext = calYear < today.getFullYear() || calMonth < today.getMonth();

  const goPrevMonth = () => {
    if (!canGoPrev) return;
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDate(null);
  };
  const goNextMonth = () => {
    if (!canGoNext) return;
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDate(null);
  };

  const calDays = buildCalendarDays(calYear, calMonth);
  const selectedCourse = selectedDate ? courseByDate[selectedDate] : null;

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

        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>배송 기록</Text>
          <View style={styles.viewToggle}>
            {([
              { mode: 'list', icon: 'list-outline' },
              { mode: 'calendar', icon: 'calendar-outline' },
              { mode: 'store', icon: 'storefront-outline' },
            ] as const).map(({ mode, icon }) => (
              <Pressable
                key={mode}
                style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
                onPress={() => setViewMode(mode)}
              >
                <Ionicons name={icon} size={16} color={viewMode === mode ? colors.white : colors.gray} />
              </Pressable>
            ))}
          </View>
        </View>
        <Text style={styles.headerSub}>
          {viewMode === 'list' ? '최근 배송 기록' : viewMode === 'calendar' ? '최근 3개월 달력' : `총 ${storeMap.length}개 매장`}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
      >

        {/* ── 목록 모드 ── */}
        {viewMode === 'list' && reversed.map(({ course, index }) => {
          const isToday = index === todayIndex;
          const { delivered, issues, total, totalBoxes, totalKinds, allDone } = calcCourseSummary(course);
          const isExpanded = expandedIndex === index;
          const sortedStores = [...course.stores].sort((a, b) => a.order - b.order);

          return (
            <View key={course.id} style={styles.dateGroup}>
              {/* 날짜 카드 */}
              <Pressable
                style={({ pressed }) => [
                  styles.dateCard,
                  isToday && styles.dateCardToday,
                  isExpanded && styles.dateCardExpanded,
                  pressed && { opacity: 0.92 },
                ]}
                onPress={() => handleDatePress(index)}
              >
                <View style={styles.dateCardLeft}>
                  <View style={styles.dateRow}>
                    <Text style={[styles.dateText, isToday && styles.dateTextToday]}>
                      {formatDateFull(course.date)}
                    </Text>
                    {isToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>오늘</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.courseText}>
                    {course.driver.distributorName} · {course.driver.courseName}
                  </Text>

                  {/* 집계 요약 */}
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <View style={[styles.dot, { backgroundColor: colors.green }]} />
                      <Text style={styles.summaryText}>완료 {delivered}/{total}</Text>
                    </View>
                    {issues > 0 && (
                      <>
                        <Text style={styles.summaryDivider}>·</Text>
                        <View style={styles.summaryItem}>
                          <View style={[styles.dot, { backgroundColor: colors.red }]} />
                          <Text style={[styles.summaryText, { color: colors.red }]}>이슈 {issues}</Text>
                        </View>
                      </>
                    )}
                    <Text style={styles.summaryDivider}>·</Text>
                    <Text style={styles.summaryText}>
                      {totalBoxes}박스 · {totalKinds}종
                    </Text>
                  </View>
                </View>

                <View style={styles.dateCardRight}>
                  {allDone
                    ? <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                    : isToday
                    ? <View style={styles.progressCircle}>
                        <Text style={styles.progressCircleText}>{delivered}/{total}</Text>
                      </View>
                    : <Ionicons name="time-outline" size={22} color={colors.gray} />
                  }
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.gray}
                    style={{ marginTop: 4 }}
                  />
                </View>
              </Pressable>

              {/* 펼쳐진 매장 목록 — 전표 형태 */}
              {isExpanded && (
                <View style={styles.storeList}>
                  {sortedStores.map((store, i) => (
                    <StoreDetailRow
                      key={store.id}
                      store={store}
                      isLast={i === sortedStores.length - 1}
                      onPress={() => router.push(`/(main)/store/${store.id}`)}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* ── 매장별 모드 ── */}
        {viewMode === 'store' && storeMap.map((s) => {
          const isExpanded = expandedStore === s.storeName;
          const allDone = s.completedVisits === s.totalVisits;
          return (
            <View key={s.storeName} style={styles.dateGroup}>
              <Pressable
                style={({ pressed }) => [
                  styles.dateCard,
                  isExpanded && styles.dateCardExpanded,
                  pressed && { opacity: 0.92 },
                ]}
                onPress={() => setExpandedStore(isExpanded ? null : s.storeName)}
              >
                <View style={styles.dateCardLeft}>
                  <Text style={styles.dateText} numberOfLines={1}>{s.storeName}</Text>
                  <Text style={styles.courseText} numberOfLines={1}>{s.storeAddress}</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <View style={[styles.dot, { backgroundColor: colors.green }]} />
                      <Text style={styles.summaryText}>완료 {s.completedVisits}/{s.totalVisits}회</Text>
                    </View>
                    {s.issueVisits > 0 && (
                      <>
                        <Text style={styles.summaryDivider}>·</Text>
                        <View style={styles.summaryItem}>
                          <View style={[styles.dot, { backgroundColor: colors.red }]} />
                          <Text style={[styles.summaryText, { color: colors.red }]}>이슈 {s.issueVisits}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.dateCardRight}>
                  {allDone
                    ? <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                    : <Ionicons name="storefront-outline" size={22} color={colors.gray} />
                  }
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16} color={colors.gray} style={{ marginTop: 4 }}
                  />
                </View>
              </Pressable>

              {isExpanded && (
                <View style={styles.storeList}>
                  {[...s.visits].reverse().map((v, i, arr) => (
                    <View
                      key={v.date + i}
                      style={[
                        styles.storeRow,
                        i < arr.length - 1 && styles.storeRowBorder,
                        v.status === 'issue' && styles.storeRowIssue,
                      ]}
                    >
                      <View style={[
                        styles.orderCircle,
                        v.status === 'delivered' && styles.orderCircleDone,
                        v.status === 'issue' && styles.orderCircleIssue,
                      ]}>
                        {v.status === 'delivered'
                          ? <Ionicons name="checkmark" size={12} color={colors.white} />
                          : v.status === 'issue'
                          ? <Ionicons name="alert" size={10} color={colors.white} />
                          : <Ionicons name="time-outline" size={12} color={colors.orange} />
                        }
                      </View>
                      <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>{formatDateFull(v.date)}</Text>
                        {v.deliveredAt
                          ? <Text style={styles.storeAddress}>{v.deliveredAt} 완료</Text>
                          : null
                        }
                        {v.driverNote
                          ? <View style={styles.noteRow}>
                              <Ionicons name="create-outline" size={11} color={colors.gray} />
                              <Text style={styles.noteText} numberOfLines={1}>{v.driverNote}</Text>
                            </View>
                          : null
                        }
                        {v.status === 'issue' && (
                          <View style={styles.issueRow}>
                            <Ionicons name="alert-circle" size={11} color={colors.red} />
                            <Text style={styles.issueRowText}>이슈 신고됨</Text>
                          </View>
                        )}
                      </View>
                      <StatusBadge status={v.status as any} deliveredAt={v.deliveredAt} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* ── 달력 모드 ── */}
        {viewMode === 'calendar' && (
          <View style={styles.calendarWrap}>
            <View style={styles.calNav}>
              <Pressable
                style={({ pressed }) => [styles.calNavBtn, !canGoPrev && styles.calNavBtnDisabled, pressed && { opacity: 0.6 }]}
                onPress={goPrevMonth} disabled={!canGoPrev}
              >
                <Ionicons name="chevron-back" size={20} color={canGoPrev ? colors.black : colors.border} />
              </Pressable>
              <Text style={styles.calNavTitle}>{calYear}년 {calMonth + 1}월</Text>
              <Pressable
                style={({ pressed }) => [styles.calNavBtn, !canGoNext && styles.calNavBtnDisabled, pressed && { opacity: 0.6 }]}
                onPress={goNextMonth} disabled={!canGoNext}
              >
                <Ionicons name="chevron-forward" size={20} color={canGoNext ? colors.black : colors.border} />
              </Pressable>
            </View>

            <View style={styles.calDayHeader}>
              {DAY_LABELS.map((d, i) => (
                <Text key={d} style={[
                  styles.calDayLabel,
                  i === 0 && { color: colors.red },
                  i === 6 && { color: colors.orange },
                ]}>{d}</Text>
              ))}
            </View>

            <View style={styles.calGrid}>
              {calDays.map((day, idx) => {
                const date = day ? new Date(calYear, calMonth, day) : null;
                const dateStr = date
                  ? `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : null;
                const courseForDay = dateStr ? (courseByDate[dateStr] ?? null) : null;
                return (
                  <CalendarDay
                    key={idx}
                    day={day}
                    date={date}
                    courseForDay={courseForDay}
                    isToday={date ? isSameDay(date, today) : false}
                    isSelected={dateStr === selectedDate}
                    onPress={() => {
                      if (!dateStr || !courseForDay) return;
                      setSelectedDate(prev => prev === dateStr ? null : dateStr);
                      goToDate(courseForDay.index);
                    }}
                  />
                );
              })}
            </View>

            {/* 선택된 날짜 — 전표 형태 */}
            {selectedCourse && (
              <View style={styles.calSelected}>
                {/* 집계 요약 */}
                {(() => {
                  const { delivered, total, totalBoxes, totalKinds, issues } = calcCourseSummary(selectedCourse.course);
                  return (
                    <View style={styles.calSummaryBar}>
                      <Text style={styles.calSelectedTitle}>
                        {formatDateFull(selectedCourse.course.date)}
                      </Text>
                      <View style={styles.calSummaryChips}>
                        <View style={styles.summaryChip}>
                          <Text style={styles.summaryChipText}>✅ {delivered}/{total}</Text>
                        </View>
                        <View style={styles.summaryChip}>
                          <Text style={styles.summaryChipText}>📦 {totalBoxes}박스</Text>
                        </View>
                        {issues > 0 && (
                          <View style={[styles.summaryChip, styles.summaryChipIssue]}>
                            <Text style={[styles.summaryChipText, { color: colors.red }]}>⚠️ 이슈 {issues}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })()}

                {[...selectedCourse.course.stores]
                  .sort((a, b) => a.order - b.order)
                  .map((store, i, arr) => (
                    <StoreDetailRow
                      key={store.id}
                      store={store}
                      isLast={i === arr.length - 1}
                      onPress={() => router.push(`/(main)/store/${store.id}`)}
                    />
                  ))}
              </View>
            )}

            <View style={styles.legend}>
              {[
                { color: colors.green, label: '모두 완료' },
                { color: colors.orange, label: '배송 있음' },
                { color: colors.red, label: '이슈' },
              ].map(({ color, label }) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.legendText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── 달력 셀 스타일
const CELL_SIZE = 44;
const calStyles = StyleSheet.create({
  dayCell: {
    width: `${100 / 7}%` as any,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(254,80,0,0.08)',
    borderRadius: 12,
  },
  dayCircle: {
    width: CELL_SIZE, height: CELL_SIZE,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
  },
  dayCircleToday: { backgroundColor: colors.orange },
  dayText: { fontSize: 15, fontWeight: '500', color: colors.black },
  dayTextToday: { color: colors.white, fontWeight: '700' },
  dayTextSelected: { color: colors.orange, fontWeight: '700' },
  dayTextDisabled: { color: colors.border },
  dotRow: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper50 },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    marginBottom: 8, alignSelf: 'flex-start',
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: colors.orange },

  // 헤더
  header: {
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16,
    backgroundColor: colors.paper50,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },
  viewToggle: {
    flexDirection: 'row', backgroundColor: colors.paper200,
    borderRadius: 10, padding: 3, gap: 2,
  },
  toggleBtn: {
    width: 36, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.orange },
  headerSub: { fontSize: 13, color: colors.gray, marginTop: 4 },

  // 리스트
  list: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  dateGroup: { gap: 0 },

  // 날짜 카드
  dateCard: {
    backgroundColor: colors.white,
    borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  dateCardToday: { borderWidth: 1.5, borderColor: colors.orange },
  dateCardExpanded: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  dateCardLeft: { flex: 1, gap: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 16, fontWeight: '700', color: colors.black },
  dateTextToday: { color: colors.orange },
  todayBadge: {
    backgroundColor: colors.orange, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  todayBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  courseText: { fontSize: 12, color: colors.gray },

  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  summaryText: { fontSize: 12, color: colors.gray, fontWeight: '500' },
  summaryDivider: { fontSize: 12, color: colors.border },

  dateCardRight: { alignItems: 'center', gap: 2, marginLeft: 12 },
  progressCircle: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: colors.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  progressCircleText: { fontSize: 11, fontWeight: '700', color: colors.orange },

  // 펼쳐진 매장 목록
  storeList: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    borderTopWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  // 매장 행
  storeRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  storeRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  storeRowIssue: { backgroundColor: 'rgba(220,38,38,0.03)' },

  orderCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.orange,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  orderCircleDone: { backgroundColor: colors.green, borderColor: colors.green },
  orderCircleIssue: { backgroundColor: colors.red, borderColor: colors.red },
  orderText: { fontSize: 11, fontWeight: '700', color: colors.orange },

  // 매장 상세 내용
  storeDetailContent: { flex: 1, gap: 5 },
  storeNameRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 6,
  },
  storeName: { fontSize: 14, fontWeight: '600', color: colors.black, flex: 1 },
  storeNameDone: { color: colors.gray },
  storeAddress: { fontSize: 12, color: colors.gray },
  storeInfo: { flex: 1, gap: 3 },

  // 상품 목록
  itemList: { gap: 3, marginTop: 2 },
  itemLine: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  itemDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.border, flexShrink: 0,
  },
  itemName: { flex: 1, fontSize: 12, color: colors.black, fontWeight: '400' },
  itemQty: { fontSize: 12, fontWeight: '600', color: colors.orange, fontVariant: ['tabular-nums'] },
  bagMini: {
    backgroundColor: '#FFF5A5', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  bagMiniText: { fontSize: 10, fontWeight: '600', color: '#1E1E1E' },

  // 특이사항
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 4,
    backgroundColor: colors.paper100, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 4,
  },
  noteText: { flex: 1, fontSize: 11, color: colors.gray, lineHeight: 16 },

  // 배송 메모
  memoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.glow100, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  memoText: { fontSize: 11, color: colors.black, fontWeight: '500' },

  // 이슈
  issueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  issueRowText: { fontSize: 11, color: colors.red, fontWeight: '600' },

  // 달력
  calendarWrap: {
    backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calNavBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, backgroundColor: colors.paper100,
  },
  calNavBtnDisabled: { backgroundColor: 'transparent' },
  calNavTitle: { fontSize: 17, fontWeight: '700', color: colors.black },
  calDayHeader: { flexDirection: 'row' },
  calDayLabel: {
    width: `${100 / 7}%` as any, textAlign: 'center',
    fontSize: 12, fontWeight: '600', color: colors.gray, paddingVertical: 4,
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  // 달력 선택 날짜
  calSelected: {
    marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 12, gap: 0,
  },
  calSummaryBar: { paddingHorizontal: 4, marginBottom: 10, gap: 6 },
  calSelectedTitle: { fontSize: 14, fontWeight: '700', color: colors.black },
  calSummaryChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  summaryChip: {
    backgroundColor: colors.paper100, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  summaryChipIssue: { backgroundColor: 'rgba(220,38,38,0.08)' },
  summaryChipText: { fontSize: 12, fontWeight: '600', color: colors.gray },

  // 범례
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, color: colors.gray },
});
