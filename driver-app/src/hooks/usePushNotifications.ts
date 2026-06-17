import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

// 알림 수신 시 배너 표시 방식 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushState {
  token: string | null;       // Expo Push Token
  granted: boolean;           // 권한 허용 여부
  loaded: boolean;            // 초기화 완료 여부
}

export function usePushNotifications(): PushState {
  const [token, setToken] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications()
      .then((expoPushToken) => {
        setToken(expoPushToken ?? null);
        setGranted(!!expoPushToken);
      })
      .catch(() => {
        setGranted(false);
      })
      .finally(() => {
        setLoaded(true);
      });

    // 앱이 포그라운드일 때 알림 수신
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] 수신:', notification.request.content.title);
    });

    // 알림 탭 시 처리
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Push] 탭:', response.notification.request.content.title);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { token, granted, loaded };
}

async function registerForPushNotifications(): Promise<string | undefined> {
  // 실기기가 아니면 토큰 발급 불가
  if (!Device.isDevice) {
    console.log('[Push] 실기기에서만 토큰 발급 가능');
    return undefined;
  }

  // Android 채널 설정
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '배송 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FE5000',
    });
  }

  // 현재 권한 확인
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // 권한 없으면 요청
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert(
      '알림 권한 필요',
      '공지사항 푸시 알림을 받으려면 설정에서 알림을 허용해 주세요.',
      [{ text: '확인' }],
    );
    return undefined;
  }

  // Expo Push Token 발급
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: undefined, // app.json의 extra.eas.projectId 자동 참조
  });

  console.log('[Push] 토큰 발급 완료:', tokenData.data);
  return tokenData.data;
}
