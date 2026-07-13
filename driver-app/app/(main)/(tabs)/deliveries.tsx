import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../src/constants/colors';
import { useDelivery } from '../../../src/context/DeliveryContext';

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  delivered: '완료',
  issue: '이슈',
};

const STATUS_COLOR: Record<string, string> = {
  pending: colors.gray,
  delivered: colors.orange,
  issue: colors.red,
};

export default function DeliveriesScreen() {
  const { course, courseConfirmed } = useDelivery();
  const router = useRouter();

  const stores = useMemo(
    () => [...course.stores].filter((s) => !s.isCancelled).sort((a, b) => a.order - b.order),
    [course.stores],
  );

  const deliveredCount = stores.filter((s) => s.status === 'delivered').length;
  const totalCount = stores.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>오늘 목록</Text>
        <Text style={styles.headerSub}>{deliveredCount}/{totalCount} 완료</Text>
      </View>

      {!courseConfirmed ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="list-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>코스가 확정되지 않았어요</Text>
          <Text style={styles.emptySubText}>홈에서 코스를 확정해 주세요</Text>
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="checkmark-done-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>배송 목록이 없어요</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {stores.map((store) => {
            const itemSummary = store.items
              .slice(0, 2)
              .map((i) => `${i.name} ${Math.floor(i.quantity / i.boxUnit)}박스`)
              .join('  ');
            const moreCount = store.items.length - 2;
            const hasBlack = store.items.some((i) => i.isBlack);
            const hasRfid = store.items.some((i) => i.isWhisky);
            const hasCold = store.items.some((i) => i.isColdChain);

            return (
              <Pressable
                key={store.id}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
                onPress={() => router.push(`/(main)/split-delivery?storeId=${store.id}`)}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderNum}>{store.order}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[store.status] + '22' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLOR[store.status] }]}>
                        {STATUS_LABEL[store.status]}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itemSummary} numberOfLines={1}>
                    {itemSummary}{moreCount > 0 ? `  +${moreCount}` : ''}
                  </Text>

                  {(hasBlack || hasRfid || hasCold) && (
                    <View style={styles.chips}>
                      {hasBlack && (
                        <View style={styles.chipBlack}>
                          <Text style={styles.chipBlackText}>🖤 블랙</Text>
                        </View>
                      )}
                      {hasRfid && (
                        <View style={styles.chipRfid}>
                          <Text style={styles.chipRfidText}>📶 RFID</Text>
                        </View>
                      )}
                      {hasCold && (
                        <View style={styles.chipCold}>
                          <Text style={styles.chipColdText}>❄ 콜드</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={16} color={colors.border} style={styles.chevron} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper100 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.black,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.white },
  headerSub: { fontSize: 13, color: colors.gray },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.gray },
  emptySubText: { fontSize: 13, color: colors.border },

  listContent: { padding: 16, gap: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLeft: { alignItems: 'center' },
  orderBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.paper100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNum: { fontSize: 13, fontWeight: '700', color: colors.black },

  cardBody: { flex: 1, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  storeName: { fontSize: 15, fontWeight: '700', color: colors.black, flex: 1 },

  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  itemSummary: { fontSize: 12, color: colors.gray },

  chips: { flexDirection: 'row', gap: 6, marginTop: 2 },
  chipBlack: { backgroundColor: '#1E1E1E', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  chipBlackText: { fontSize: 10, fontWeight: '700', color: '#FFD700' },
  chipRfid: { backgroundColor: '#1A3A5C', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  chipRfidText: { fontSize: 10, fontWeight: '700', color: colors.white },
  chipCold: { backgroundColor: '#003A45', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  chipColdText: { fontSize: 10, fontWeight: '700', color: '#00D8FF' },

  chevron: { marginLeft: 4 },
});
