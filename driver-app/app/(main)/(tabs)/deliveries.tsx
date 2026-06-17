import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { colors } from '../../../src/constants/colors';
import { useDelivery } from '../../../src/context/DeliveryContext';
import { Store } from '../../../src/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ─── 드래그 아이템 컴포넌트 ────────────────────────────────────────────
interface DragItemProps {
  store: Store;
  isDragging: boolean;
  isDropTarget: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPress: (id: string) => void;
  onDragStart: (storeId: string, itemY: number) => void;
  onLayout: (storeId: string, y: number, height: number) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

function DragItem({
  store, isDragging, isDropTarget, isFirst, isLast,
  onPress, onDragStart, onLayout, onMoveUp, onMoveDown,
}: DragItemProps) {
  const rowRef = useRef<View>(null);
  const isDone = store.status === 'delivered';
  const isIssue = store.status === 'issue';
  const isPending = store.status === 'pending';
  const totalBags = store.items.reduce((sum: number, item: any) => sum + (item.bags ?? 0), 0);
  const actualBagsSum = store.items.reduce((sum: number, item: any) => sum + (item.actualBags ?? (item.bags ?? 0)), 0);
  const hasBagShortage = totalBags > 0 && actualBagsSum < totalBags;

  const handleLayout = useCallback(() => {
    rowRef.current?.measure((_x, _y, _w, h, _px, py) => {
      onLayout(store.id, py, h);
    });
  }, [store.id, onLayout]);

  const startDrag = useCallback(() => {
    rowRef.current?.measure((_x, _y, _w, _h, _px, py) => {
      onDragStart(store.id, py);
    });
  }, [store.id, onDragStart]);

  const longPress = Gesture.LongPress()
    .minDuration(300)
    .runOnJS(true)
    .onStart(() => {
      if (!isPending) return;
      startDrag();
    });

  return (
    <View
      ref={rowRef}
      onLayout={handleLayout}
      style={[styles.rowWrap, isDropTarget && styles.rowDropTarget]}
    >
      {/* 순서 원 */}
      <View
        style={[
          styles.orderCircle,
          isDone && styles.orderCircleDone,
          isIssue && styles.orderCircleIssue,
          isDragging && styles.orderCircleDragging,
        ]}
      >
        {isDone ? (
          <Ionicons name="checkmark" size={16} color={colors.white} />
        ) : (
          <Text
            style={[
              styles.orderText,
              isIssue && styles.orderTextIssue,
            ]}
          >
            {store.order}
          </Text>
        )}
      </View>

      {/* 카드 — pending 건은 전체 롱프레스로 드래그 */}
      <GestureDetector gesture={longPress}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isDone && styles.cardDone,
          isDragging && styles.cardDragging,
          pressed && !isDragging && styles.cardPressed,
        ]}
        onPress={() => onPress(store.id)}
      >
        {/* 상단: 매장명 + 전화 + 상태 */}
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.storeName, isDone && styles.storeNameDone]}
                numberOfLines={1}
              >
                {store.name}
              </Text>
              <StatusBadge status={store.status} deliveredAt={store.deliveredAt} />
            </View>
            {store.phone && (
              <Pressable
                style={({ pressed }) => [styles.phoneChip, pressed && { opacity: 0.7 }]}
                onPress={() => Linking.openURL(`tel:${store.phone}`)}
                hitSlop={6}
              >
                <Ionicons name="call-outline" size={11} color={colors.orange} />
                <Text style={styles.phoneChipText}>{store.phone}</Text>
              </Pressable>
            )}
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={12} color={colors.gray} />
              <Text style={styles.storeAddress} numberOfLines={1}>
                {store.address}
              </Text>
            </View>
            {store.memo && (
              <View style={styles.memoRow}>
                <Ionicons name="warning" size={11} color={colors.black} />
                <Text style={styles.memoText} numberOfLines={1}>{store.memo}</Text>
              </View>
            )}
          </View>
          {/* 드래그 핸들 — 탭하면 즉시 드래그, pending 건만 */}
          {isPending && (
            <Pressable
              style={({ pressed }) => [styles.dragHandle, pressed && { opacity: 0.5 }]}
              onPress={startDrag}
              hitSlop={8}
            >
              <Ionicons name="reorder-two" size={20} color={colors.gray} />
            </Pressable>
          )}
        </View>

        {/* 상품 칩 */}
        <View style={styles.itemsRow}>
          {store.items.slice(0, 2).map((item) => (
            <View
              key={item.code ?? item.name}
              style={[styles.itemChip, item.isBlack && styles.itemChipBlack]}
            >
              {item.isBlack && (
                <Ionicons name="diamond" size={9} color="#EECB4E" />
              )}
              <Text
                style={[styles.itemChipText, item.isBlack && styles.itemChipTextBlack]}
                numberOfLines={1}
              >
                {item.name.split('(')[0].trim()}
              </Text>
              {item.boxUnit > 0 && item.quantity >= item.boxUnit && (
                <Text style={[styles.itemChipQty, item.isBlack && styles.itemChipQtyBlack]}>
                  {Math.floor(item.quantity / item.boxUnit)}박스
                </Text>
              )}
            </View>
          ))}
          {store.items.length > 2 && (
            <View style={[styles.itemChip, styles.itemChipMore]}>
              <Text style={styles.itemChipMoreText}>+{store.items.length - 2}</Text>
            </View>
          )}
          {totalBags > 0 && (
            <View style={[
              styles.itemChip,
              styles.itemChipBag,
              hasBagShortage && styles.itemChipBagShortage,
            ]}>
              <Text style={[
                styles.itemChipBagText,
                hasBagShortage && styles.itemChipBagShortageText,
              ]}>
                {hasBagShortage
                  ? `🛍 ${actualBagsSum}/${totalBags}개`
                  : `🛍 ${totalBags}개`}
              </Text>
            </View>
          )}
          {/* 회수 뱃지 */}
          {store.pickupItems && store.pickupItems.length > 0 && (
            <View style={[styles.itemChip, styles.itemChipPickup]}>
              <Ionicons name="arrow-undo" size={10} color={colors.blue} />
              <Text style={styles.itemChipPickupText}>
                회수 {store.pickupItems.length}종
                {store.pickupStatus === 'collected' ? ' ✓' : ''}
              </Text>
            </View>
          )}
          {/* fallback: 배송 없고 회수만 있을 때 */}
          {store.items.length === 0 && (!store.pickupItems || store.pickupItems.length === 0) && (
            <Text style={styles.noItemText}>상품 정보 없음</Text>
          )}
        </View>

        {/* ↑↓ 버튼 — pending 건만 */}
        {isPending && (
          <View style={styles.reorderButtons}>
            <Pressable
              style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
              onPress={() => !isFirst && onMoveUp(store.id)}
              hitSlop={{ top: 14, bottom: 14, left: 20, right: 8 }}
            >
              <Ionicons
                name="chevron-up"
                size={16}
                color={isFirst ? colors.border : colors.gray}
              />
              <Text style={[styles.reorderBtnText, isFirst && styles.reorderBtnTextDisabled]}>
                위로
              </Text>
            </Pressable>
            <View style={styles.reorderDivider} />
            <Pressable
              style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
              onPress={() => !isLast && onMoveDown(store.id)}
              hitSlop={{ top: 14, bottom: 14, left: 8, right: 20 }}
            >
              <Ionicons
                name="chevron-down"
                size={16}
                color={isLast ? colors.border : colors.gray}
              />
              <Text style={[styles.reorderBtnText, isLast && styles.reorderBtnTextDisabled]}>
                아래
              </Text>
            </Pressable>
          </View>
        )}
      </Pressable>
      </GestureDetector>
    </View>
  );
}

export default function DeliveriesScreen() {
  const { course, courseConfirmed, moveStoreUp, moveStoreDown, moveStoreTo } = useDelivery();
  const router = useRouter();

  useEffect(() => {
    if (!courseConfirmed) {
      router.replace('/(main)/course-confirm');
    }
  }, [courseConfirmed]);

  if (!courseConfirmed) return null;

  // ── 드래그 상태
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number>(-1);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const ghostY = useSharedValue(0);
  const ghostOpacity = useSharedValue(0);
  const ghostScale = useSharedValue(1);
  const draggingSharedId = useSharedValue<string | null>(null);
  const itemLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map());
  const scrollRef = useRef<ScrollView>(null);
  const initialScrollDoneRef = useRef(false);
  // 드래그 안내 배너 dismiss 상태 (영구 저장)
  const [hintDismissed, setHintDismissed] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem('@hint_dismissed_drag').then((v) => {
      if (v === '1') setHintDismissed(true);
    });
  }, []);
  const dismissHint = useCallback(() => {
    setHintDismissed(true);
    AsyncStorage.setItem('@hint_dismissed_drag', '1').catch(() => {});
  }, []);

  const sortedStores = useMemo(
    () => [...course.stores].filter((s) => !s.isCancelled).sort((a, b) => a.order - b.order),
    [course.stores],
  );

  // 화면 진입 시 다음 pending 매장으로 자동 스크롤 (드래그 중이 아닐 때만)
  useFocusEffect(
    useCallback(() => {
      // 한 프레임 양보 후 layout 정보 누적된 다음 스크롤
      const t = setTimeout(() => {
        if (draggingId !== null) return;
        const nextPending = sortedStores.find((s) => s.status === 'pending');
        if (!nextPending) return;
        const layout = itemLayoutsRef.current.get(nextPending.id);
        if (!layout) return;
        // 헤더·안내배너 위로 살짝 띄움 (상단 여백 80px)
        const targetY = Math.max(0, layout.y - 80);
        scrollRef.current?.scrollTo({ y: targetY, animated: initialScrollDoneRef.current });
        initialScrollDoneRef.current = true;
      }, 220);
      return () => clearTimeout(t);
    }, [sortedStores, draggingId]),
  );

  const deliveredCount = useMemo(
    () => course.stores.filter((s) => s.status === 'delivered').length,
    [course.stores],
  );
  const totalCount = course.stores.length;
  const progress = totalCount > 0 ? deliveredCount / totalCount : 0;
  const allDone = deliveredCount === totalCount;

  // pending 매장 순서 목록 (↑↓ first/last 계산용)
  const pendingStoreIds = useMemo(
    () => sortedStores.filter((s) => s.status === 'pending').map((s) => s.id),
    [sortedStores],
  );

  // ── 드래그 레이아웃 측정
  const handleItemLayout = useCallback((storeId: string, y: number, height: number) => {
    itemLayoutsRef.current.set(storeId, { y, height });
  }, []);

  // ── 드래그 시작
  const handleDragStart = useCallback((storeId: string, itemY: number) => {
    setDraggingId(storeId);
    draggingSharedId.value = storeId;
    setScrollEnabled(false);
    ghostY.value = itemY;
    ghostOpacity.value = withSpring(1, { damping: 20 });
    ghostScale.value = withSpring(1.04, { damping: 15 });
  }, [draggingSharedId, ghostY, ghostOpacity, ghostScale]);

  // ── drop target 계산
  const computeDropTarget = useCallback((fingerY: number) => {
    const layouts = itemLayoutsRef.current;
    let closest = -1;
    let closestDist = Infinity;
    sortedStores.forEach((s, idx) => {
      if (s.status !== 'pending') return;
      const layout = layouts.get(s.id);
      if (!layout) return;
      const centerY = layout.y + layout.height / 2;
      const dist = Math.abs(fingerY - centerY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = idx;
      }
    });
    setDropTargetIdx(closest);
  }, [sortedStores]);

  // ── 드래그 종료
  const handleDragEnd = useCallback(() => {
    if (draggingId !== null && dropTargetIdx >= 0) {
      moveStoreTo(draggingId, dropTargetIdx + 1);
    }
    draggingSharedId.value = null;
    setDraggingId(null);
    setDropTargetIdx(-1);
    setScrollEnabled(true);
    ghostOpacity.value = withSpring(0, { damping: 20 });
    ghostScale.value = withSpring(1, { damping: 15 });
  }, [draggingSharedId, draggingId, dropTargetIdx, moveStoreTo, ghostOpacity, ghostScale]);

  // ── 화면 전체 Pan
  const screenPan = Gesture.Pan()
    .onUpdate((e) => {
      if (!draggingSharedId.value) return;
      ghostY.value = e.absoluteY - 60;
      runOnJS(computeDropTarget)(e.absoluteY);
    })
    .onEnd(() => {
      if (draggingSharedId.value) {
        runOnJS(handleDragEnd)();
      }
    })
    .enabled(draggingId !== null);

  const ghostStore = draggingId ? sortedStores.find((s) => s.id === draggingId) : null;
  const ghostAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: ghostY.value },
      { scale: ghostScale.value },
    ],
    opacity: ghostOpacity.value,
  }));

  const handlePress = useCallback(
    (id: string) => router.push(`/(main)/store/${id}`),
    [router],
  );
  const handleMoveUp = useCallback((id: string) => moveStoreUp(id), [moveStoreUp]);
  const handleMoveDown = useCallback((id: string) => moveStoreDown(id), [moveStoreDown]);

  return (
    <GestureDetector gesture={screenPan}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper100} />

        {/* 드래그 ghost */}
        {ghostStore && (
          <Animated.View style={[styles.ghostCard, ghostAnimStyle]} pointerEvents="none">
            <View style={styles.ghostCardInner}>
              <View style={styles.ghostCircle}>
                <Text style={styles.ghostCircleText}>{ghostStore.order}</Text>
              </View>
              <Text style={styles.ghostStoreName} numberOfLines={1}>{ghostStore.name}</Text>
              <Ionicons name="reorder-three" size={20} color={colors.border} />
            </View>
          </Animated.View>
        )}

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
          <View style={styles.headerTop}>
            <View style={styles.dateLabelWrap}>
              <Text style={styles.title}>오늘 배송 목록</Text>
              <Text style={styles.date}>{formatDate(course.date)}</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{course.driver.name}</Text>
              <Text style={styles.courseLabel}>
                {course.driver.distributorName} · {course.driver.courseName}
              </Text>
            </View>
          </View>

          {/* 진행률 */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressDone}>{deliveredCount}곳 완료</Text>
              <Text style={styles.progressTotal}>전체 {totalCount}곳</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%` as any },
                  allDone && styles.progressFillDone,
                ]}
              />
            </View>
            {allDone && (
              <Text style={styles.allDoneText}>🎉 오늘 배송 모두 완료!</Text>
            )}
          </View>
        </View>

        {/* 안내 배너 — dismiss 가능 */}
        {!hintDismissed && (
          <View style={styles.notice}>
            <Ionicons name="swap-vertical-outline" size={14} color={colors.orange} />
            <Text style={styles.noticeText}>
              순서 변경: <Text style={styles.noticeEmphasis}>≡ 탭</Text> 또는{' '}
              <Text style={styles.noticeEmphasis}>카드 길게 누르면 드래그</Text>
              {' · '}
              <Text style={styles.noticeEmphasis}>↑↓ 버튼</Text>으로도 이동 가능
            </Text>
            <Pressable
              style={({ pressed }) => [styles.noticeCloseBtn, pressed && { opacity: 0.6 }]}
              onPress={dismissHint}
              hitSlop={10}
            >
              <Ionicons name="close" size={14} color={colors.orange} />
            </Pressable>
          </View>
        )}

        {/* 매장 목록 */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          {sortedStores.map((store, idx) => {
            const pendingIdx = pendingStoreIds.indexOf(store.id);
            const isFirst = pendingIdx === 0;
            const isLast = pendingIdx === pendingStoreIds.length - 1;
            return (
              <DragItem
                key={store.id}
                store={store}
                isDragging={draggingId === store.id}
                isDropTarget={dropTargetIdx === idx && draggingId !== null && draggingId !== store.id}
                isFirst={isFirst}
                isLast={isLast}
                onPress={handlePress}
                onDragStart={handleDragStart}
                onLayout={handleItemLayout}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper50,
  },

  // 헤더
  header: {
    backgroundColor: colors.paper100,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.orange,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  dateLabelWrap: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.black,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 2,
  },
  driverInfo: {
    alignItems: 'flex-end',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
  },
  courseLabel: {
    fontSize: 13,
    color: colors.orange,
    marginTop: 2,
    fontWeight: '600',
  },

  // 진행률
  progressSection: {
    marginTop: 14,
    gap: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDone: {
    fontSize: 14,
    color: colors.orange,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressTotal: {
    fontSize: 14,
    color: colors.black,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.paper200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.orange,
    borderRadius: 3,
  },
  progressFillDone: {
    backgroundColor: colors.green,
  },
  allDoneText: {
    fontSize: 13,
    color: colors.green,
    fontWeight: '600',
    textAlign: 'center',
  },

  // 안내
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.glow100,
    borderBottomWidth: 1,
    borderBottomColor: colors.glow200,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  noticeText: {
    fontSize: 12,
    color: colors.orange,
    fontWeight: '500',
    flex: 1,
    lineHeight: 17,
  },
  noticeEmphasis: {
    fontWeight: '700',
  },
  noticeCloseBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(254,80,0,0.12)',
    flexShrink: 0,
  },

  // 스크롤
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 0,
  },

  // 행
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  rowDropTarget: {
    borderTopWidth: 2,
    borderTopColor: colors.orange,
    marginTop: -1,
  },

  // 순서 원
  orderCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 12,
    backgroundColor: colors.white,
  },
  orderCircleDone: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  orderCircleIssue: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  orderCircleDragging: {
    borderColor: colors.orange,
    borderStyle: 'dashed',
  },
  orderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.orange,
  },
  orderTextIssue: {
    color: colors.white,
  },

  // 카드
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 11,
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardDone: {
    backgroundColor: colors.paper50,
  },
  cardDragging: {
    opacity: 0.35,
    backgroundColor: colors.paper100,
  },
  cardPressed: {
    backgroundColor: colors.paper100,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
    flex: 1,
  },
  storeNameDone: {
    color: colors.gray,
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(254,80,0,0.08)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  phoneChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.orange,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  storeAddress: {
    fontSize: 13,
    color: colors.gray,
    flex: 1,
    fontWeight: '500',
  },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.glow100,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  memoText: {
    fontSize: 12,
    color: colors.black,
    fontWeight: '600',
  },

  // 드래그 핸들
  dragHandle: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -4,
  },

  // 상품 칩
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.paper100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemChipText: {
    fontSize: 12,
    color: colors.black,
    fontWeight: '500',
    maxWidth: 100,
  },
  itemChipQty: {
    fontSize: 12,
    color: colors.orange,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  itemChipBlack: {
    backgroundColor: '#1A1A1A',
    borderColor: '#3A3A3A',
  },
  itemChipTextBlack: {
    color: '#EECB4E',
  },
  itemChipQtyBlack: {
    color: '#EECB4E',
  },
  itemChipMore: {
    backgroundColor: colors.paper200,
  },
  itemChipMoreText: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '700',
  },
  itemChipBag: {
    backgroundColor: '#FFF5A5',
  },
  itemChipBagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  itemChipBagShortage: {
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red,
  },
  itemChipBagShortageText: {
    color: colors.red,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  itemChipPickup: {
    backgroundColor: '#DDE2FF',
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
    paddingLeft: 7,
  },
  itemChipPickupText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.blue,
  },
  noItemText: {
    fontSize: 11,
    color: colors.border,
  },

  // ↑↓ 버튼
  reorderButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 2,
    paddingTop: 6,
    gap: 0,
  },
  reorderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    minHeight: 36,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  reorderDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  reorderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray,
  },
  reorderBtnTextDisabled: {
    color: colors.border,
  },

  // 드래그 ghost
  ghostCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  ghostCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  ghostCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  ghostCircleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.orange,
  },
  ghostStoreName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
});
