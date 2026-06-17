/**
 * Design C — Ink
 * 다크 배경 전체 / 타이포 중심 / 오렌지 0%
 */
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

export default function LoginC() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const btnScale = useRef(new Animated.Value(1)).current;

  const handleLogin = () => {
    if (!id.trim() || !password.trim()) { setError('아이디와 비밀번호를 입력해 주세요.'); return; }
    setError('');
    router.replace('/(main)/course-confirm');
  };
  const onPressIn = () => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* 상단 로고 */}
          <View style={s.top}>
            <Image
              source={require('../assets/Dailyshot_App_Icon.png')}
              style={s.icon}
              resizeMode="cover"
            />
            <Image
              source={require('../assets/Dailyshot_Logo_Primary.png')}
              style={s.logo}
              resizeMode="contain"
              tintColor={colors.white}
            />
          </View>

          {/* 헤드 카피 */}
          <View style={s.copy}>
            <Text style={s.copyMain}>오늘도{'\n'}안전한 배송.</Text>
            <Text style={s.copySub}>배송팀 계정으로 접속해 주세요</Text>
          </View>

          {/* 폼 */}
          <View style={s.form}>
            <View style={s.inputWrap}>
              <Text style={s.inputLabel}>아이디</Text>
              <TextInput
                style={s.input}
                value={id}
                onChangeText={v => { setId(v); setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                placeholder="아이디 입력"
                placeholderTextColor="#555"
              />
            </View>

            <View style={s.inputWrap}>
              <Text style={s.inputLabel}>비밀번호</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  secureTextEntry={!showPw}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholder="비밀번호 입력"
                  placeholderTextColor="#555"
                />
                <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8}>
                  <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={18} color="#666" />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={colors.red} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 8 }}>
              <Pressable style={s.btn} onPress={handleLogin} onPressIn={onPressIn} onPressOut={onPressOut}>
                <Text style={s.btnText}>로그인</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.black} />
              </Pressable>
            </Animated.View>
          </View>

          <Text style={s.footer}>© 2026 Dailyshot</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28 },

  top: {
    alignItems: 'flex-start',
    paddingTop: 56,
    gap: 20,
  },
  icon: { width: 52, height: 52, borderRadius: 14 },
  logo: { width: 140, height: 34 },

  copy: {
    paddingTop: 48,
    paddingBottom: 48,
    gap: 10,
  },
  copyMain: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  copySub: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },

  form: { gap: 20 },

  inputWrap: { gap: 8 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: '#555', letterSpacing: 0.8, textTransform: 'uppercase' },
  pwRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 16, paddingRight: 14 },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.white,
  },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: { fontSize: 12, color: colors.red },

  btn: {
    backgroundColor: colors.white,
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.black, letterSpacing: 0.2 },

  footer: { textAlign: 'center', fontSize: 12, color: '#3A3A3A', marginTop: 40, marginBottom: 24 },
});
