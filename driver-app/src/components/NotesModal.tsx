import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../constants/colors';
import { Note, useNotes } from '../hooks/useNotes';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function NotesModal({ visible, onClose }: Props) {
  const { notes, addNote, toggleNote, deleteNote, deleteAll } = useNotes();
  const [input, setInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleAdd = () => {
    if (!input.trim()) return;
    addNote(input.trim());
    setInput('');
  };

  const renderItem = ({ item }: { item: Note }) => (
    <View style={styles.noteRow}>
      <Pressable onPress={() => toggleNote(item.id)} style={styles.checkbox} hitSlop={8}>
        <View style={[styles.checkboxBox, item.checked && styles.checkboxBoxChecked]}>
          {item.checked && <Ionicons name="checkmark" size={13} color={colors.white} />}
        </View>
      </Pressable>
      <Text style={[styles.noteText, item.checked && styles.noteTextChecked]} numberOfLines={3}>
        {item.content}
      </Text>
      <Pressable onPress={() => deleteNote(item.id)} hitSlop={8} style={styles.trashBtn}>
        <Ionicons name="trash-outline" size={17} color={colors.gray} />
      </Pressable>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheet}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>메모</Text>
          <View style={styles.headerRight}>
            {notes.length > 0 && (
              <Pressable onPress={() => setShowDeleteConfirm(true)} style={styles.deleteAllBtn}>
                <Text style={styles.deleteAllText}>전체 삭제</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.black} />
            </Pressable>
          </View>
        </View>

        {/* 메모 목록 */}
        {notes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={36} color={colors.border} />
            <Text style={styles.emptyText}>메모가 없습니다</Text>
          </View>
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        )}

        {/* 입력 영역 */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="메모 추가..."
            placeholderTextColor={colors.gray}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            multiline={false}
          />
          <Pressable
            style={[styles.addBtn, !input.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!input.trim()}
          >
            <Ionicons name="add" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* 전체 삭제 확인 팝업 */}
      {showDeleteConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
          <Pressable style={styles.confirmOverlay} onPress={() => setShowDeleteConfirm(false)}>
            <Pressable style={styles.confirmBox} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.confirmTitle}>모든 메모가 삭제됩니다.{'\n'}진행 하시겠습니까?</Text>
              <View style={styles.confirmBtns}>
                <Pressable style={styles.confirmNo} onPress={() => setShowDeleteConfirm(false)}>
                  <Text style={styles.confirmNoText}>NO</Text>
                </Pressable>
                <Pressable style={styles.confirmYes} onPress={() => { setShowDeleteConfirm(false); deleteAll(); }}>
                  <Text style={styles.confirmYesText}>YES</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '55%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.black,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  deleteAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.red + '80',
  },
  deleteAllText: {
    fontSize: 12,
    color: colors.red,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  checkbox: {
    padding: 2,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: colors.black,
    lineHeight: 20,
  },
  noteTextChecked: {
    color: colors.gray,
    textDecorationLine: 'line-through',
  },
  trashBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.paper50,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: colors.border,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: 280,
    alignItems: 'center',
    gap: 20,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmNo: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  confirmNoText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray,
  },
  confirmYes: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
  },
  confirmYesText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
