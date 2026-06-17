import { Redirect } from 'expo-router';

// 기존 라우트 호환성 유지 — 탭으로 리다이렉트
export default function HomeRedirect() {
  return <Redirect href="/(main)/(tabs)" />;
}
