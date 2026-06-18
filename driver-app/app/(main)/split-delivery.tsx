import { Ionicons } from '@expo/vector-icons';
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
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/colors';
import { useDelivery } from '../../src/context/DeliveryContext';
import { Store } from '../../src/types';

const { height: SCREEN_H } = Dimensions.get('window');
const TOP_RATIO = 0.42; // 상단 목록 비율

// ─── 상단 목록 아이템 ────────────────────────────────────────────────────
function ListItem({
  store,
  isSelected,
  onSelect,
}: {
  store: Store;
  isSelected: boolean;
  onSelect: (id: string) => void;
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
      style={[styles.listItem, isSelected && styles.listItemSelected]}
      onPress={() => onSelect(store.id)}
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
}: {
  store: Store;
  onDelivered: (storeId: string, photos: string[]) => void;
  onIssue: (storeId: string) => void;
}) {
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const prevStoreId = useRef(store.id);

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
        {store.items.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>배송 상품</Text>
              <Text style={styles.sectionCount}>{store.items.length}종</Text>
            </View>
            <View style={styles.itemCard}>
              {store.items.map((item, idx) => {
                const boxes = Math.floor(item.quantity / item.boxUnit);
                const isLast = idx === store.items.length - 1;
                return (
                  <View key={item.code} style={[styles.itemRow, !isLast && styles.itemBorder]}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
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
            </View>
          </>
        )}

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

        {/* 임시 사진 영역 — 사진 찍은 후 */}
        {isPending && hasPendingPhotos && (
          <View style={styles.photoCard}>
            <View style={styles.photoHeader}>
              <Ionicons name="camera" size={14} color={colors.orange} />
              <Text style={styles.photoTitle}>촬영된 사진</Text>
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
            <Text style={styles.doneText}>배송 완료  {store.deliveredAt ?? ''}</Text>
          </View>
        )}

        {/* 이슈 상태 */}
        {isIssue && (
          <View style={styles.issueCard}>
            <Ionicons name="alert-circle" size={22} color={colors.red} />
            <Text style={styles.issueText}>이슈 신고됨 — 담당자 확인 대기 중</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 하단 버튼 */}
      {isPending && (
        <View style={styles.panelBar}>
          {!hasPendingPhotos ? (
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
                {store.name}{'\n'}사진 {pendingPhotos.length}장 첨부됨
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
  const { course, updateStoreStatus, addStorePhoto } = useDelivery();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  const selectedStore = useMemo(
    () => sortedStores.find((s) => s.id === selectedId) ?? sortedStores[0],
    [sortedStores, selectedId],
  );

  const doneCount = sortedStores.filter((s) => s.status === 'delivered').length;
  const totalCount = sortedStores.length;

  const handleDelivered = useCallback(
    (id: string, photos: string[]) => {
      updateStoreStatus(id, 'delivered', photos);
      // 다음 대기 매장으로 자동 이동
      const nextPending = sortedStores.find(
        (s) => s.status === 'pending' && s.id !== id,
      );
      if (nextPending) setSelectedId(nextPending.id);
    },
    [updateStoreStatus, sortedStores],
  );

  const handleIssue = useCallback(
    (id: string) => {
      updateStoreStatus(id, 'issue');
      const nextPending = sortedStores.find(
        (s) => s.status === 'pending' && s.id !== id,
      );
      if (nextPending) setSelectedId(nextPending.id);
    },
    [updateStoreStatus, sortedStores],
  );

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
          <Ionicons name="chevron-back" size={20} color={colors.white} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>오늘 배송</Text>
          <Text style={styles.headerSub}>
            {doneCount}/{totalCount} 완료
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6 }}
        >
          {sortedStores.map((store) => (
            <ListItem
              key={store.id}
              store={store}
              isSelected={store.id === selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </ScrollView>
      </View>

      {/* 구분선 */}
      <View style={styles.divider}>
        <View style={styles.dividerHandle} />
        <Text style={styles.dividerLabel}>
          {selectedStore.order}번  {selectedStore.name}
        </Text>
        <View style={styles.dividerHandle} />
      </View>

      {/* ── 하단: 매장 상세 ── */}
      <View style={styles.bottomSection}>
        <StorePanel
          key={selectedStore.id}
          store={selectedStore}
          onDelivered={handleDelivered}
          onIssue={handleIssue}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.paper100 },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.black, paddingHorizontal: 12, paddingVertical: 10 },
  backBtn:      { width: 36, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: colors.white, fontSize: 15, fontWeight: '700' },
  headerSub:    { color: colors.gray, fontSize: 11, marginTop: 1 },
  progressBar:  { height: 3, backgroundColor: colors.border },
  progressFill: { height: 3, backgroundColor: colors.orange },

  // 상단 목록
  topSection:   { backgroundColor: colors.white },
  listItem:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  listItemSelected: { backgroundColor: colors.orange + '0F' },
  listNum:      { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.paper100, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  listNumSelected: { backgroundColor: colors.orange },
  listNumText:  { fontSize: 12, fontWeight: '700', color: colors.black },
  listBody:     { flex: 1 },
  listName:     { fontSize: 13, fontWeight: '600', color: colors.black },
  listItems:    { fontSize: 11, color: colors.gray, marginTop: 2 },
  listBadge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  listBadgeText:{ fontSize: 11, fontWeight: '600' },

  // 구분선
  divider:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper100, paddingHorizontal: 12, paddingVertical: 7, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  dividerHandle:{ flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: { fontSize: 12, fontWeight: '700', color: colors.orange, marginHorizontal: 10 },

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

  // 하단 버튼 바
  panelBar:     { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.black, borderRadius: 12, paddingVertical: 14, marginBottom: 6 },
  primaryBtnText:{ color: colors.white, fontSize: 15, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 8 },
  retakeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.paper100, borderRadius: 10, paddingVertical: 10 },
  retakeBtnText:{ fontSize: 13, color: colors.gray },
  issueBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.red + '50', borderRadius: 10, paddingVertical: 10 },
  issueBtnText: { fontSize: 13, color: colors.red },

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
