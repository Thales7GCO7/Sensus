import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import { auth, db } from '../firebase';

export default function AddIncomeModal({ visible, onClose, currentUser }) {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(`${dd}/${mm}/${yyyy}`);

  const handleDateChange = (text) => {
    let v = text.replace(/\D/g, ''); 
    if (v.length > 8) v = v.substring(0, 8); 
    if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)/, "$1/$2");
    setDate(v);
  };

  const handleSubmit = () => {
    if (!value || !description) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }
    if (date.length !== 10) {
      Alert.alert('Atenção', 'Digite a data completa no formato DD/MM/AAAA');
      return;
    }

    let numericValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numericValue)) return Alert.alert('Erro', 'Valor inválido.');

    const [dia, mes, ano] = date.split('/');
    const dataBanco = `${ano}-${mes}-${dia}`;
    const userEmail = auth.currentUser?.email || currentUser || 'Desconhecido';

    // 1. MOSTRA O ALERTA E SÓ FECHA A TELA QUANDO CLICAR EM "OK"
    Alert.alert(
      'Sucesso', 
      'Receita adicionada com sucesso!',
      [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onClose();
          }
        }
      ]
    );

    // 2. SALVA NO BANCO EM SEGUNDO PLANO (Sem travar o celular)
    addDoc(collection(db, 'incomes'), {
      amount: numericValue,
      description: description,
      date: dataBanco,
      userEmail: userEmail,
      createdAt: new Date().toISOString()
    }).then(() => {
      // Cria a notificação para o Sino
      addDoc(collection(db, 'notifications'), {
        type: 'income',
        title: 'Nova Receita Adicionada 💰',
        message: `Você registrou uma receita de R$ ${numericValue.toFixed(2).replace('.', ',')} (${description}).`,
        userEmail: userEmail,
        createdAt: new Date().toISOString(),
        read: false 
      });
    }).catch(e => console.error(e));
  };

  const resetForm = () => { 
    setValue(''); 
    setDescription(''); 
    setDate(`${dd}/${mm}/${yyyy}`); 
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adicionar Receita</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Valor *</Text>
                <TextInput style={styles.input} placeholder="150,00" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={value} onChangeText={setValue} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Descrição *</Text>
                <TextInput style={styles.input} placeholder="Ex: Salário, Freelance, etc" placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Data</Text>
                <TextInput style={styles.input} value={date} onChangeText={handleDateChange} keyboardType="numeric" maxLength={10} placeholder="DD/MM/AAAA" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
                  <Text style={styles.submitButtonText}>Adicionar</Text>
                </TouchableOpacity>
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral + '40', justifyContent: 'center', alignItems: 'center' },
  form: { gap: 16 }, inputGroup: { marginBottom: 8 }, label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderWidth: 2, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, backgroundColor: Colors.neutral + '40', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.textSecondary },
  submitButton: { flex: 1, backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.textLight }
});