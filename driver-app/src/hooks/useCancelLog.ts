import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { CancelLog } from '../types';

const CANCEL_LOG_KEY = '@cancel_logs';

export function useCancelLog() {
  const [logs, setLogs] = useState<CancelLog[]>([]);

  // 앱 시작 시 전체 로그 불러오기
  useEffect(() => {
    AsyncStorage.getItem(CANCEL_LOG_KEY)
      .then((raw) => {
        if (raw) setLogs(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  // 취소 이력 1건 추가
  const addCancelLog = useCallback(async (entry: Omit<CancelLog, 'id'>) => {
    const newLog: CancelLog = {
      ...entry,
      id: `${entry.date}_${entry.storeId}_${entry.cancelledAt.replace(':', '')}`,
    };
    setLogs((prev) => {
      const updated = [newLog, ...prev]; // 최신순
      AsyncStorage.setItem(CANCEL_LOG_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // 전체 로그 초기화 (개발·테스트용)
  const clearCancelLogs = useCallback(async () => {
    await AsyncStorage.removeItem(CANCEL_LOG_KEY).catch(() => {});
    setLogs([]);
  }, []);

  return { logs, addCancelLog, clearCancelLogs };
}
