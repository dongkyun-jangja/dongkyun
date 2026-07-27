import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const THUMB_SIZE = Math.floor((SCREEN_W - 88) / 3);

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { colors } from '../../../src/constants/colors';
import { useDelivery } from '../../../src/context/DeliveryContext';
import { useKakaoChat } from '../../../src/hooks/useKakaoChat';
import { NotesModal } from '../../../src/components/NotesModal';
import { useNotes } from '../../../src/hooks/useNotes';
import { DeliveryItem, PickupItem } from '../../../src/types';

// 상품 이미지 확대 모달
// 상품 행 컴포넌트
const ItemRow = React.memo(function ItemRow({
  item,
  isLast,
}: {
  item: DeliveryItem;
  isLast: boolean;
}) {
  const requestedQty = item.quantity;
  const requestedBoxes = Math.floor(requestedQty / item.boxUnit);
  const requestedBags = item.bags ?? 0;

  return (
    <View style={[styles.itemRow, !isLast && styles.itemRowBorder]}>
      <View style={styles.itemLeft}>
        <View style={styles.itemNameRow}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          {/* 블랙 배지 — 상품명 바로 아래 인라인 */}
          {item.isBlack && (
            <View style={styles.itemBlackBadge}>
              <Ionicons name="diamond" size={8} color="#EECB4E" />
              <Text style={styles.itemBlackBadgeText}>블랙</Text>
            </View>
          )}
          {item.isWhisky && (
            <View style={styles.itemRfidBadge}>
              <Ionicons name="wifi-outline" size={8} color={colors.white} />
              <Text style={styles.itemRfidBadgeText}>RFID</Text>
            </View>
          )}
          {item.isColdChain && (
            <View style={styles.itemColdChainBadge}>
              <Ionicons name="snow-outline" size={8} color="#00D8FF" />
              <Text style={styles.itemColdChainBadgeText}>콜드체인</Text>
            </View>
          )}
        </View>
        <View style={styles.itemMeta}>
          <Text style={styles.itemCode}>#{item.code}</Text>
        </View>
        {/* 상품 메모 */}
        {item.itemNote ? (
          <View style={styles.itemNoteRow}>
            <Ionicons name="information-circle" size={12} color={colors.orange} />
            <Text style={styles.itemNoteText}>{item.itemNote}</Text>
          </View>
        ) : null}
      </View>

      {/* 오른쪽: 수량 표시 */}
      <View style={styles.itemRight}>
        <Text style={styles.itemQty}>{requestedBoxes}박스</Text>
        <Text style={styles.itemQtySub}>{requestedQty}개</Text>
      </View>

    </View>
  );
});

// ─── 회수 상품 행 컴포넌트 ─────────────────────────────────────────────
const PickupItemRow = React.memo(function PickupItemRow({
  item,
  isLast,
}: {
  item: PickupItem;
  isLast: boolean;
}) {
  const requestedQty = item.quantity;
  const requestedBoxes = item.boxUnit > 0 ? Math.floor(requestedQty / item.boxUnit) : 0;

  return (
    <View style={[styles.itemRow, !isLast && styles.itemRowBorder]}>
      <View style={styles.pickupIconWrap}>
        <Ionicons name="arrow-undo" size={18} color={colors.blue} />
      </View>

      <View style={styles.itemLeft}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemCode}>#{item.code}</Text>

      </View>

      <View style={styles.itemQtyWrap}>
        <Text style={[styles.itemQty, { color: colors.blue }]}>{requestedBoxes}박스</Text>
        <Text style={styles.itemQtySub}>{requestedQty}개</Text>
      </View>
    </View>
  );
});

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { course, updateStoreStatus, addStorePhoto, removeStorePhoto, updatePickupStatus, updatePickupDriverNote, resetIssueStore, cancelStore } = useDelivery();
  const router = useRouter();
  const { openChat: openKakaoChat } = useKakaoChat();
  const insets = useSafeAreaInsets();

  // 촬영 후 아직 확정 전 임시 사진 (pending 상태에서만 사용)
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  // 이슈 신고 확인 오버레이 (Alert 대신 Expo Web 호환)
  const [showIssueConfirm, setShowIssueConfirm] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const { uncheckedCount } = useNotes();
  const [issueCopied, setIssueCopied] = useState(false);
  // 이슈 초기화 모달
  const [showIssueResetModal, setShowIssueResetModal] = useState(false);
  // 회수 기사 메모 편집
  const [pickupNoteEditing, setPickupNoteEditing] = useState(false);
  const [pickupNoteDraft, setPickupNoteDraft] = useState('');
  // 배송 완료 취소 팝업
  const [showCancelDelivery, setShowCancelDelivery] = useState(false);
  // 쇼핑백 확인 체크박스 (previewCard 인라인)
  // 완료 토스트
  const [remainingCount, setRemainingCount] = useState(0);
  const [nextStoreId, setNextStoreId] = useState<string | null>(null);
  const [nextStoreName, setNextStoreName] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState(0); // 방금 완료한 매장의 1-based index
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const store = useMemo(
    () => course.stores.find((s) => s.id === id),
    [course.stores, id],
  );

  const handleCall = useCallback(() => {
    if (!store) return;
    Linking.openURL(`tel:${store.phone}`);
  }, [store]);

  const openCamera = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '카메라 권한 필요',
        '배송 사진을 촬영하려면 카메라 권한이 필요합니다.\n설정 화면에서 권한을 허용해 주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '설정 열기', onPress: () => Linking.openSettings() },
        ],
      );
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

  // 1단계: 사진 촬영 → 임시 저장 (아직 완료 처리 안 함)
  const handleTakePhoto = useCallback(async () => {
    const uri = await openCamera();
    if (!uri) return;
    setPendingPhotos([uri]);
  }, [openCamera]);

  // 1단계: 사진 추가 (임시, 최대 3장)
  const handleAddPendingPhoto = useCallback(async () => {
    if (pendingPhotos.length >= 3) return;
    const uri = await openCamera();
    if (!uri) return;
    setPendingPhotos(prev => [...prev, uri]);
  }, [openCamera, pendingPhotos.length]);

  // 1단계: 임시 사진 삭제
  const handleDeletePendingPhoto = useCallback((index: number) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 2단계: 배송 완료 확정
  // 공통 — 완료 토스트 + 다음 매장 자동 이동
  const triggerNextStore = useCallback(
    (kind: 'delivered') => {
      if (!store) return;
      const pendingAfter = course.stores
        .filter((s) => s.status === 'pending' && s.id !== store.id)
        .sort((a, b) => a.order - b.order);
      const nextPending = pendingAfter[0] ?? null;
      const totalCount = course.stores.length;
      const doneCount = totalCount - pendingAfter.length; // 방금 완료 포함

      setRemainingCount(pendingAfter.length);
      setNextStoreId(nextPending?.id ?? null);
      setNextStoreName(nextPending?.name ?? null);
      setCompletedOrder(doneCount);
      setToastVisible(true);

      const navigate = () => {
        if (nextPending) {
          router.replace(`/(main)/store/${nextPending.id}` as any);
        } else {
          router.replace('/(main)/(tabs)/dashboard');
        }
      };

      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => navigate());
    },
    [store, course.stores, toastAnim, router],
  );

  const [showPickupWarn, setShowPickupWarn] = useState(false);
  const [showRfidConfirm, setShowRfidConfirm] = useState(false);

  const pickupReady = !store || !store.pickupItems || store.pickupItems.length === 0
    || store.pickupStatus === 'collected' || store.pickupStatus === 'issue';
  const canConfirmDelivery = true;

  const doConfirmDelivery = useCallback(() => {
    if (!store || pendingPhotos.length === 0) return;
    updateStoreStatus(store.id, 'delivered', pendingPhotos);
    setPendingPhotos([]);
    triggerNextStore('delivered');
  }, [store, pendingPhotos, updateStoreStatus, triggerNextStore]);

  const handleConfirmDelivery = useCallback(() => {
    if (!store || pendingPhotos.length === 0) return;
    if (!pickupReady) {
      setShowPickupWarn(true);
      return;
    }
    const hasWhisky = store.items.some((i) => i.isWhisky);
    if (hasWhisky) {
      setShowRfidConfirm(true);
      return;
    }
    doConfirmDelivery();
  }, [store, pendingPhotos, pickupReady, doConfirmDelivery]);

  // 완료 상태에서 추가 사진 촬영
  const handleAddPhoto = useCallback(async () => {
    if (!store) return;
    const uri = await openCamera();
    if (!uri) return;
    addStorePhoto(store.id, uri);
  }, [store, addStorePhoto, openCamera]);

  // 완료된 사진 삭제 (최소 1장 유지)
  const handleDeletePhoto = useCallback((index: number) => {
    if (!store) return;
    Alert.alert('사진 삭제', '이 사진을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeStorePhoto(store.id, index) },
    ]);
  }, [store, removeStorePhoto]);

  const handleReportIssue = useCallback(() => {
    setShowIssueConfirm(true);
  }, []);

  // 이슈 메시지 생성
  const buildIssueMessage = useCallback(() => {
    if (!store) return '';
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const ampm = h < 12 ? '오전' : '오후';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const timeStr = `${ampm} ${h12}:${m}`;

    const itemLines = store.items
      .map((item) => {
        const boxes = Math.floor(item.quantity / item.boxUnit);
        return `• ${item.name} — ${boxes}박스 (${item.quantity}개)`;
      })
      .join('\n');

    const photoLine = pendingPhotos.length > 0
      ? `\n📷 현장 사진 ${pendingPhotos.length}장 (별도 공유)`
      : '';

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
      photoLine,
      ``,
    ].filter((l) => l !== null).join('\n');
  }, [store, course.driver, pendingPhotos]);

  const handleIssueConfirmed = useCallback(async () => {
    if (!store) return;
    const message = buildIssueMessage();
    setShowIssueConfirm(false);
    updateStoreStatus(store.id, 'issue');

    // 클립보드 복사
    await Clipboard.setStringAsync(message);
    setIssueCopied(true);

    // 채팅방 오픈
    openKakaoChat();
  }, [store, buildIssueMessage, updateStoreStatus, openKakaoChat]);

  // 팀 채팅방 공유
  const handleShareToTeam = useCallback(async () => {
    if (!store) return;
    const statusLabel =
      store.status === 'delivered' ? `✅ 배송 완료 (${store.deliveredAt ?? ''})` :
      store.status === 'issue' ? '🚨 이슈 신고됨' :
      '⏳ 배송 대기';

    const itemLines = store.items
      .map(item => {
        const boxes = Math.floor(item.quantity / item.boxUnit);
        return `  • ${item.name} ${boxes}박스 (${item.quantity}개)`;
      })
      .join('\n');

    const photoLine = store.photoUris && store.photoUris.length > 0
      ? `📷 배송 사진 ${store.photoUris.filter(u => u !== 'delivered').length}장 촬영`
      : '';

    const message = [
      `[배송 정보 공유] ${store.name}`,
      ``,
      `📍 ${store.address}`,
      `📞 ${store.phone}`,
      ``,
      `📦 배송 상품:`,
      itemLines,
      ``,
      statusLabel,
      photoLine,
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message });
    } catch (e) {
      // 취소 시 무시
    }
  }, [store]);

  if (!store) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20, color: colors.gray }}>매장 정보를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const isPending = store.status === 'pending';
  const isDelivered = store.status === 'delivered';
  const isIssue = store.status === 'issue';

  // collectedAt이 'YYYY-MM-DD HH:MM' 또는 'HH:MM' 모두 대응
  const formatCollectedAt = (raw?: string) => {
    if (!raw) return '';
    const parts = raw.trim().split(/\s+/);
    return parts.length === 2 ? parts[1] : raw;
  };
  const collectedTime = formatCollectedAt(store.collectedAt);
  // 회수 전용 매장(배송 상품 없음)은 사진 플로우 자체가 없으므로 hasPendingPhotos 항상 false
  const hasPendingPhotos = pendingPhotos.length > 0 && store.items.length > 0;

  // 전체 진행률
  const totalCount = course.stores.length;
  const deliveredCount = course.stores.filter((s) => s.status === 'delivered').length;
  const progressRatio = totalCount > 0 ? deliveredCount / totalCount : 0;

  // 완료 카드 진입 애니메이션
  const completedAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isDelivered) {
      Animated.spring(completedAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
    }
  }, [isDelivered]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper100} />

      {/* 커스텀 헤더 */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
          <Text style={styles.backText}>목록</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {store.name}
        </Text>
        <View style={styles.headerRight}>
          <StatusBadge status={store.status} size="sm" />
          <Pressable
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.65 }]}
            onPress={handleShareToTeam}
            hitSlop={8}
          >
            <Ionicons name="share-outline" size={20} color={colors.gray} />
          </Pressable>
        </View>
      </View>

      {/* 진행률 스트립 */}
      <View style={styles.progressStrip}>
        <View style={styles.progressStripBarBg}>
          <View style={[styles.progressStripFill, { width: `${Math.round(progressRatio * 100)}%` as any }]} />
        </View>
        <View style={styles.progressStripMeta}>
          <Text style={styles.progressStripText}>{store.order}번째 배송지</Text>
          <Text style={styles.progressStripText}>
            <Text style={{ color: colors.orange, fontWeight: '700' }}>{deliveredCount}</Text>
            /{totalCount} 완료
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 배송 메모 배너 */}
        {store.memo ? (
          <View style={styles.memoBanner}>
            <View style={styles.memoHeader}>
              <Ionicons name="warning" size={16} color={colors.black} />
              <Text style={styles.memoTitle}>배송 메모</Text>
            </View>
            <Text style={styles.memoText}>{store.memo}</Text>
          </View>
        ) : null}

        {/* 매장 정보 */}
        <View style={styles.card}>
          <Pressable style={styles.infoRow} onPress={handleCall}>
            <Ionicons name="location-outline" size={18} color={colors.gray} />
            <Text style={styles.infoText}>{store.address}</Text>
          </Pressable>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={colors.gray} />
            <Text style={[styles.infoText, { flex: 1 }]}>{store.phone}</Text>
            <Pressable style={styles.callButton} onPress={handleCall}>
              <Text style={styles.callButtonText}>전화</Text>
            </Pressable>
          </View>
        </View>

        {/* 배송 상품 목록 — 배송 상품이 있을 때만 */}
        {store.items.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>배송 상품</Text>
              <View style={styles.sectionMeta}>
                {(() => {
                  const totalBags = store.items.reduce((s, i) => s + (i.bags ?? 0), 0);
                  return totalBags > 0 ? (
                    <View style={styles.totalBagBadge}>
                      <Text style={styles.totalBagText}>🛍 쇼핑백 {totalBags}개</Text>
                    </View>
                  ) : null;
                })()}
                <Text style={styles.sectionCount}>{store.items.length}종</Text>
              </View>
            </View>
            {(store.items.some((i) => i.isBlack) || store.items.some((i) => i.isWhisky) || store.items.some((i) => i.isColdChain)) && (() => {
              const blackCount = store.items.filter((i) => i.isBlack).length;
              const rfidCount = store.items.filter((i) => i.isWhisky).length;
              const coldCount = store.items.filter((i) => i.isColdChain).length;
              return (
                <View style={styles.combinedInfoBanner}>
                  {blackCount > 0 && (
                    <View style={styles.combinedInfoChip}>
                      <Ionicons name="diamond" size={12} color="#EECB4E" />
                      <Text style={[styles.combinedInfoChipText, { color: '#EECB4E' }]}>블랙 {blackCount}개</Text>
                    </View>
                  )}
                  {blackCount > 0 && rfidCount > 0 && <View style={styles.combinedInfoDivider} />}
                  {rfidCount > 0 && (
                    <View style={styles.combinedInfoChip}>
                      <Ionicons name="wifi-outline" size={12} color="#7EB8FF" />
                      <Text style={[styles.combinedInfoChipText, { color: '#7EB8FF' }]}>RFID {rfidCount}개</Text>
                    </View>
                  )}
                  {(blackCount > 0 || rfidCount > 0) && coldCount > 0 && <View style={styles.combinedInfoDivider} />}
                  {coldCount > 0 && (
                    <View style={styles.combinedInfoChip}>
                      <Ionicons name="snow-outline" size={12} color="#00D8FF" />
                      <Text style={[styles.combinedInfoChipText, { color: '#00D8FF' }]}>콜드체인 {coldCount}개</Text>
                    </View>
                  )}
                </View>
              );
            })()}
            <View style={styles.card}>
              {store.items.map((item, idx) => (
                <ItemRow
                  key={item.code}
                  item={item}
                  isLast={idx === store.items.length - 1 && store.items.reduce((s, i) => s + (i.bags ?? 0), 0) === 0}
                />
              ))}
              {(() => {
                const totalBags = store.items.reduce((s, i) => s + (i.bags ?? 0), 0);
                if (totalBags === 0) return null;
                return (
                  <View style={[styles.itemRow]}>
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
                );
              })()}
            </View>
          </>
        )}

        {/* 회수 상품 섹션 */}
        {store.pickupItems && store.pickupItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="arrow-undo" size={15} color={colors.blue} />
                <Text style={[styles.sectionTitle, { color: colors.blue }]}>회수 상품</Text>
              </View>
              <View style={styles.sectionMeta}>
                <Text style={[styles.sectionCount, { color: colors.blue }]}>{store.pickupItems.length}종</Text>
              </View>
            </View>
            <View style={[styles.card, styles.pickupCard]}>
              {store.pickupItems.map((pItem, idx) => {
                const isLast = idx === store.pickupItems!.length - 1;
                return (
                  <PickupItemRow
                    key={pItem.code}
                    item={pItem}
                    isLast={isLast}
                  />
                );
              })}
            </View>

            {/* 기사 회수 메모 (시트 "신동주류 비고") */}
            {pickupNoteEditing ? (
              <View style={styles.pickupNoteEditCard}>
                <TextInput
                  style={styles.noteInput}
                  value={pickupNoteDraft}
                  onChangeText={setPickupNoteDraft}
                  placeholder="회수 관련 비고 (예: 사장님 부재로 직원에게 인수)"
                  placeholderTextColor={colors.gray}
                  multiline
                  autoFocus
                  maxLength={150}
                />
                <View style={styles.noteEditActions}>
                  <Text style={styles.noteCharCount}>{pickupNoteDraft.length}/150</Text>
                  <View style={styles.noteEditBtns}>
                    <Pressable style={styles.noteCancelBtn} onPress={() => setPickupNoteEditing(false)}>
                      <Text style={styles.noteCancelText}>취소</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.noteSaveBtn, { backgroundColor: colors.blue }]}
                      onPress={() => {
                        updatePickupDriverNote(store.id, pickupNoteDraft.trim());
                        setPickupNoteEditing(false);
                      }}
                    >
                      <Text style={styles.noteSaveText}>저장</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : store.pickupDriverNote ? (
              <Pressable
                style={styles.pickupDriverNoteCard}
                onPress={() => { setPickupNoteDraft(store.pickupDriverNote ?? ''); setPickupNoteEditing(true); }}
              >
                <Ionicons name="document-text-outline" size={14} color={colors.blue} style={{ marginTop: 1 }} />
                <Text style={styles.pickupDriverNoteText}>{store.pickupDriverNote}</Text>
                <Text style={styles.pickupDriverNoteEdit}>수정</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.pickupDriverNoteEmpty}
                onPress={() => { setPickupNoteDraft(''); setPickupNoteEditing(true); }}
              >
                <Ionicons name="add-circle-outline" size={14} color={colors.blue} />
                <Text style={styles.pickupDriverNoteEmptyText}>회수 메모 추가 (선택)</Text>
              </Pressable>
            )}
          </>
        )}

        {/* 임시 사진 프리뷰 (촬영 후 완료 확정 전) — 배송 상품 있는 매장만 */}
        {isPending && hasPendingPhotos && store.items.length > 0 && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Ionicons name="camera" size={16} color={colors.orange} />
              <Text style={styles.previewTitle}>촬영된 사진 확인</Text>
              <Text style={styles.previewCount}>{pendingPhotos.length}/3장</Text>
            </View>

            <View style={styles.photoGrid}>
              {pendingPhotos.map((uri, idx) => (
                <View key={idx} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                  <Pressable
                    style={styles.photoDeleteBtn}
                    onPress={() => handleDeletePendingPhoto(idx)}
                    hitSlop={4}
                  >
                    <View style={styles.photoDeleteCircle}>
                      <Ionicons name="close" size={10} color={colors.white} />
                    </View>
                  </Pressable>
                </View>
              ))}

              {pendingPhotos.length < 3 && (
                <Pressable
                  style={({ pressed }) => [styles.photoAddBtn, pressed && { opacity: 0.7 }]}
                  onPress={handleAddPendingPhoto}
                >
                  <Ionicons name="camera-outline" size={22} color={colors.orange} />
                  <Text style={styles.photoAddText}>추가</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.previewHint}>사진 확인 후 완료 버튼을 눌러주세요</Text>
          </View>
        )}

        {/* 배송 완료 상태 */}
        {isDelivered && (() => {
          const photoUris = store.photoUris ?? [];
          const realPhotos = photoUris.filter(u => u !== 'delivered');
          const photoCount = photoUris.length;
          return (
            <Animated.View
              style={[
                styles.completedCard,
                {
                  opacity: completedAnim,
                  transform: [{
                    scale: completedAnim.interpolate({
                      inputRange: [0, 1], outputRange: [0.94, 1],
                    }),
                  }],
                },
              ]}
            >
              {/* 완료 헤더 */}
              <View style={styles.completedHeader}>
                <Animated.View style={{
                  transform: [{
                    scale: completedAnim.interpolate({
                      inputRange: [0, 0.6, 1], outputRange: [0.5, 1.2, 1],
                    }),
                  }],
                }}>
                  <Ionicons name="checkmark-circle" size={28} color={colors.green} />
                </Animated.View>
                <View>
                  <Text style={styles.completedTitle}>배송 완료</Text>
                  {store.deliveredAt && (
                    <Text style={styles.completedTime}>{store.deliveredAt} 처리됨</Text>
                  )}
                </View>
              </View>

              {/* 사진 섹션 */}
              <View style={styles.photoSection}>
                <View style={styles.photoSectionHeader}>
                  <Text style={styles.photoSectionTitle}>배송 사진</Text>
                  <Text style={[
                    styles.photoCount,
                    photoCount >= 1 && { color: colors.green },
                  ]}>
                    {photoCount}/3장
                  </Text>
                </View>

                <View style={styles.photoGrid}>
                  {photoUris.map((uri, idx) => (
                    <View key={idx} style={styles.photoThumbWrap}>
                      {uri !== 'delivered' ? (
                        <Image
                          source={{ uri }}
                          style={styles.photoThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.photoThumb, styles.photoThumbPlaceholder]}>
                          <Ionicons name="camera" size={24} color={colors.border} />
                        </View>
                      )}
                      {uri !== 'delivered' && (
                        <Pressable
                          style={styles.photoDeleteBtn}
                          onPress={() => handleDeletePhoto(idx)}
                          hitSlop={4}
                        >
                          <View style={styles.photoDeleteCircle}>
                            <Ionicons name="close" size={10} color={colors.white} />
                          </View>
                        </Pressable>
                      )}
                    </View>
                  ))}

                  {photoCount < 3 && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.photoAddBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={handleAddPhoto}
                    >
                      <Ionicons name="camera-outline" size={22} color={colors.orange} />
                      <Text style={styles.photoAddText}>추가</Text>
                    </Pressable>
                  )}
                </View>

                {realPhotos.length === 0 && (
                  <Text style={styles.photoHint}>📷 사진이 아직 없어요 — 추가로 찍어두세요</Text>
                )}
              </View>
            </Animated.View>
          );
        })()}

        {/* 이슈 상태 */}
        {isIssue && (
          <View style={styles.issueCard}>
            {/* 헤더 */}
            <View style={styles.issueCardHeader}>
              <View style={styles.issueIconWrap}>
                <Ionicons name="alert-circle" size={24} color={colors.red} />
              </View>
              <View style={styles.issueBody}>
                <Text style={styles.issueTitle}>이슈 신고 완료</Text>
                <Text style={styles.issueText}>담당자 확인 대기 중</Text>
              </View>
            </View>

            {/* 메시지 복사 안내 */}
            {issueCopied && (
              <View style={styles.issueCopiedRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                <Text style={styles.issueCopiedText}>
                  이슈 메시지가 클립보드에 복사되었습니다
                </Text>
              </View>
            )}

            {/* 공유 액션 */}
            <View style={styles.issueActions}>
              {/* 채팅방 + 메시지 붙여넣기 */}
              <Pressable
                style={({ pressed }) => [styles.issueActionBtn, styles.issueActionBtnKakao, pressed && { opacity: 0.85 }]}
                onPress={async () => {
                  const msg = buildIssueMessage();
                  await Clipboard.setStringAsync(msg);
                  setIssueCopied(true);
                  openKakaoChat();
                }}
              >
                <Text style={styles.issueActionEmoji}>💬</Text>
                <View>
                  <Text style={styles.issueActionLabel}>채팅방 열기</Text>
                  <Text style={styles.issueActionSub}>메시지 자동 복사됨</Text>
                </View>
              </Pressable>

              {/* 사진 공유 */}
              {store.photoUris && store.photoUris.filter(u => u !== 'delivered').length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.issueActionBtn, styles.issueActionBtnPhoto, pressed && { opacity: 0.85 }]}
                  onPress={async () => {
                    const realPhotos = (store.photoUris ?? []).filter(u => u !== 'delivered');
                    if (realPhotos.length === 0) return;
                    try {
                      await Share.share({
                        message: `[DDMS 이슈 신고] ${store.name} 현장 사진`,
                        url: realPhotos[0],
                      });
                    } catch {
                      // 취소 무시
                    }
                  }}
                >
                  <Ionicons name="images-outline" size={20} color={colors.black} />
                  <View>
                    <Text style={[styles.issueActionLabel, { color: colors.black }]}>사진 공유</Text>
                    <Text style={[styles.issueActionSub, { color: colors.gray }]}>공유 시트로 전송</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* 이슈 초기화 버튼 */}
            <Pressable
              style={({ pressed }) => [styles.issueResetBtn, pressed && { opacity: 0.75 }]}
              onPress={() => setShowIssueResetModal(true)}
            >
              <Ionicons name="refresh-circle-outline" size={18} color={colors.gray} />
              <Text style={styles.issueResetBtnText}>이슈 초기화</Text>
            </Pressable>
          </View>
        )}

        {/* 이슈 초기화 확인 팝업 */}
        {showIssueResetModal && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShowIssueResetModal(false)}>
            <Pressable style={styles.issueOverlay} onPress={() => setShowIssueResetModal(false)}>
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
                    setShowIssueResetModal(false);
                    resetIssueStore(store.id);
                  }}
                >
                  <Text style={[styles.issueResetOptionTitle, { textAlign: 'center', flex: 1 }]}>확인</Text>
                </Pressable>
                <Pressable style={styles.issueResetCancelBtn} onPress={() => setShowIssueResetModal(false)}>
                  <Text style={styles.issueResetCancelBtnText}>닫기</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* 배송 완료 확인 팝업 */}

        <View style={{ height: 100 }} />
      </ScrollView>

      <NotesModal visible={showNotes} onClose={() => setShowNotes(false)} />

      {/* RFID 확인 팝업 */}
      {showRfidConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowRfidConfirm(false)}>
          <Pressable style={styles.issueOverlay} onPress={() => setShowRfidConfirm(false)}>
            <Pressable style={styles.issueResetModal} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.issueResetModalIcon, { backgroundColor: '#1A3A5C' }]}>
                <Ionicons name="wifi-outline" size={32} color={colors.white} />
              </View>
              <Text style={styles.issueResetModalTitle}>RFID 태그 확인</Text>
              <Text style={styles.issueResetModalDesc}>위스키 상품이 포함되어 있습니다.{'\n'}단말기로 RFID 태그를 완료하셨나요?</Text>
              <View style={styles.cancelDeliveryModalBtns}>
                <Pressable
                  style={[styles.cancelDeliveryModalBtn, { backgroundColor: colors.paper100 }]}
                  onPress={() => setShowRfidConfirm(false)}
                >
                  <Text style={[styles.cancelDeliveryModalBtnText, { color: colors.gray }]}>아직이요</Text>
                </Pressable>
                <Pressable
                  style={[styles.cancelDeliveryModalBtn, { backgroundColor: '#1A3A5C' }]}
                  onPress={() => { setShowRfidConfirm(false); doConfirmDelivery(); }}
                >
                  <Text style={[styles.cancelDeliveryModalBtnText, { color: colors.white }]}>완료했어요</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* 회수 상품 경고 모달 */}
      {showPickupWarn && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowPickupWarn(false)}>
          <Pressable style={styles.issueOverlay} onPress={() => setShowPickupWarn(false)}>
            <Pressable style={styles.issueResetModal} onPress={(e) => e.stopPropagation()}>
              <View style={styles.issueResetModalIcon}>
                <Ionicons name="arrow-undo-circle" size={36} color={colors.blue} />
              </View>
              <Text style={styles.issueResetModalTitle}>회수 상품 확인</Text>
              <Text style={styles.issueResetModalDesc}>회수 필요한 상품이 있습니다.{'\n'}잊지 말고 챙겨주세요.</Text>
              <Pressable
                style={({ pressed }) => [styles.issueResetOption, styles.issueResetOptionPrimary, pressed && { opacity: 0.85 }]}
                onPress={() => { setShowPickupWarn(false); doConfirmDelivery(); }}
              >
                <View style={styles.issueResetOptionBody}>
                  <Text style={styles.issueResetOptionTitle}>OK</Text>
                </View>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* 하단 액션 버튼 */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(12, insets.bottom + 8) }]}>
        {/* 사진 촬영 전 */}
        {isPending && !hasPendingPhotos && (
          <>
            <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera" size={22} color={colors.white} />
                <Text style={styles.primaryButtonText}>사진 촬영하기</Text>
              </Pressable>
              <View style={styles.secondaryButtonRow}>
                <Pressable style={styles.memoButton} onPress={() => setShowNotes(true)}>
                  <Ionicons name="create-outline" size={15} color="#5A4500" />
                  <Text style={styles.memoButtonText}>메모</Text>
                  {uncheckedCount > 0 && <View style={styles.memoDot} />}
                </Pressable>
                <Pressable style={styles.issueButton} onPress={handleReportIssue}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
                  <Text style={styles.issueButtonText}>이슈 신고</Text>
                </Pressable>
              </View>
          </>
        )}

        {/* 사진 촬영 후 → 완료 확정 대기 — 배송 상품 있는 매장만 */}
        {isPending && hasPendingPhotos && store.items.length > 0 && (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={handleConfirmDelivery}
            >
              <Ionicons name="checkmark-circle" size={22} color={colors.white} />
              <Text style={styles.primaryButtonText}>배송 완료 확정</Text>
            </Pressable>
            <View style={styles.secondaryRow}>
              <Pressable
                style={({ pressed }) => [styles.retakeButton, pressed && { opacity: 0.7 }]}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera-outline" size={16} color={colors.gray} />
                <Text style={styles.retakeButtonText}>다시 찍기</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.issueButtonSmall, pressed && { opacity: 0.7 }]}
                onPress={handleReportIssue}
              >
                <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
                <Text style={styles.issueButtonText}>이슈 신고</Text>
              </Pressable>
            </View>
          </>
        )}


        {/* 배송 완료 상태 — 취소 버튼 */}
        {isDelivered && (
          <Pressable
            style={({ pressed }) => [styles.cancelDeliveryBtn, pressed && { opacity: 0.75 }]}
            onPress={() => setShowCancelDelivery(true)}
          >
            <Ionicons name="arrow-undo-outline" size={16} color={colors.white} />
            <Text style={styles.cancelDeliveryBtnText}>배송 완료 취소</Text>
          </Pressable>
        )}

        {/* 이슈 상태 */}
        {isIssue && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.red },
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={openKakaoChat}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.white} />
            <Text style={styles.primaryButtonText}>배송팀 채팅방 열기</Text>
          </Pressable>
        )}
      </View>

      {/* 배송 완료 취소 확인 팝업 */}
      {showCancelDelivery && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowCancelDelivery(false)}>
          <Pressable style={styles.issueOverlay} onPress={() => setShowCancelDelivery(false)}>
            <Pressable style={styles.cancelDeliveryModal} onPress={(e) => e.stopPropagation()}>
              <Ionicons name="arrow-undo-circle" size={36} color={colors.orange} />
              <Text style={styles.issueResetModalTitle}>배송 완료를 취소합니다</Text>
              <Text style={styles.issueResetModalDesc}>
                완료 상태가 해제되고{'\n'}배송 대기 상태로 돌아갑니다.
              </Text>
              <View style={styles.cancelDeliveryBtns}>
                <Pressable
                  style={[styles.cancelDeliveryModalBtn, { backgroundColor: colors.paper50, borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setShowCancelDelivery(false)}
                >
                  <Text style={[styles.cancelDeliveryModalBtnText, { color: colors.gray }]}>닫기</Text>
                </Pressable>
                <Pressable
                  style={[styles.cancelDeliveryModalBtn, { backgroundColor: colors.orange }]}
                  onPress={() => {
                    setShowCancelDelivery(false);
                    resetIssueStore(store.id);
                  }}
                >
                  <Text style={[styles.cancelDeliveryModalBtnText, { color: colors.white }]}>취소 확인</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* 이슈 신고 확인 오버레이 */}
      {showIssueConfirm && (
        <View style={styles.issueOverlay}>
          <View style={styles.issueModal}>
            <View style={styles.issueModalIcon}>
              <Ionicons name="alert-circle" size={32} color={colors.red} />
            </View>
            <Text style={styles.issueModalTitle}>이슈 신고</Text>
            <Text style={styles.issueModalMsg}>
              이슈 내용이 자동으로 메시지에 담기고{'\n'}채팅방이 열립니다.
            </Text>
            <View style={styles.issueModalSteps}>
              <View style={styles.issueModalStep}>
                <Text style={styles.issueModalStepNum}>1</Text>
                <Text style={styles.issueModalStepText}>이슈 메시지 클립보드 복사</Text>
              </View>
              <View style={styles.issueModalStep}>
                <Text style={styles.issueModalStepNum}>2</Text>
                <Text style={styles.issueModalStepText}>채팅방 자동 오픈</Text>
              </View>
              <View style={styles.issueModalStep}>
                <Text style={styles.issueModalStepNum}>3</Text>
                <Text style={styles.issueModalStepText}>붙여넣기 후 전송</Text>
              </View>
            </View>
            <View style={styles.issueModalBtns}>
              <Pressable
                style={({ pressed }) => [styles.issueModalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowIssueConfirm(false)}
              >
                <Text style={styles.issueModalCancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.issueModalConfirm, pressed && { opacity: 0.88 }]}
                onPress={handleIssueConfirmed}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.white} />
                <Text style={styles.issueModalConfirmText}>신고 및 채팅방 열기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* 배송 완료 토스트 — 탭하면 즉시 이동 */}
      {toastVisible && (
        <Pressable
          style={styles.deliveryDoneOverlay}
          onPress={() => {
            toastAnim.stopAnimation();
            setToastVisible(false);
            if (nextStoreId) {
              router.replace(`/(main)/store/${nextStoreId}` as any);
            } else {
              router.replace('/(main)/(tabs)/dashboard');
            }
          }}
        >
          <Animated.View
            style={[
              styles.deliveryDonePopup,
              {
                opacity: toastAnim,
                transform: [{
                  scale: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.88, 1],
                  }),
                }],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={48} color={colors.green} />
            <Text style={styles.deliveryDoneTitle}>배송 완료 처리되었습니다.</Text>
            <Text style={styles.deliveryDoneSub}>다음으로 넘어갑니다</Text>
          </Animated.View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper50,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
  backText: {
    fontSize: 15,
    color: colors.orange,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 64,
    justifyContent: 'flex-end',
  },
  shareBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 진행률 스트립
  progressStrip: {
    backgroundColor: colors.paper100,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 7,
  },
  progressStripBarBg: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressStripFill: {
    height: '100%',
    backgroundColor: colors.orange,
    borderRadius: 2,
  },
  progressStripMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStripText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.black,
    fontVariant: ['tabular-nums'],
  },

  // 스크롤
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // 배송 메모
  memoBanner: {
    backgroundColor: colors.glow100,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  memoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  memoText: {
    fontSize: 14,
    color: colors.black,
    lineHeight: 20,
  },

  // 카드
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // 매장 정보
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.paper100,
    marginLeft: 44,
  },
  infoText: {
    fontSize: 14,
    color: colors.black,
    flex: 1,
    lineHeight: 20,
  },
  callButton: {
    backgroundColor: colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },

  // 섹션 헤더
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  sectionCount: {
    fontSize: 14,
    color: colors.black,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  totalBagBadge: {
    backgroundColor: '#FFF3ED',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFD0B5',
  },
  totalBagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C44A00',
  },
  combinedInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'center',
    maxWidth: 400,
  },
  combinedInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  combinedInfoChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  combinedInfoDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#444',
    marginHorizontal: 4,
  },

  // 상품 행
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.paper100,
  },
  itemBlackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexShrink: 0,
  },
  itemBlackBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EECB4E',
    letterSpacing: 0.3,
  },
  itemRfidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1A3A5C',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexShrink: 0,
  },
  itemRfidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3,
  },
  itemColdChainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#003A45',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexShrink: 0,
  },
  itemColdChainBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00D8FF',
    letterSpacing: 0.3,
  },
  itemLeft: { flex: 1, gap: 3 },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.black,
    lineHeight: 20,
    flexShrink: 1,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  itemCode: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  bagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3ED',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FFD0B5',
  },
  bagChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C44A00',
  },
  bagChipMismatch: {
    backgroundColor: colors.red50,
    borderColor: colors.red,
  },
  bagChipMismatchText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.red,
    fontVariant: ['tabular-nums'],
  },
  itemNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(254,80,0,0.06)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginTop: 2,
  },
  itemNoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.black,
    lineHeight: 17,
    fontWeight: '600',
  },
  itemRight: { alignItems: 'flex-end', gap: 2, paddingTop: 2 },
  itemQty: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.black,
    fontVariant: ['tabular-nums'],
  },
  itemQtySub: {
    fontSize: 13,
    color: colors.gray,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // 이미지 확대 모달
  // 특이사항
  noteInput: {
    fontSize: 14,
    color: colors.black,
    lineHeight: 20,
    padding: 14,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  noteEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.paper100,
    backgroundColor: colors.paper50,
  },
  noteCharCount: {
    fontSize: 11,
    color: colors.gray,
    fontVariant: ['tabular-nums'],
  },
  noteEditBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  noteCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.paper200,
  },
  noteCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray,
  },
  noteSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.orange,
  },
  noteSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  // 임시 사진 프리뷰 카드
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  previewCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.orange,
    fontVariant: ['tabular-nums'],
  },
  previewHint: {
    fontSize: 12,
    color: colors.gray,
    lineHeight: 18,
  },
  bagInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF3ED',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FFD0B5',
  },
  bagInlineLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C44A00',
    flex: 1,
  },
  bagInlineRowShortage: {
    backgroundColor: colors.red50,
    borderColor: colors.red,
  },
  bagCheckBoxShortage: {
    borderColor: colors.red,
    backgroundColor: colors.red,
  },

  // 배송 완료 카드
  completedCard: {
    backgroundColor: colors.green50,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.green100,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.green,
  },
  completedTime: {
    fontSize: 12,
    color: colors.green,
    opacity: 0.8,
    marginTop: 2,
  },

  // 사진 섹션
  photoSection: {
    gap: 10,
  },
  photoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.black,
  },
  photoCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
    fontVariant: ['tabular-nums'],
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  photoThumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'visible',
  },
  photoThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
  },
  photoThumbPlaceholder: {
    backgroundColor: colors.paper200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  photoDeleteCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  photoAddBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.orange,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(254,80,0,0.04)',
  },
  photoAddText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.orange,
  },
  photoHint: {
    fontSize: 12,
    color: colors.gray,
    lineHeight: 18,
  },

  // 이슈 카드
  issueCard: {
    backgroundColor: colors.red50,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.red,
  },
  issueIconWrap: {
    paddingTop: 2,
  },
  issueBody: {
    flex: 1,
    gap: 3,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.red,
  },
  issueText: {
    fontSize: 13,
    color: colors.red,
    fontWeight: '500',
  },
  issueHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  issueHint: {
    fontSize: 12,
    color: colors.orange,
    fontWeight: '600',
  },

  // 하단 액션
  bottomBar: {
    backgroundColor: colors.paper50,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.black,
    borderRadius: 14,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonDimmed: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retakeButton: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.paper100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
  },
  secondaryButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  memoButton: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6C200',
  },
  memoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5A4500',
  },
  memoDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.red,
    position: 'absolute',
    top: 8,
    right: 10,
  },
  issueButton: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.red50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red,
  },
  issueButtonSmall: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.red50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red,
  },
  issueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.red,
  },

  // 완료 상태 바
  deliveredBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  deliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveredBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.green,
  },
  undoButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  undoText: {
    fontSize: 13,
    color: colors.gray,
    fontWeight: '500',
  },

  // 이슈 카드 (신고 완료 상태)
  issueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  issueCopiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green50,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  issueCopiedText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: '600',
    flex: 1,
  },
  issueActions: {
    flexDirection: 'row',
    gap: 10,
  },
  issueActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  issueActionBtnKakao: {
    backgroundColor: '#FEE500',
  },
  issueActionBtnPhoto: {
    backgroundColor: colors.paper100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  issueActionEmoji: {
    fontSize: 20,
  },
  issueActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.black,
  },
  issueActionSub: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },

  // 이슈 초기화 버튼
  issueResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper50 ?? colors.paper100,
  },
  issueResetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray,
  },
  // 이슈 초기화 모달
  issueResetModal: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  issueResetModalIcon: {
    marginBottom: 12,
  },
  issueResetModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  issueResetModalDesc: {
    fontSize: 13,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  issueResetOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  issueResetOptionPrimary: {
    backgroundColor: colors.orange,
  },
  issueResetOptionCancel: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.red,
  },
  issueResetOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueResetOptionBody: {
    flex: 1,
  },
  issueResetOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 2,
  },
  issueResetOptionSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
  },
  issueResetCancelBtn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  issueResetCancelBtnText: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '600',
  },

  // 쇼핑백 확인 오버레이
  bagOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 100,
  },
  bagModal: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  bagModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bagModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.black,
  },
  bagModalMsg: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  bagItemList: {
    alignSelf: 'stretch',
    backgroundColor: colors.paper50,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  bagItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bagItemName: {
    flex: 1,
    fontSize: 13,
    color: colors.black,
    fontWeight: '500',
  },
  bagItemBags: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C44A00',
    fontVariant: ['tabular-nums'],
  },
  bagCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    paddingVertical: 4,
  },
  bagCheckBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bagCheckBoxChecked: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  bagCheckLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    flex: 1,
  },
  bagModalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  bagModalCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
  },
  bagModalConfirm: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bagModalConfirmDisabled: {
    backgroundColor: colors.border,
  },
  bagModalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  // 이슈 신고 오버레이 — 흐름 안내
  issueModalSteps: {
    alignSelf: 'stretch',
    backgroundColor: colors.paper50,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  issueModalStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  issueModalStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.orange,
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  issueModalStepText: {
    fontSize: 13,
    color: colors.black,
    fontWeight: '500',
  },

  // 이슈 신고 오버레이
  issueOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 100,
  },
  issueModal: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  issueModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.red50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  issueModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.black,
  },
  issueModalMsg: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  issueModalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  issueModalCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
  },
  issueModalConfirm: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  issueModalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  // 완료 토스트
  deliveryDoneOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryDonePopup: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 36,
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 40,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  deliveryDoneTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.black,
    textAlign: 'center',
  },
  deliveryDoneSub: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '500',
  },

  // 수량 불일치
  qtyMismatchAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  qtyMismatchAddText: {
    fontSize: 11,
    color: colors.gray,
    fontWeight: '500',
  },
  qtyMismatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
    backgroundColor: colors.red50,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.red,
    alignSelf: 'flex-start',
  },
  qtyMismatchText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.red,
    fontVariant: ['tabular-nums'],
  },
  qtyMismatchEdit: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.orange,
    marginLeft: 2,
  },
  qtyMismatchReset: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray,
  },
  qtyEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: colors.paper100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: colors.orange,
    alignSelf: 'flex-start',
  },
  qtyEditLabel: {
    fontSize: 11,
    color: colors.gray,
    fontWeight: '500',
  },
  qtyEditInput: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    minWidth: 48,
    maxWidth: 72,
    textAlign: 'center',
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
    borderBottomWidth: 1.5,
    borderBottomColor: colors.orange,
  },
  qtyEditUnit: {
    fontSize: 12,
    color: colors.gray,
    marginRight: 4,
  },
  qtyConfirmBtn: {
    backgroundColor: colors.orange,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qtyConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  qtyCancelBtn: {
    padding: 4,
  },

  // 회수(pickup) 섹션
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pickupCard: {
    borderWidth: 1.5,
    borderColor: '#B0B8FF',
    backgroundColor: '#F8F9FF',
  },
  itemQtyWrap: {
    alignItems: 'flex-end',
  },
  pickupIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pickupReason: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: '500',
    marginTop: 2,
  },
  pickupDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF0FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickupDoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue,
  },
  // 바텀 바 회수 버튼
  pickupActionGroup: {
    gap: 10,
  },
  pickupCollectButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.blue,
    borderRadius: 14,
  },
  pickupCollectButtonSmall: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF0FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.blue,
  },
  pickupCollectButtonSmallText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.blue,
  },
  pickupDoneButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF0FF',
    borderRadius: 14,
  },
  pickupDoneButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.blue,
  },
  pickupDoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#EEF0FF',
    borderRadius: 10,
  },
  pickupDoneChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.blue,
  },


  // 회수 상품 메타 칩 (사유/예정조치/출고일)
  pickupMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  pickupMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pickupMetaChipReason: {
    backgroundColor: '#EEF0FF',
  },
  pickupMetaChipAction: {
    backgroundColor: '#E7F5EC',
  },
  pickupMetaChipDate: {
    backgroundColor: colors.paper100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickupMetaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.black,
  },
  pickupMetaChipDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray,
  },

  // 기사 회수 메모 카드
  pickupDriverNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8F9FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#D5DAFF',
  },
  pickupDriverNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.black,
    lineHeight: 18,
  },
  pickupDriverNoteEdit: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.blue,
    paddingTop: 1,
  },
  pickupDriverNoteEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D5DAFF',
    borderStyle: 'dashed',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  pickupDriverNoteEmptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue,
  },
  pickupNoteEditCard: {
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: colors.blue,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },

  // 회수 배지 + 취소 버튼
  pickupBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pickupUndoTinyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.paper100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickupUndoTinyText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray,
  },
  // 하단 chip 안의 취소 버튼 (chip 전체 tap도 됨, 시각적 affordance용)
  pickupChipUndoBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  pickupChipUndoText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray,
  },
  // 배송 완료 확정 차단 안내
  pickupBlockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF0FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#B0B8FF',
  },
  pickupBlockHintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue,
  },

  // 회수 완료/미완료 취소 popup (dashboard의 배송 완료 취소와 동일 스타일)
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
    width: 64,
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

  cancelDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.red,
  },
  cancelDeliveryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  cancelDeliveryModal: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center',
    gap: 0,
  },
  cancelDeliveryBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  cancelDeliveryModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDeliveryModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
