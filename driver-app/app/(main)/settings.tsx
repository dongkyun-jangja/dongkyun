import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function confirmReset(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/colors';
import { useDelivery } from '../../src/context/DeliveryContext';
import { useKakaoChat } from '../../src/hooks/useKakaoChat';

function isValidKakaoOpenUrl(url: string) {
  return url.startsWith('https://open.kakao.com/') || url.startsWith('http://open.kakao.com/');
}

function isValidUrl(url: string) {
  return url.startsWith('https://') || url.startsWith('http://');
}

export default function SettingsScreen() {
  const router = useRouter();
  const { resetTodayCourse } = useDelivery();
  const {
    openChatUrl,
    regularChatUrl,
    saveOpenChatUrl,
    saveRegularChatUrl,
    openChat,
    isConfigured,
  } = useKakaoChat();

  const [openInput, setOpenInput] = useState('');
  const [regularInput, setRegularInput] = useState('');
  const [openSaved, setOpenSaved] = useState(false);
  const [regularSaved, setRegularSaved] = useState(false);

  useEffect(() => {
    if (openChatUrl) setOpenInput(openChatUrl);
  }, [openChatUrl]);

  useEffect(() => {
    if (regularChatUrl) setRegularInput(regularChatUrl);
  }, [regularChatUrl]);

  const openIsValid = isValidKakaoOpenUrl(openInput.trim());
  const openIsChanged = openInput.trim() !== openChatUrl;
  const canSaveOpen = openIsValid && openIsChanged;

  const regularIsValid = isValidUrl(regularInput.trim());
  const regularIsChanged = regularInput.trim() !== regularChatUrl;
  const canSaveRegular = regularIsValid && regularIsChanged;

  const handleSaveOpen = async () => {
    await saveOpenChatUrl(openInput.trim());
    setOpenSaved(true);
    Keyboard.dismiss();
    setTimeout(() => setOpenSaved(false), 2000);
  };

  const handleSaveRegular = async () => {
    await saveRegularChatUrl(regularInput.trim());
    setRegularSaved(true);
    Keyboard.dismiss();
    setTimeout(() => setRegularSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!isConfigured) {
      Alert.alert('링크 오류', '유효한 카카오 채팅방 링크를 먼저 입력해주세요.');
      return;
    }
    await openChat();
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 섹션: 카카오 채팅방 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>카카오 채팅방</Text>

            {/* 연결 상태 */}
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: isConfigured ? colors.green : colors.border },
                ]} />
                <Text style={[styles.statusText, { color: isConfigured ? colors.green : colors.gray }]}>
                  {isConfigured ? '채팅방 연결됨' : '미설정'}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.testBtn,
                    pressed && { opacity: 0.75 },
                    !isConfigured && { opacity: 0.4 },
                  ]}
                  onPress={handleTest}
                  disabled={!isConfigured}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.orange} />
                  <Text style={styles.testBtnText}>연결 테스트</Text>
                </Pressable>
              </View>
            </View>

            {/* 오픈채팅방 */}
            <View style={styles.card}>
              <View style={styles.chatTypeHeader}>
                <Ionicons name="megaphone-outline" size={16} color={colors.orange} />
                <Text style={styles.chatTypeTitle}>오픈채팅방</Text>
                <Text style={styles.chatTypeDesc}>이슈 신고 시 자동 연결</Text>
              </View>

              <View style={styles.howToBox}>
                <Text style={styles.howToStep}>카카오톡 오픈채팅방 → 메뉴(≡) → 채팅방 링크 복사</Text>
              </View>

              <View style={styles.inputWrap}>
                <TextInput
                  style={[
                    styles.input,
                    openInput.length > 0 && !openIsValid && styles.inputError,
                    openInput.length > 0 && openIsValid && styles.inputValid,
                  ]}
                  value={openInput}
                  onChangeText={(t) => { setOpenInput(t); setOpenSaved(false); }}
                  placeholder="https://open.kakao.com/o/..."
                  placeholderTextColor={colors.gray}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={canSaveOpen ? handleSaveOpen : undefined}
                />
                {openInput.length > 0 && (
                  <Pressable style={styles.clearBtn} onPress={() => setOpenInput('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.border} />
                  </Pressable>
                )}
              </View>
              {openInput.length > 0 && !openIsValid && (
                <Text style={styles.errorText}>open.kakao.com 링크만 사용 가능합니다</Text>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  !canSaveOpen && styles.saveBtnDisabled,
                  pressed && canSaveOpen && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={handleSaveOpen}
                disabled={!canSaveOpen}
              >
                {openSaved ? (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                    <Text style={styles.saveBtnText}>저장됨</Text>
                  </>
                ) : (
                  <Text style={styles.saveBtnText}>저장</Text>
                )}
              </Pressable>
            </View>

            {/* 일반 채팅방 */}
            <View style={styles.card}>
              <View style={styles.chatTypeHeader}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.gray} />
                <Text style={styles.chatTypeTitle}>일반 채팅방</Text>
                <Text style={styles.chatTypeDesc}>팀 채팅방 연결 (선택)</Text>
              </View>

              <View style={styles.howToBox}>
                <Text style={styles.howToStep}>카카오톡 채팅방 → 공유 링크 또는 초대 링크 붙여넣기</Text>
              </View>

              <View style={styles.inputWrap}>
                <TextInput
                  style={[
                    styles.input,
                    regularInput.length > 0 && !regularIsValid && styles.inputError,
                    regularInput.length > 0 && regularIsValid && styles.inputValid,
                  ]}
                  value={regularInput}
                  onChangeText={(t) => { setRegularInput(t); setRegularSaved(false); }}
                  placeholder="https://..."
                  placeholderTextColor={colors.gray}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={canSaveRegular ? handleSaveRegular : undefined}
                />
                {regularInput.length > 0 && (
                  <Pressable style={styles.clearBtn} onPress={() => setRegularInput('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.border} />
                  </Pressable>
                )}
              </View>
              {regularInput.length > 0 && !regularIsValid && (
                <Text style={styles.errorText}>유효한 URL(https://)을 입력해주세요</Text>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  !canSaveRegular && styles.saveBtnDisabled,
                  pressed && canSaveRegular && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={handleSaveRegular}
                disabled={!canSaveRegular}
              >
                {regularSaved ? (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                    <Text style={styles.saveBtnText}>저장됨</Text>
                  </>
                ) : (
                  <Text style={styles.saveBtnText}>저장</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* 섹션: 개발/데모 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>개발 / 데모</Text>
            <View style={styles.card}>
              <Text style={styles.devDesc}>오늘 배송 데이터를 초기화합니다. 완료·이슈 상태가 모두 대기로 돌아갑니다.</Text>
              <Pressable
                style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.75 }]}
                onPress={() => {
                  confirmReset(async () => {
                    await resetTodayCourse();
                    router.replace('/(main)/course-confirm');
                  });
                }}
              >
                <Ionicons name="refresh" size={16} color={colors.red} />
                <Text style={styles.resetBtnText}>오늘 배송 초기화</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.versionText}>배송 기사님 앱 v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 80,
  },
  backText: { fontSize: 15, color: colors.black, fontWeight: '500' },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
  },

  content: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },

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

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  chatTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  chatTypeDesc: {
    fontSize: 12,
    color: colors.gray,
    marginLeft: 2,
  },

  howToBox: {
    backgroundColor: colors.paper50,
    borderRadius: 10,
    padding: 14,
    gap: 5,
  },
  howToTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 4,
  },
  howToStep: {
    fontSize: 13,
    color: colors.gray,
    lineHeight: 20,
  },

  inputWrap: {
    position: 'relative',
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    paddingRight: 40,
    fontSize: 14,
    color: colors.black,
    backgroundColor: colors.paper50,
  },
  inputError: {
    borderColor: colors.red,
  },
  inputValid: {
    borderColor: colors.green,
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    color: colors.red,
    marginTop: -6,
  },

  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.orange,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  testBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.orange,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.orange,
    borderRadius: 12,
  },
  saveBtnDisabled: {
    backgroundColor: colors.border,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  versionText: {
    fontSize: 12,
    color: colors.border,
    textAlign: 'center',
  },

  devDesc: {
    fontSize: 13,
    color: colors.gray,
    lineHeight: 19,
    marginBottom: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignSelf: 'flex-start',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red,
  },
});
