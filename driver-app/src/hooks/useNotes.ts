import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const NOTES_KEY = '@ddms_notes';

export type Note = {
  id: string;
  content: string;
  checked: boolean;
  createdAt: string;
};

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY).then((raw) => {
      if (raw) setNotes(JSON.parse(raw));
    });
  }, []);

  const save = useCallback(async (next: Note[]) => {
    setNotes(next);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
  }, []);

  const addNote = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const note: Note = {
      id: String(Date.now()),
      content: trimmed,
      checked: false,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => {
      const next = [...prev, note];
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, checked: !n.checked } : n);
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteAll = useCallback(async () => {
    await save([]);
  }, [save]);

  const uncheckedCount = notes.filter((n) => !n.checked).length;

  return { notes, addNote, toggleNote, deleteNote, deleteAll, uncheckedCount };
}
