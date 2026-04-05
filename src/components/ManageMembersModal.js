import { Ionicons } from '@expo/vector-icons';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
// IMPORTAMOS O updateDoc AQUI PARA PODER RESETAR A SENHA
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebase';

export default function ManageMembersModal({ visible, onClose, currentUser }) {
  const [members, setMembers] = useState([]);
  const [guestEmail, setGuestEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');
  const [memberToDelete, setMemberToDelete] = useState(null);

  useEffect(() => {
    if (!currentUser || !visible) return;
    const q = query(collection(db, 'members'), where('parentEmail', '==', currentUser));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setMembers(list);
    });
    return () => unsubscribe();
  }, [currentUser, visible]);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleAddMember = async () => {
    if (!guestEmail.includes('@')) return Alert.alert('Atenção', 'Digite um e-mail válido para o convidado.');
    
    const alreadyAdded = members.some(m => m.guestEmail.toLowerCase() === guestEmail.toLowerCase());
    if (alreadyAdded) return Alert.alert('Atenção', 'Este e-mail já está na sua lista de membros ativos.');

    setIsAdding(true);
    const inviteCode = generateInviteCode();

    try {
      await addDoc(collection(db, 'members'), {
        parentEmail: currentUser,
        guestEmail: guestEmail.toLowerCase(),
        inviteCode: inviteCode,
        status: 'active',
        // NOVA TRAVA DE SEGURANÇA: Avisa que a senha ainda é a provisória
        hasCustomPassword: false, 
        createdAt: new Date().toISOString()
      });
      setGuestEmail('');
      setIsAdding(false);
    } catch (error) {
      console.error(error);
      setIsAdding(false);
      Alert.alert('Erro', 'Não foi possível adicionar o membro.');
    }
  };

  const handleShareInvite = async (email, code) => {
    const mensagem = `Olá! Estou compartilhando o acesso ao meu controle financeiro com você.\n\nBaixe o aplicativo e clique em "Entrar como Convidado".\n\n📧 *Seu E-mail:* ${email}\n🔑 *Senha Gerada:* ${code}\n\n⚠️ No seu primeiro acesso, o sistema pedirá para você criar uma senha pessoal e segura.`;
    try {
      await Share.share({
        message: mensagem,
        title: 'Convite - Gestão Financeira'
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar o convite.');
    }
  };

  // NOVA FUNÇÃO: RESETAR SENHA DO CONVIDADO
  const handleResetPassword = (member) => {
    Alert.alert(
      'Resetar Senha',
      `O convidado esqueceu a senha pessoal?\n\nIsso irá gerar uma nova senha provisória e forçará ${member.guestEmail} a criar uma senha nova no próximo acesso.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Gerar Nova Senha', 
          onPress: async () => {
            try {
              const newCode = generateInviteCode();
              await updateDoc(doc(db, 'members', member.id), {
                inviteCode: newCode,
                hasCustomPassword: false // Volta para o status de "Aguardando 1º acesso"
              });
              Alert.alert('Sucesso', 'Nova senha provisória gerada! Envie o convite novamente para o convidado.');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível resetar a senha.');
            }
          }
        }
      ]
    );
  };

  const handleRequestDelete = (member) => {
    setMemberToDelete(member);
    setSecurityPassword('');
    setPasswordModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!securityPassword) return Alert.alert('Atenção', 'Digite sua senha de administrador.');
    
    try {
      const credential = EmailAuthProvider.credential(currentUser, securityPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      await deleteDoc(doc(db, 'members', memberToDelete.id));
      
      setPasswordModalVisible(false);
      setSecurityPassword('');
      setMemberToDelete(null);
      
      setTimeout(() => {
        Alert.alert('Sucesso', 'Acesso do membro removido permanentemente.');
      }, 300);

    } catch (error) {
      Alert.alert('Acesso Negado', 'Senha incorreta. A exclusão foi cancelada.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="people-outline" size={26} color="#1E3B4D" />
              <Text style={styles.title}>Gerenciar Membros</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={styles.closeBtnText}>X</Text></TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Adicione e-mails autorizados para lançar despesas. Por segurança, os convidados criam a própria senha no primeiro acesso.</Text>

          <View style={styles.inviteBox}>
            <Text style={styles.label}>E-mail do novo membro</Text>
            <View style={styles.inputRow}>
              <TextInput 
                style={styles.input} 
                placeholder="exemplo@email.com" 
                keyboardType="email-address"
                autoCapitalize="none"
                value={guestEmail}
                onChangeText={setGuestEmail}
              />
              <TouchableOpacity style={[styles.addBtn, isAdding && { opacity: 0.7 }]} onPress={handleAddMember} disabled={isAdding}>
                <Ionicons name="add-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Membros Ativos ({members.length})</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{member.guestEmail.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberEmail}>{member.guestEmail}</Text>
                    
                    {/* VERIFICA SE JÁ TEM SENHA PESSOAL OU NÃO */}
                    {member.hasCustomPassword ? (
                      <View style={styles.secureBadge}>
                        <Ionicons name="lock-closed" size={12} color="#4CAF50" />
                        <Text style={styles.secureBadgeText}>Senha Pessoal Definida</Text>
                      </View>
                    ) : (
                      <Text style={styles.memberCode}>Senha gerada: <Text style={{fontWeight: 'bold', color: '#1E3B4D'}}>{member.inviteCode}</Text></Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.memberActions}>
                  {/* SE TIVER SENHA PESSOAL, MOSTRA O RESET. SE NÃO, MOSTRA COMPARTILHAR */}
                  {member.hasCustomPassword ? (
                    <TouchableOpacity style={styles.resetBtn} onPress={() => handleResetPassword(member)}>
                      <Ionicons name="refresh-outline" size={18} color="#E65100" />
                      <Text style={styles.resetBtnText}>Resetar Senha</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.shareBtn} onPress={() => handleShareInvite(member.guestEmail, member.inviteCode)}>
                      <Ionicons name="share-social-outline" size={18} color="#FFF" />
                      <Text style={styles.shareBtnText}>Enviar Convite</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity onPress={() => handleRequestDelete(member)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={20} color="#E53935" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {members.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="person-add-outline" size={40} color="#CCC" />
                <Text style={styles.emptyText}>Nenhuma subconta criada.</Text>
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

        </View>
      </KeyboardAvoidingView>

      <Modal visible={passwordModalVisible} transparent={true} animationType="fade">
        <View style={styles.passwordModalOverlay}>
          <View style={styles.passwordModalContent}>
            <Ionicons name="shield-checkmark-outline" size={40} color="#E53935" style={{ marginBottom: 15 }} />
            <Text style={styles.passwordModalTitle}>Autenticação Necessária</Text>
            <Text style={styles.passwordModalText}>
              Para excluir o acesso de <Text style={{fontWeight: 'bold'}}>{memberToDelete?.guestEmail}</Text>, confirme sua senha de administrador.
            </Text>
            <TextInput style={styles.passwordInput} placeholder="Digite sua senha..." placeholderTextColor="#999" secureTextEntry={true} value={securityPassword} onChangeText={setSecurityPassword} autoFocus={true} />
            <View style={styles.passwordButtonRow}>
              <TouchableOpacity style={styles.passwordCancelButton} onPress={() => { setPasswordModalVisible(false); setSecurityPassword(''); }}>
                <Text style={styles.passwordCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.passwordConfirmButton} onPress={handleConfirmDelete}>
                <Text style={styles.passwordConfirmText}>Excluir Acesso</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }, backdrop: { flex: 1 },
  modalContent: { backgroundColor: '#F8F9FA', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 25, paddingHorizontal: 20, paddingBottom: 20, height: '85%', elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { fontSize: 20, fontWeight: 'bold', color: '#1E3B4D' }, closeBtn: { padding: 5 }, closeBtnText: { fontSize: 22, color: '#333', fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 18 },
  
  inviteBox: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 25 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 15, fontSize: 15, color: '#333' },
  addBtn: { backgroundColor: '#1E3B4D', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3B4D', marginBottom: 15 },
  
  memberCard: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA', elevation: 1 },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  memberEmail: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  memberCode: { fontSize: 13, color: '#666' },
  
  // NOVO BADGE DE SEGURANÇA
  secureBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', gap: 4, marginTop: 4 },
  secureBadgeText: { color: '#4CAF50', fontSize: 11, fontWeight: 'bold' },

  memberActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7CB342', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, gap: 6 },
  shareBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  
  // NOVO BOTÃO DE RESET
  resetBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, gap: 6 },
  resetBtnText: { color: '#E65100', fontWeight: 'bold', fontSize: 13 },
  
  removeBtn: { padding: 10, backgroundColor: '#FFEBEE', borderRadius: 10 },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 14 },

  passwordModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  passwordModalContent: { backgroundColor: '#FFF', width: '100%', borderRadius: 24, padding: 25, alignItems: 'center', elevation: 10 },
  passwordModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  passwordModalText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  passwordInput: { width: '100%', backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 16, fontSize: 16, color: '#333', marginBottom: 25, textAlign: 'center' },
  passwordButtonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  passwordCancelButton: { flex: 1, backgroundColor: '#EEEEEE', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  passwordCancelText: { fontSize: 15, fontWeight: 'bold', color: '#666' },
  passwordConfirmButton: { flex: 1, backgroundColor: '#E53935', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  passwordConfirmText: { fontSize: 15, fontWeight: 'bold', color: '#FFF' }
});