import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/colors';
import { useDelivery } from '../../src/context/DeliveryContext';

const MAX_FEEDBACK_LENGTH = 500;
// ── 임시: 기기 로컬 저장 / 추후 데일리샷 서버 → 도매사 어드민으로 교체 예정 ──
const FEEDBACK_KEY = '@user_feedback_log';

function confirmReset(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if ((window as any).confirm('오늘 배송 데이터를 모두 초기화할까요?\n완료된 배송도 대기 상태로 돌아갑니다.')) {
      onConfirm();
    }
  } else {
    Alert.alert(
      '배송 초기화',
      '오늘 배송 데이터를 모두 초기화할까요?\n완료된 배송도 대기 상태로 돌아갑니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '초기화', style: 'destructive', onPress: onConfirm },
      ],
    );
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const { resetTodayCourse } = useDelivery();

  // ── 의견 제안하기 상태 ──
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleFeedbackSend = () => {
    if (!feedbackText.trim()) return;
    setShowConfirmModal(true);
  };

  const handleFeedbackConfirm = async () => {
    // 임시: AsyncStorage 저장 (추후 데일리샷 서버 API 전송으로 교체)
    try {
      const existing = await AsyncStorage.getItem(FEEDBACK_KEY);
      const logs = existing ? JSON.parse(existing) : [];
      logs.push({ text: feedbackText.trim(), sentAt: new Date().toISOString() });
      await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(logs));
    } catch {}
    setShowConfirmModal(false);
    setShowFeedbackModal(false);
    setFeedbackText('');
    Alert.alert('전송 완료', '소중한 의견 감사합니다!');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if ((window as any).confirm('정말 로그아웃 하시겠습니까? 메인 화면으로 돌아갑니다.')) {
        router.replace('/');
      }
    } else {
      Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?\n메인 화면으로 돌아갑니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => router.replace('/') },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper100} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
          <Text style={styles.backText}>돌아가기</Text>
        </Pressable>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 섹션 1: 계정 로그아웃 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>계정 로그아웃하기</Text>
          <View style={styles.card}>
            <Text style={styles.desc}>로그아웃하고 제일 처음 화면으로 돌아갑니다.</Text>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.logoutBtn, pressed && { opacity: 0.75 }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.red} />
              <Text style={[styles.actionBtnText, { color: colors.red }]}>로그아웃</Text>
            </Pressable>
          </View>
        </View>

        {/* 섹션 2: 배송 초기화 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>배송 초기화</Text>
          <View style={styles.card}>
            <Text style={styles.desc}>오늘 배송 데이터를 초기화합니다. 완료·이슈 상태가 모두 대기로 돌아갑니다.</Text>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.resetBtn, pressed && { opacity: 0.75 }]}
              onPress={() => {
                confirmReset(async () => {
                  await resetTodayCourse();
                  router.replace('/(main)/course-confirm');
                });
              }}
            >
              <Ionicons name="refresh" size={16} color={colors.red} />
              <Text style={[styles.actionBtnText, { color: colors.red }]}>오늘 배송 초기화</Text>
            </Pressable>
          </View>
        </View>

        {/* 섹션 3: 의견 제안하기 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>의견 제안하기</Text>
          <View style={styles.card}>
            <Text style={styles.desc}>앱 개선이나 기타 의견을 말씀해 주세요.</Text>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.feedbackBtn, pressed && { opacity: 0.75 }]}
              onPress={() => setShowFeedbackModal(true)}
            >
              <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.orange} />
              <Text style={[styles.actionBtnText, { color: colors.orange }]}>의견 작성하기</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.versionText}>배송 기사님 앱 v1.0</Text>
      </ScrollView>

      {/* 의견 입력 모달 */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFeedbackModal(false)} />
          <View style={styles.feedbackModal}>
            <View style={styles.feedbackHeader}>
              <Text style={styles.feedbackTitle}>의견 제안하기</Text>
              <Pressable onPress={() => setShowFeedbackModal(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.black} />
              </Pressable>
            </View>

            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={(t) => setFeedbackText(t.slice(0, MAX_FEEDBACK_LENGTH))}
              placeholder="앱 개선이나 기타 의견을 자유롭게 작성해 주세요."
              placeholderTextColor={colors.gray}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>{feedbackText.length} / {MAX_FEEDBACK_LENGTH}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                !feedbackText.trim() && styles.sendBtnDisabled,
                pressed && feedbackText.trim() && { opacity: 0.85 },
              ]}
              onPress={handleFeedbackSend}
              disabled={!feedbackText.trim()}
            >
              <Text style={styles.sendBtnText}>전송</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 전송 확인 팝업 */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>전송 확인</Text>
            <Text style={styles.confirmDesc}>이대로 전송하시겠습니까?</Text>
            <View style={styles.confirmBtns}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmBtnNo]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmBtnNoText}>아니요</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, styles.confirmBtnYes]}
                onPress={handleFeedbackConfirm}
              >
                <Text style={styles.confirmBtnYesText}>예</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 80 },
  backText: { fontSize: 15, color: colors.black, fontWeight: '500' },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
  },

  content: { padding: 20, gap: 24, paddingBottom: 40 },

  section: { gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  desc: { fontSize: 13, color: colors.gray, lineHeight: 19 },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignSelf: 'flex-start',
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  logoutBtn: { borderColor: colors.red + '60' },
  resetBtn:  { borderColor: colors.red + '60' },
  feedbackBtn: { borderColor: colors.orange + '80' },

  versionText: { fontSize: 12, color: colors.border, textAlign: 'center' },

  // 의견 입력 모달
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  feedbackModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14,
    paddingBottom: 36,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackTitle: { fontSize: 17, fontWeight: '700', color: colors.black },
  feedbackInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.black,
    minHeight: 160,
    backgroundColor: colors.paper50,
  },
  charCount: { fontSize: 12, color: colors.gray, textAlign: 'right', marginTop: -8 },
  sendBtn: {
    backgroundColor: colors.orange,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  // 전송 확인 팝업
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  confirmBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: colors.black },
  confirmDesc: { fontSize: 14, color: colors.gray, lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnNo: { borderWidth: 1, borderColor: colors.border },
  confirmBtnYes: { backgroundColor: colors.orange },
  confirmBtnNoText: { fontSize: 15, fontWeight: '600', color: colors.gray },
  confirmBtnYesText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
