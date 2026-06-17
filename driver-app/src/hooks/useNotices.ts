import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const READ_RECORDS_KEY = '@notices_read_records_v2';

export interface Notice {
  id: string;
  tag: '공지' | '안내' | '주의';
  title: string;   // 목록 제목 (짧게)
  detail?: string; // 긴 본문 (없으면 title만 표시)
  date: string;
  time: string;
}

// 읽음 기록: { [notice_id]: ISO timestamp }
type ReadRecords = Record<string, string>;

export const NOTICES: Notice[] = [
  {
    id: '10',
    tag: '주의',
    title: '강동구 일부 구간 도로 침수 — 우회로 이용 바람',
    detail: '04/25 오전 기준 강동구 천호대로 진입로 침수로 통행 불가.\n우회 경로: 올림픽대로 → 강동대로 → 진입 권장.\n기상 상황에 따라 추가 구간 확대될 수 있으니 출발 전 반드시 확인해 주세요.',
    date: '04/25',
    time: '06:10',
  },
  {
    id: '9',
    tag: '공지',
    title: '5월 1일(목) 노동절 — 물류센터 단축 운영',
    detail: '5월 1일(목) 노동절 당일 물류센터는 단축 운영합니다.\n운영 시간: 오전 7시 ~ 오후 1시 (평소 대비 4시간 단축)\n단축 시간 이후 추가 출고 요청은 익일 처리되오니 배송 일정에 반드시 반영해 주시기 바랍니다.',
    date: '04/25',
    time: '08:00',
  },
  {
    id: '8',
    tag: '안내',
    title: '쇼핑백 신규 규격 도입 — 대형(XL) 추가',
    detail: '이번 주부터 쇼핑백 대형(XL) 규격이 추가됩니다.\n1.5L 이상 대용량 상품 또는 와인 2병 이상 포함 주문 건은 XL 쇼핑백으로 포장해 주세요.\nXL 쇼핑백은 물류센터 픽업 시 별도 스티커(주황색)가 부착된 박스에 있습니다.',
    date: '04/24',
    time: '09:30',
  },
  {
    id: '7',
    tag: '공지',
    title: '오늘 강남 일부 구간 도로 공사 — 테헤란로 우회 권장',
    date: '04/24',
    time: '06:30',
  },
  {
    id: '6',
    tag: '안내',
    title: '이번 주 금요일 물류센터 오후 3시 조기 마감',
    detail: '04/26(금) 물류센터 내부 재고 실사로 인해 오후 3시 조기 마감합니다.\n이 시간 이후 픽업 요청은 접수되지 않으며, 해당일 3시 이전까지 모든 픽업을 완료해 주세요.',
    date: '04/23',
    time: '17:45',
  },
  {
    id: '5',
    tag: '주의',
    title: '서초구 일대 배달 지연 — 주문 전 고객 사전 안내 바람',
    date: '04/23',
    time: '09:15',
  },
  {
    id: '4',
    tag: '공지',
    title: '4월 22일(월) 물류센터 정기 점검 — 오전 8시~10시 입고 불가',
    detail: '정기 점검 일정: 04/22(월) 오전 8:00 ~ 10:00\n점검 시간 동안 물류센터 내부 진입 및 입·출고 업무 전면 중단.\n점검 완료 후 정상 운영 재개 시 별도 알림 발송 예정입니다.',
    date: '04/22',
    time: '07:00',
  },
  {
    id: '3',
    tag: '안내',
    title: '쇼핑백 재고 보충 완료. 배송 전 수량 확인 바랍니다.',
    date: '04/21',
    time: '15:20',
  },
  {
    id: '2',
    tag: '공지',
    title: '4월 3주차 코스 배정 완료. 앱에서 확인해 주세요.',
    date: '04/19',
    time: '08:00',
  },
  {
    id: '1',
    tag: '안내',
    title: 'DDMS 앱 업데이트 안내 (v1.2.0)',
    detail: 'v1.2.0 주요 변경 사항:\n• 배송 목록 드래그 순서 변경 기능 추가\n• 매장 상세 화면 사진 최대 3장 첨부 가능\n• 이슈 신고 시 메시지 자동 복사 기능 개선\n• 공지사항 읽음 확인 기능 추가\n\n업데이트는 앱스토어/플레이스토어에서 진행해 주세요.',
    date: '04/17',
    time: '10:00',
  },
];

export function useNotices() {
  const [records, setRecords] = useState<ReadRecords | null>(null); // null = 로드 전

  useEffect(() => {
    AsyncStorage.getItem(READ_RECORDS_KEY).then((raw) => {
      try {
        setRecords(raw ? JSON.parse(raw) : {});
      } catch {
        setRecords({});
      }
    });
  }, []);

  // 개별 공지 읽음 처리 — 이미 읽은 건 덮어쓰지 않음 (최초 열람 시각 보존)
  const markRead = useCallback(async (id: string) => {
    setRecords((prev) => {
      if (!prev || prev[id]) return prev; // 이미 읽은 경우 유지
      const next = { ...prev, [id]: new Date().toISOString() };
      AsyncStorage.setItem(READ_RECORDS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // 전체 읽음 처리
  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    const next: ReadRecords = {};
    NOTICES.forEach((n) => {
      next[n.id] = now;
    });
    await AsyncStorage.setItem(READ_RECORDS_KEY, JSON.stringify(next));
    setRecords(next);
  }, []);

  const isRead = useCallback(
    (id: string) => !!(records && records[id]),
    [records],
  );

  const readAt = useCallback(
    (id: string): Date | null => {
      if (!records || !records[id]) return null;
      return new Date(records[id]);
    },
    [records],
  );

  const unreadCount = records
    ? NOTICES.filter((n) => !records[n.id]).length
    : 0;

  return {
    notices: NOTICES,
    unreadCount,
    isRead,
    readAt,
    markRead,
    markAllRead,
    loaded: records !== null,
  };
}
