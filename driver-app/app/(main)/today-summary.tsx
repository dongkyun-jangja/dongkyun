import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge } from '../../src/components/StatusBadge';
import { colors } from '../../src/constants/colors';
import { useDelivery } from '../../src/context/DeliveryContext';
import { useKakaoChat } from '../../src/hooks/useKakaoChat';
import { Course, Store } from '../../src/types';

// ─── 유틸 ──────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// collectedAt: 'YYYY-MM-DD HH:MM' 또는 'HH:MM' → 시각 부분만
function formatCollectedTime(raw?: string): string {
  if (!raw) return '';
  const parts = raw.trim().split(/\s+/);
  return parts.length === 2 ? parts[1] : raw;
}

// 회수 미완료 kind 라벨
const PICKUP_FAIL_KIND_LABEL: Record<string, string> = {
  '매장에주류없음': '매장에 주류 없음',
  '매장부재': '매장 부재',
  '중복오기입': '중복/오기입',
  '기타': '기타',
};

function calcStoreBoxes(store: Store) {
  return store.items.reduce((sum, item) => {
    const qty = item.actualQuantity ?? item.quantity;
    return sum + Math.floor(qty / item.boxUnit);
  }, 0);
}

// 카카오톡 붙여넣기 최적화 포맷 — 줄당 정보 밀도 높임
function buildKakaoText(course: Course) {
  const sorted = [...course.stores].sort((a, b) => a.order - b.order);
  const delivered = sorted.filter((s) => s.status === 'delivered');
  const issues = sorted.filter((s) => s.status === 'issue');
  const pending = sorted.filter((s) => s.status === 'pending');
  const totalBoxes = sorted.reduce((s, st) => s + calcStoreBoxes(st), 0);
  const totalKinds = new Set(sorted.flatMap((s) => s.items.map((i) => i.code))).size;
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');

  const lines: string[] = [
    `[DDMS 배송 전표] ${formatDate(course.date)}`,
    `${course.driver.distributorName} · ${course.driver.courseName} · ${course.driver.name} 기사`,
    `전송: ${hh}:${mm}`,
    ``,
    `━━ 요약 ━━`,
    `✅ ${delivered.length}곳 완료  ` +
      (issues.length > 0 ? `⚠️ ${issues.length}곳 이슈  ` : '') +
      (pending.length > 0 ? `⏳ ${pending.length}곳 미완료` : ''),
    `📦 총 ${totalBoxes}박스 · ${totalKinds}종 · ${sorted.length}개 매장`,
  ];

  // 이슈 매장 먼저 강조
  if (issues.length > 0) {
    lines.push(``, `━━ 이슈 신고 ━━`);
    issues.forEach((store) => {
      lines.push(`⚠️ ${store.name}`);
      if (store.driverNote) lines.push(`   📝 ${store.driverNote}`);
    });
  }

  // 매장별 상세
  lines.push(``, `━━ 매장별 내역 ━━`);
  sorted.forEach((store, idx) => {
    const mark = store.status === 'delivered' ? '✅' : store.status === 'issue' ? '⚠️' : '⏳';
    const timeStr = store.deliveredAt ? ` ${store.deliveredAt}` : '';
    const blackFlag = store.items.some((i) => i.isBlack) ? ' ◆' : '';
    lines.push(`${idx + 1}. ${mark} ${store.name}${blackFlag}${timeStr}`);

    store.items.forEach((item) => {
      const actualQty = item.actualQuantity ?? item.quantity;
      const boxes = Math.floor(actualQty / item.boxUnit);
      const bags = item.bags ?? 0;
      const actualBags = item.actualBags ?? bags;
      const blackMark = item.isBlack ? '◆ ' : '';
      const qtyMismatch =
        item.actualQuantity != null && item.actualQuantity !== item.quantity
          ? ` ※실제${item.actualQuantity}개`
          : '';
      const bagsLabel = bags > 0
        ? (item.actualBags != null && item.actualBags !== bags
            ? ` 🛍${actualBags}/${bags}개`
            : ` 🛍${bags}개`)
        : '';
      const qtyStr = `${boxes}박스 - ${actualQty}개${bagsLabel}`;
      lines.push(`   ${blackMark}${item.name} ${qtyStr}${qtyMismatch}`);
    });

    if (store.pickupItems && store.pickupItems.length > 0) {
      let pickupStatus: string;
      if (store.pickupStatus === 'collected') {
        pickupStatus = `완료 ${formatCollectedTime(store.collectedAt)}`;
      } else if (store.pickupStatus === 'issue') {
        const kindLabel = store.pickupFailKind ? PICKUP_FAIL_KIND_LABEL[store.pickupFailKind] : '';
        const reasonExtra = store.pickupFailReason ? ` — ${store.pickupFailReason}` : '';
        pickupStatus = `미완료${kindLabel ? `: ${kindLabel}` : ''}${reasonExtra}`;
      } else {
        pickupStatus = '대기';
      }
      lines.push(`   [회수 ${pickupStatus}]`);
      store.pickupItems.forEach((pItem) => {
        const actualQty = pItem.actualQuantity ?? pItem.quantity;
        const boxes = Math.floor(actualQty / pItem.boxUnit);
        const mismatch = pItem.actualQuantity != null && pItem.actualQuantity !== pItem.quantity
          ? ` ※요청${pItem.quantity}개→실제${actualQty}개`
          : '';
        const reasonStr = pItem.reason ? ` (${pItem.reason}${pItem.plannedAction ? `→${pItem.plannedAction}` : ''})` : '';
        const shipStr = pItem.shippedDate ? ` ‖출고 ${pItem.shippedDate.slice(5)}` : '';
        lines.push(`   ↩ ${pItem.name} ${boxes}박스 - ${actualQty}개${reasonStr}${shipStr}${mismatch}`);
      });
      if (store.pickupDriverNote) lines.push(`   📝 회수메모: ${store.pickupDriverNote}`);
    }

    if (store.driverNote) lines.push(`   📝 ${store.driverNote}`);
  });

  lines.push(``, `— DDMS 자동 전표`);

  return lines.join('\n');
}

// ─── 매장 전표 행 ───────────────────────────────────────────────────
function StoreInvoiceRow({ store, index, onPress }: { store: Store; index: number; onPress?: () => void }) {
  const storeBoxes = calcStoreBoxes(store);
  const hasNote = !!(store.driverNote);
  const hasMemo = !!(store.memo);
  const hasBlack = store.items.some((item) => item.isBlack);
  const hasMismatch = store.items.some(
    (item) => item.actualQuantity != null && item.actualQuantity !== item.quantity,
  );
  const hasBagShortage = store.items.some(
    (item) => item.actualBags != null && item.actualBags !== (item.bags ?? 0),
  );
  const totalBagsReq = store.items.reduce((s, i) => s + (i.bags ?? 0), 0);
  const totalBagsActual = store.items.reduce((s, i) => s + (i.actualBags ?? (i.bags ?? 0)), 0);

  return (
    <Pressable
      style={({ pressed }) => [styles.storeRow, pressed && { opacity: 0.85, backgroundColor: colors.paper50 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* 순서 번호 + 상태 */}
      <View style={styles.storeRowHeader}>
        <View style={styles.storeOrderBadge}>
          <Text style={styles.storeOrderText}>{index + 1}</Text>
        </View>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        {hasBlack && (
          <View style={styles.storeBlackBadge}>
            <Ionicons name="diamond" size={9} color="#EECB4E" />
          </View>
        )}
        <StatusBadge status={store.status} size="sm" />
        {store.deliveredAt && (
          <Text style={styles.storeTime}>{store.deliveredAt}</Text>
        )}
      </View>

      {/* 배송 상품 목록 */}
      {store.items.length > 0 && (
        <View style={styles.itemList}>
          {store.items.map((item) => {
            const actualQty = item.actualQuantity ?? item.quantity;
            const boxes = Math.floor(actualQty / item.boxUnit);
            const bags = item.bags ?? 0;
            const isMismatch = item.actualQuantity != null && item.actualQuantity !== item.quantity;
            const qtyLabel = `${boxes}박스 - ${actualQty}개`;
            const origQtyLabel = `${Math.floor(item.quantity / item.boxUnit)}박스 - ${item.quantity}개`;
            return (
              <View key={item.code} style={styles.invoiceItemRow}>
                <View style={styles.invoiceDot} />
                <View style={styles.invoiceItemNameWrap}>
                  <Text style={styles.invoiceItemName} numberOfLines={1}>{item.name}</Text>
                  {item.isBlack && (
                    <View style={styles.invoiceBlackBadge}>
                      <Ionicons name="diamond" size={8} color="#EECB4E" />
                      <Text style={styles.invoiceBlackBadgeText}>블랙</Text>
                    </View>
                  )}
                </View>
                <View style={styles.invoiceQtyWrap}>
                  {isMismatch ? (
                    <View style={styles.invoiceQtyMismatch}>
                      <Text style={styles.invoiceQtyOriginal}>{origQtyLabel}</Text>
                      <Text style={styles.invoiceQtyActual}>{qtyLabel}</Text>
                      <Ionicons name="alert-circle" size={12} color={colors.red} />
                    </View>
                  ) : (
                    <Text style={styles.invoiceQty}>{qtyLabel}</Text>
                  )}
                  {bags > 0 && (() => {
                    const aBags = item.actualBags ?? bags;
                    const bagsShort = item.actualBags != null && item.actualBags !== bags;
                    return (
                      <Text style={[styles.invoiceBags, bagsShort && { color: colors.red, fontWeight: '800' }]}>
                        {bagsShort ? `🛍 ${aBags}/${bags}개` : `🛍 ${bags}개`}
                      </Text>
                    );
                  })()}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 회수 상품 목록 */}
      {store.pickupItems && store.pickupItems.length > 0 && (
        <View style={[styles.itemList, styles.pickupItemList]}>
          <View style={styles.pickupSectionLabel}>
            <Ionicons
              name={store.pickupStatus === 'issue' ? 'alert-circle' : 'arrow-undo'}
              size={11}
              color={store.pickupStatus === 'issue' ? colors.red : colors.blue}
            />
            <Text style={[
              styles.pickupSectionLabelText,
              store.pickupStatus === 'issue' && { color: colors.red },
            ]}>
              회수
              {store.pickupStatus === 'collected' ? ` ✓ ${formatCollectedTime(store.collectedAt)}` : ''}
              {store.pickupStatus === 'issue' ? ` 미완료${store.pickupFailKind ? ` · ${PICKUP_FAIL_KIND_LABEL[store.pickupFailKind]}` : ''}` : ''}
            </Text>
          </View>
          {store.pickupItems.map((pItem) => {
            const actualQty = pItem.actualQuantity ?? pItem.quantity;
            const actualBoxes = Math.floor(actualQty / pItem.boxUnit);
            const reqBoxes = Math.floor(pItem.quantity / pItem.boxUnit);
            const isMismatch = pItem.actualQuantity != null && pItem.actualQuantity !== pItem.quantity;
            return (
              <View key={pItem.code} style={styles.invoiceItemRow}>
                <View style={[styles.invoiceDot, { backgroundColor: colors.blue }]} />
                <View style={styles.invoiceItemNameWrap}>
                  <Text style={[styles.invoiceItemName, { color: colors.blue }]} numberOfLines={1}>
                    {pItem.name}
                  </Text>
                  {(pItem.reason || pItem.plannedAction || pItem.shippedDate) && (
                    <Text style={styles.pickupReasonText} numberOfLines={1}>
                      {[
                        pItem.reason,
                        pItem.plannedAction && `→${pItem.plannedAction}`,
                        pItem.shippedDate && `출고 ${pItem.shippedDate.slice(5)}`,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <View style={styles.invoiceQtyWrap}>
                  {isMismatch ? (
                    <View style={styles.invoiceQtyMismatch}>
                      <Text style={styles.invoiceQtyOriginal}>
                        {reqBoxes}박스 - {pItem.quantity}개
                      </Text>
                      <Text style={[styles.invoiceQtyActual, { color: colors.blue }]}>
                        {actualBoxes}박스 - {actualQty}개
                      </Text>
                      <Ionicons name="alert-circle" size={12} color={colors.blue} />
                    </View>
                  ) : (
                    <Text style={[styles.invoiceQty, { color: colors.blue }]}>
                      {reqBoxes}박스 - {pItem.quantity}개
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 메모·이슈 배지 라인 */}
      {(hasNote || hasMemo || hasMismatch || hasBagShortage || store.pickupDriverNote || store.pickupStatus === 'issue') && (
        <View style={styles.storeTagRow}>
          {hasMemo && (
            <View style={styles.storeTagMemo}>
              <Ionicons name="warning" size={10} color="#C44A00" />
              <Text style={styles.storeTagText}>{store.memo}</Text>
            </View>
          )}
          {hasNote && (
            <View style={styles.storeTagNote}>
              <Ionicons name="create-outline" size={10} color={colors.gray} />
              <Text style={[styles.storeTagText, { color: colors.gray }]}>{store.driverNote}</Text>
            </View>
          )}
          {store.pickupDriverNote && (
            <View style={[styles.storeTagNote, { backgroundColor: '#EEF0FF' }]}>
              <Ionicons name="document-text-outline" size={10} color={colors.blue} />
              <Text style={[styles.storeTagText, { color: colors.blue }]}>회수 메모: {store.pickupDriverNote}</Text>
            </View>
          )}
          {store.pickupStatus === 'issue' && (
            <View style={styles.storeTagMismatch}>
              <Ionicons name="alert-circle" size={10} color={colors.red} />
              <Text style={[styles.storeTagText, { color: colors.red }]}>
                회수 미완료{store.pickupFailKind ? ` · ${PICKUP_FAIL_KIND_LABEL[store.pickupFailKind]}` : ''}
                {store.pickupFailReason ? ` — ${store.pickupFailReason}` : ''}
              </Text>
            </View>
          )}
          {hasMismatch && (
            <View style={styles.storeTagMismatch}>
              <Ionicons name="swap-horizontal" size={10} color={colors.red} />
              <Text style={[styles.storeTagText, { color: colors.red }]}>수량 불일치</Text>
            </View>
          )}
          {hasBagShortage && (
            <View style={styles.storeTagMismatch}>
              <Ionicons name="bag-handle" size={10} color={colors.red} />
              <Text style={[styles.storeTagText, { color: colors.red }]}>
                쇼핑백 {totalBagsActual}/{totalBagsReq}개
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 하단 집계 */}
      <View style={styles.storeFooter}>
        {store.items.length > 0 && (
          <Text style={styles.storeFooterText}>
            배송 {store.items.length}종 · {storeBoxes}박스
            {store.items.reduce((s, i) => s + (i.bags ?? 0), 0) > 0
              ? ` · 🛍 ${store.items.reduce((s, i) => s + (i.bags ?? 0), 0)}개`
              : ''}
          </Text>
        )}
        {store.pickupItems && store.pickupItems.length > 0 && (
          <Text style={[styles.storeFooterText, { color: colors.blue }]}>
            회수 {store.pickupItems.length}종 ·{' '}
            {store.pickupItems.reduce((s, p) => s + Math.floor(p.quantity / p.boxUnit), 0)}박스
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── 메인 화면 ─────────────────────────────────────────────────────
export default function TodaySummaryScreen() {
  const { course, courseConfirmed, courseConfirmedAt } = useDelivery();
  const { openChat } = useKakaoChat();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 토스트
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const sortedStores = React.useMemo(
    () => [...course.stores].sort((a, b) => a.order - b.order),
    [course.stores],
  );

  const delivered = sortedStores.filter((s) => s.status === 'delivered');
  const issues = sortedStores.filter((s) => s.status === 'issue');
  const pending = sortedStores.filter((s) => s.status === 'pending');
  const totalBoxes = React.useMemo(
    () => sortedStores.reduce((s, store) => s + calcStoreBoxes(store), 0),
    [sortedStores],
  );
  const totalKinds = React.useMemo(
    () => new Set(sortedStores.flatMap((s) => s.items.map((i) => i.code))).size,
    [sortedStores],
  );
  const mismatchCount = React.useMemo(
    () => sortedStores.reduce(
      (count, store) =>
        count + store.items.filter(
          (item) => item.actualQuantity != null && item.actualQuantity !== item.quantity,
        ).length,
      0,
    ),
    [sortedStores],
  );
  const bagShortageCount = React.useMemo(
    () => sortedStores.reduce(
      (count, store) =>
        count + store.items.filter(
          (item) => item.actualBags != null && item.actualBags !== (item.bags ?? 0),
        ).length,
      0,
    ),
    [sortedStores],
  );

  const showToast = () => {
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  // 전표 텍스트 클립보드 복사 → 채팅방 오픈
  const handleShareToKakao = async () => {
    const text = buildKakaoText(course);
    await Clipboard.setStringAsync(text);
    showToast();
    // 300ms 후 채팅방 열기 (토스트 보이고 나서)
    setTimeout(() => openChat(), 300);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper50} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.orange} />
          <Text style={styles.backBtnText}>홈</Text>
        </Pressable>
        <Text style={styles.headerTitle}>오늘 배송 요약</Text>
        <Pressable
          style={({ pressed }) => [styles.shareIconBtn, pressed && { opacity: 0.6 }]}
          onPress={handleShareToKakao}
          hitSlop={8}
        >
          <Text style={styles.kakaoShareIcon}>💬</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* 전표 헤더 카드 */}
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceTitleRow}>
            <Ionicons name="document-text" size={18} color={colors.orange} />
            <Text style={styles.invoiceTitle}>배송 전표</Text>
            {courseConfirmed && (
              <View style={styles.confirmedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={colors.green} />
                <Text style={styles.confirmedBadgeText}>코스 확정됨</Text>
              </View>
            )}
          </View>
          <Text style={styles.invoiceDate}>{formatDate(course.date)}</Text>
          <Text style={styles.invoiceDriver}>
            {course.driver.name} · {course.driver.distributorName} · {course.driver.courseName}
          </Text>
          {courseConfirmedAt && (
            <Text style={styles.invoiceConfirmedAt}>확정 {courseConfirmedAt}</Text>
          )}
        </View>

        {/* 총계 카드 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, { backgroundColor: '#E6F7EE' }]}>
              <Text style={[styles.summaryChipNum, { color: colors.green }]}>{delivered.length}</Text>
              <Text style={[styles.summaryChipLabel, { color: colors.green }]}>완료</Text>
            </View>
            {issues.length > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: colors.red50 }]}>
                <Text style={[styles.summaryChipNum, { color: colors.red }]}>{issues.length}</Text>
                <Text style={[styles.summaryChipLabel, { color: colors.red }]}>이슈</Text>
              </View>
            )}
            {pending.length > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: colors.paper200 }]}>
                <Text style={[styles.summaryChipNum, { color: colors.gray }]}>{pending.length}</Text>
                <Text style={[styles.summaryChipLabel, { color: colors.gray }]}>미완료</Text>
              </View>
            )}
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatNum}>{totalBoxes}</Text>
              <Text style={styles.summaryStatLabel}>총 박스</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatNum}>{totalKinds}</Text>
              <Text style={styles.summaryStatLabel}>상품 종류</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatNum}>{sortedStores.length}</Text>
              <Text style={styles.summaryStatLabel}>매장</Text>
            </View>
            {mismatchCount > 0 && (
              <>
                <View style={styles.summaryStatDivider} />
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatNum, { color: colors.red }]}>{mismatchCount}</Text>
                  <Text style={[styles.summaryStatLabel, { color: colors.red }]}>수량불일치</Text>
                </View>
              </>
            )}
            {bagShortageCount > 0 && (
              <>
                <View style={styles.summaryStatDivider} />
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatNum, { color: colors.red }]}>{bagShortageCount}</Text>
                  <Text style={[styles.summaryStatLabel, { color: colors.red }]}>쇼핑백부족</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 이슈 매장 먼저 강조 */}
        {issues.length > 0 && (
          <>
            <View style={styles.groupHeader}>
              <Ionicons name="alert-circle" size={14} color={colors.red} />
              <Text style={[styles.groupHeaderText, { color: colors.red }]}>이슈 신고 ({issues.length})</Text>
            </View>
            {issues.map((store, idx) => (
              <StoreInvoiceRow
                key={store.id}
                store={store}
                index={sortedStores.indexOf(store)}
                onPress={() => router.push(`/(main)/store/${store.id}` as any)}
              />
            ))}
          </>
        )}

        {/* 미완료 */}
        {pending.length > 0 && (
          <>
            <View style={styles.groupHeader}>
              <Ionicons name="time-outline" size={14} color={colors.gray} />
              <Text style={styles.groupHeaderText}>미완료 ({pending.length})</Text>
            </View>
            {pending.map((store) => (
              <StoreInvoiceRow
                key={store.id}
                store={store}
                index={sortedStores.indexOf(store)}
                onPress={() => router.push(`/(main)/store/${store.id}` as any)}
              />
            ))}
          </>
        )}

        {/* 완료 */}
        <View style={styles.groupHeader}>
          <Ionicons name="checkmark-circle" size={14} color={colors.green} />
          <Text style={[styles.groupHeaderText, { color: colors.green }]}>배송 완료 ({delivered.length})</Text>
        </View>
        {delivered.map((store) => (
          <StoreInvoiceRow key={store.id} store={store} index={sortedStores.indexOf(store)} />
        ))}

        {/* 공유 버튼 */}
        <Pressable
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.88 }]}
          onPress={handleShareToKakao}
        >
          <Text style={styles.shareBtnEmoji}>💬</Text>
          <Text style={styles.shareBtnText}>카카오톡 채팅방으로 공유</Text>
        </Pressable>

        <Text style={styles.shareHint}>전표가 복사되고 채팅방이 열립니다 — 붙여넣기 후 전송하세요</Text>
      </ScrollView>

      {/* 복사 완료 토스트 */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
              }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.white} />
          <Text style={styles.toastText}>전표 복사 완료 — 채팅방에 붙여넣기하세요</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper50 },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.paper50,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 52,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.orange,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
  },
  shareIconBtn: {
    minWidth: 52,
    alignItems: 'flex-end',
  },

  content: {
    padding: 16,
    gap: 12,
  },

  // 전표 헤더
  invoiceHeader: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    gap: 6,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
  },
  invoiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.black,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F7EE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.green,
  },
  invoiceDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    marginTop: 2,
  },
  invoiceDriver: {
    fontSize: 12,
    color: colors.gray,
    lineHeight: 18,
  },
  invoiceConfirmedAt: {
    fontSize: 11,
    color: colors.green,
    fontWeight: '500',
  },

  // 총계 카드
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flex: 1,
    minWidth: 80,
  },
  summaryChipNum: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 26,
  },
  summaryChipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.paper100,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryStatNum: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.black,
    fontVariant: ['tabular-nums'],
  },
  summaryStatLabel: {
    fontSize: 12,
    color: colors.black,
    fontWeight: '600',
  },
  summaryStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },

  // 그룹 헤더
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 6,
  },
  groupHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray,
  },

  // 매장 전표 행
  storeRow: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 0,
  },
  storeRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper100,
  },
  storeBlackBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  storeOrderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.paper200,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  storeOrderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray,
  },
  storeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
  },
  storeTime: {
    fontSize: 13,
    color: colors.gray,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // 상품 목록
  itemList: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 7,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    flexShrink: 0,
  },
  invoiceItemNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  invoiceItemName: {
    fontSize: 14,
    color: colors.black,
    lineHeight: 20,
    fontWeight: '500',
    flexShrink: 1,
  },
  invoiceBlackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexShrink: 0,
  },
  invoiceBlackBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EECB4E',
    letterSpacing: 0.2,
  },
  invoiceQtyWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  invoiceQty: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.black,
    fontVariant: ['tabular-nums'],
  },
  invoiceBags: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '600',
  },

  // 회수 섹션
  pickupItemList: {
    borderTopWidth: 1,
    borderTopColor: '#B0B8FF',
    marginTop: 4,
    paddingTop: 8,
  },
  pickupSectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  pickupSectionLabelText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.blue,
    letterSpacing: 0.3,
  },
  pickupReasonText: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: '500',
    opacity: 0.85,
    marginTop: 1,
  },

  invoiceQtyMismatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invoiceQtyOriginal: {
    fontSize: 12,
    color: colors.gray,
    textDecorationLine: 'line-through',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  invoiceQtyActual: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.red,
    fontVariant: ['tabular-nums'],
  },

  // 메모·이슈 태그
  storeTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  storeTagMemo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3ED',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  storeTagNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.paper100,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  storeTagMismatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.red50,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  storeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C44A00',
    flexShrink: 1,
  },

  // 하단 집계
  storeFooter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.paper100,
    backgroundColor: colors.paper50,
  },
  storeFooterText: {
    fontSize: 13,
    color: colors.black,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // 공유 버튼
  shareBtn: {
    backgroundColor: '#FEE500',
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  shareBtnEmoji: {
    fontSize: 18,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#391B1B',
  },
  shareHint: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    marginTop: -4,
  },
  kakaoShareIcon: {
    fontSize: 18,
  },

  // 토스트
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.black,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
});
