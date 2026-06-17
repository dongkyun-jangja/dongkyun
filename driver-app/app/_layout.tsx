import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DeliveryProvider } from '../src/context/DeliveryContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DeliveryProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </DeliveryProvider>
    </GestureHandlerRootView>
  );
}
