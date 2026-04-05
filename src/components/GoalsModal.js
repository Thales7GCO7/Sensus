import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';

export default function GoalsModal({ visible, onClose, currentUser, categories = [], expenses = [] }) {
  const [goals, setGoals] = useState([]);
  
  // Estados para o Formulário de Edição de Meta
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const formatarMoeda = (valor) => Number(valor).toFixed(2).replace('.', ',');

  // 1. Busca as Metas no banco de dados
  useEffect(() => {
    if (!currentUser || !visible) return;
    const q = query(collection(db, 'goals'), where('userEmail', '==', currentUser));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setGoals(list);
    });
    return () => unsubscribe();
  }, [currentUser, visible]);

  // 2. Calcula os gastos apenas do mês atual
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const expensesThisMonth = expenses.filter(e => {
    const d = e.date || e.createdAt.split('T')[0];
    return d.startsWith(currentMonthStr);
  });

  const spentByCategory = {};
  expensesThisMonth.forEach(exp => {
    const cat = exp.category || 'Geral';
    if (!spentByCategory[cat]) spentByCategory[cat] = 0;
    spentByCategory[cat] += Number(exp.amount);
  });

  // 3. Monta a lista de categorias (Incluindo a Geral como padrão)
  const allCategories = [{ name: 'Geral', icon: '📋', color: '#78909C' }, ...categories];

  // Ações
  const handleOpenEdit = (categoryName, currentGoal) => {
    setSelectedCategory(categoryName);
    setGoalAmount(currentGoal ? currentGoal.toString() : '');
    setIsEditing(true);
    setShowCategoryDropdown(false);
  };

  // --- FUNÇÃO PARA DELETAR META DIRETO DA LISTA ---
  const handleDeleteGoal = (categoryToDelete) => {
    Alert.alert('Excluir Meta', `Deseja realmente excluir a meta de ${categoryToDelete}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive',
        onPress: () => {
          // Deleta em segundo plano
          deleteDoc(doc(db, 'goals', `${currentUser}_${categoryToDelete}`))
            .catch(error => Alert.alert('Erro', 'Não foi possível excluir a meta.'));
        }
      }
    ]);
  };

  // --- FUNÇÃO PARA SALVAR META (FECHAMENTO INSTANTÂNEO) ---
  const handleSaveGoal = () => {
    if (!selectedCategory) return Alert.alert('Atenção', 'Selecione uma categoria.');
    
    let numericValue = parseFloat(String(goalAmount).replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) return Alert.alert('Atenção', 'Digite um valor válido para a meta.');

    // 1. FECHA A TELA IMEDIATAMENTE (Otimização de velocidade)
    setIsEditing(false);
    
    // 2. SALVA NO BANCO EM SEGUNDO PLANO
    setDoc(doc(db, 'goals', `${currentUser}_${selectedCategory}`), {
      userEmail: currentUser,
      category: selectedCategory,
      amount: numericValue,
      updatedAt: new Date().toISOString()
    }).catch(error => {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar a meta.');
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.modalContent}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="disc-outline" size={24} color="#1E3B4D" />
              <Text style={styles.title}>Metas Mensais</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={styles.closeBtnText}>X</Text></TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Defina limites de gastos mensais para cada categoria e acompanhe seu progresso.</Text>

          {/* Botão de Nova Meta Geral */}
          <TouchableOpacity style={styles.newGoalBtn} onPress={() => handleOpenEdit('Geral', '')}>
            <Text style={styles.newGoalBtnText}>+ Criar Nova Meta</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
            {allCategories.map((cat, index) => {
              const spent = spentByCategory[cat.name] || 0;
              const goalObj = goals.find(g => g.category === cat.name);
              const hasGoal = !!goalObj;
              const goalValue = hasGoal ? goalObj.amount : 0;
              
              let progressPercentage = 0;
              let isOverBudget = false;
              
              if (hasGoal && goalValue > 0) {
                progressPercentage = Math.min((spent / goalValue) * 100, 100);
                isOverBudget = spent > goalValue;
              }

              // Só mostra na lista se tiver meta definida OU se tiver gasto neste mês
              if (!hasGoal && spent === 0 && cat.name !== 'Geral') return null;

              return (
                <View key={index} style={styles.goalCard}>
                  <View style={styles.goalCardHeader}>
                    <View style={styles.goalInfoRow}>
                      <Text style={styles.catIcon}>{cat.icon}</Text>
                      <View>
                        <Text style={styles.catName}>{cat.name}</Text>
                        <Text style={styles.spentText}>Gasto esse mês: R$ {formatarMoeda(spent)}</Text>
                      </View>
                    </View>
                    
                    {/* AÇÕES: Lápis e Lixeira lado a lado */}
                    <View style={styles.actionIconsRow}>
                      <TouchableOpacity onPress={() => handleOpenEdit(cat.name, goalValue)} style={styles.iconBtn}>
                        <Ionicons name="pencil" size={20} color="#1E3B4D" />
                      </TouchableOpacity>
                      
                      {hasGoal && (
                        <TouchableOpacity onPress={() => handleDeleteGoal(cat.name)} style={styles.iconBtn}>
                          <Ionicons name="trash-outline" size={20} color="#E53935" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {hasGoal ? (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressTextRow}>
                        <Text style={[styles.progressLabel, isOverBudget && { color: '#E53935' }]}>
                          {isOverBudget ? 'Meta ultrapassada!' : `${progressPercentage.toFixed(0)}% da meta`}
                        </Text>
                        <Text style={styles.progressValue}>Meta: R$ {formatarMoeda(goalValue)}</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progressPercentage}%`, backgroundColor: isOverBudget ? '#E53935' : cat.color || '#7CB342' }]} />
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.dashedBox} onPress={() => handleOpenEdit(cat.name, '')}>
                      <Text style={styles.dashedText}>Nenhuma meta definida</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
            <Text style={styles.footerBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- SUB-MODAL DE EDIÇÃO DE META --- */}
      <Modal visible={isEditing} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editModalContainer}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Configurar Meta</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>

            <Text style={styles.label}>Categoria</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}>
              <Text style={styles.dropdownText}>{selectedCategory || 'Selecione...'}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {showCategoryDropdown && (
              <View style={styles.dropdownMenu}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                  {allCategories.map(c => (
                    <TouchableOpacity key={c.name} style={styles.dropdownItem} onPress={() => { setSelectedCategory(c.name); setShowCategoryDropdown(false); }}>
                      <Text style={styles.dropdownItemText}>{c.icon} {c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.label, { marginTop: 15 }]}>Valor Máximo (R$)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 500,00"
              keyboardType="numeric"
              value={goalAmount}
              onChangeText={setGoalAmount}
            />

            <View style={styles.editBtnRow}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setIsEditing(false)}>
                <Text style={styles.editCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveGoal}>
                <Text style={styles.editSaveText}>Salvar</Text>
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
  
  newGoalBtn: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#7CB342', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  newGoalBtnText: { color: '#7CB342', fontWeight: 'bold', fontSize: 14 },

  goalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, marginBottom: 15, elevation: 1, borderWidth: 1, borderColor: '#F0F0F0' },
  goalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  goalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { fontSize: 28 }, catName: { fontSize: 16, fontWeight: 'bold', color: '#333' }, spentText: { fontSize: 12, color: '#888', marginTop: 2 },
  
  actionIconsRow: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 4 },

  dashedBox: { borderWidth: 1.5, borderColor: '#B0BEC5', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 15, alignItems: 'center', backgroundColor: '#FAFAFA' },
  dashedText: { color: '#90A4AE', fontWeight: '500', fontSize: 13 },

  progressContainer: { marginTop: 5 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  progressValue: { fontSize: 12, color: '#888', fontWeight: '500' },
  progressBarBg: { height: 8, backgroundColor: '#EEEEEE', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  footerBtn: { backgroundColor: '#7CB342', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 }, footerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // Estilos do Modal de Edição
  editModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
  editModalContent: { backgroundColor: '#FFF', width: '100%', borderRadius: 20, padding: 20, elevation: 5 },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  editModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD', padding: 15, borderRadius: 10 },
  dropdownText: { fontSize: 15, color: '#333' },
  dropdownMenu: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 10, marginTop: 5, elevation: 3, maxHeight: 150 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemText: { fontSize: 15, color: '#333' },
  input: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD', padding: 15, borderRadius: 10, fontSize: 16, color: '#333' },
  
  editBtnRow: { flexDirection: 'row', gap: 10, marginTop: 25 },
  editCancelBtn: { flex: 1, backgroundColor: '#EEEEEE', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }, 
  editCancelText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  
  editSaveBtn: { flex: 1, backgroundColor: '#1E3B4D', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }, 
  editSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});