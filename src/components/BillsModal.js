import { Ionicons } from '@expo/vector-icons';
import { addDoc, arrayUnion, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';

export default function BillsModal({ visible, onClose, currentUser }) {
  const [tab, setTab] = useState('lista'); // 'lista' ou 'nova'
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados do Formulário
  const [billType, setBillType] = useState('fixed'); // 'fixed' ou 'variable'
  const [billName, setBillName] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Estado para Detalhes da Conta
  const [selectedBill, setSelectedBill] = useState(null);

  // Busca as contas no Firebase
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'bills'), where('userEmail', '==', currentUser));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      // Ordena: primeiro as pendentes, depois as pagas
      list.sort((a, b) => {
        const aPaga = isPaid(a);
        const bPaga = isPaid(b);
        if (aPaga === bPaga) return 0;
        return aPaga ? 1 : -1;
      });
      setBills(list);
      setLoading(false);
      
      // Atualiza a conta selecionada se ela mudar no banco
      if (selectedBill) {
        const updated = list.find(b => b.id === selectedBill.id);
        if (updated) setSelectedBill(updated);
      }
    });
    return () => unsubscribe();
  }, [currentUser, selectedBill]);

  // --- LÓGICA DE DATAS ---
  const getCurrentMonthYear = () => {
    const data = new Date();
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`; // Ex: "2026-03"
  };

  const isPaid = (bill) => {
    if (bill.type === 'variable') return bill.status === 'paid';
    if (bill.type === 'fixed') {
      const currentMonth = getCurrentMonthYear();
      return bill.paymentHistory && bill.paymentHistory.includes(currentMonth);
    }
    return false;
  };

  // --- AÇÕES DO BANCO DE DADOS ---
  const handleSaveBill = async () => {
    if (!billName) return Alert.alert('Erro', 'Digite o nome da conta.');
    if (billType === 'fixed' && (!dueDay || isNaN(dueDay) || dueDay < 1 || dueDay > 31)) {
      return Alert.alert('Erro', 'Digite um dia de vencimento válido (1 a 31).');
    }
    if (billType === 'variable' && dueDate.length < 10) {
      return Alert.alert('Erro', 'Digite a data no formato DD/MM/AAAA.');
    }

    try {
      await addDoc(collection(db, 'bills'), {
        userEmail: currentUser,
        name: billName,
        type: billType,
        dueDay: billType === 'fixed' ? Number(dueDay) : null,
        dueDate: billType === 'variable' ? dueDate : null,
        status: 'pending',
        paymentHistory: [], 
        lastAlert2Days: null, 
        lastAlertToday: null,
        lastAlertOverdue: null,
        createdAt: new Date().toISOString()
      });
      
      // Envia notificação da criação da conta
      await addDoc(collection(db, 'notifications'), {
        userEmail: currentUser,
        title: 'Nova Conta Adicionada 📝',
        message: `Sua conta "${billName}" foi registrada com sucesso.`,
        date: new Date().toISOString(),
        read: false,
        type: 'bill_created'
      });

      Alert.alert('Sucesso', 'Conta cadastrada com sucesso!');
      setBillName(''); setDueDay(''); setDueDate('');
      setTab('lista');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a conta.');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert('Excluir Conta', 'Tem certeza que deseja apagar esta conta para sempre?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, 'bills', id));
          setSelectedBill(null);
        }
      }
    ]);
  };

  const handleMarkAsPaid = async (bill) => {
    const billRef = doc(db, 'bills', bill.id);
    const currentMonth = getCurrentMonthYear();

    try {
      if (bill.type === 'variable') {
        await updateDoc(billRef, { status: 'paid' });
        Alert.alert('Sucesso', 'Conta variável marcada como paga!');
      } else {
        if (isPaid(bill)) {
          return Alert.alert('Aviso', 'Esta conta já foi marcada como paga neste mês.');
        }
        await updateDoc(billRef, { paymentHistory: arrayUnion(currentMonth) });
        Alert.alert('Sucesso', 'Conta fixa paga este mês! Um registro foi salvo no histórico.');
      }

      // Envia notificação de pagamento realizado
      await addDoc(collection(db, 'notifications'), {
        userEmail: currentUser,
        title: 'Conta Paga! ✅',
        message: `Parabéns! Você registrou o pagamento de "${bill.name}".`,
        date: new Date().toISOString(),
        read: false,
        type: 'bill_paid'
      });

    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar a conta.');
    }
  };

  // --- RENDERIZAÇÃO ---
  const renderDetailsModal = () => {
    if (!selectedBill) return null;
    const paga = isPaid(selectedBill);

    return (
      <Modal visible={!!selectedBill} transparent animationType="slide">
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsContent}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>{selectedBill.name}</Text>
              <TouchableOpacity onPress={() => setSelectedBill(null)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
            </View>
            
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: selectedBill.type === 'fixed' ? '#2196F3' : '#9C27B0' }]}>
                <Text style={styles.badgeText}>{selectedBill.type === 'fixed' ? 'Fixa Mensal' : 'Variável (Única)'}</Text>
              </View>
              {paga && (
                <View style={[styles.badge, { backgroundColor: '#7CB342' }]}>
                  <Text style={styles.badgeText}>Paga</Text>
                </View>
              )}
            </View>

            <Text style={styles.detailsInfo}>
              Vencimento: {selectedBill.type === 'fixed' ? `Todo dia ${selectedBill.dueDay}` : selectedBill.dueDate}
            </Text>

            {/* Histórico para contas fixas */}
            {selectedBill.type === 'fixed' && (
              <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>Histórico de Pagamentos:</Text>
                {selectedBill.paymentHistory?.length > 0 ? (
                  selectedBill.paymentHistory.map((mes, idx) => (
                    <Text key={idx} style={styles.historyItem}>• Competência: {mes}</Text>
                  ))
                ) : (
                  <Text style={styles.historyEmpty}>Nenhum pagamento registrado ainda.</Text>
                )}
              </View>
            )}

            <View style={styles.detailsActions}>
              {!paga ? (
                <TouchableOpacity style={styles.btnPay} onPress={() => handleMarkAsPaid(selectedBill)}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.btnText}>Marcar como Paga {selectedBill.type === 'fixed' && 'este mês'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.btnPaidDisabled}>
                  <Ionicons name="checkmark-circle" size={20} color="#7CB342" />
                  <Text style={styles.btnPaidText}>Já Paga {selectedBill.type === 'fixed' && 'neste mês'}</Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(selectedBill.id)}>
                <Ionicons name="trash-outline" size={20} color="#E53935" />
                <Text style={styles.btnDeleteText}>Excluir Conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Contas e Faturas</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color="#1E3B4D" /></TouchableOpacity>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, tab === 'lista' && styles.tabActive]} onPress={() => setTab('lista')}>
            <Text style={[styles.tabText, tab === 'lista' && styles.tabTextActive]}>Minhas Contas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'nova' && styles.tabActive]} onPress={() => setTab('nova')}>
            <Text style={[styles.tabText, tab === 'nova' && styles.tabTextActive]}>Adicionar Nova</Text>
          </TouchableOpacity>
        </View>

        {tab === 'lista' ? (
          // ABA DE LISTAGEM
          loading ? <ActivityIndicator size="large" color="#7CB342" style={{marginTop: 50}} /> :
          <ScrollView contentContainerStyle={styles.scroll}>
            {bills.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma conta cadastrada.</Text>
            ) : (
              bills.map(bill => {
                const paga = isPaid(bill);
                return (
                  <TouchableOpacity key={bill.id} style={[styles.billCard, paga && styles.billCardPaid]} onPress={() => setSelectedBill(bill)}>
                    <View style={styles.billIcon}>
                      <Ionicons name={bill.type === 'fixed' ? "calendar" : "receipt"} size={24} color={paga ? "#9E9E9E" : "#7CB342"} />
                    </View>
                    <View style={styles.billInfo}>
                      <Text style={[styles.billName, paga && styles.textPaid]}>{bill.name}</Text>
                      <Text style={styles.billDue}>
                        {bill.type === 'fixed' ? `Dia ${bill.dueDay}` : bill.dueDate}
                      </Text>
                    </View>
                    {paga && <Ionicons name="checkmark-circle" size={24} color="#7CB342" />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        ) : (
          // ABA DE NOVA CONTA
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.label}>Tipo de Conta</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity style={[styles.typeBtn, billType === 'fixed' && styles.typeBtnActive]} onPress={() => setBillType('fixed')}>
                <Text style={[styles.typeBtnText, billType === 'fixed' && styles.typeBtnTextActive]}>Fixa Mensal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, billType === 'variable' && styles.typeBtnActive]} onPress={() => setBillType('variable')}>
                <Text style={[styles.typeBtnText, billType === 'variable' && styles.typeBtnTextActive]}>Variável (Única)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.descText}>
              {billType === 'fixed' ? "Ex: Conta de Luz. O aviso renova todo mês." : "Ex: Multa de trânsito. Você paga apenas uma vez."}
            </Text>

            <Text style={styles.label}>Nome da Conta</Text>
            <TextInput style={styles.input} placeholder="Ex: Conta de Luz" value={billName} onChangeText={setBillName} />

            {billType === 'fixed' ? (
              <>
                <Text style={styles.label}>Dia do Vencimento</Text>
                <TextInput style={styles.input} placeholder="Ex: 20" keyboardType="numeric" maxLength={2} value={dueDay} onChangeText={setDueDay} />
              </>
            ) : (
              <>
                <Text style={styles.label}>Data do Vencimento</Text>
                <TextInput style={styles.input} placeholder="DD/MM/AAAA" keyboardType="numeric" maxLength={10} value={dueDate} onChangeText={(text) => {
                  let val = text.replace(/\D/g, '');
                  if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2);
                  if (val.length > 5) val = val.substring(0, 5) + '/' + val.substring(5, 9);
                  setDueDate(val);
                }} />
              </>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBill}>
              <Text style={styles.saveBtnText}>Salvar Conta</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
      
      {/* Modal de Detalhes da Conta */}
      {renderDetailsModal()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E3B4D' },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderColor: '#E0E0E0' },
  tabActive: { borderColor: '#7CB342' },
  tabText: { color: '#757575', fontWeight: 'bold', fontSize: 15 },
  tabTextActive: { color: '#7CB342' },
  scroll: { padding: 20, paddingBottom: 50 },
  emptyText: { textAlign: 'center', color: '#9E9E9E', marginTop: 40, fontSize: 16 },
  
  // Lista
  billCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 2 },
  billCardPaid: { opacity: 0.7, backgroundColor: '#F9F9F9' },
  billIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(124, 179, 66, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  billInfo: { flex: 1 },
  billName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  billDue: { fontSize: 13, color: '#757575', marginTop: 2 },
  textPaid: { textDecorationLine: 'line-through', color: '#9E9E9E' },

  // Formulário
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  descText: { fontSize: 12, color: '#757575', marginBottom: 15, fontStyle: 'italic' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 10 },
  typeSelector: { flexDirection: 'row', gap: 10, marginTop: 5 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', alignItems: 'center', backgroundColor: '#FFF' },
  typeBtnActive: { borderColor: '#7CB342', backgroundColor: 'rgba(124, 179, 66, 0.1)' },
  typeBtnText: { color: '#757575', fontWeight: 'bold' },
  typeBtnTextActive: { color: '#7CB342' },
  saveBtn: { backgroundColor: '#7CB342', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Modal de Detalhes
  detailsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailsContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  detailsTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  detailsInfo: { fontSize: 16, color: '#555', marginBottom: 20 },
  
  historyContainer: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12, marginBottom: 20 },
  historyTitle: { fontWeight: 'bold', color: '#333', marginBottom: 8 },
  historyItem: { color: '#555', fontSize: 14, marginBottom: 4 },
  historyEmpty: { color: '#9E9E9E', fontStyle: 'italic' },

  detailsActions: { gap: 12 },
  btnPay: { backgroundColor: '#7CB342', flexDirection: 'row', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  btnPaidDisabled: { flexDirection: 'row', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: 'rgba(124, 179, 66, 0.1)', borderWidth: 1, borderColor: '#7CB342' },
  btnPaidText: { color: '#7CB342', fontWeight: 'bold', fontSize: 15 },
  btnDelete: { flexDirection: 'row', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E53935' },
  btnDeleteText: { color: '#E53935', fontWeight: 'bold', fontSize: 15 }
});