/**
 * Design B — Ghost
 * 흰 배경 / 하단선 입력창 / 블랙 CTA / 오렌지 0%
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

export default function LoginB() {
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* 로고 영역 */}
          <View style={s.logoSection}>
            <Image
              source={require('../assets/Dailyshot_App_Icon.png')}
              style={s.icon}
              resizeMode="cover"
            />
            <Image
              source={require('../assets/Dailyshot_Logo_Primary.png')}
              style={s.logo}
              resizeMode="contain"
            />
            <Text style={s.sub}>배송팀 전용 앱</Text>
          </View>

          {/* 폼 */}
          <View style={s.form}>
            {/* 아이디 */}
            <View style={s.field}>
              <Text style={s.label}>아이디</Text>
              <View style={s.underlineWrap}>
                <TextInput
                  style={s.input}
                  value={id}
                  onChangeText={v => { setId(v); setError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  placeholder="입력하세요"
                  placeholderTextColor="#C0BDB8"
                />
              </View>
            </View>

            {/* 비밀번호 */}
            <View style={s.field}>
              <Text style={s.label}>비밀번호</Text>
              <View style={s.underlineWrap}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  secureTextEntry={!showPw}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholder="입력하세요"
                  placeholderTextColor="#C0BDB8"
                />
                <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8}>
                  <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={18} color="#C0BDB8" />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={colors.red} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Animated.View style={[{ transform: [{ scale: btnScale }] }, { marginTop: 36 }]}>
              <Pressable style={s.btn} onPress={handleLogin} onPressIn={onPressIn} onPressOut={onPressOut}>
                <Text style={s.btnText}>로그인</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
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
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 32 },

  logoSection: {
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 56,
    gap: 16,
  },
  icon: { width: 72, height: 72, borderRadius: 18 },
  logo: { width: 160, height: 40 },
  sub: { fontSize: 13, color: '#ABABAB', fontWeight: '500', letterSpacing: 0.5 },

  form: { gap: 28 },

  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: '#ABABAB', letterSpacing: 0.8, textTransform: 'uppercase' },
  underlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E4DF',
    paddingBottom: 10,
  },
  input: { flex: 1, fontSize: 16, color: colors.black, paddingVertical: 0 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -12 },
  errorText: { fontSize: 12, color: colors.red },

  btn: {
    backgroundColor: colors.black,
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.white, letterSpacing: 0.2 },

  footer: { textAlign: 'center', fontSize: 12, color: '#CFCBC6', marginTop: 40, marginBottom: 24 },
});
