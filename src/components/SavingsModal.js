import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';

// Lista de emojis disponíveis para os cofrinhos
const EMOJIS = ['💰', '✈️', '🚗', '🏍️', '🏠', '🎓', '💻', '🎮', '🏥', '📱', '💍', '🎉'];

export default function SavingsModal({ visible, onClose, currentUser }) {
  const [savings, setSavings] = useState([]);
  
  // Estados para Criar Novo Cofrinho
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💰'); // Emoji Padrão

  // Estados para Gerenciar Dinheiro (Guardar/Resgatar)
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [selectedSaving, setSelectedSaving] = useState(null);
  const [manageAmount, setManageAmount] = useState('');
  const [manageAction, setManageAction] = useState('add'); // 'add' ou 'remove'

  const formatarMoeda = (valor) => Number(valor).toFixed(2).replace('.', ',');

  // Busca os Cofrinhos no banco
  useEffect(() => {
    if (!currentUser || !visible) return;
    const q = query(collection(db, 'savings'), where('userEmail', '==', currentUser));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setSavings(list);
    });
    return () => unsubscribe();
  }, [currentUser, visible]);

  // --- FUNÇÕES DE CRIAÇÃO ---
  const handleCreateSaving = async () => {
    if (!newName) return Alert.alert('Atenção', 'Dê um nome ao seu cofrinho.');
    
    let targetValue = parseFloat(newTarget.replace(',', '.'));
    if (isNaN(targetValue)) targetValue = 0;

    setIsCreating(false); // Fechamento instantâneo
    setNewName('');
    setNewTarget('');

    try {
      await addDoc(collection(db, 'savings'), {
        userEmail: currentUser,
        name: newName,
        targetAmount: targetValue,
        savedAmount: 0,
        emoji: selectedEmoji, // Salva o emoji escolhido!
        createdAt: new Date().toISOString()
      });
      setSelectedEmoji('💰'); // Reseta o emoji
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o cofrinho.');
    }
  };

  // --- FUNÇÕES DE GERENCIAMENTO ---
  const handleOpenManage = (saving, action) => {
    setSelectedSaving(saving);
    setManageAction(action);
    setManageAmount('');
    setManageModalVisible(true);
  };

  const handleConfirmManage = async () => {
    let numericValue = parseFloat(manageAmount.replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) return Alert.alert('Atenção', 'Digite um valor válido.');

    let newSavedAmount = selectedSaving.savedAmount;

    if (manageAction === 'add') {
      newSavedAmount += numericValue;
    } else if (manageAction === 'remove') {
      if (numericValue > newSavedAmount) return Alert.alert('Atenção', 'Você não pode resgatar mais do que possui guardado.');
      newSavedAmount -= numericValue;
    }

    setManageModalVisible(false);

    try {
      await updateDoc(doc(db, 'savings', selectedSaving.id), {
        savedAmount: newSavedAmount,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o saldo.');
    }
  };

  const handleDeleteSaving = (id, name) => {
    Alert.alert('Quebrar Cofrinho', `Tem certeza que deseja excluir o cofrinho "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Quebrar', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'savings', id));
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        }
      }
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="wallet-outline" size={24} color="#1E3B4D" />
              <Text style={styles.title}>Meus Cofrinhos</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={styles.closeBtnText}>X</Text></TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Guarde dinheiro para seus objetivos e sonhos. O dinheiro aqui fica separado do seu saldo principal.</Text>

          <TouchableOpacity style={styles.newGoalBtn} onPress={() => setIsCreating(true)}>
            <Text style={styles.newGoalBtnText}>+ Criar Novo Cofrinho</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
            {savings.map((item) => {
              let progressPercentage = 0;
              if (item.targetAmount > 0) {
                progressPercentage = Math.min((item.savedAmount / item.targetAmount) * 100, 100);
              }

              return (
                <View key={item.id} style={styles.goalCard}>
                  <View style={styles.goalCardHeader}>
                    <View style={styles.goalInfoRow}>
                      <View style={styles.iconBox}>
                        {/* Mostra o emoji salvo no banco, ou o de dinheiro por padrão */}
                        <Text style={styles.savedEmoji}>{item.emoji || '💰'}</Text>
                      </View>
                      <View>
                        <Text style={styles.catName}>{item.name}</Text>
                        <Text style={styles.savedText}>Guardado: R$ {formatarMoeda(item.savedAmount)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteSaving(item.id, item.name)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={20} color="#E53935" />
                    </TouchableOpacity>
                  </View>

                  {item.targetAmount > 0 && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressTextRow}>
                        <Text style={styles.progressLabel}>{progressPercentage.toFixed(0)}% do objetivo</Text>
                        <Text style={styles.progressValue}>Objetivo: R$ {formatarMoeda(item.targetAmount)}</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                      </View>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleOpenManage(item, 'remove')}>
                      <Ionicons name="arrow-down-outline" size={16} color="#E53935" />
                      <Text style={styles.actionBtnTextRed}>Resgatar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnSolid} onPress={() => handleOpenManage(item, 'add')}>
                      <Ionicons name="arrow-up-outline" size={16} color="#FFF" />
                      <Text style={styles.actionBtnTextWhite}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {savings.length === 0 && <Text style={styles.emptyText}>Você ainda não possui cofrinhos.</Text>}
            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
            <Text style={styles.footerBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- SUB-MODAL: CRIAR NOVO COFRINHO --- */}
      <Modal visible={isCreating} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editModalContainer}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Novo Cofrinho</Text>
              <TouchableOpacity onPress={() => setIsCreating(false)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>

            <Text style={styles.label}>Ícone</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map((emoji, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.emojiButton, selectedEmoji === emoji && styles.emojiButtonSelected]} 
                  onPress={() => setSelectedEmoji(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 10 }]}>Nome do Objetivo</Text>
            <TextInput style={styles.input} placeholder="Ex: Viagem, Moto..." value={newName} onChangeText={setNewName} />

            <Text style={[styles.label, { marginTop: 15 }]}>Valor Objetivo (R$)</Text>
            <TextInput style={styles.input} placeholder="Ex: 5000,00 (Opcional)" keyboardType="numeric" value={newTarget} onChangeText={setNewTarget} />

            <View style={styles.editBtnRow}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setIsCreating(false)}><Text style={styles.editCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleCreateSaving}><Text style={styles.editSaveText}>Criar</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- SUB-MODAL: GUARDAR / RESGATAR --- */}
      <Modal visible={manageModalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editModalContainer}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>{manageAction === 'add' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}</Text>
              <TouchableOpacity onPress={() => setManageModalVisible(false)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>

            <Text style={{textAlign: 'center', marginBottom: 15, color: '#666'}}>
              Cofrinho: <Text style={{fontWeight: 'bold', color: '#333'}}>{selectedSaving?.name}</Text>
            </Text>

            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput style={styles.input} placeholder="Ex: 100,00" keyboardType="numeric" value={manageAmount} onChangeText={setManageAmount} autoFocus />

            <View style={styles.editBtnRow}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setManageModalVisible(false)}><Text style={styles.editCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.editSaveBtn, manageAction === 'remove' && {backgroundColor: '#E53935'}]} onPress={handleConfirmManage}>
                <Text style={styles.editSaveText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }, backdrop: { flex: 1 },
  modalContent: { backgroundColor: '#F8F9FA', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 25, paddingHorizontal: 20, paddingBottom: 20, height: '88%', elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { fontSize: 18, fontWeight: 'bold', color: '#1E3B4D' }, closeBtn: { padding: 5 }, closeBtnText: { fontSize: 20, color: '#333', fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 15, lineHeight: 18 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  
  newGoalBtn: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#7CB342', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  newGoalBtnText: { color: '#7CB342', fontWeight: 'bold', fontSize: 14 },

  goalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, marginBottom: 15, elevation: 1, borderWidth: 1, borderColor: '#E0E0E0' },
  goalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  goalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F1F8E9', justifyContent: 'center', alignItems: 'center' },
  savedEmoji: { fontSize: 22 },
  catName: { fontSize: 16, fontWeight: 'bold', color: '#333' }, savedText: { fontSize: 13, color: '#7CB342', fontWeight: 'bold', marginTop: 2 },
  iconBtn: { padding: 4 },

  progressContainer: { marginTop: 5, marginBottom: 15 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  progressValue: { fontSize: 12, color: '#888', fontWeight: '500' },
  progressBarBg: { height: 8, backgroundColor: '#EEEEEE', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#7CB342', borderRadius: 4 },

  actionRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12 },
  actionBtnOutline: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E53935', gap: 4 },
  actionBtnTextRed: { color: '#E53935', fontWeight: 'bold', fontSize: 13 },
  actionBtnSolid: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: '#7CB342', gap: 4 },
  actionBtnTextWhite: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  footerBtn: { backgroundColor: '#7CB342', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 }, footerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // Modais Secundários
  editModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
  editModalContent: { backgroundColor: '#FFF', width: '100%', borderRadius: 20, padding: 20, elevation: 5 },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  editModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  emojiButton: { width: 44, height: 44, backgroundColor: '#F5F5F5', borderRadius: 12, borderWidth: 2, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  emojiButtonSelected: { borderColor: '#7CB342', backgroundColor: '#F1F8E9' },
  emojiText: { fontSize: 20 },

  label: { fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  input: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD', padding: 15, borderRadius: 10, fontSize: 16, color: '#333' },
  editBtnRow: { flexDirection: 'row', gap: 10, marginTop: 25 },
  editCancelBtn: { flex: 1, backgroundColor: '#EEE', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }, editCancelText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  editSaveBtn: { flex: 1, backgroundColor: '#1E3B4D', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }, editSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});