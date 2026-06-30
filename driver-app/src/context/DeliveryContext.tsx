import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { mockAllCourses } from '../data/mock';
import { Course, DeliveryStatus, PickupFailKind, PickupStatus } from '../types';

// 오늘 날짜 기준 키 — 날짜가 바뀌면 이전 데이터는 무시됨
const todayCourse = mockAllCourses[mockAllCourses.length - 1];
const TODAY_KEY = `@delivery_course_${todayCourse.date}`;
const CONFIRMED_KEY = `@delivery_confirmed_${todayCourse.date}`;

interface DeliveryContextType {
  course: Course;
  allCourses: Course[];
  dateIndex: number;
  totalDates: number;
  isToday: boolean;
  courseConfirmed: boolean;      // 오늘 코스 확정 여부
  courseConfirmedAt: string | null; // 코스 확정 시각 (HH:MM AM/PM)
  confirmCourse: () => void;     // 코스 확정 처리
  resetTodayCourse: () => Promise<void>; // 오늘 배송 초기화 (개발/데모용)
  goToPrevDate: () => void;
  goToNextDate: () => void;
  goToDate: (index: number) => void;
  updateStoreStatus: (storeId: string, status: DeliveryStatus, photoUris?: string[]) => void;
  addStorePhoto: (storeId: string, uri: string) => void;
  removeStorePhoto: (storeId: string, index: number) => void;
  moveStoreUp: (storeId: string) => void;
  moveStoreDown: (storeId: string) => void;
  moveStoreTo: (storeId: string, targetOrder: number) => void;
  updateItemQuantity: (storeId: string, itemCode: string, actualQty: number | null) => void;
  updateItemBags: (storeId: string, itemCode: string, actualBags: number | null) => void;
  updatePickupStatus: (
    storeId: string,
    status: PickupStatus,
    failReason?: string,
    failKind?: PickupFailKind,
  ) => void;
  updatePickupItemQuantity: (storeId: string, itemCode: string, actualQty: number | null) => void;
  updatePickupDriverNote: (storeId: string, note: string) => void;
  resetIssueStore: (storeId: string) => void;  // 이슈 → 대기(다시 배송)
  cancelStore: (storeId: string) => void;      // 이슈 → 취소(목록에서 숨김, 이력은 이슈 유지)
  addManualStore: (store: { name: string; address: string; phone: string; items: { name: string; quantity: number }[] }) => void;
}

const DeliveryContext = createContext<DeliveryContextType | null>(null);

export function DeliveryProvider({ children }: { children: React.ReactNode }) {
  const todayIndex = mockAllCourses.length - 1;
  const [dateIndex, setDateIndex] = useState(todayIndex);
  const [courses, setCourses] = useState<Course[]>(mockAllCourses);
  const [courseConfirmed, setCourseConfirmed] = useState(false);
  const [courseConfirmedAt, setCourseConfirmedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // 저장 debounce — 100ms 뒤 실제 write
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 앱 시작 시 오늘 코스 복원 ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [courseRaw, confirmedRaw] = await Promise.all([
          AsyncStorage.getItem(TODAY_KEY),
          AsyncStorage.getItem(CONFIRMED_KEY),
        ]);
        if (courseRaw) {
          const savedCourse: Course = JSON.parse(courseRaw);
          setCourses((prev) =>
            prev.map((c, idx) => (idx === todayIndex ? savedCourse : c)),
          );
        }
        if (confirmedRaw) {
          const { confirmed, confirmedAt } = JSON.parse(confirmedRaw);
          setCourseConfirmed(confirmed ?? false);
          setCourseConfirmedAt(confirmedAt ?? null);
        }
      } catch {
        // 파싱 실패 시 mock 데이터 유지
      } finally {
        setHydrated(true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 오늘 코스 변경 시 자동 저장 (debounced) ──────────────────
  useEffect(() => {
    if (!hydrated) return; // 초기 로드 중 불필요한 저장 방지
    const todayCourseState = courses[todayIndex];
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(TODAY_KEY, JSON.stringify(todayCourseState)).catch(() => {});
    }, 100);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [courses, todayIndex, hydrated]);

  // ── 확정 상태 변경 시 자동 저장 ──────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      CONFIRMED_KEY,
      JSON.stringify({ confirmed: courseConfirmed, confirmedAt: courseConfirmedAt }),
    ).catch(() => {});
  }, [courseConfirmed, courseConfirmedAt, hydrated]);

  const confirmCourse = useCallback(() => {
    setCourseConfirmed(true);
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const ampm = h < 12 ? '오전' : '오후';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    setCourseConfirmedAt(`${ampm} ${h12}:${m}`);
  }, []);

  const resetTodayCourse = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TODAY_KEY),
      AsyncStorage.removeItem(CONFIRMED_KEY),
    ]).catch(() => {});
    setCourses(mockAllCourses);
    setCourseConfirmed(false);
    setCourseConfirmedAt(null);
  }, []);

  const course = courses[dateIndex];
  const isToday = dateIndex === todayIndex;

  const goToPrevDate = useCallback(() => {
    setDateIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToNextDate = useCallback(() => {
    setDateIndex((i) => Math.min(mockAllCourses.length - 1, i + 1));
  }, []);

  const goToDate = useCallback((index: number) => {
    setDateIndex(Math.max(0, Math.min(mockAllCourses.length - 1, index)));
  }, []);

  const nowTime = () =>
    new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

  // 'YYYY-MM-DD HH:MM' (회수 완료 시각용)
  const nowDateTime = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${mm}`;
  };

  const updateStoreStatus = useCallback(
    (storeId: string, status: DeliveryStatus, photoUris?: string[]) => {
      setCourses((prev) =>
        prev.map((c, idx) =>
          idx !== dateIndex
            ? c
            : {
                ...c,
                stores: c.stores.map((s) =>
                  s.id === storeId
                    ? {
                        ...s,
                        status,
                        photoUris: photoUris ?? (status === 'pending' ? [] : s.photoUris),
                        deliveredAt:
                          status === 'delivered'
                            ? s.deliveredAt ?? nowTime()
                            : status === 'pending'
                            ? undefined
                            : s.deliveredAt,
                      }
                    : s,
                ),
              },
        ),
      );
    },
    [dateIndex],
  );

  const addStorePhoto = useCallback(
    (storeId: string, uri: string) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          return {
            ...c,
            stores: c.stores.map((s) => {
              if (s.id !== storeId) return s;
              const current = s.photoUris ?? [];
              if (current.length >= 3) return s;
              return {
                ...s,
                photoUris: [...current, uri],
                status: 'delivered' as DeliveryStatus,
                deliveredAt: s.deliveredAt ?? nowTime(),
              };
            }),
          };
        }),
      );
    },
    [dateIndex],
  );

  const removeStorePhoto = useCallback(
    (storeId: string, index: number) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          return {
            ...c,
            stores: c.stores.map((s) => {
              if (s.id !== storeId) return s;
              const current = [...(s.photoUris ?? [])];
              if (current.length <= 1) return s; // 최소 1장 유지
              current.splice(index, 1);
              return { ...s, photoUris: current };
            }),
          };
        }),
      );
    },
    [dateIndex],
  );

  const moveStoreUp = useCallback(
    (storeId: string) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          const sorted = [...c.stores].sort((a, b) => a.order - b.order);
          const i = sorted.findIndex((s) => s.id === storeId);
          if (i <= 0) return c;
          const next = [...sorted];
          [next[i - 1], next[i]] = [next[i], next[i - 1]];
          return { ...c, stores: next.map((s, j) => ({ ...s, order: j + 1 })) };
        }),
      );
    },
    [dateIndex],
  );

  const moveStoreDown = useCallback(
    (storeId: string) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          const sorted = [...c.stores].sort((a, b) => a.order - b.order);
          const i = sorted.findIndex((s) => s.id === storeId);
          if (i >= sorted.length - 1) return c;
          const next = [...sorted];
          [next[i], next[i + 1]] = [next[i + 1], next[i]];
          return { ...c, stores: next.map((s, j) => ({ ...s, order: j + 1 })) };
        }),
      );
    },
    [dateIndex],
  );

  const moveStoreTo = useCallback(
    (storeId: string, targetOrder: number) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          const sorted = [...c.stores].sort((a, b) => a.order - b.order);
          const fromIdx = sorted.findIndex((s) => s.id === storeId);
          if (fromIdx === -1) return c;
          const clampedTarget = Math.max(1, Math.min(sorted.length, targetOrder));
          const toIdx = clampedTarget - 1;
          if (fromIdx === toIdx) return c;
          const next = [...sorted];
          const [removed] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, removed);
          return { ...c, stores: next.map((s, j) => ({ ...s, order: j + 1 })) };
        }),
      );
    },
    [dateIndex],
  );

  const updatePickupStatus = useCallback(
    (
      storeId: string,
      status: PickupStatus,
      failReason?: string,
      failKind?: PickupFailKind,
    ) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          return {
            ...c,
            stores: c.stores.map((s) => {
              if (s.id !== storeId) return s;
              const isPickupOnly = s.items.length === 0;
              // 회수 전용 매장 — store.status를 회수 상태와 동기화
              // 회수+배송 매장 — store.status는 손대지 않음 (배송 플로우 별도)
              const syncedStatus: DeliveryStatus = isPickupOnly
                ? status === 'collected'
                  ? 'delivered'
                  : status === 'issue'
                  ? 'issue'
                  : 'pending'
                : s.status;
              return {
                ...s,
                status: syncedStatus,
                pickupStatus: status,
                pickupFailReason: status === 'issue' ? (failReason ?? undefined) : undefined,
                pickupFailKind: status === 'issue' ? (failKind ?? undefined) : undefined,
                collectedAt:
                  status === 'collected'
                    ? s.collectedAt ?? nowDateTime()
                    : status === 'pending'
                    ? undefined
                    : s.collectedAt,
                // 회수 전용 매장의 deliveredAt도 동기화
                deliveredAt: isPickupOnly
                  ? status === 'collected'
                    ? s.deliveredAt ?? nowTime()
                    : status === 'pending'
                    ? undefined
                    : s.deliveredAt
                  : s.deliveredAt,
              };
            }),
          };
        }),
      );
    },
    [dateIndex],
  );

  const updatePickupDriverNote = useCallback(
    (storeId: string, note: string) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          return {
            ...c,
            stores: c.stores.map((s) =>
              s.id === storeId ? { ...s, pickupDriverNote: note } : s,
            ),
          };
        }),
      );
    },
    [dateIndex],
  );

  const updatePickupItemQuantity = useCallback(
    (storeId: string, itemCode: string, actualQty: number | null) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          return {
            ...c,
            stores: c.stores.map((s) => {
              if (s.id !== storeId) return s;
              return {
                ...s,
                pickupItems: (s.pickupItems ?? []).map((item) =>
                  item.code === itemCode
                    ? { ...item, actualQuantity: actualQty ?? undefined }
                    : item,
                ),
              };
            }),
          };
        }),
      );
    },
    [dateIndex],
  );

  // actualBags=null 이면 불일치 해제 (요청 쇼핑백 수와 동일)
  const updateItemBags = useCallback(
    (storeId: string, itemCode: string, actualBags: number | null) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          return {
            ...c,
            stores: c.stores.map((s) => {
              if (s.id !== storeId) return s;
              return {
                ...s,
                items: s.items.map((item) =>
                  item.code === itemCode
                    ? { ...item, actualBags: actualBags ?? undefined }
                    : item,
                ),
              };
            }),
          };
        }),
      );
    },
    [dateIndex],
  );

  // actualQty=null 이면 불일치 해제 (요청 수량과 동일)
  const updateItemQuantity = useCallback(
    (storeId: string, itemCode: string, actualQty: number | null) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          return {
            ...c,
            stores: c.stores.map((s) => {
              if (s.id !== storeId) return s;
              return {
                ...s,
                items: s.items.map((item) =>
                  item.code === itemCode
                    ? { ...item, actualQuantity: actualQty ?? undefined }
                    : item,
                ),
              };
            }),
          };
        }),
      );
    },
    [dateIndex],
  );

  const resetIssueStore = useCallback(
    (storeId: string) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          return {
            ...c,
            stores: c.stores.map((s) =>
              s.id === storeId
                ? { ...s, status: 'pending', isCancelled: false, photoUris: [], deliveredAt: undefined }
                : s,
            ),
          };
        }),
      );
    },
    [dateIndex],
  );

  const addManualStore = useCallback(
    (input: { name: string; address: string; phone: string; items: { name: string; quantity: number }[] }) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== todayIndex) return c;
          const maxOrder = c.stores.reduce((m, s) => Math.max(m, s.order), 0);
          const newStore: import('../types').Store = {
            id: `manual-${Date.now()}`,
            code: '',
            name: input.name,
            address: input.address,
            phone: input.phone,
            status: 'pending',
            isManual: true,
            order: maxOrder + 1,
            items: input.items.map((item, i) => ({
              code: `manual-${Date.now()}-${i}`,
              name: item.name,
              quantity: item.quantity,
              boxUnit: 1,
            })),
          };
          return { ...c, stores: [...c.stores, newStore] };
        }),
      );
    },
    [todayIndex],
  );

  const cancelStore = useCallback(
    (storeId: string) => {
      setCourses((prev) =>
        prev.map((c, idx) => {
          if (idx !== dateIndex) return c;
          return {
            ...c,
            stores: c.stores.map((s) =>
              s.id === storeId ? { ...s, status: 'issue', isCancelled: true } : s,
            ),
          };
        }),
      );
    },
    [dateIndex],
  );

  return (
    <DeliveryContext.Provider
      value={{
        course,
        allCourses: courses,
        dateIndex,
        totalDates: mockAllCourses.length,
        isToday,
        courseConfirmed,
        courseConfirmedAt,
        confirmCourse,
        goToPrevDate,
        goToNextDate,
        goToDate,
        updateStoreStatus,
        addStorePhoto,
        removeStorePhoto,
        moveStoreUp,
        moveStoreDown,
        moveStoreTo,
        updateItemQuantity,
        updateItemBags,
        updatePickupStatus,
        updatePickupItemQuantity,
        updatePickupDriverNote,
        resetIssueStore,
        cancelStore,
        addManualStore,
        resetTodayCourse,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error('useDelivery must be used within DeliveryProvider');
  return ctx;
}
