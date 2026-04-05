import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Colors from '../constants/Colors';
import { db } from '../firebase';

export default function RemoveExpenseModal({ visible, onClose, currentUser }) {
  // Configura datas padrão (Hoje e 30 dias atrás)
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const formatarParaInput = (data) => {
    const dd = String(data.getDate()).padStart(2, '0');
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const yyyy = data.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const [startDate, setStartDate] = useState(formatarParaInput(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatarParaInput(today));
  
  const [allExpenses, setAllExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);

  // Busca TODAS as despesas do usuário
  useEffect(() => {
    if (!currentUser || !visible) return;

    const q = query(collection(db, 'expenses'), where('userEmail', '==', currentUser));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      // Ordena da mais recente para a mais antiga
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllExpenses(list);
    });

    return () => unsubscribe();
  }, [currentUser, visible]);

  // Aplica o filtro de datas
  useEffect(() => {
    if (startDate.length === 10 && endDate.length === 10) {
      const [diaI, mesI, anoI] = startDate.split('/');
      const startBanco = `${anoI}-${mesI}-${diaI}`;

      const [diaF, mesF, anoF] = endDate.split('/');
      const endBanco = `${anoF}-${mesF}-${diaF}`;

      const filtered = allExpenses.filter(expense => {
        return expense.date >= startBanco && expense.date <= endBanco;
      });
      setFilteredExpenses(filtered);
    } else {
      setFilteredExpenses(allExpenses); // Se a data estiver incompleta, mostra tudo
    }
  }, [allExpenses, startDate, endDate]);

  // Função para colocar as barras "/" na data automaticamente
  const handleDateChange = (text, setDateState) => {
    let v = text.replace(/\D/g, ''); 
    if (v.length > 8) v = v.substring(0, 8); 
    if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)/, "$1/$2");
    setDateState(v);
  };

  const handleDelete = (id, name, amount) => {
    Alert.alert(
      'Excluir Despesa',
      `Tem certeza que deseja excluir "${name}" no valor de R$ ${Number(amount).toFixed(2).replace('.', ',')}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => {
            deleteDoc(doc(db, 'expenses', id))
              .then(() => Alert.alert('Sucesso', 'Despesa excluída com sucesso!'))
              .catch(error => console.error("Erro ao excluir:", error));
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Remover Despesas</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Filtre pelo período desejado:</Text>
          
          <View style={styles.filterRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data Inicial</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={(t) => handleDateChange(t, setStartDate)}
                keyboardType="numeric"
                maxLength={10}
                placeholder="DD/MM/AAAA"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data Final</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={(t) => handleDateChange(t, setEndDate)}
                keyboardType="numeric"
                maxLength={10}
                placeholder="DD/MM/AAAA"
              />
            </View>
          </View>

          <View style={styles.listContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredExpenses.map((expense) => (
                <View key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseName}>{expense.name || 'Despesa'}</Text>
                    <Text style={styles.expenseDetails}>
                      {expense.date?.split('-').reverse().join('/')} • {expense.category || 'Geral'}
                    </Text>
                  </View>
                  <View style={styles.expenseAction}>
                    <Text style={styles.expenseAmount}>- R$ {Number(expense.amount).toFixed(2).replace('.', ',')}</Text>
                    <TouchableOpacity 
                      style={styles.deleteButton} 
                      onPress={() => handleDelete(expense.id, expense.name, expense.amount)}
                    >
                      <Ionicons name="trash" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {filteredExpenses.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search" size={40} color="#CCC" />
                  <Text style={styles.emptyText}>Nenhuma despesa encontrada neste período.</Text>
                </View>
              )}
            </ScrollView>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  modalContent: { backgroundColor: '#F8F9FA', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#E53935' }, 
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral + '40', justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  inputGroup: { flex: 1 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333' },
  
  listContainer: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 15, padding: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  expenseCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  expenseDetails: { fontSize: 12, color: '#888' },
  expenseAction: { alignItems: 'flex-end', gap: 8 },
  expenseAmount: { fontSize: 15, fontWeight: 'bold', color: '#EF5350' }, // Valor em vermelho para despesas
  deleteButton: { backgroundColor: '#E53935', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#999', marginTop: 10, textAlign: 'center' }
});