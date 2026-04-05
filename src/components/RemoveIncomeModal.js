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

export default function RemoveIncomeModal({ visible, onClose, currentUser }) {
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
  
  const [allIncomes, setAllIncomes] = useState([]);
  const [filteredIncomes, setFilteredIncomes] = useState([]);

  // Busca TODAS as receitas do usuário
  useEffect(() => {
    if (!currentUser || !visible) return;

    const q = query(collection(db, 'incomes'), where('userEmail', '==', currentUser));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      // Ordena da mais recente para a mais antiga
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllIncomes(list);
    });

    return () => unsubscribe();
  }, [currentUser, visible]);

  // Aplica o filtro de datas sempre que as receitas ou as datas digitadas mudam
  useEffect(() => {
    if (startDate.length === 10 && endDate.length === 10) {
      const [diaI, mesI, anoI] = startDate.split('/');
      const startBanco = `${anoI}-${mesI}-${diaI}`;

      const [diaF, mesF, anoF] = endDate.split('/');
      const endBanco = `${anoF}-${mesF}-${diaF}`;

      const filtered = allIncomes.filter(income => {
        return income.date >= startBanco && income.date <= endBanco;
      });
      setFilteredIncomes(filtered);
    } else {
      setFilteredIncomes(allIncomes); // Se a data estiver incompleta, mostra tudo
    }
  }, [allIncomes, startDate, endDate]);

  // Função para colocar as barras "/" na data automaticamente
  const handleDateChange = (text, setDateState) => {
    let v = text.replace(/\D/g, ''); 
    if (v.length > 8) v = v.substring(0, 8); 
    if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)/, "$1/$2");
    setDateState(v);
  };

  const handleDelete = (id, description, amount) => {
    Alert.alert(
      'Excluir Receita',
      `Tem certeza que deseja excluir "${description}" no valor de R$ ${Number(amount).toFixed(2).replace('.', ',')}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => {
            deleteDoc(doc(db, 'incomes', id))
              .then(() => Alert.alert('Sucesso', 'Receita excluída com sucesso!'))
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
            <Text style={styles.modalTitle}>Remover Receitas</Text>
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
              {filteredIncomes.map((income) => (
                <View key={income.id} style={styles.incomeCard}>
                  <View style={styles.incomeInfo}>
                    <Text style={styles.incomeDesc}>{income.description || 'Receita'}</Text>
                    <Text style={styles.incomeDate}>{income.date?.split('-').reverse().join('/')}</Text>
                  </View>
                  <View style={styles.incomeAction}>
                    <Text style={styles.incomeAmount}>R$ {Number(income.amount).toFixed(2).replace('.', ',')}</Text>
                    <TouchableOpacity 
                      style={styles.deleteButton} 
                      onPress={() => handleDelete(income.id, income.description, income.amount)}
                    >
                      <Ionicons name="trash" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {filteredIncomes.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search" size={40} color="#CCC" />
                  <Text style={styles.emptyText}>Nenhuma receita encontrada neste período.</Text>
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
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#E53935' }, // Título vermelho para atenção
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral + '40', justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  inputGroup: { flex: 1 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333' },
  
  listContainer: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 15, padding: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  incomeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  incomeInfo: { flex: 1 },
  incomeDesc: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  incomeDate: { fontSize: 12, color: '#888' },
  incomeAction: { alignItems: 'flex-end', gap: 8 },
  incomeAmount: { fontSize: 15, fontWeight: 'bold', color: '#7CB342' },
  deleteButton: { backgroundColor: '#E53935', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#999', marginTop: 10, textAlign: 'center' }
});