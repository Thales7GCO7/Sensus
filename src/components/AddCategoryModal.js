import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import { auth, db } from '../firebase';

const EMOJIS = ['💳', '🏋️', '🎓', '🏥', '🐕', '🚗', '✈️', '🎬', '🎮', '📱', '👕', '🛒', '🍔', '🏠'];
const COLORS = ['#4299E1', '#48BB78', '#ED8936', '#F56565', '#9F7AEA', '#D53F8C', '#38B2AC', '#ECC94B'];

export default function AddCategoryModal({ visible, onClose, categories = [] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryOldName, setEditingCategoryOldName] = useState('');

  const handleClose = () => { setIsCreating(false); resetForm(); onClose(); };
  const resetForm = () => { setName(''); setSelectedEmoji(''); setSelectedColor(''); setEditingCategoryId(null); setEditingCategoryOldName(''); };

  const handleEdit = (cat) => {
    setName(cat.name); setSelectedEmoji(cat.icon); setSelectedColor(cat.color);
    setEditingCategoryId(cat.id); setEditingCategoryOldName(cat.name); setIsCreating(true);
  };

  const handleSubmit = async () => {
    if (!name || !selectedEmoji || !selectedColor) return Alert.alert('Atenção', 'Preencha todos os campos');
    const userEmail = auth.currentUser?.email || 'Desconhecido';

    if (editingCategoryId) {
      Alert.alert('Sucesso', 'Categoria atualizada!');
      setIsCreating(false); 
      try {
        await updateDoc(doc(db, 'categories', editingCategoryId), { name, icon: selectedEmoji, color: selectedColor });
        if (name !== editingCategoryOldName) {
          const q = query(collection(db, 'expenses'), where('category', '==', editingCategoryOldName));
          const querySnapshot = await getDocs(q);
          const updatePromises = [];
          querySnapshot.forEach((document) => updatePromises.push(updateDoc(doc(db, 'expenses', document.id), { category: name })));
          await Promise.all(updatePromises);
        }
        // NOTIFICA EDIÇÃO
        await addDoc(collection(db, 'notifications'), { type: 'category', title: 'Categoria Editada ✏️', message: `A categoria "${editingCategoryOldName}" agora se chama "${name}".`, userEmail, createdAt: new Date().toISOString(), read: false });
      } catch (error) { console.error(error); }
      resetForm();
    } else {
      Alert.alert('Sucesso', 'Categoria criada com sucesso!');
      setIsCreating(false); 
      resetForm();
      addDoc(collection(db, 'categories'), { name, icon: selectedEmoji, color: selectedColor, userEmail, createdAt: new Date().toISOString() })
      .then(() => {
        // NOTIFICA CRIAÇÃO
        addDoc(collection(db, 'notifications'), { type: 'category', title: 'Nova Categoria 🏷️', message: `A categoria "${name}" foi criada com sucesso.`, userEmail, createdAt: new Date().toISOString(), read: false });
      }).catch(e => console.error(e));
    }
  };

  const handleDelete = (id, categoryName) => {
    Alert.alert('Excluir Categoria', `Deseja excluir "${categoryName}"? As despesas mudarão para "Geral".`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: async () => {
            try {
              const q = query(collection(db, 'expenses'), where('category', '==', categoryName));
              const querySnapshot = await getDocs(q);
              const updatePromises = [];
              querySnapshot.forEach((document) => updatePromises.push(updateDoc(doc(db, 'expenses', document.id), { category: 'Geral' })));
              await Promise.all(updatePromises);
              await deleteDoc(doc(db, 'categories', id));
              // NOTIFICA EXCLUSÃO
              await addDoc(collection(db, 'notifications'), { type: 'alert', title: 'Categoria Excluída 🗑️', message: `A categoria "${categoryName}" foi apagada.`, userEmail: auth.currentUser?.email, createdAt: new Date().toISOString(), read: false });
            } catch (error) { console.error(error); }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {!isCreating && (
            <View style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Categorias</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.categoriesGrid}>
                  {categories.map((cat) => (
                    <View key={cat.id} style={[styles.categoryCard, { borderLeftColor: cat.color || Colors.primary }]}>
                      <Text style={styles.cardEmoji}>{cat.icon}</Text>
                      <Text style={styles.cardName} numberOfLines={1}>{cat.name}</Text>
                      <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(cat)}><Ionicons name="pencil" size={12} color="#9E9E9E" /><Text style={styles.editBtnText}>Editar</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(cat.id, cat.name)}><Ionicons name="trash" size={12} color="#E57373" /><Text style={styles.deleteBtnText}>Excluir</Text></TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {categories.length === 0 && <Text style={{ textAlign: 'center', color: '#999', width: '100%', marginTop: 20 }}>Nenhuma categoria cadastrada.</Text>}
                </View>
              </ScrollView>
              <View style={styles.footerButtons}>
                <TouchableOpacity style={styles.newCategoryBtn} onPress={() => setIsCreating(true)}><Text style={styles.newCategoryBtnText}>+ Nova Categoria</Text></TouchableOpacity>
                <TouchableOpacity style={styles.closeFooterBtn} onPress={handleClose}><Text style={styles.closeFooterBtnText}>Fechar</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {isCreating && (
            <View style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingCategoryId ? 'Editar Categoria' : 'Nova Categoria'}</Text>
                <TouchableOpacity onPress={() => { setIsCreating(false); resetForm(); }} style={styles.closeButton}><Ionicons name="arrow-back" size={24} color={Colors.textPrimary} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nome</Text>
                    <TextInput style={styles.input} placeholder="Ex: Cartão de Crédito..." placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Emoji</Text>
                    <View style={styles.emojiGrid}>
                      {EMOJIS.map((emoji, index) => (
                        <TouchableOpacity key={index} style={[styles.emojiButton, selectedEmoji === emoji && styles.emojiButtonSelected]} onPress={() => setSelectedEmoji(emoji)} activeOpacity={0.7}><Text style={styles.emoji}>{emoji}</Text></TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cor</Text>
                    <View style={styles.colorGrid}>
                      {COLORS.map((color, index) => (
                        <TouchableOpacity key={index} style={[styles.colorButton, { backgroundColor: color }, selectedColor === color && styles.colorButtonSelected]} onPress={() => setSelectedColor(color)} activeOpacity={0.8}>
                          {selectedColor === color && <Ionicons name="checkmark" size={24} color={Colors.textLight} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsCreating(false); resetForm(); }} activeOpacity={0.8}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}><Text style={styles.submitButtonText}>{editingCategoryId ? 'Salvar Edição' : 'Criar Categoria'}</Text></TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay }, modalContent: { backgroundColor: Colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary }, closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 20 }, categoryCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardEmoji: { fontSize: 28, marginBottom: 8 }, cardName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 }, cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, gap: 4 }, editBtnText: { fontSize: 10, color: '#9E9E9E', fontWeight: 'bold' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, gap: 4 }, deleteBtnText: { fontSize: 10, color: '#E57373', fontWeight: 'bold' },
  footerButtons: { marginTop: 10, gap: 10 }, newCategoryBtn: { backgroundColor: '#7CB342', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, newCategoryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }, closeFooterBtn: { backgroundColor: '#E8F5E9', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, closeFooterBtnText: { color: '#7CB342', fontSize: 16, fontWeight: 'bold' },
  form: { gap: 20 }, inputGroup: { marginBottom: 8 }, label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 }, input: { backgroundColor: Colors.background, borderWidth: 2, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, emojiButton: { width: 56, height: 56, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' }, emojiButtonSelected: { borderColor: Colors.secondary, backgroundColor: Colors.secondaryLight }, emoji: { fontSize: 28 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, colorButton: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'transparent' }, colorButtonSelected: { borderColor: Colors.primary, transform: [{ scale: 1.1 }] },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 }, cancelButton: { flex: 1, backgroundColor: Colors.neutral + '40', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.textSecondary }, submitButton: { flex: 1, backgroundColor: Colors.secondary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, submitButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.textLight },
});