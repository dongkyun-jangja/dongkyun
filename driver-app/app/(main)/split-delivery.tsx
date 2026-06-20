import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/colors';
import { useDelivery } from '../../src/context/DeliveryContext';
import { useCancelLog } from '../../src/hooks/useCancelLog';
import { useKakaoChat } from '../../src/hooks/useKakaoChat';
import { Store } from '../../src/types';

const { height: SCREEN_H } = Dimensions.get('window');
const TOP_RATIO = 0.40; // 상단 목록 비율

// ─── 상단 목록 아이템 ────────────────────────────────────────────────────
function ListItem({
  store,
  isSelected,
  isHighlighted,
  onSelect,
  onLayout,
}: {
  store: Store;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (id: string) => void;
  onLayout: (y: number) => void;
}) {
  const statusColor =
    store.status === 'delivered' ? colors.green :
    store.status === 'issue'     ? colors.red   : colors.gray;

  const statusLabel =
    store.status === 'delivered' ? '완료' :
    store.status === 'issue'     ? '이슈' : '대기';

  const itemSummary = store.items
    .slice(0, 2)
    .map((i) => `${i.name.slice(0, 6)} ${Math.floor(i.quantity / i.boxUnit)}박스`)
    .join('  ');
  const hasMore = store.items.length > 2;
  const hasPickup = (store.pickupItems?.length ?? 0) > 0;

  return (
    <Pressable
      style={[styles.listItem, isSelected && styles.listItemSelected, isHighlighted && styles.listItemHighlighted]}
      onPress={() => onSelect(store.id)}
      onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
    >
      {/* 왼쪽: 순서 번호 */}
      <View style={[styles.listNum, isSelected && styles.listNumSelected]}>
        <Text style={[styles.listNumText, isSelected && { color: colors.white }]}>
          {store.order}
        </Text>
      </View>

      {/* 중간: 매장 정보 */}
      <View style={styles.listBody}>
        <Text style={[styles.listName, isSelected && { color: colors.orange }]} numberOfLines={1}>
          {store.name}
        </Text>
        <Text style={styles.listItems} numberOfLines={1}>
          {itemSummary}{hasMore ? '  +' + (store.items.length - 2) : ''}
          {hasPickup ? '  ↩회수' : ''}
        </Text>
      </View>

      {/* 오른쪽: 상태 */}
      <View style={[styles.listBadge, { backgroundColor: statusColor + '22' }]}>
        <Text style={[styles.listBadgeText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </Pressable>
  );
}

// ─── 하단 매장 상세 패널 ─────────────────────────────────────────────────
function StorePanel({
  store,
  onDelivered,
  onIssue,
  onUndoRequest,
  onOpenKakao,
  onIssueReset,
}: {
  store: Store;
  onDelivered: (storeId: string, photos: string[]) => void;
  onIssue: (storeId: string) => void;
  onUndoRequest: (storeId: string) => void;
  onOpenKakao: (storeId: string) => void;
  onIssueReset: (storeId: string) => void;
}) {
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const prevStoreId = useRef(store.id);

  const totalBags = store.items.reduce((s, i) => s + (i.bags ?? 0), 0);

  // 매장 바뀌면 임시 사진 초기화
  if (prevStoreId.current !== store.id) {
    prevStoreId.current = store.id;
    if (pendingPhotos.length > 0) setPendingPhotos([]);
  }

  const openCamera = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('카메라 권한 필요', '설정에서 카메라 권한을 허용해 주세요.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
      exif: false,
    });
    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0].uri;
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const uri = await openCamera();
    if (!uri) return;
    setPendingPhotos([uri]);
  }, [openCamera]);

  const handleAddPhoto = useCallback(async () => {
    if (pendingPhotos.length >= 3) return;
    const uri = await openCamera();
    if (!uri) return;
    setPendingPhotos((prev) => [...prev, uri]);
  }, [openCamera, pendingPhotos.length]);

  const isPending = store.status === 'pending';
  const isDelivered = store.status === 'delivered';
  const isIssue = store.status === 'issue';
  const hasPendingPhotos = pendingPhotos.length > 0;
  const canConfirm = hasPendingPhotos;

  return (
    <View style={styles.panel}>
      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 배송 메모 */}
        {store.memo ? (
          <View style={styles.memoBanner}>
            <Ionicons name="warning" size={14} color={colors.black} />
            <Text style={styles.memoText}>{store.memo}</Text>
          </View>
        ) : null}

        {/* 매장 정보 */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={15} color={colors.gray} />
            <Text style={styles.infoText}>{store.address}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={15} color={colors.gray} />
            <Text style={[styles.infoText, { flex: 1 }]}>{store.phone}</Text>
            <Pressable
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${store.phone}`)}
            >
              <Text style={styles.callBtnText}>전화</Text>
            </Pressable>
          </View>
        </View>

        {/* 배송 상품 목록 */}
        {store.items.length > 0 && (() => {
          const hasBlack = store.items.some((i) => i.isBlack);
          return (
            <>
              {hasBlack && (
                <View style={styles.blackBanner}>
                  <Ionicons name="diamond" size={13} color="#FFD700" />
                  <Text style={styles.blackBannerText}>블랙멤버십 상품 포함 — 픽업 매장 인계 시 우선 처리해 주세요</Text>
                </View>
              )}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>배송 상품</Text>
                <Text style={styles.sectionCount}>{store.items.length + (totalBags > 0 ? 1 : 0)}종</Text>
              </View>
              <View style={styles.itemCard}>
                {store.items.map((item, idx) => {
                  const boxes = Math.floor(item.quantity / item.boxUnit);
                  return (
                    <View key={item.code} style={[styles.itemRow, styles.itemBorder]}>
                      <View style={styles.itemLeft}>
                        <View style={styles.itemNameRow}>
                          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                          {item.isBlack && (
                            <View style={styles.blackBadge}>
                              <Text style={styles.blackBadgeText}>블랙</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.itemCode}>#{item.code}</Text>
                        {item.itemNote ? (
                          <Text style={styles.itemNote}>{item.itemNote}</Text>
                        ) : null}
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.itemQty}>{boxes}박스</Text>
                        <Text style={styles.itemQtySub}>{item.quantity}개</Text>
                      </View>
                    </View>
                  );
                })}
                {totalBags > 0 && (
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <View style={[styles.itemNameRow, { gap: 5 }]}>
                        <Ionicons name="bag-handle-outline" size={14} color={colors.orange} />
                        <Text style={styles.itemName}>쇼핑백</Text>
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemQty, { color: colors.orange }]}>{totalBags}개</Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          );
        })()}

        {/* 회수 상품 */}
        {(store.pickupItems?.length ?? 0) > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="arrow-undo" size={13} color={colors.blue} />
                <Text style={[styles.sectionTitle, { color: colors.blue }]}>회수 상품</Text>
              </View>
              <Text style={[styles.sectionCount, { color: colors.blue }]}>
                {store.pickupItems!.length}종
              </Text>
            </View>
            <View style={[styles.itemCard, { borderLeftColor: colors.blue, borderLeftWidth: 3 }]}>
              {store.pickupItems!.map((item, idx) => {
                const boxes = item.boxUnit > 0 ? Math.floor(item.quantity / item.boxUnit) : 0;
                const isLast = idx === store.pickupItems!.length - 1;
                return (
                  <View key={item.code} style={[styles.itemRow, !isLast && styles.itemBorder]}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemCode}>#{item.code}</Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemQty, { color: colors.blue }]}>{boxes}박스</Text>
                      <Text style={styles.itemQtySub}>{item.quantity}개</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* 특이사항 */}
        {isPending && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>특이사항</Text>
          </View>
        )}
        {isPending && (
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              {store.driverNote ? store.driverNote : '특이사항 없음 — 탭하여 추가'}
            </Text>
          </View>
        )}

        {/* 상품 사진 */}
        {isPending && hasPendingPhotos && (
          <View style={styles.photoCard}>
            <View style={styles.photoHeader}>
              <Ionicons name="camera" size={14} color={colors.orange} />
              <Text style={styles.photoTitle}>상품 사진</Text>
              <Text style={styles.photoCount}>{pendingPhotos.length}/3장</Text>
            </View>
            <View style={styles.photoGrid}>
              {pendingPhotos.map((uri, idx) => (
                <View key={idx} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                  <Pressable
                    style={styles.photoDelBtn}
                    onPress={() => setPendingPhotos((p) => p.filter((_, i) => i !== idx))}
                    hitSlop={4}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.red} />
                  </Pressable>
                </View>
              ))}
              {pendingPhotos.length < 3 && (
                <Pressable style={styles.photoAddBtn} onPress={handleAddPhoto}>
                  <Ionicons name="camera-outline" size={20} color={colors.orange} />
                  <Text style={styles.photoAddText}>추가</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}


        {/* 완료 상태 */}
        {isDelivered && (
          <View style={styles.doneCard}>
            <Ionicons name="checkmark-circle" size={22} color={colors.green} />
            <Text style={[styles.doneText, { flex: 1 }]}>배송 완료  {store.deliveredAt ?? ''}</Text>
          </View>
        )}

        {/* 이슈 상태 */}
        {isIssue && (
          <View style={styles.issueSection}>
            <View style={styles.issueHeader}>
              <Ionicons name="alert-circle" size={18} color={colors.red} />
              <View>
                <Text style={styles.issueTitle}>이슈 신고 완료</Text>
                <Text style={styles.issueSubText}>담당자 확인 대기 중</Text>
              </View>
            </View>
            <View style={styles.issueActions}>
              <Pressable
                style={({ pressed }) => [styles.issueActionBtn, styles.issueActionKakao, pressed && { opacity: 0.85 }]}
                onPress={() => onOpenKakao(store.id)}
              >
                <Text style={styles.issueActionEmoji}>💬</Text>
                <View>
                  <Text style={styles.issueActionLabel}>채팅방 열기</Text>
                  <Text style={styles.issueActionSub}>메시지 자동 복사됨</Text>
                </View>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [styles.issueResetBtn, pressed && { opacity: 0.7 }]}
              onPress={() => onIssueReset(store.id)}
            >
              <Ionicons name="refresh-circle-outline" size={14} color={colors.gray} />
              <Text style={styles.issueResetText}>이슈 초기화</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 배송 완료 취소 버튼 */}
      {isDelivered && (
        <View style={styles.panelBar}>
          <Pressable style={styles.undoBtn} onPress={() => onUndoRequest(store.id)}>
            <Ionicons name="arrow-undo-circle-outline" size={17} color={colors.white} />
            <Text style={styles.undoBtnText}>배송 완료 취소</Text>
          </Pressable>
        </View>
      )}

      {/* 하단 버튼 */}
      {isPending && (
        <View style={styles.panelBar}>
          {!canConfirm ? (
            <>
              <Pressable style={styles.primaryBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={18} color={colors.white} />
                <Text style={styles.primaryBtnText}>사진 촬영하기</Text>
              </Pressable>
              <Pressable style={styles.issueBtn} onPress={() => onIssue(store.id)}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.red} />
                <Text style={styles.issueBtnText}>이슈 신고</Text>
              </Pressable>
            </>
          ) : (
            /* 모든 사진 완료 */
            <>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => setShowConfirm(true)}
              >
                <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                <Text style={styles.primaryBtnText}>배송 완료 확정</Text>
              </Pressable>
              <View style={styles.secondaryRow}>
                <Pressable style={styles.retakeBtn} onPress={handleTakePhoto}>
                  <Ionicons name="camera-outline" size={14} color={colors.gray} />
                  <Text style={styles.retakeBtnText}>다시 찍기</Text>
                </Pressable>
                <Pressable style={styles.issueBtn} onPress={() => onIssue(store.id)}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.red} />
                  <Text style={styles.issueBtnText}>이슈 신고</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {/* 완료 확인 팝업 */}
      {showConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
          <Pressable style={styles.overlay} onPress={() => setShowConfirm(false)}>
            <Pressable style={styles.confirmModal} onPress={(e) => e.stopPropagation()}>
              <Ionicons name="checkmark-circle" size={36} color={colors.green} />
              <Text style={styles.confirmTitle}>배송을 완료 처리할까요?</Text>
              <Text style={styles.confirmDesc}>
                {store.name}{'\n'}
                상품 사진 {pendingPhotos.length}장
                {needsBagPhoto ? `  |  쇼핑백 사진 ${pendingBagPhotos.length}장` : ''}
              </Text>
              <Pressable
                style={styles.confirmBtn}
                onPress={() => {
                  setShowConfirm(false);
                  onDelivered(store.id, pendingPhotos);
                  setPendingPhotos([]);
                }}
              >
                <Text style={styles.confirmBtnText}>완료 확정</Text>
              </Pressable>
              <Pressable style={styles.confirmCancelBtn} onPress={() => setShowConfirm(false)}>
                <Text style={styles.confirmCancelText}>취소</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── 메인 화면 ───────────────────────────────────────────────────────────
export default function SplitDeliveryScreen() {
  const { storeId } = useLocalSearchParams<{ storeId?: string }>();
  const { course, updateStoreStatus, addStorePhoto, resetIssueStore, cancelStore } = useDelivery();
  const { addCancelLog } = useCancelLog();
  const { openChat: openKakaoChat } = useKakaoChat();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [undoTarget, setUndoTarget] = useState<string | null>(null);
  const [undoReason, setUndoReason] = useState('');

  const sortedStores = useMemo(
    () =>
      course.stores
        .filter((s) => !s.isCancelled)
        .sort((a, b) => a.order - b.order),
    [course.stores],
  );

  const firstPendingId = useMemo(
    () => sortedStores.find((s) => s.status === 'pending')?.id ?? sortedStores[0]?.id,
    [sortedStores],
  );

  const [selectedId, setSelectedId] = useState<string>(
    storeId ?? firstPendingId ?? sortedStores[0]?.id ?? '',
  );

  // ── 이슈 초기화 모달
  const [issueResetTargetId, setIssueResetTargetId] = useState<string | null>(null);

  // ── 매장 검색
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedStoreId, setHighlightedStoreId] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const listScrollRef = useRef<ScrollView>(null);
  const itemLayoutsRef = useRef<Map<string, { y: number }>>(new Map());

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return sortedStores.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
  }, [searchQuery, sortedStores]);

  const scrollToStore = useCallback((storeId: string) => {
    const layout = itemLayoutsRef.current.get(storeId);
    if (layout) {
      const visibleHeight = SCREEN_H * TOP_RATIO - 60;
      const targetY = Math.max(0, layout.y - visibleHeight / 2 + 24);
      listScrollRef.current?.scrollTo({ y: targetY, animated: true });
    }
    setSelectedId(storeId);
    setHighlightedStoreId(storeId);
    setShowSearch(false);
    setSearchQuery('');
    setTimeout(() => setHighlightedStoreId(null), 2000);
  }, []);

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const found = sortedStores.find((s) => s.name.toLowerCase().includes(q.toLowerCase()));
    if (found) scrollToStore(found.id);
  }, [searchQuery, sortedStores, scrollToStore]);

  const toggleSearch = useCallback(() => {
    setShowSearch((v) => {
      if (!v) setTimeout(() => searchInputRef.current?.focus(), 100);
      else setSearchQuery('');
      return !v;
    });
  }, []);

  const selectedStore = useMemo(
    () => sortedStores.find((s) => s.id === selectedId) ?? sortedStores[0],
    [sortedStores, selectedId],
  );

  const doneCount = sortedStores.filter((s) => s.status === 'delivered').length;
  const totalCount = sortedStores.length;

  const handleDelivered = useCallback(
    (id: string, photos: string[]) => {
      updateStoreStatus(id, 'delivered', photos);
      const nextPending = sortedStores.find(
        (s) => s.status === 'pending' && s.id !== id,
      );
      if (nextPending) {
        setSelectedId(nextPending.id);
      } else {
        // 모든 배송 완료 → 대시보드로 자동 이동
        router.replace('/(main)/(tabs)/dashboard');
      }
    },
    [updateStoreStatus, sortedStores, router],
  );

  const handleUndoConfirm = useCallback(() => {
    if (!undoTarget || undoReason.trim().length === 0) return;
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const targetStore = sortedStores.find((s) => s.id === undoTarget);
    if (targetStore) {
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
    }
    updateStoreStatus(undoTarget, 'pending');
    setUndoTarget(null);
    setUndoReason('');
  }, [undoTarget, undoReason, sortedStores, course, addCancelLog, updateStoreStatus]);

  const handleIssue = useCallback(
    (id: string) => {
      updateStoreStatus(id, 'issue');
    },
    [updateStoreStatus],
  );

  const buildIssueMessage = useCallback((id: string) => {
    const store = sortedStores.find((s) => s.id === id);
    if (!store) return '';
    const now = new Date();
    const h = now.getHours();
    const timeStr = `${h >= 12 ? '오후' : '오전'} ${h > 12 ? h - 12 : h}:${String(now.getMinutes()).padStart(2, '0')}`;
    const itemLines = store.items
      .map((i) => `• ${i.name} — ${Math.floor(i.quantity / i.boxUnit)}박스 (${i.quantity}개)`)
      .join('\n');
    return [
      `🚨 [이슈 신고] ${store.name}`,
      ``,
      `배송 기사: ${course.driver.name} (${course.driver.distributorName} · ${course.driver.courseName})`,
      `신고 시각: ${timeStr}`,
      ``,
      `📍 매장`,
      `${store.name}`,
      `${store.address}`,
      `☎ ${store.phone}`,
      ``,
      `📦 배송 상품`,
      itemLines,
    ].join('\n');
  }, [sortedStores, course]);

  const handleOpenKakao = useCallback(async (id: string) => {
    const message = buildIssueMessage(id);
    if (message) await Clipboard.setStringAsync(message);
    openKakaoChat();
  }, [buildIssueMessage, openKakaoChat]);

  const handleIssueReset = useCallback((id: string) => {
    setIssueResetTargetId(id);
  }, []);

  if (!selectedStore) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20, color: colors.gray }}>매장 정보를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.replace('/(main)/(tabs)/dashboard')}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.white} />
          <Text style={styles.backBtnText}>홈</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>오늘 배송</Text>
          <Text style={styles.headerSub}>
            {doneCount}/{totalCount} 완료
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.searchToggleBtn, pressed && { opacity: 0.6 }]}
          onPress={toggleSearch}
          hitSlop={8}
        >
          <Ionicons
            name={showSearch ? 'close-outline' : 'search-outline'}
            size={15}
            color={colors.orange}
          />
          <Text style={styles.searchToggleText}>
            매장명
          </Text>
        </Pressable>
      </View>

      {/* 검색 바 */}
      {showSearch && (
        <View style={styles.searchBar}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={15} color={colors.gray} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="매장명 검색"
              placeholderTextColor={colors.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
                <Ionicons name="close-circle" size={16} color={colors.gray} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.75 }]}
            onPress={handleSearch}
          >
            <Text style={styles.searchBtnText}>검색</Text>
          </Pressable>
          {searchSuggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {searchSuggestions.map((s) => (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [styles.suggestionItem, pressed && { opacity: 0.7 }]}
                  onPress={() => scrollToStore(s.id)}
                >
                  <Ionicons name="location-outline" size={13} color={colors.orange} />
                  <Text style={styles.suggestionText} numberOfLines={1}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 진행률 바 */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: totalCount > 0 ? `${Math.round((doneCount / totalCount) * 100)}%` as any : '0%' },
          ]}
        />
      </View>

      {/* ── 상단: 오늘 목록 ── */}
      <View style={[styles.topSection, { height: SCREEN_H * TOP_RATIO - 60 }]}>
        <ScrollView
          ref={listScrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6 }}
        >
          {sortedStores.map((store) => (
            <ListItem
              key={store.id}
              store={store}
              isSelected={store.id === selectedId}
              isHighlighted={highlightedStoreId === store.id}
              onSelect={setSelectedId}
              onLayout={(y) => itemLayoutsRef.current.set(store.id, { y })}
            />
          ))}
        </ScrollView>
      </View>

      {/* 구분선 */}
      <View style={styles.divider}>
        <Text style={styles.dividerLabel}>
          {selectedStore.order}번  {selectedStore.name}
        </Text>
        <Ionicons name="chevron-down" size={13} color={colors.orange} />
      </View>

      {/* ── 하단: 매장 상세 ── */}
      <View style={styles.bottomSection}>
        <StorePanel
          key={selectedStore.id}
          store={selectedStore}
          onDelivered={handleDelivered}
          onIssue={handleIssue}
          onUndoRequest={setUndoTarget}
          onOpenKakao={handleOpenKakao}
          onIssueReset={handleIssueReset}
        />
      </View>

      {/* 이슈 초기화 확인 팝업 */}
      {issueResetTargetId !== null && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setIssueResetTargetId(null)}>
          <Pressable style={styles.overlay} onPress={() => setIssueResetTargetId(null)}>
            <Pressable style={styles.issueResetModal} onPress={(e) => e.stopPropagation()}>
              <View style={styles.issueResetModalIcon}>
                <Ionicons name="refresh-circle" size={36} color={colors.orange} />
              </View>
              <Text style={styles.issueResetModalTitle}>이슈를 초기화합니다</Text>
              <Text style={styles.issueResetModalDesc}>
                이슈 상태가 해제되고 배송 대기 상태로 돌아갑니다.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.issueResetOption, styles.issueResetOptionPrimary, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  resetIssueStore(issueResetTargetId);
                  setIssueResetTargetId(null);
                }}
              >
                <Text style={[styles.issueResetOptionTitle, { textAlign: 'center', flex: 1 }]}>확인</Text>
              </Pressable>
              <Pressable style={styles.issueResetCancelBtn} onPress={() => setIssueResetTargetId(null)}>
                <Text style={styles.issueResetCancelBtnText}>닫기</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* 배송 완료 취소 팝업 */}
      {undoTarget !== null && (() => {
        const targetStore = sortedStores.find((s) => s.id === undoTarget);
        if (!targetStore) return null;
        const totalQty = targetStore.items.reduce((sum, item) => sum + item.quantity, 0);
        const canConfirmUndo = undoReason.trim().length > 0;
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => { setUndoTarget(null); setUndoReason(''); }}>
            <Pressable style={styles.overlay} onPress={() => { setUndoTarget(null); setUndoReason(''); }}>
              <Pressable style={styles.undoModal} onPress={(e) => e.stopPropagation()}>
                {/* 헤더 */}
                <View style={styles.undoModalHeader}>
                  <View style={styles.undoIconWrap}>
                    <Ionicons name="arrow-undo-circle-outline" size={26} color={colors.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.undoModalTitle}>배송 완료 취소</Text>
                    <Text style={styles.undoModalStoreName} numberOfLines={1}>{targetStore.name}</Text>
                  </View>
                </View>

                {/* 배송 요약 */}
                <View style={styles.undoSummaryBox}>
                  <View style={styles.undoSummaryRow}>
                    <Ionicons name="time-outline" size={13} color={colors.gray} />
                    <Text style={styles.undoSummaryLabel}>완료 시각</Text>
                    <Text style={styles.undoSummaryValue}>{targetStore.deliveredAt ?? '—'}</Text>
                  </View>
                  <View style={styles.undoSummaryDivider} />
                  <View style={styles.undoSummaryRow}>
                    <Ionicons name="cube-outline" size={13} color={colors.gray} />
                    <Text style={styles.undoSummaryLabel}>배송 상품</Text>
                    <Text style={styles.undoSummaryValue}>{targetStore.items.length}종 · 총 {totalQty}개</Text>
                  </View>
                </View>

                {/* 취소 사유 */}
                <View style={styles.undoReasonWrap}>
                  <Text style={styles.undoReasonLabel}>
                    취소 사유 <Text style={{ color: colors.red }}>*</Text>
                  </Text>
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
                <View style={styles.undoModalBtns}>
                  <Pressable
                    style={styles.undoModalCancelBtn}
                    onPress={() => { setUndoTarget(null); setUndoReason(''); }}
                  >
                    <Text style={styles.undoModalCancelText}>아니오</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.undoModalConfirmBtn, !canConfirmUndo && styles.undoModalConfirmBtnDisabled]}
                    onPress={handleUndoConfirm}
                  >
                    <Text style={[styles.undoModalConfirmText, !canConfirmUndo && { color: 'rgba(255,255,255,0.45)' }]}>완료 취소</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}
    </SafeAreaView>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.paper100 },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.black, paddingHorizontal: 12, paddingVertical: 10 },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.orange, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  searchToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1.5, borderColor: colors.orange, backgroundColor: 'rgba(255,138,0,0.12)' },
  searchToggleText: { fontSize: 12, color: colors.orange, fontWeight: '600' },
  searchBar: { backgroundColor: colors.black, paddingHorizontal: 12, paddingBottom: 10, gap: 0 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, borderWidth: 1.5, borderColor: colors.orange, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  searchInput: { flex: 1, fontSize: 14, color: colors.black, paddingVertical: 0 },
  searchBtn: { marginTop: 6, backgroundColor: colors.orange, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  searchBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  suggestionsBox: { marginTop: 4, backgroundColor: colors.white, borderRadius: 10, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.paper100 },
  suggestionText: { fontSize: 14, color: colors.black, flex: 1 },
  backBtnText:  { color: colors.white, fontSize: 16, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: colors.white, fontSize: 15, fontWeight: '700' },
  headerSub:    { color: colors.gray, fontSize: 11, marginTop: 1 },
  progressBar:  { height: 3, backgroundColor: colors.border },
  progressFill: { height: 3, backgroundColor: colors.orange },

  // 상단 목록
  topSection:   { backgroundColor: colors.white },
  listItem:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  listItemSelected: { backgroundColor: colors.orange + '0F' },
  listItemHighlighted: { backgroundColor: '#FFF3E0', borderLeftWidth: 3, borderLeftColor: colors.orange },
  listNum:      { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.paper100, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  listNumSelected: { backgroundColor: colors.orange },
  listNumText:  { fontSize: 12, fontWeight: '700', color: colors.black },
  listBody:     { flex: 1 },
  listName:     { fontSize: 13, fontWeight: '600', color: colors.black },
  listItems:    { fontSize: 11, color: colors.gray, marginTop: 2 },
  listBadge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  listBadgeText:{ fontSize: 11, fontWeight: '600' },

  // 구분선
  divider:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.black, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 5, borderTopColor: colors.orange, shadowColor: colors.black, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 8 },
  dividerLabel: { fontSize: 12, fontWeight: '700', color: colors.white },

  // 하단 패널
  bottomSection:{ flex: 1 },
  panel:        { flex: 1 },
  panelScroll:  { flex: 1 },
  panelContent: { paddingHorizontal: 14, paddingTop: 10 },

  // 메모
  memoBanner:   { flexDirection: 'row', gap: 6, backgroundColor: '#FFF3CD', borderRadius: 8, padding: 10, marginBottom: 10 },
  memoText:     { flex: 1, fontSize: 12, color: '#7A5C00', lineHeight: 18 },

  // 매장 정보
  infoCard:     { backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 10 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText:     { fontSize: 13, color: colors.black },
  infoDivider:  { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  callBtn:      { backgroundColor: colors.orange, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  callBtnText:  { color: colors.white, fontSize: 12, fontWeight: '700' },

  // 섹션
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.black },
  sectionCount: { fontSize: 12, color: colors.gray },

  // 블랙 멤버십
  blackBanner:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#1E1E1E', borderRadius: 8, padding: 10, marginBottom: 8 },
  blackBannerText: { flex: 1, fontSize: 11, color: '#FFD700', lineHeight: 16 },
  blackBadge:   { backgroundColor: '#1E1E1E', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 5 },
  blackBadgeText:{ fontSize: 10, fontWeight: '700', color: '#FFD700' },

  // 쇼핑백
  bagItemCard:       { borderWidth: 1.5, borderColor: colors.orange + '55' },
  photoCardRequired: { borderWidth: 1.5, borderColor: colors.red + '60' },
  bagPhotoPrompt:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.red + '10', borderRadius: 8, padding: 12 },
  bagPhotoPromptText:{ fontSize: 13, color: colors.red, flex: 1 },
  bagPhotoBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.red, borderRadius: 12, paddingVertical: 14, marginBottom: 6 },

  // 상품명 행
  itemNameRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },

  // 특이사항
  noteCard:     { backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 10 },
  noteText:     { fontSize: 12, color: colors.gray, lineHeight: 18 },

  // 상품 목록
  itemCard:     { backgroundColor: colors.white, borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  itemRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  itemBorder:   { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemLeft:     { flex: 1 },
  itemName:     { fontSize: 13, fontWeight: '600', color: colors.black },
  itemCode:     { fontSize: 11, color: colors.gray, marginTop: 2 },
  itemNote:     { fontSize: 11, color: colors.orange, marginTop: 2 },
  itemRight:    { alignItems: 'flex-end', marginLeft: 10 },
  itemQty:      { fontSize: 14, fontWeight: '700', color: colors.black },
  itemQtySub:   { fontSize: 11, color: colors.gray },

  // 사진
  photoCard:    { backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 10 },
  photoHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  photoTitle:   { fontSize: 13, fontWeight: '600', color: colors.black, flex: 1 },
  photoCount:   { fontSize: 12, color: colors.orange },
  photoGrid:    { flexDirection: 'row', gap: 8 },
  photoThumbWrap:{ position: 'relative' },
  photoThumb:   { width: 70, height: 70, borderRadius: 8 },
  photoDelBtn:  { position: 'absolute', top: -6, right: -6 },
  photoAddBtn:  { width: 70, height: 70, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.orange, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoAddText: { fontSize: 11, color: colors.orange },

  // 완료/이슈 상태 카드
  doneCard:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.green + '15', borderRadius: 10, padding: 14, marginBottom: 10 },
  doneText:     { fontSize: 13, fontWeight: '600', color: colors.green },
  issueCard:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.red + '15', borderRadius: 10, padding: 14, marginBottom: 10 },
  issueText:    { fontSize: 13, fontWeight: '600', color: colors.red, flex: 1 },
  issueSection: { borderWidth: 1.5, borderColor: colors.red + '40', borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: colors.red + '08' },
  issueHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  issueTitle:   { fontSize: 14, fontWeight: '700', color: colors.red },
  issueSubText: { fontSize: 12, color: colors.gray, marginTop: 1 },
  issueActions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  issueActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12 },
  issueActionKakao: { backgroundColor: '#FEE500' },
  issueActionEmoji: { fontSize: 22 },
  issueActionLabel: { fontSize: 13, fontWeight: '700', color: colors.black },
  issueActionSub:   { fontSize: 11, color: 'rgba(0,0,0,0.5)', marginTop: 1 },
  issueResetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  issueResetText: { fontSize: 12, color: colors.gray },
  issueResetModal: { backgroundColor: colors.white, borderRadius: 20, padding: 24, marginHorizontal: 24, alignItems: 'center' },
  issueResetModalIcon: { marginBottom: 12 },
  issueResetModalTitle: { fontSize: 17, fontWeight: '800', color: colors.black, marginBottom: 8, textAlign: 'center' },
  issueResetModalDesc: { fontSize: 13, color: colors.gray, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  issueResetOption: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 16, marginBottom: 10 },
  issueResetOptionPrimary: { backgroundColor: colors.orange },
  issueResetOptionCancel: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.red },
  issueResetOptionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  issueResetOptionBody: { flex: 1 },
  issueResetOptionTitle: { fontSize: 14, fontWeight: '800', color: colors.white, marginBottom: 2 },
  issueResetOptionSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 16 },
  issueResetCancelBtn: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 24 },
  issueResetCancelBtnText: { fontSize: 14, color: colors.gray, fontWeight: '600' },

  // 하단 버튼 바
  panelBar:     { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.black, borderRadius: 12, paddingVertical: 14, marginBottom: 6 },
  primaryBtnText:{ color: colors.white, fontSize: 15, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 8 },
  retakeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.paper100, borderRadius: 10, paddingVertical: 10 },
  retakeBtnText:{ fontSize: 13, color: colors.gray },
  issueBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.red + '50', borderRadius: 10, paddingVertical: 10 },
  issueBtnText: { fontSize: 13, color: colors.red },

  // 배송 완료 취소 버튼
  undoBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.red, borderRadius: 12, paddingVertical: 13 },
  undoBtnText:  { fontSize: 14, fontWeight: '600', color: colors.white },

  // 취소 팝업
  undoModal:    { backgroundColor: colors.white, borderRadius: 16, padding: 20, width: '88%', gap: 12 },
  undoModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  undoIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.orange + '18', alignItems: 'center', justifyContent: 'center' },
  undoModalTitle: { fontSize: 15, fontWeight: '700', color: colors.black },
  undoModalStoreName: { fontSize: 12, color: colors.gray, marginTop: 2 },
  undoSummaryBox: { backgroundColor: colors.paper100, borderRadius: 10, padding: 12, gap: 6 },
  undoSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  undoSummaryLabel: { fontSize: 12, color: colors.gray, width: 56 },
  undoSummaryValue: { fontSize: 12, fontWeight: '600', color: colors.black, flex: 1 },
  undoSummaryDivider: { height: 1, backgroundColor: colors.border },
  undoReasonWrap: { gap: 4 },
  undoReasonLabel: { fontSize: 12, fontWeight: '600', color: colors.black },
  undoReasonInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 13, color: colors.black, minHeight: 72, textAlignVertical: 'top' },
  undoReasonCount: { fontSize: 11, color: colors.gray, textAlign: 'right' },
  undoModalBtns:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  undoModalCancelBtn: { flex: 1, backgroundColor: colors.paper100, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  undoModalCancelText: { fontSize: 14, fontWeight: '600', color: colors.gray },
  undoModalConfirmBtn: { flex: 1, backgroundColor: colors.orange, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  undoModalConfirmBtnDisabled: { backgroundColor: colors.gray },
  undoModalConfirmText: { fontSize: 14, fontWeight: '700', color: colors.white },

  // 확인 팝업
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  confirmModal: { backgroundColor: colors.white, borderRadius: 16, padding: 24, width: '80%', alignItems: 'center', gap: 8 },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: colors.black, marginTop: 4 },
  confirmDesc:  { fontSize: 13, color: colors.gray, textAlign: 'center', lineHeight: 20 },
  confirmBtn:   { width: '100%', backgroundColor: colors.black, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  confirmBtnText:{ color: colors.white, fontSize: 15, fontWeight: '700' },
  confirmCancelBtn:{ paddingVertical: 8 },
  confirmCancelText:{ fontSize: 13, color: colors.gray },
});
