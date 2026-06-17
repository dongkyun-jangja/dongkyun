import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

const OPEN_CHAT_KEY = '@kakao_open_chat_url';
const REGULAR_CHAT_KEY = '@kakao_regular_chat_url';

/** 오픈채팅 웹 URL → 카카오톡 딥링크 변환 */
function toOpenChatDeepLink(webUrl: string): string | null {
  const match = webUrl.match(/open\.kakao\.com\/o\/([^/?#]+)/);
  if (!match) return null;
  return `kakaoopen://join?l=${match[1]}`;
}

async function openUrl(url: string) {
  // 오픈채팅 딥링크 시도
  const deepLink = toOpenChatDeepLink(url);
  if (deepLink) {
    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
        return;
      }
    } catch {}
  }
  // 원본 URL로 폴백
  await Linking.openURL(url);
}

export function useKakaoChat() {
  const [openChatUrl, setOpenChatUrl] = useState('');
  const [regularChatUrl, setRegularChatUrl] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(OPEN_CHAT_KEY),
      AsyncStorage.getItem(REGULAR_CHAT_KEY),
    ]).then(([open, regular]) => {
      if (open) setOpenChatUrl(open);
      if (regular) setRegularChatUrl(regular);
      setLoaded(true);
    });
  }, []);

  // 하위 호환: chatUrl = 오픈채팅 URL
  const chatUrl = openChatUrl;

  const saveOpenChatUrl = useCallback(async (url: string) => {
    const trimmed = url.trim();
    await AsyncStorage.setItem(OPEN_CHAT_KEY, trimmed);
    setOpenChatUrl(trimmed);
  }, []);

  const saveRegularChatUrl = useCallback(async (url: string) => {
    const trimmed = url.trim();
    await AsyncStorage.setItem(REGULAR_CHAT_KEY, trimmed);
    setRegularChatUrl(trimmed);
  }, []);

  // 하위 호환
  const saveChatUrl = saveOpenChatUrl;

  const openChat = useCallback(async (type?: 'open' | 'regular') => {
    const hasOpen = openChatUrl.length > 0;
    const hasRegular = regularChatUrl.length > 0;

    if (!hasOpen && !hasRegular) {
      Alert.alert(
        '채팅방 미설정',
        '설정(⚙)에서 카카오 채팅방 링크를 먼저 입력해주세요.',
        [{ text: '확인' }],
      );
      return;
    }

    try {
      if (type === 'regular' && hasRegular) {
        await openUrl(regularChatUrl);
      } else if (type === 'open' && hasOpen) {
        await openUrl(openChatUrl);
      } else if (hasOpen) {
        await openUrl(openChatUrl);
      } else {
        await openUrl(regularChatUrl);
      }
    } catch {
      Alert.alert('오류', '채팅방을 열 수 없습니다. 링크를 다시 확인해주세요.');
    }
  }, [openChatUrl, regularChatUrl]);

  const isConfigured = loaded && (openChatUrl.length > 0 || regularChatUrl.length > 0);

  return {
    chatUrl,
    openChatUrl,
    regularChatUrl,
    saveChatUrl,
    saveOpenChatUrl,
    saveRegularChatUrl,
    openChat,
    isConfigured,
    loaded,
  };
}
