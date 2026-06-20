import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/colors';
import { useDelivery } from '../../src/context/DeliveryContext';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function formatTime(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${m}`;
}

// ─── 드래그 아이템 컴포넌트 ────────────────────────────────────────────
interface DragItemProps {
  store: any;
  idx: number;
  total: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (storeId: string, itemY: number, fromHandle?: boolean) => void;
  onLayout: (storeId: string, y: number, height: number) => void;
  onOrderCircleTap: (storeId: string, currentOrder: number) => void;
  onPhonePress: (phone: string) => void;
  onHandleGhostUpdate: (absoluteY: number) => void;
  onHandleDragEnd: () => void;
}

function DragItem({
  store, idx, total, isDragging, isDropTarget,
  onDragStart, onLayout, onOrderCircleTap, onPhonePress,
  onHandleGhostUpdate, onHandleDragEnd,
}: DragItemProps) {
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const rowRef = useRef<View>(null);

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

  const startDragFromHandle = useCallback(() => {
    rowRef.current?.measure((_x, _y, _w, _h, _px, py) => {
      onDragStart(store.id, py, true);
    });
  }, [store.id, onDragStart]);

  // 핸들 Pan — 누르는 순간부터 바로 드래그
  const handlePan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onStart(startDragFromHandle)
    .onUpdate((e) => onHandleGhostUpdate(e.absoluteY))
    .onEnd(onHandleDragEnd);

  // 카드 전체 롱프레스 → 드래그
  const cardLongPress = Gesture.LongPress()
    .minDuration(300)
    .runOnJS(true)
    .onStart(startDrag);

  return (
    <View
      ref={rowRef}
      onLayout={handleLayout}
      style={[styles.storeRow, isDropTarget && styles.storeRowDropTarget]}
    >
      {/* 순서 컬럼 — 탭하면 번호 입력 모달 */}
      <View style={styles.orderCol}>
        <Pressable
          style={[styles.orderCircle, isFirst && styles.orderCircleFirst, isDragging && styles.orderCircleDragging]}
          onPress={() => onOrderCircleTap(store.id, store.order)}
          hitSlop={8}
        >
          <Text style={[styles.orderText, isFirst && styles.orderTextFirst]}>
            {store.order}
          </Text>
        </Pressable>
        {!isLast && <View style={styles.orderLine} />}
      </View>

      {/* 매장 카드 — 롱프레스로 드래그 */}
      <GestureDetector gesture={cardLongPress}>
        <View style={[
          styles.storeCard,
          isFirst && styles.storeCardFirst,
          isDragging && styles.storeCardDragging,
        ]}>
          <View style={styles.storeCardTop}>
            <View style={styles.storeCardInfo}>
              <View style={styles.storeNameRow}>
                <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                <Pressable
                  style={({ pressed }) => [styles.phoneChip, pressed && { opacity: 0.7 }]}
                  onPress={() => onPhonePress(store.phone)}
                  hitSlop={6}
                >
                  <Ionicons name="call-outline" size={11} color={colors.orange} />
                  <Text style={styles.phoneChipText}>{store.phone}</Text>
                </Pressable>
              </View>
              <Text style={styles.storeAddress} numberOfLines={1}>{store.address}</Text>
              {store.memo && (
                <View style={styles.memoRow}>
                  <Ionicons name="warning" size={11} color={colors.black} />
                  <Text style={styles.memoText} numberOfLines={1}>{store.memo}</Text>
                </View>
              )}
            </View>

            {/* 드래그 핸들 — 누른 채 밀면 바로 드래그 */}
            <GestureDetector gesture={handlePan}>
              <View style={styles.dragHandle}>
                <Ionicons name="reorder-three" size={22} color={colors.gray} />
              </View>
            </GestureDetector>
          </View>

          {/* 상품 칩 */}
          <View style={styles.itemsRow}>
            {store.items.slice(0, 2).map((item: any) => (
              <View key={item.code} style={styles.itemChip}>
                <Text style={styles.itemChipText} numberOfLines={1}>
                  {item.name.split('(')[0].trim()}
                </Text>
                <Text style={styles.itemChipQty}>
                  {Math.floor(item.quantity / item.boxUnit)}박스
                </Text>
              </View>
            ))}
            {store.items.length > 2 && (
              <View style={[styles.itemChip, styles.itemChipMore]}>
                <Text style={styles.itemChipMoreText}>+{store.items.length - 2}</Text>
              </View>
            )}
            {(() => {
              const bags = store.items.reduce((b: number, i: any) => b + (i.bags ?? 0), 0);
              return bags > 0 ? (
                <View style={[styles.itemChip, styles.itemChipBag]}>
                  <Text style={styles.itemChipBagText}>🛍 {bags}개</Text>
                </View>
              ) : null;
            })()}
            {/* 회수 뱃지 */}
            {store.pickupItems && store.pickupItems.length > 0 && (
              <View style={[styles.itemChip, styles.itemChipPickup]}>
                <Ionicons name="arrow-undo" size={10} color={colors.blue} />
                <Text style={styles.itemChipPickupText}>
                  회수 {store.pickupItems.length}종
                </Text>
              </View>
            )}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────
export default function CourseConfirmScreen() {
  const { course, confirmCourse, moveStoreTo } = useDelivery();
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [confirmTime, setConfirmTime] = useState('');
  const [now, setNow] = useState(new Date());
  const [showProductList, setShowProductList] = useState(false);

  // ── 드래그 상태
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number>(-1);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const ghostY = useSharedValue(0);
  const ghostOpacity = useSharedValue(0);
  const ghostScale = useSharedValue(1);
  // Reanimated 4: worklet 안에서 React state 직접 접근 불가 → shared value로 동기화
  const draggingSharedId = useSharedValue<string | null>(null);
  const itemLayoutsRef = useRef<Map<string, { y: number; height: number; scrollOffset: number }>>(new Map());
  const scrollOffsetRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  // 핸들 Pan 드래그 여부 — screenPan과 중복 방지
  const dragFromHandleRef = useRef(false);

  // ── 번호 입력 모달 상태
  const [moveModal, setMoveModal] = useState<{ storeId: string; current: number } | null>(null);
  const [moveInput, setMoveInput] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const sortedStores = useMemo(
    () => [...course.stores].sort((a, b) => a.order - b.order),
    [course.stores],
  );

  const totalItems = sortedStores.reduce((sum, s) => sum + s.items.length, 0);
  const totalBags = sortedStores.reduce(
    (sum, s) => sum + s.items.reduce((b: number, i: any) => b + (i.bags ?? 0), 0), 0,
  );

  const aggregatedProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; isBlack: boolean }>();
    sortedStores.forEach((s) =>
      s.items.forEach((item: any) => {
        const existing = map.get(item.name);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          map.set(item.name, { name: item.name, quantity: item.quantity, isBlack: !!item.isBlack });
        }
      }),
    );
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sortedStores]);

  const blackItemCount = aggregatedProducts.filter((p) => p.isBlack).length;

  const handleConfirm = () => {
    setConfirmTime(formatTime(new Date()));
    setShowReady(true);
  };

  // ── 드래그 레이아웃 측정 (측정 시점의 스크롤 오프셋도 함께 저장)
  const handleItemLayout = useCallback((storeId: string, y: number, height: number) => {
    itemLayoutsRef.current.set(storeId, { y, height, scrollOffset: scrollOffsetRef.current });
  }, []);

  // ── 드래그 시작
  const handleDragStart = useCallback((storeId: string, itemY: number, fromHandle = false) => {
    dragFromHandleRef.current = fromHandle;
    setDraggingId(storeId);
    draggingSharedId.value = storeId;
    setScrollEnabled(false);
    ghostY.value = itemY;
    ghostOpacity.value = withSpring(1, { damping: 20 });
    ghostScale.value = withSpring(1.04, { damping: 15 });
  }, [draggingSharedId, ghostY, ghostOpacity, ghostScale]);

  // ── 드래그 중 drop target 계산 (스크롤 보정 포함)
  const computeDropTarget = useCallback((fingerY: number) => {
    const layouts = itemLayoutsRef.current;
    const currentScroll = scrollOffsetRef.current;
    let closest = -1;
    let closestDist = Infinity;
    sortedStores.forEach((s, idx) => {
      const layout = layouts.get(s.id);
      if (!layout) return;
      // layout.y는 측정 당시 화면 절대좌표 → 현재 스크롤 반영해 보정
      const currentScreenY = layout.y + layout.scrollOffset - currentScroll;
      const centerY = currentScreenY + layout.height / 2;
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
      const targetOrder = dropTargetIdx + 1;
      moveStoreTo(draggingId, targetOrder);
    }
    dragFromHandleRef.current = false;
    draggingSharedId.value = null;
    setDraggingId(null);
    setDropTargetIdx(-1);
    setScrollEnabled(true);
    ghostOpacity.value = withSpring(0, { damping: 20 });
    ghostScale.value = withSpring(1, { damping: 15 });
  }, [draggingSharedId, draggingId, dropTargetIdx, moveStoreTo, ghostOpacity, ghostScale]);

  // ── 화면 전체 pan (드래그 중 ghost 이동)
  // Reanimated 4: onUpdate/onEnd는 worklet → JS state 접근 불가 → draggingSharedId 사용
  const screenPan = Gesture.Pan()
    .onUpdate((e) => {
      if (!draggingSharedId.value) return;  // shared value로 체크
      ghostY.value = e.absoluteY - 60;
      runOnJS(computeDropTarget)(e.absoluteY);
    })
    .onEnd(() => {
      if (draggingSharedId.value) {  // shared value로 체크
        runOnJS(handleDragEnd)();
      }
    })
    .enabled(draggingId !== null && !dragFromHandleRef.current);

  // ── ghost 애니메이션 스타일
  const ghostStore = draggingId ? sortedStores.find((s) => s.id === draggingId) : null;
  const ghostAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: ghostY.value },
      { scale: ghostScale.value },
    ],
    opacity: ghostOpacity.value,
  }));

  // ── 핸들 Pan용 콜백
  const handleGhostUpdate = useCallback((absoluteY: number) => {
    ghostY.value = absoluteY - 60;
    computeDropTarget(absoluteY);
  }, [ghostY, computeDropTarget]);

  // ── 번호 입력 이동
  const handleMoveConfirm = () => {
    if (!moveModal) return;
    const target = parseInt(moveInput, 10);
    if (!isNaN(target) && target >= 1 && target <= sortedStores.length) {
      moveStoreTo(moveModal.storeId, target);
    }
    setMoveModal(null);
    setMoveInput('');
  };

  return (
    <GestureDetector gesture={screenPan}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />

        {/* ── 번호 입력 모달 */}
        {moveModal && (
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => { setMoveModal(null); setMoveInput(''); }} />
            <View style={styles.moveModalCard}>
              <Text style={styles.moveModalTitle}>순서 이동</Text>
              <Text style={styles.moveModalSub}>
                현재 {moveModal.current}번째 · 이동할 순서를 입력하세요
              </Text>
              <TextInput
                style={styles.moveModalInput}
                value={moveInput}
                onChangeText={setMoveInput}
                keyboardType="number-pad"
                placeholder={`1 ~ ${sortedStores.length}`}
                placeholderTextColor={colors.border}
                autoFocus
                selectTextOnFocus
                maxLength={2}
                returnKeyType="done"
                onSubmitEditing={handleMoveConfirm}
              />
              <View style={styles.moveModalBtns}>
                <Pressable
                  style={styles.moveModalCancel}
                  onPress={() => { setMoveModal(null); setMoveInput(''); }}
                >
                  <Text style={styles.moveModalCancelText}>취소</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.moveModalConfirm,
                    (!moveInput || isNaN(parseInt(moveInput)) ||
                      parseInt(moveInput) < 1 || parseInt(moveInput) > sortedStores.length) &&
                      styles.moveModalConfirmDisabled,
                  ]}
                  onPress={handleMoveConfirm}
                  disabled={!moveInput || isNaN(parseInt(moveInput)) ||
                    parseInt(moveInput) < 1 || parseInt(moveInput) > sortedStores.length}
                >
                  <Ionicons name="arrow-forward" size={16} color={colors.white} />
                  <Text style={styles.moveModalConfirmText}>이동</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ── 출발 준비 완료 오버레이 */}
        {showReady && (() => {
          // 첫 pending 매장 + 총 박스 수 계산
          const firstPending = sortedStores.find((s) => s.status === 'pending') ?? sortedStores[0];
          const totalBoxes = sortedStores.reduce(
            (sum, s) => sum + s.items.reduce((sub, it) => sub + Math.floor(it.quantity / it.boxUnit), 0),
            0,
          );
          const pickupStoreCount = sortedStores.filter((s) => s.pickupItems && s.pickupItems.length > 0).length;
          return (
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalEmoji}>🚚</Text>
                <Text style={styles.modalTitle}>배송 코스 확정!</Text>
                <Text style={styles.modalSub}>
                  {course.driver.distributorName} · {course.driver.courseName}
                </Text>

                {/* 출발 전 가시화 — 매장·박스·회수 */}
                <View style={styles.readyStatsBox}>
                  <View style={styles.readyStatItem}>
                    <Text style={styles.readyStatNum}>{sortedStores.length}</Text>
                    <Text style={styles.readyStatLabel}>매장</Text>
                  </View>
                  <View style={styles.readyStatDivider} />
                  <View style={styles.readyStatItem}>
                    <Text style={styles.readyStatNum}>{totalBoxes}</Text>
                    <Text style={styles.readyStatLabel}>박스</Text>
                  </View>
                  {pickupStoreCount > 0 && (
                    <>
                      <View style={styles.readyStatDivider} />
                      <View style={styles.readyStatItem}>
                        <Text style={[styles.readyStatNum, { color: colors.blue }]}>{pickupStoreCount}</Text>
                        <Text style={styles.readyStatLabel}>회수</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.modalTimeRow}>
                  <Ionicons name="time-outline" size={14} color={colors.gray} />
                  <Text style={styles.modalTimeText}>확정 시각 {confirmTime}</Text>
                </View>

                <Text style={styles.modalMessage}>오늘도 잘 부탁드립니다 🙏</Text>

                {/* 직행 CTA — 첫 매장으로 바로 출발 */}
                <Pressable
                  style={({ pressed }) => [styles.modalBtn, pressed && { opacity: 0.88 }]}
                  onPress={() => {
                    setShowReady(false);
                    setIsConfirming(true);
                    confirmCourse();
                    if (firstPending) {
                      router.replace(`/(main)/split-delivery?storeId=${firstPending.id}` as any);
                    } else {
                      router.replace('/(main)/(tabs)/dashboard');
                    }
                  }}
                >
                  <Ionicons name="navigate" size={16} color={colors.white} />
                  <Text style={styles.modalBtnText}>
                    {firstPending ? `1번 ${firstPending.name}로 출발` : '출발하기'}
                  </Text>
                </Pressable>

                {/* 보조 — 홈으로 (대시보드 거치고 싶은 경우) */}
                <Pressable
                  style={({ pressed }) => [styles.modalSecondaryBtn, pressed && { opacity: 0.6 }]}
                  onPress={() => {
                    setShowReady(false);
                    setIsConfirming(true);
                    confirmCourse();
                    router.replace('/(main)/(tabs)/dashboard');
                  }}
                >
                  <Text style={styles.modalSecondaryText}>홈으로</Text>
                </Pressable>
              </View>
            </View>
          );
        })()}

        {/* ── 드래그 ghost 카드 */}
        {ghostStore && (
          <Animated.View style={[styles.ghostCard, ghostAnimStyle]} pointerEvents="none">
            <View style={styles.ghostCardInner}>
              <View style={[styles.orderCircle, styles.orderCircleDragging]}>
                <Text style={styles.orderText}>{ghostStore.order}</Text>
              </View>
              <Text style={styles.ghostStoreName} numberOfLines={1}>{ghostStore.name}</Text>
              <Ionicons name="reorder-three" size={20} color={colors.border} />
            </View>
          </Animated.View>
        )}

        {/* ── 헤더 */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.65 }]}
            onPress={() => router.push('/(main)/(tabs)/dashboard')}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.9)" />
            <Text style={styles.homeBtnText}>홈</Text>
          </Pressable>

          <View style={styles.headerTop}>
            <View style={styles.headerBadge}>
              <Ionicons name="map-outline" size={14} color={colors.orange} />
              <Text style={styles.headerBadgeText}>오늘의 배송 코스</Text>
            </View>
            <View style={styles.headerDateWrap}>
              <Text style={styles.headerDate}>{formatDate(course.date)}</Text>
              <Text style={styles.headerTime}>{formatTime(now)}</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>{course.driver.name} 기사님</Text>
          <Text style={styles.headerSub}>
            {course.driver.distributorName} · {course.driver.courseName}
          </Text>

          {/* 요약 */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{sortedStores.length}</Text>
              <Text style={styles.summaryLabel}>배송지</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalItems}</Text>
              <Text style={styles.summaryLabel}>상품 종류</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalBags}</Text>
              <Text style={styles.summaryLabel}>🛍 쇼핑백</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={styles.summaryValueRow}>
                {blackItemCount > 0 && (
                  <Ionicons name="diamond" size={11} color="#EECB4E" />
                )}
                <Text style={[styles.summaryValue, blackItemCount > 0 && styles.summaryValueBlack]}>
                  {blackItemCount}
                </Text>
              </View>
              <Text style={styles.summaryLabel}>블랙멤버십</Text>
            </View>
          </View>

          {/* 상품 목록 접이식 */}
          <Pressable
            style={({ pressed }) => [styles.productAccordionBtn, pressed && { opacity: 0.75 }]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowProductList((v) => !v);
            }}
          >
            <Ionicons name="cube-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.productAccordionText}>
              전체 상품 목록 보기 ({aggregatedProducts.length}종)
            </Text>
            <Ionicons
              name={showProductList ? 'chevron-up' : 'chevron-down'}
              size={13}
              color="rgba(255,255,255,0.6)"
            />
          </Pressable>
          {showProductList && (
            <View style={styles.productListBox}>
              {aggregatedProducts.map((p) => (
                <View key={p.name} style={styles.productListRow}>
                  <Text style={styles.productListName} numberOfLines={1}>{p.name}</Text>
                  {p.isBlack && (
                    <View style={styles.productBlackBadge}>
                      <Text style={styles.productBlackBadgeText}>블랙</Text>
                    </View>
                  )}
                  <Text style={styles.productListQty}>{p.quantity}개</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── 안내 */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={15} color={colors.orange} />
          <Text style={styles.noticeText}>
            순서 변경: <Text style={styles.noticeEmphasis}>≡ 탭</Text> 또는 <Text style={styles.noticeEmphasis}>카드 길게 누르면 드래그</Text>
            {' · '}
            <Text style={styles.noticeEmphasis}>번호 탭하면 직접 입력</Text>
          </Text>
        </View>

        {/* ── 코스 목록 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
        >
          {sortedStores.map((store, idx) => (
            <DragItem
              key={store.id}
              store={store}
              idx={idx}
              total={sortedStores.length}
              isDragging={draggingId === store.id}
              isDropTarget={dropTargetIdx === idx && draggingId !== null && draggingId !== store.id}
              onDragStart={handleDragStart}
              onLayout={handleItemLayout}
              onOrderCircleTap={(id, order) => {
                setMoveModal({ storeId: id, current: order });
                setMoveInput(String(order));
              }}
              onPhonePress={(phone) => Linking.openURL(`tel:${phone}`)}
              onHandleGhostUpdate={handleGhostUpdate}
              onHandleDragEnd={handleDragEnd}
            />
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── 하단 확정 버튼 */}
        <View style={styles.bottomBar}>
          <Text style={styles.bottomHint}>순서 확인 후 이상 없으면 확정해 주세요</Text>
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              isConfirming && { backgroundColor: colors.green },
            ]}
            onPress={handleConfirm}
            disabled={isConfirming}
          >
            <Ionicons
              name={isConfirming ? 'checkmark-circle' : 'play-circle'}
              size={24}
              color={colors.white}
            />
            <Text style={styles.confirmBtnText}>
              {isConfirming ? '출발!' : '확정하고 출발'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper50 },

  // 홈 버튼
  homeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    marginBottom: 8, alignSelf: 'flex-start',
  },
  homeBtnText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },

  // 헤더
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 4,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 2,
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.white, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: colors.orange },
  headerDateWrap: { alignItems: 'flex-end', gap: 1 },
  headerDate: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  headerTime: {
    fontSize: 16, color: colors.white, fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  headerTitle: { fontSize: 21, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  summaryRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, padding: 10, marginTop: 6,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 1 },
  summaryValue: {
    fontSize: 18, fontWeight: '800', color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  summaryDivider: {
    width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4,
  },
  summaryValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  summaryValueBlack: { color: '#EECB4E' },

  // 상품 접이식
  productAccordionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6, paddingVertical: 6, paddingHorizontal: 4,
  },
  productAccordionText: {
    flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500',
  },
  productListBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 6,
  },
  productListRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productListName: {
    flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500',
  },
  productBlackBadge: {
    backgroundColor: '#EECB4E', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  productBlackBadgeText: { fontSize: 9, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.3 },
  productListQty: {
    fontSize: 12, fontWeight: '700', color: colors.white,
    fontVariant: ['tabular-nums'], minWidth: 32, textAlign: 'right',
  },

  // 안내
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: colors.glow100,
    borderBottomWidth: 1, borderBottomColor: colors.glow200,
  },
  noticeText: { flex: 1, fontSize: 11, color: colors.black, lineHeight: 16, fontWeight: '500' },
  noticeEmphasis: { fontWeight: '700', color: colors.orange },

  // 스크롤
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, gap: 0 },

  // 코스 행
  storeRow: { flexDirection: 'row', gap: 12 },
  storeRowDropTarget: {
    borderTopWidth: 2, borderTopColor: colors.orange, marginTop: -1,
  },

  // 순서 컬럼
  orderCol: { alignItems: 'center', width: 30 },
  orderCircle: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  orderCircleFirst: { borderColor: colors.orange, backgroundColor: colors.orange },
  orderCircleDragging: { borderColor: colors.orange, borderStyle: 'dashed' },
  orderText: { fontSize: 14, fontWeight: '700', color: colors.gray },
  orderTextFirst: { color: colors.white },
  orderLine: {
    width: 2, flex: 1, minHeight: 16,
    backgroundColor: colors.border, marginVertical: 4,
  },

  // 매장 카드
  storeCard: {
    flex: 1, backgroundColor: colors.white,
    borderRadius: 12, padding: 10, gap: 7,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  storeCardFirst: { borderWidth: 1.5, borderColor: colors.orange },
  storeCardDragging: { opacity: 0.35, backgroundColor: colors.paper100 },
  storeCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  storeCardInfo: { flex: 1, gap: 3 },
  storeNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  storeName: { fontSize: 14, fontWeight: '700', color: colors.black },
  phoneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(254,80,0,0.08)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  phoneChipText: { fontSize: 11, fontWeight: '600', color: colors.orange },
  storeAddress: { fontSize: 12, color: colors.gray },
  memoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.glow100, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
    marginTop: 2, alignSelf: 'flex-start',
  },
  memoText: { fontSize: 11, color: colors.black, fontWeight: '500' },

  // 드래그 핸들
  dragHandle: {
    width: 36, height: 44,
    alignItems: 'center', justifyContent: 'center',
    marginRight: -4,
  },

  // 상품 칩
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.paper100, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  itemChipText: {
    fontSize: 11, color: colors.gray, fontWeight: '500', maxWidth: 100,
  },
  itemChipQty: { fontSize: 11, color: colors.orange, fontWeight: '700' },
  itemChipMore: { backgroundColor: colors.paper200 },
  itemChipMoreText: { fontSize: 11, color: colors.gray, fontWeight: '600' },
  itemChipBag: { backgroundColor: colors.paper200 },
  itemChipBagText: { fontSize: 11, color: colors.black, fontWeight: '600' },
  itemChipPickup: { backgroundColor: '#EEF0FF', flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemChipPickupText: { fontSize: 11, fontWeight: '600', color: colors.blue },

  // 드래그 ghost
  ghostCard: {
    position: 'absolute',
    left: 16, right: 16,
    zIndex: 999,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  ghostCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: colors.orange,
  },
  ghostStoreName: {
    flex: 1, fontSize: 14, fontWeight: '700', color: colors.black,
  },

  // 번호 입력 모달
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, zIndex: 100,
  },
  moveModalCard: {
    backgroundColor: colors.white, borderRadius: 20,
    padding: 24, width: '100%', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  moveModalTitle: { fontSize: 18, fontWeight: '800', color: colors.black },
  moveModalSub: { fontSize: 13, color: colors.gray, marginTop: -8 },
  moveModalInput: {
    borderWidth: 2, borderColor: colors.orange,
    borderRadius: 12, height: 56,
    fontSize: 28, fontWeight: '800',
    color: colors.black, textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  moveModalBtns: { flexDirection: 'row', gap: 10 },
  moveModalCancel: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  moveModalCancelText: { fontSize: 15, fontWeight: '600', color: colors.gray },
  moveModalConfirm: {
    flex: 2, height: 48, borderRadius: 12,
    backgroundColor: colors.orange,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  moveModalConfirmDisabled: { backgroundColor: colors.border },
  moveModalConfirmText: { fontSize: 15, fontWeight: '700', color: colors.white },

  // 하단 버튼
  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, gap: 8,
  },
  bottomHint: { fontSize: 11, color: colors.gray, textAlign: 'center' },
  confirmBtn: {
    backgroundColor: colors.black, borderRadius: 14, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },

  // 출발 모달
  modalCard: {
    backgroundColor: colors.white, borderRadius: 24,
    paddingVertical: 36, paddingHorizontal: 28,
    alignItems: 'center', gap: 8, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  modalEmoji: { fontSize: 48, marginBottom: 4 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },
  modalSub: { fontSize: 13, color: colors.gray, fontWeight: '500' },
  modalDivider: { width: 40, height: 1.5, backgroundColor: colors.border, marginVertical: 8 },
  modalTimeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.paper100, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
    alignSelf: 'stretch', justifyContent: 'center',
  },
  modalTimeText: {
    fontSize: 13, fontWeight: '600', color: colors.gray, fontVariant: ['tabular-nums'],
  },
  modalMessage: { fontSize: 17, fontWeight: '600', color: colors.black, marginBottom: 8 },
  modalBtn: {
    backgroundColor: colors.black, borderRadius: 14, height: 52, width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  modalBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  // 출발 가시화 박스
  readyStatsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: colors.paper50,
    borderRadius: 12,
    paddingVertical: 14,
    marginVertical: 4,
  },
  readyStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  readyStatNum: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.black,
    fontVariant: ['tabular-nums'],
  },
  readyStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray,
  },
  readyStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
    marginTop: 4,
  },
  modalSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray,
  },
});
