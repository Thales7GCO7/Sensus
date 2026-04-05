import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import { db } from '../firebase';

export default function NotificationsModal({ visible, onClose, currentUser }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // TRAVA DE SEGURANÇA: Se não achar o e-mail, usa o Desconhecido para não quebrar
    if (!visible) return;
    const emailUsuario = currentUser || 'Desconhecido';

    const q = query(collection(db, 'notifications'), where('userEmail', '==', emailUsuario));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((document) => list.push({ id: document.id, ...document.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(list);

      // Marca como lida
      list.forEach(notif => {
        if (!notif.read) updateDoc(doc(db, 'notifications', notif.id), { read: true }).catch(e => console.error(e));
      });
    });

    return () => unsubscribe();
  }, [currentUser, visible]);

  const handleDelete = (id) => deleteDoc(doc(db, 'notifications', id)).catch(e => console.error(e));

  const handleClearAll = () => {
    Alert.alert('Limpar tudo', 'Deseja excluir todas as notificações?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: () => { notifications.forEach(n => deleteDoc(doc(db, 'notifications', n.id))); } }
    ]);
  };

  const getIconInfo = (type) => {
    switch(type) {
      case 'income': return { icon: 'arrow-up-circle', color: '#7CB342' }; 
      case 'expense': return { icon: 'arrow-down-circle', color: '#EF5350' }; 
      case 'category': return { icon: 'grid', color: '#4299E1' }; 
      case 'alert': return { icon: 'warning', color: '#FFCA28' }; 
      default: return { icon: 'information-circle', color: '#9E9E9E' }; 
    }
  };

  const formatarData = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="notifications" size={24} color="#1E3B4D" />
              <Text style={styles.modalTitle}>Notificações</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={28} color={Colors.textMuted} /></TouchableOpacity>
          </View>

          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}><Text style={styles.clearAllText}>Limpar tudo</Text></TouchableOpacity>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {notifications.map((item) => {
              const { icon, color } = getIconInfo(item.type);
              return (
                <View key={item.id} style={styles.notificationCard}>
                  <View style={[styles.iconBox, { backgroundColor: color + '20' }]}><Ionicons name={icon} size={24} color={color} /></View>
                  <View style={styles.notificationTextContainer}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                    <Text style={styles.notificationDate}>{formatarData(item.createdAt)}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={20} color="#E53935" /></TouchableOpacity>
                </View>
              );
            })}
            {notifications.length === 0 && (
              <View style={styles.emptyState}><Ionicons name="notifications-off-outline" size={48} color="#CCC" /><Text style={styles.emptyText}>Você não tem novas notificações.</Text></View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-start', backgroundColor: 'rgba(0,0,0,0.5)' }, backdrop: { flex: 1 },
  modalContent: { backgroundColor: '#F8F9FA', marginTop: Platform.OS === 'ios' ? 50 : 20, marginHorizontal: 15, borderRadius: 24, padding: 20, maxHeight: '80%', elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }, modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E3B4D' },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEEEEE', justifyContent: 'center', alignItems: 'center' },
  clearAllBtn: { alignSelf: 'flex-end', marginBottom: 10 }, clearAllText: { color: '#E53935', fontSize: 13, fontWeight: 'bold' },
  notificationCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 10, alignItems: 'center', elevation: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, notificationTextContainer: { flex: 1 },
  notificationTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 2 }, notificationMessage: { fontSize: 13, color: '#666', marginBottom: 4, lineHeight: 18 }, notificationDate: { fontSize: 11, color: '#999' },
  deleteBtn: { padding: 8 }, emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }, emptyText: { color: '#999', marginTop: 10, textAlign: 'center', fontSize: 14 }
});