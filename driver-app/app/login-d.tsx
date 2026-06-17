/**
 * Design D — Paper
 * 크림 배경 전체 / 따뜻한 뉴트럴 / 오렌지 0% / 블랙 CTA
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

export default function LoginD() {
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper100} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* 상단 브랜드 */}
          <View style={s.brand}>
            <View style={s.iconWrap}>
              <Image
                source={require('../assets/Dailyshot_App_Icon.png')}
                style={s.icon}
                resizeMode="cover"
              />
            </View>
            <Image
              source={require('../assets/Dailyshot_Logo_Primary.png')}
              style={s.logo}
              resizeMode="contain"
            />
            <View style={s.divider} />
            <Text style={s.tagline}>주류 배송 파트너 앱</Text>
          </View>

          {/* 폼 카드 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>로그인</Text>

            <View style={s.inputWrap}>
              <Ionicons name="person-outline" size={16} color={colors.border} />
              <TextInput
                style={s.input}
                value={id}
                onChangeText={v => { setId(v); setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                placeholder="아이디"
                placeholderTextColor={colors.border}
              />
            </View>

            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.border} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                placeholder="비밀번호"
                placeholderTextColor={colors.border}
              />
              <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8}>
                <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={16} color={colors.border} />
              </Pressable>
            </View>

            {error ? (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={colors.red} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable style={s.btn} onPress={handleLogin} onPressIn={onPressIn} onPressOut={onPressOut}>
                <Text style={s.btnText}>로그인</Text>
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
  safe: { flex: 1, backgroundColor: colors.paper100 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  brand: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 32,
    gap: 14,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.paper200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 64, height: 64, borderRadius: 16 },
  logo: { width: 148, height: 36 },
  divider: { width: 32, height: 1, backgroundColor: colors.border, marginVertical: 2 },
  tagline: { fontSize: 13, color: colors.gray, fontWeight: '400', letterSpacing: 0.2 },

  card: {
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.black, marginBottom: 4 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    backgroundColor: colors.paper50,
  },
  input: { flex: 1, fontSize: 15, color: colors.black },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -4 },
  errorText: { fontSize: 12, color: colors.red },

  btn: {
    backgroundColor: colors.black,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.white, letterSpacing: 0.1 },

  footer: { textAlign: 'center', fontSize: 12, color: colors.border, marginTop: 32, marginBottom: 24 },
});
