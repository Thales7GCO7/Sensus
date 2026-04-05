import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import { auth, db } from '../firebase';

export default function AddExpenseModal({ visible, onClose, categories = [], currentUser }) {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Geral'); 
  const [expenseType, setExpenseType] = useState('geral');
  const [date, setDate] = useState(`${dd}/${mm}/${yyyy}`);
  const [observation, setObservation] = useState('');

  const allCategories = [{ name: 'Geral', icon: '📋', color: '#78909C' }, ...categories];

  const handleDateChange = (text) => {
    let v = text.replace(/\D/g, ''); 
    if (v.length > 8) v = v.substring(0, 8); 
    if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)/, "$1/$2");
    setDate(v);
  };

  // --- FUNÇÃO DE SALVAR AGORA É ASYNC (INTELIGENTE) ---
  const handleSubmit = async () => {
    if (!name || !value) return Alert.alert('Atenção', 'Preencha o Nome e o Valor.');
    if (date.length !== 10) return Alert.alert('Atenção', 'Digite a data completa.');

    let numericValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) return Alert.alert('Erro', 'Valor numérico inválido.');

    const [dia, mes, ano] = date.split('/');
    const dataBanco = `${ano}-${mes}-${dia}`;
    const mesAtual = `${ano}-${mes}`; // Usado para calcular os gastos do mês
    const emailUsuario = currentUser || auth.currentUser?.email || 'Desconhecido';
    
    // O fechamento instantâneo para não travar a tela
    onClose();
    resetForm();

    setTimeout(() => {
      Alert.alert('Sucesso', 'Despesa adicionada com sucesso!');
    }, 300);

    try {
      // 1. Salva a despesa no banco de dados
      await addDoc(collection(db, 'expenses'), {
        name: name, 
        amount: numericValue, 
        category: selectedCategory, 
        type: expenseType, 
        date: dataBanco, 
        observation: observation, 
        userEmail: emailUsuario, 
        createdAt: new Date().toISOString()
      });

      // 2. Cria a notificação PADRÃO de despesa registrada
      await addDoc(collection(db, 'notifications'), {
        type: 'expense',
        title: 'Nova Despesa Registrada 📉',
        message: `Você gastou R$ ${numericValue.toFixed(2).replace('.', ',')} com ${name} na categoria ${selectedCategory}.`,
        userEmail: emailUsuario,
        createdAt: new Date().toISOString(),
        read: false
      });

      // ==========================================================
      // 3. INTELIGÊNCIA PROATIVA: VERIFICAÇÃO DE METAS (80% e 100%)
      // ==========================================================
      const goalRef = doc(db, 'goals', `${emailUsuario}_${selectedCategory}`);
      const goalSnap = await getDoc(goalRef);

      // Só faz o cálculo se existir uma meta criada para essa categoria
      if (goalSnap.exists()) {
        const goalAmount = goalSnap.data().amount;

        // Busca todas as despesas dessa categoria para somar o gasto do mês
        const q = query(
          collection(db, 'expenses'),
          where('userEmail', '==', emailUsuario),
          where('category', '==', selectedCategory)
        );
        const expSnap = await getDocs(q);

        let totalGastoNoMes = 0;
        expSnap.forEach(documento => {
          const d = documento.data();
          const dataDespesa = d.date || d.createdAt.split('T')[0];
          // Se a despesa for do mês atual, soma
          if (dataDespesa.startsWith(mesAtual)) {
            totalGastoNoMes += Number(d.amount);
          }
        });

        // Calcula a porcentagem ANTES e DEPOIS dessa nova compra
        const totalAntesDaCompra = totalGastoNoMes - numericValue;
        const porcentagemAntes = (totalAntesDaCompra / goalAmount) * 100;
        const porcentagemDepois = (totalGastoNoMes / goalAmount) * 100;

        // REGRA 1: Se passou de 100% agora (e antes não tinha passado)
        if (porcentagemDepois > 100 && porcentagemAntes <= 100) {
          await addDoc(collection(db, 'notifications'), {
            type: 'alert',
            title: 'Meta Ultrapassada! 🚨',
            message: `Atenção! Sua compra de ${name} fez você ultrapassar a meta de R$ ${goalAmount.toFixed(2).replace('.', ',')} da categoria ${selectedCategory}.`,
            userEmail: emailUsuario,
            createdAt: new Date().toISOString(),
            read: false
          });
        } 
        // REGRA 2: Se passou de 80% agora (e antes não tinha passado)
        else if (porcentagemDepois >= 80 && porcentagemAntes < 80) {
          const valorRestante = goalAmount - totalGastoNoMes;
          await addDoc(collection(db, 'notifications'), {
            type: 'warning',
            title: 'Atenção ao Limite! ⚠️',
            message: `Você atingiu ${porcentagemDepois.toFixed(0)}% da sua meta de ${selectedCategory}. Restam apenas R$ ${valorRestante.toFixed(2).replace('.', ',')}!`,
            userEmail: emailUsuario,
            createdAt: new Date().toISOString(),
            read: false
          });
        }
      }

    } catch (error) {
      console.error("Erro ao salvar despesa e verificar metas:", error);
    }
  };

  const resetForm = () => { 
    setName(''); 
    setValue(''); 
    setSelectedCategory('Geral'); 
    setExpenseType('geral'); 
    setDate(`${dd}/${mm}/${yyyy}`); 
    setObservation(''); 
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adicionar Despesa</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={28} color={Colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome da Despesa *</Text>
                <TextInput style={styles.input} placeholder="Ex: Supermercado" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Valor *</Text>
                <TextInput style={styles.input} placeholder="150,00" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={value} onChangeText={setValue} />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Categoria</Text>
                <View style={styles.categoriesGrid}>
                  {allCategories.map(cat => {
                    const isSelected = selectedCategory === cat.name;
                    return (
                      <TouchableOpacity 
                        key={cat.id || cat.name} 
                        style={[
                          styles.categoryChip, 
                          { borderColor: cat.color || Colors.border }, 
                          isSelected && { backgroundColor: Colors.secondary, borderColor: Colors.secondary }
                        ]} 
                        onPress={() => setSelectedCategory(cat.name)} 
                        activeOpacity={0.7}
                      >
                        <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                        <Text style={[styles.categoryName, isSelected && { color: Colors.textLight }]}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Data</Text>
                <TextInput style={styles.input} value={date} onChangeText={handleDateChange} keyboardType="numeric" maxLength={10} placeholder="DD/MM/AAAA" placeholderTextColor={Colors.textMuted} />
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}><Text style={styles.submitButtonText}>Adicionar</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' }, backdrop: { flex: 1, backgroundColor: Colors.overlay },
  modalContent: { backgroundColor: Colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral + '40', justifyContent: 'center', alignItems: 'center' }, form: { gap: 16 },
  inputGroup: { marginBottom: 8 }, label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderWidth: 2, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, 
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 2, gap: 6 },
  categoryEmoji: { fontSize: 18 }, categoryName: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary }, 
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, backgroundColor: Colors.neutral + '40', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.textSecondary },
  submitButton: { flex: 1, backgroundColor: Colors.warning, paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, submitButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.textLight }
});