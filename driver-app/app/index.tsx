import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Image,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../src/constants/colors';

export default function LoginScreen() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();
  const btnScale = useRef(new Animated.Value(1)).current;

  const handleLogin = () => {
    if (!id.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    setError('');
    router.replace('/(main)/(tabs)/dashboard');
  };

  const onPressIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper50} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 브랜드 영역 */}
          <View style={styles.brand}>
            {/* 데일리샷 로고 */}
            <View style={styles.logoPill}>
              <Image
                source={require('../assets/Dailyshot_Logo_Primary.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* DDMS 헤드라인 */}
            <View style={styles.ddmsBlock}>
              <Text style={styles.ddms}>DD<Text style={styles.ddmsAccent}>M</Text>S</Text>
              <View style={styles.ddmsDivider} />
              <Text style={styles.ddmsFull}>Dailyshot Delivery Management System</Text>
            </View>
          </View>

          {/* 폼 카드 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>로그인</Text>
            <Text style={styles.cardSub}>배송팀 계정으로 접속해 주세요</Text>

            {/* 아이디 */}
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={colors.gray} />
              <TextInput
                style={styles.input}
                value={id}
                onChangeText={(v) => { setId(v); setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                placeholder="아이디"
                placeholderTextColor={colors.gray}
              />
            </View>

            {/* 비밀번호 */}
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.gray} />
              <TextInput
                style={[styles.input, { paddingRight: 8 }]}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                placeholder="비밀번호"
                placeholderTextColor={colors.gray}
              />
              <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8}>
                <Ionicons
                  name={showPw ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={colors.gray}
                />
              </Pressable>
            </View>

            {/* 에러 */}
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* 로그인 버튼 */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                style={styles.loginBtn}
                onPress={handleLogin}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
              >
                <Text style={styles.loginBtnText}>로그인</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </Pressable>
            </Animated.View>
          </View>

          {/* 하단 푸터 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 Dailyshot</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper50,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },

  // 브랜드 영역
  brand: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 32,
    gap: 32,
  },

  // 로고
  logoPill: {
    backgroundColor: colors.black,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  logo: {
    width: 160,
    height: 42,
    tintColor: colors.white,
  },

  // DDMS 블록
  ddmsBlock: {
    alignItems: 'center',
    gap: 12,
  },
  ddms: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.black,
    letterSpacing: 4,
    lineHeight: 68,
  },
  ddmsAccent: {
    color: colors.orange,
  },
  ddmsDivider: {
    width: 32,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 1,
  },
  ddmsFull: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 20,
  },

  // 폼 카드
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    gap: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.black,
    letterSpacing: -0.5,
  },
  cardSub: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },

  // 인풋
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.black,
  },

  // 에러
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  errorText: {
    fontSize: 13,
    color: colors.red,
  },

  // 로그인 버튼
  loginBtn: {
    backgroundColor: colors.black,
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },

  // 푸터
  footer: {
    backgroundColor: colors.paper50,
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.gray,
  },
});
