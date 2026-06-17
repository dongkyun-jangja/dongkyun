import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../src/constants/colors';
import { useDelivery } from '../../../src/context/DeliveryContext';
import { useCancelLog } from '../../../src/hooks/useCancelLog';
import { useKakaoChat } from '../../../src/hooks/useKakaoChat';
import { usePushNotifications } from '../../../src/hooks/usePushNotifications';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '일찍 출근하셨네요';
  if (h < 12) return '좋은 아침이에요';
  return '안녕하세요';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function DashboardScreen() {
  const { course, isToday, courseConfirmed, updateStoreStatus } = useDelivery();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showAllDonePopup, setShowAllDonePopup] = useState(false);
  const [undoTarget, setUndoTarget] = useState<string | null>(null);
  const [undoReason, setUndoReason] = useState('');
  // 취소 버튼 2단계 confirmation
  const [confirmingUndoId, setConfirmingUndoId] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUndoTap = (storeId: string) => {
    if (confirmingUndoId === storeId) {
      // 확인 모드에서 두 번째 탭 → 실제 popup 열기
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmingUndoId(null);
      setUndoTarget(storeId);
    } else {
      // 첫 탭 → 확인 모드 진입 (2.5초 후 자동 해제)
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmingUndoId(storeId);
      confirmTimerRef.current = setTimeout(() => setConfirmingUndoId(null), 2500);
    }
  };
  const [showAllDone, setShowAllDone] = useState(false);
  const prevAllDone = useRef(false);
  const isFirstMount = useRef(true);
  const { openChat: openKakaoChat, isConfigured: isChatConfigured } = useKakaoChat();
  const { granted: pushGranted, loaded: pushLoaded } = usePushNotifications();
  const { addCancelLog } = useCancelLog();

  const sortedStores = useMemo(
    () => [...course.stores].filter((s) => !s.isCancelled).sort((a, b) => a.order - b.order),
    [course.stores],
  );

  const deliveredCount = sortedStores.filter((s) => s.status === 'delivered').length;
  const issueCount = sortedStores.filter((s) => s.status === 'issue').length;
  const pendingCount = sortedStores.filter((s) => s.status === 'pending').length;
  const totalCount = sortedStores.length;
  const progress = totalCount > 0 ? deliveredCount / totalCount : 0;
  const allDone = pendingCount === 0 && totalCount > 0;
  const nextStore = sortedStores.find((s) => s.status === 'pending');
  const completedStores = sortedStores.filter((s) => s.status === 'delivered');
  const issueStores = sortedStores.filter((s) => s.status === 'issue');
  // 정정(수량 불일치) 상품 수 — 완료 매장 중 actualQuantity 차이 있는 상품 합산
  const mismatchCount = completedStores.reduce(
    (count, s) =>
      count + s.items.filter((it) => it.actualQuantity != null && it.actualQuantity !== it.quantity).length,
    0,
  );
  // 쇼핑백 부족 상품 수 — 완료 매장 중 actualBags 차이 있는 상품 합산
  const bagShortageCount = completedStores.reduce(
    (count, s) =>
      count + s.items.filter((it) => it.actualBags != null && it.actualBags !== (it.bags ?? 0)).length,
    0,
  );

  // 전체 완료 → 팝업 1회 표시 (첫 마운트 시 기존 allDone 상태 기록만, 팝업 미표시)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevAllDone.current = allDone;
      return;
    }
    if (allDone && !prevAllDone.current) {
      setShowAllDonePopup(true);
    }
    prevAllDone.current = allDone;
  }, [allDone]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />

      {/* 배송 완료 취소 팝업 */}
      {undoTarget !== null && (() => {
        const targetStore = sortedStores.find((s) => s.id === undoTarget);
        if (!targetStore) return null;
        const totalQty = targetStore.items.reduce((sum, item) => sum + item.quantity, 0);
        const canConfirm = undoReason.trim().length > 0;
        return (
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              {/* 헤더 */}
              <View style={styles.undoPopupHeader}>
                <View style={styles.undoPopupIconWrap}>
                  <Ionicons name="arrow-undo-circle-outline" size={28} color={colors.orange} />
                </View>
                <View style={styles.undoPopupHeaderText}>
                  <Text style={styles.undoPopupTitle}>배송 완료 취소</Text>
                  <Text style={styles.undoPopupStoreName} numberOfLines={1}>{targetStore.name}</Text>
                </View>
              </View>

              {/* 배송 요약 */}
              <View style={styles.undoSummaryBox}>
                <View style={styles.undoSummaryRow}>
                  <Ionicons name="time-outline" size={14} color={colors.gray} />
                  <Text style={styles.undoSummaryLabel}>완료 시각</Text>
                  <Text style={styles.undoSummaryValue}>{targetStore.deliveredAt ?? '—'}</Text>
                </View>
                <View style={styles.undoSummaryDivider} />
                <View style={styles.undoSummaryRow}>
                  <Ionicons name="cube-outline" size={14} color={colors.gray} />
                  <Text style={styles.undoSummaryLabel}>배송 상품</Text>
                  <Text style={styles.undoSummaryValue}>
                    {targetStore.items.length}종 · 총 {totalQty}개
                  </Text>
                </View>
                <View style={styles.undoSummaryDivider} />
                {targetStore.items.slice(0, 2).map((item, i) => (
                  <Text key={i} style={styles.undoSummaryItem} numberOfLines={1}>
                    · {item.name} {Math.floor(item.quantity / item.boxUnit)}박스
                  </Text>
                ))}
                {targetStore.items.length > 2 && (
                  <Text style={styles.undoSummaryMore}>
                    외 {targetStore.items.length - 2}종 더 보기
                  </Text>
                )}
                {/* 회수 상품 상세 (있는 경우만) */}
                {targetStore.pickupItems && targetStore.pickupItems.length > 0 && (
                  <>
                    <View style={styles.undoSummaryDivider} />
                    <View style={styles.undoSummaryRow}>
                      <Ionicons name="arrow-undo" size={14} color={colors.blue} />
                      <Text style={styles.undoSummaryLabel}>회수 상품</Text>
                      <Text style={[styles.undoSummaryValue, { color: colors.blue }]}>
                        {targetStore.pickupItems.length}종 · 총{' '}
                        {targetStore.pickupItems.reduce((sum, p) => sum + (p.actualQuantity ?? p.quantity), 0)}개
                      </Text>
                    </View>
                    {targetStore.pickupItems.slice(0, 2).map((p, i) => {
                      const qty = p.actualQuantity ?? p.quantity;
                      const boxes = p.boxUnit > 0 ? Math.floor(qty / p.boxUnit) : 0;
                      return (
                        <Text key={i} style={styles.undoSummaryItem} numberOfLines={1}>
                          ↩ {p.name} {boxes}박스 ({qty}개)
                        </Text>
                      );
                    })}
                    {targetStore.pickupItems.length > 2 && (
                      <Text style={styles.undoSummaryMore}>
                        외 {targetStore.pickupItems.length - 2}종 더 보기
                      </Text>
                    )}
                  </>
                )}
              </View>

              {/* 취소 사유 입력 */}
              <View style={styles.undoReasonWrap}>
                <Text style={styles.undoReasonLabel}>취소 사유 <Text style={{ color: colors.red }}>*</Text></Text>
                <TextInput
                  style={styles.undoReasonInput}
                  value={undoReason}
                  onChangeText={setUndoReason}
                  placeholder="취소 사유를 입력해 주세요"
                  placeholderTextColor={colors.gray}
                  multiline
                  maxLength={100}
                />
                <Text style={styles.undoReasonCount}>{undoReason.length}/100</Text>
              </View>

              {/* 버튼 */}
              <View style={styles.undoPopupBtns}>
                <Pressable
                  style={({ pressed }) => [styles.undoPopupCancelBtn, pressed && { opacity: 0.75 }]}
                  onPress={() => { setUndoTarget(null); setUndoReason(''); }}
                >
                  <Text style={styles.undoPopupCancelText}>아니오</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.undoPopupConfirmBtn,
                    !canConfirm && styles.undoPopupConfirmBtnDisabled,
                    pressed && canConfirm && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    if (!canConfirm) return;
                    const now = new Date();
                    const hh = now.getHours().toString().padStart(2, '0');
                    const mm = now.getMinutes().toString().padStart(2, '0');
                    addCancelLog({
                      date: course.date,
                      cancelledAt: `${hh}:${mm}`,
                      driverId: course.driver.id,
                      driverName: course.driver.name,
                      distributorName: course.driver.distributorName,
                      courseName: course.driver.courseName,
                      storeId: targetStore.id,
                      storeCode: targetStore.code,
                      storeName: targetStore.name,
                      originalDeliveredAt: targetStore.deliveredAt,
                      reason: undoReason.trim(),
                    });
                    updateStoreStatus(undoTarget, 'pending');
                    setUndoTarget(null);
                    setUndoReason('');
                  }}
                >
                  <Text style={[
                    styles.undoPopupConfirmText,
                    !canConfirm && { color: 'rgba(255,255,255,0.5)' },
                  ]}>완료 취소</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })()}

      {/* 전체 완료 팝업 */}
      {showAllDonePopup && (() => {
        // 본인 성과 가시화 — 박스 수, 회수 처리 수
        const totalBoxes = sortedStores.reduce(
          (sum, s) => sum + s.items.reduce((sub, it) => sub + Math.floor((it.actualQuantity ?? it.quantity) / it.boxUnit), 0),
          0,
        );
        const pickupHandledCount = sortedStores.filter(
          (s) => s.pickupItems && s.pickupItems.length > 0 && (s.pickupStatus === 'collected' || s.pickupStatus === 'issue'),
        ).length;
        return (
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              <Text style={styles.popupEmoji}>🎉</Text>
              <Text style={styles.popupTitle}>오늘 배송 모두 완료!</Text>
              <Text style={styles.popupSub}>
                {course.driver.distributorName} · {course.driver.courseName}
              </Text>

              {/* 성과 가시화 */}
              <View style={styles.popupStatsBox}>
                <View style={styles.popupStatItem}>
                  <Text style={styles.popupStatNum}>{totalCount}</Text>
                  <Text style={styles.popupStatLabel}>매장</Text>
                </View>
                <View style={styles.popupStatDivider} />
                <View style={styles.popupStatItem}>
                  <Text style={styles.popupStatNum}>{totalBoxes}</Text>
                  <Text style={styles.popupStatLabel}>박스</Text>
                </View>
                {pickupHandledCount > 0 && (
                  <>
                    <View style={styles.popupStatDivider} />
                    <View style={styles.popupStatItem}>
                      <Text style={[styles.popupStatNum, { color: colors.blue }]}>{pickupHandledCount}</Text>
                      <Text style={styles.popupStatLabel}>회수</Text>
                    </View>
                  </>
                )}
                {issueCount > 0 && (
                  <>
                    <View style={styles.popupStatDivider} />
                    <View style={styles.popupStatItem}>
                      <Text style={[styles.popupStatNum, { color: colors.red }]}>{issueCount}</Text>
                      <Text style={styles.popupStatLabel}>이슈</Text>
                    </View>
                  </>
                )}
              </View>

              <Text style={styles.popupMsg}>정말 수고하셨습니다 👏</Text>
              <Pressable
                style={({ pressed }) => [styles.popupBtn, pressed && { opacity: 0.88 }]}
                onPress={() => setShowAllDonePopup(false)}
              >
                <Text style={styles.popupBtnText}>확인</Text>
              </Pressable>
            </View>
          </View>
        );
      })()}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>

        {/* 오렌지 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.greeting}>
                {isToday ? getGreeting() : '배송 이력'}
              </Text>
              <Text style={styles.driverName}>{course.driver.name} 기사님 👋</Text>
            </View>
            <View style={styles.headerRight}>
              {/* 알림 버튼 */}
              {/* 우선순위: 푸시 미허용(긴급) > 카톡 미설정. 동시에 2개 도트 노출 방지 */}
              <Pressable
                style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/(main)/notifications')}
                hitSlop={8}
              >
                <Ionicons
                  name={pushLoaded && !pushGranted ? 'notifications-off-outline' : 'notifications-outline'}
                  size={20}
                  color="rgba(255,255,255,0.85)"
                />
                {pushLoaded && !pushGranted && <View style={styles.settingsDot} />}
              </Pressable>
              {/* 설정 버튼 — 푸시 도트 떠있으면 카톡 도트 숨김 */}
              <Pressable
                style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/(main)/settings')}
                hitSlop={8}
              >
                <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.85)" />
                {!isChatConfigured && !(pushLoaded && !pushGranted) && (
                  <View style={styles.settingsDot} />
                )}
              </Pressable>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>{formatDate(course.date)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.courseRow}>
            <Ionicons name="business-outline" size={13} color="rgba(255,255,255,0.65)" />
            <Text style={styles.courseText}>
              {course.driver.distributorName} · {course.driver.courseName}
            </Text>
          </View>
        </View>

        <View style={styles.content}>

          {/* ① 진행률 카드 — 헤더와 겹침, 전체 탭 가능 */}
          <Pressable
            style={({ pressed }) => [
              styles.progressCard,
              !courseConfirmed && !allDone && styles.progressCardLocked,
              courseConfirmed && !allDone && pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => {
              if (allDone || !courseConfirmed) return;
              router.push('/(main)/(tabs)/deliveries');
            }}
            disabled={allDone || !courseConfirmed}
          >
            <View style={styles.progressTop}>
              <View>
                {/* 라벨 먼저, 숫자는 크게 */}
                <Text style={styles.progressLabel}>
                  {allDone
                    ? '오늘 배송 완료 🎉'
                    : progress >= 0.9
                    ? '거의 다 왔어요! 💪'
                    : progress >= 0.5
                    ? '절반 완료! 🔥'
                    : progress > 0
                    ? '배송 중...'
                    : '배송 시작'}
                </Text>
                <View style={styles.bigNumbers}>
                  <Text style={[styles.bigCurrent, !courseConfirmed && { color: colors.border }]}>
                    {deliveredCount}
                  </Text>
                  <Text style={styles.bigSeparator}>/</Text>
                  <Text style={[styles.bigTotal, !courseConfirmed && { color: colors.border }]}>
                    {totalCount}
                  </Text>
                  <Text style={styles.bigUnit}>곳</Text>
                </View>
              </View>
              {allDone ? (
                <View style={[styles.statusBadge, styles.statusBadgeDone]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                  <Text style={[styles.statusBadgeText, { color: colors.green }]}>모두 완료</Text>
                </View>
              ) : !courseConfirmed ? (
                <View style={[styles.statusBadge, styles.statusBadgeLocked]}>
                  <Ionicons name="lock-closed" size={12} color={colors.gray} />
                  <Text style={[styles.statusBadgeText, { color: colors.gray }]}>코스 미확정</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusBadgePending]}>
                  <Text style={[styles.statusBadgeText, { color: colors.gray }]}>
                    {pendingCount}곳 남음
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.gray} />
                </View>
              )}
            </View>

            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  { width: `${progress * 100}%` },
                  allDone && { backgroundColor: colors.green },
                ]}
              />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: colors.green }]} />
                <Text style={styles.statLabel}>완료</Text>
                <Text style={[styles.statValue, deliveredCount > 0 && { color: colors.green }]}>
                  {deliveredCount}
                </Text>
                {(mismatchCount > 0 || bagShortageCount > 0) && (
                  <View style={styles.statMismatchChip}>
                    {mismatchCount > 0 && (
                      <>
                        <Ionicons name="swap-horizontal" size={9} color={colors.red} />
                        <Text style={styles.statMismatchText}>정정 {mismatchCount}</Text>
                      </>
                    )}
                    {bagShortageCount > 0 && (
                      <>
                        {mismatchCount > 0 && <Text style={styles.statMismatchText}>·</Text>}
                        <Ionicons name="bag-handle" size={9} color={colors.red} />
                        <Text style={styles.statMismatchText}>🛍 {bagShortageCount}</Text>
                      </>
                    )}
                  </View>
                )}
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: colors.border }]} />
                <Text style={styles.statLabel}>대기</Text>
                <Text style={styles.statValue}>{pendingCount}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: colors.red }]} />
                <Text style={styles.statLabel}>이슈</Text>
                <Text style={[styles.statValue, issueCount > 0 && { color: colors.red }]}>
                  {issueCount}
                </Text>
              </View>
            </View>
          </Pressable>

          {/* ③ 전체 완료 배너 */}
          {allDone && (
            <View style={styles.allDoneCard}>
              <Text style={styles.allDoneEmoji}>🎉</Text>
              <View>
                <Text style={styles.allDoneTitle}>오늘 배송 모두 완료!</Text>
                <Text style={styles.allDoneSubtitle}>정말 수고하셨습니다</Text>
              </View>
            </View>
          )}

          {/* ④ 다음 배송지 or 코스 미확정 안내 */}
          {nextStore && !courseConfirmed && isToday && (
            // 코스 미확정: 배송 시작 차단 + 안내 카드
            <Pressable
              style={({ pressed }) => [
                styles.unconfirmedCard,
                pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => router.push('/(main)/course-confirm')}
            >
              <View style={styles.unconfirmedTop}>
                <View style={styles.unconfirmedIconWrap}>
                  <Ionicons name="map-outline" size={22} color={colors.orange} />
                </View>
                <View style={styles.unconfirmedBody}>
                  <Text style={styles.unconfirmedTitle}>배송 코스를 먼저 확정해 주세요</Text>
                  <Text style={styles.unconfirmedSub}>
                    오늘 배송할 {course.stores.length}곳의 순서를 확인하고 코스를 확정해야 배송을 시작할 수 있어요
                  </Text>
                </View>
              </View>
              <View style={styles.unconfirmedBtn}>
                <Text style={styles.unconfirmedBtnText}>코스 확인하기</Text>
                <Ionicons name="arrow-forward" size={15} color={colors.orange} />
              </View>
            </Pressable>
          )}

          {nextStore && courseConfirmed && (
            <Pressable
              style={({ pressed }) => [
                styles.nextCard,
                pressed && { opacity: 0.92, transform: [{ scale: 0.96 }] },
              ]}
              onPress={() => router.push(`/(main)/store/${nextStore.id}`)}
            >
              <View style={styles.nextHeader}>
                <View style={styles.nextBadge}>
                  <Ionicons name="navigate" size={12} color={colors.orange} />
                  <Text style={styles.nextBadgeText}>지금 가야 할 곳</Text>
                </View>
                <Text style={styles.nextOrder}>{nextStore.order}번째</Text>
              </View>
              <Text style={styles.nextStoreName}>{nextStore.name}</Text>
              <View style={styles.nextAddressRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.nextAddress} numberOfLines={1}>
                  {nextStore.address}
                </Text>
              </View>
              <View style={styles.nextFooter}>
                <Text style={styles.nextItemCount}>상품 {nextStore.items.length}종</Text>
                <View style={styles.nextGoBtn}>
                  <Text style={styles.nextGoBtnText}>배송 시작</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.white} />
                </View>
              </View>
            </Pressable>
          )}

          {/* ⑤ 이슈 신고 매장 — 완료 내역보다 위, 우선 처리 강조 */}
          {issueStores.length > 0 && (
            <View style={[styles.doneCard, styles.issueListCard]}>
              <View style={styles.doneCardHeader}>
                <View style={styles.issueListHeaderLeft}>
                  <Ionicons name="alert-circle" size={14} color={colors.red} />
                  <Text style={[styles.doneCardTitle, { color: colors.red }]}>이슈 신고</Text>
                </View>
                <Text style={[styles.doneCardCount, { color: colors.red }]}>{issueStores.length}곳</Text>
              </View>
              {issueStores.map((s, i) => {
                const isPickupOnly = s.items.length === 0;
                const kindLabel = s.pickupFailKind && {
                  '매장에주류없음': '매장에 주류 없음',
                  '매장부재': '매장 부재',
                  '중복오기입': '중복/오기입',
                  '기타': '기타',
                }[s.pickupFailKind];
                const sub = isPickupOnly
                  ? `회수 미완료${kindLabel ? ` · ${kindLabel}` : ''}`
                  : '배송 이슈';
                return (
                  <Pressable
                    key={s.id}
                    style={({ pressed }) => [
                      styles.doneRow,
                      i < issueStores.length - 1 && styles.doneRowBorder,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => router.push(`/(main)/store/${s.id}`)}
                  >
                    <View style={[styles.doneCircle, { backgroundColor: colors.red }]}>
                      <Ionicons name="alert" size={14} color={colors.white} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.doneName, { color: colors.black }]} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.issueRowSub} numberOfLines={1}>{sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.gray} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ⑤ 완료 내역 — 맥락 정보, 하단으로 */}
          {completedStores.length > 0 && (
            <View style={styles.doneCard}>
              <View style={styles.doneCardHeader}>
                <Text style={styles.doneCardTitle}>완료한 배송</Text>
                <Text style={styles.doneCardCount}>{completedStores.length}곳</Text>
              </View>
              {(showAllDone ? completedStores : completedStores.slice(0, 3)).map((s, i) => {
                const list = showAllDone ? completedStores : completedStores.slice(0, 3);
                return (
                  <View
                    key={s.id}
                    style={[styles.doneRow, i < list.length - 1 && styles.doneRowBorder]}
                  >
                    <View style={styles.doneCircle}>
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    </View>
                    <Text style={styles.doneName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.doneTime}>{s.deliveredAt}</Text>
                    {(() => {
                      const isConfirming = confirmingUndoId === s.id;
                      return (
                        <Pressable
                          style={({ pressed }) => [
                            styles.doneUndoBtn,
                            isConfirming && styles.doneUndoBtnConfirming,
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={() => handleUndoTap(s.id)}
                          hitSlop={8}
                        >
                          <Text style={[
                            styles.doneUndoText,
                            isConfirming && styles.doneUndoTextConfirming,
                          ]}>
                            {isConfirming ? '정말?' : '취소'}
                          </Text>
                        </Pressable>
                      );
                    })()}
                  </View>
                );
              })}
              {completedStores.length > 3 && (
                <Pressable
                  style={({ pressed }) => [styles.doneMoreBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowAllDone((v) => !v)}
                >
                  <Text style={styles.doneMoreText}>
                    {showAllDone ? '접기' : `나머지 ${completedStores.length - 3}곳 더보기`}
                  </Text>
                  <Ionicons
                    name={showAllDone ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={colors.gray}
                  />
                </Pressable>
              )}
            </View>
          )}

          {/* ⑥ 오늘 배송 요약 */}
          <Pressable
            style={({ pressed }) => [styles.summaryBtn, pressed && { opacity: 0.88 }]}
            onPress={() => router.push('/(main)/today-summary' as any)}
          >
            <Ionicons name="document-text-outline" size={16} color={colors.black} />
            <Text style={styles.summaryBtnText}>오늘 배송 요약</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.gray} />
          </Pressable>

          {/* ⑦ 연락 수단 */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>연락</Text>
            <Pressable
              style={({ pressed }) => [styles.contactBtn, styles.contactBtnKakao, pressed && { opacity: 0.85 }]}
              onPress={openKakaoChat}
            >
              <Text style={styles.contactEmoji}>💬</Text>
              <View>
                <Text style={styles.contactBtnLabel}>팀 채팅방</Text>
                <Text style={styles.contactBtnSub}>배송 중 소통</Text>
              </View>
            </Pressable>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper50 },

  // 헤더
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 52,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  driverName: {
    fontSize: 24, fontWeight: '800', color: colors.white,
    marginTop: 2, letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  dateBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  dateBadgeText: { fontSize: 12, color: colors.white, fontWeight: '600' },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  courseText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  // 컨텐츠
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  // ① 진행률 카드
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: 24, padding: 24, marginTop: -32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 6, gap: 16,
  },
  progressTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12, fontWeight: '600', color: colors.gray,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  bigNumbers: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  bigCurrent: {
    fontSize: 52, fontWeight: '800', color: colors.black,
    letterSpacing: -2, lineHeight: 56,
    fontVariant: ['tabular-nums'],
  },
  bigSeparator: {
    fontSize: 26, fontWeight: '400', color: colors.border, marginHorizontal: 2,
  },
  bigTotal: { fontSize: 26, fontWeight: '700', color: colors.gray },
  bigUnit: {
    fontSize: 15, fontWeight: '500', color: colors.gray,
    marginLeft: 4, alignSelf: 'flex-end', marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  statusBadgeDone: { backgroundColor: colors.green50 },
  statusBadgePending: { backgroundColor: colors.paper100 },
  statusBadgeLocked: { backgroundColor: colors.paper100 },
  progressCardLocked: { borderWidth: 1.5, borderColor: colors.border },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },
  barBg: { height: 8, backgroundColor: colors.paper200, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.orange, borderRadius: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: 14, color: colors.black, fontWeight: '500' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.black, fontVariant: ['tabular-nums'] },
  // 완료 stat 종속 chip — 수량 정정 표시
  statMismatchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
    backgroundColor: colors.red50,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.red,
  },
  statMismatchText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.red,
    fontVariant: ['tabular-nums'],
  },
  statDivider: { width: 1, height: 24, backgroundColor: colors.border },

  // 전체 완료 팝업
  popupOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 100,
  },
  popupCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  popupEmoji: { fontSize: 52, marginBottom: 4 },
  popupTitle: { fontSize: 22, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },
  popupSub: { fontSize: 13, color: colors.gray, fontWeight: '500' },
  popupDivider: { width: 40, height: 1.5, backgroundColor: colors.border, marginVertical: 8 },
  popupMsg: { fontSize: 17, fontWeight: '600', color: colors.black, marginBottom: 8 },
  popupBtn: {
    backgroundColor: colors.green,
    borderRadius: 14, height: 52, width: '100%',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  popupBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  // 종료 팝업 성과 박스
  popupStatsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: colors.paper50,
    borderRadius: 12,
    paddingVertical: 14,
    marginVertical: 8,
  },
  popupStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  popupStatNum: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.black,
    fontVariant: ['tabular-nums'],
  },
  popupStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray,
  },
  popupStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  // ③ 전체 완료
  allDoneCard: {
    backgroundColor: colors.green50, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: colors.green100,
  },
  allDoneEmoji: { fontSize: 36 },
  allDoneTitle: { fontSize: 17, fontWeight: '800', color: colors.green },
  allDoneSubtitle: { fontSize: 13, color: colors.green, opacity: 0.8, marginTop: 2 },

  // 코스 미확정 카드
  unconfirmedCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  unconfirmedTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  unconfirmedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(254,80,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  unconfirmedBody: {
    flex: 1,
    gap: 4,
  },
  unconfirmedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
    lineHeight: 21,
  },
  unconfirmedSub: {
    fontSize: 12,
    color: colors.gray,
    lineHeight: 18,
  },
  unconfirmedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(254,80,0,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  unconfirmedBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.orange,
  },

  // ④ 다음 배송지
  nextCard: {
    backgroundColor: colors.orange, borderRadius: 20, padding: 22, gap: 10,
    shadowColor: colors.orange, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 5,
  },
  nextHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  nextBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.white, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  nextBadgeText: { fontSize: 12, fontWeight: '700', color: colors.orange },
  nextOrder: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  nextStoreName: {
    fontSize: 22, fontWeight: '800', color: colors.white, letterSpacing: -0.5,
  },
  nextAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextAddress: { fontSize: 13, color: 'rgba(255,255,255,0.95)', flex: 1 },
  nextFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4,
  },
  nextItemCount: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  nextGoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9,
  },
  nextGoBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },

  // ⑤ 완료 내역
  doneCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: 20, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  doneCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  doneCardTitle: {
    fontSize: 14, fontWeight: '700', color: colors.black,
  },
  doneCardCount: {
    fontSize: 14, fontWeight: '700', color: colors.gray, fontVariant: ['tabular-nums'],
  },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  doneMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  doneMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray,
  },
  doneUndoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.paper100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneUndoText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray,
  },
  doneUndoBtnConfirming: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  doneUndoTextConfirming: {
    color: colors.white,
    fontWeight: '700',
  },
  doneRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  doneCircle: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  doneName: { flex: 1, fontSize: 15, color: colors.black, fontWeight: '600' },
  doneTime: { fontSize: 14, color: colors.gray, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // 이슈 매장 카드 (완료 카드 변형)
  issueListCard: {
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.red50,
  },
  issueListHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  issueRowSub: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.red,
  },
  // 배송 완료 취소 팝업
  undoPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  undoPopupIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.glow100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  undoPopupHeaderText: {
    flex: 1,
    gap: 3,
  },
  undoPopupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.black,
    letterSpacing: -0.3,
  },
  undoPopupStoreName: {
    fontSize: 13,
    color: colors.gray,
    fontWeight: '500',
  },
  undoSummaryBox: {
    width: '100%',
    backgroundColor: colors.paper50,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  undoSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  undoSummaryLabel: {
    fontSize: 12,
    color: colors.gray,
    width: 56,
  },
  undoSummaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.black,
    flex: 1,
  },
  undoSummaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  undoSummaryItem: {
    fontSize: 12,
    color: colors.gray,
    paddingLeft: 20,
    lineHeight: 18,
  },
  undoSummaryMore: {
    fontSize: 11,
    color: colors.orange,
    paddingLeft: 20,
    fontWeight: '500',
  },
  undoReasonWrap: {
    width: '100%',
    gap: 6,
  },
  undoReasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.black,
  },
  undoReasonInput: {
    backgroundColor: colors.paper50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.black,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  undoReasonCount: {
    fontSize: 11,
    color: colors.gray,
    alignSelf: 'flex-end',
    fontVariant: ['tabular-nums'],
  },
  undoPopupBtns: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  undoPopupCancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  undoPopupCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray,
  },
  undoPopupConfirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.red,
  },
  undoPopupConfirmBtnDisabled: {
    backgroundColor: colors.border,
  },
  undoPopupConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },


  // 오늘 전표 버튼
  summaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },

  // ⑦ 연락 수단
  contactSection: { gap: 10 },
  contactTitle: {
    fontSize: 12, fontWeight: '700', color: colors.gray,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  contactBtn: {
    flex: 1, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  contactBtnKakao: { backgroundColor: '#FEE500' },
  contactEmoji: { fontSize: 24 },
  contactBtnLabel: { fontSize: 14, fontWeight: '700', color: colors.black },
  contactBtnSub: { fontSize: 12, color: colors.gray, marginTop: 1 },
});
