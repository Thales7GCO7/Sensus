import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import { db } from '../firebase';

export default function GuestPasswordChangeScreen({ navigation, route }) {
  const { memberId, guestEmail, parentEmail } = route.params;

  // NOVO ESTADO: Nome do Convidado
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password);
  
  const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  const passwordsMatch = password === confirmPassword;

  const handleSavePassword = async () => {
    if (!name.trim()) return Alert.alert('Atenção', 'Por favor, digite seu nome.');
    if (!isPasswordStrong || !passwordsMatch) return;

    try {
      // Salva a senha e o Nome do convidado!
      await updateDoc(doc(db, 'members', memberId), {
        inviteCode: password,
        hasCustomPassword: true,
        name: name.trim() // <-- Mágica acontece aqui
      });

      Alert.alert('Sucesso', `Tudo certo, ${name.trim()}! Sua senha foi registrada.`);
      
      // Manda o nome novo pra Home
      navigation.replace('Home', { 
        isGuest: true, 
        parentEmail: parentEmail,
        guestEmail: guestEmail,
        guestName: name.trim() // Passando o nome
      });

    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a nova senha.');
      console.error(error);
    }
  };

  return (
    <LinearGradient colors={Colors.gradientPrimary || ['#1E3B4D', '#26A69A']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="lock-closed" size={48} color={Colors.accent || '#7CB342'} />
          </View>
          <Text style={styles.appName}>Primeiro Acesso</Text>
          <Text style={styles.subtitle}>Crie sua senha definitiva e segura.</Text>
        </View>

        <View style={styles.formContainer}>
          {/* CAMPO NOME */}
          <TextInput
            placeholder="Seu Nome"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            style={styles.input}
            placeholderTextColor="rgba(255,255,255,0.7)"
          />

          <View style={styles.passwordContainer}>
            <TextInput placeholder="Sua Nova Senha Forte" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} style={styles.passwordInput} placeholderTextColor="rgba(255,255,255,0.7)" />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}><Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="rgba(255,255,255,0.7)" /></TouchableOpacity>
          </View>

          {password.length === 0 && <Text style={styles.helperText}>A senha precisa ter letras (A-a), números e símbolos.</Text>}

          {password.length > 0 && !isPasswordStrong && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxTitle}>Sua senha deve conter:</Text>
              {!hasMinLength && <Text style={styles.errorText}>• Pelo menos 8 dígitos</Text>}
              {!hasUppercase && <Text style={styles.errorText}>• Pelo menos 1 letra MAIÚSCULA</Text>}
              {!hasLowercase && <Text style={styles.errorText}>• Pelo menos 1 letra minúscula</Text>}
              {!hasNumber && <Text style={styles.errorText}>• Pelo menos 1 número (0-9)</Text>}
              {!hasSpecialChar && <Text style={styles.errorText}>• Pelo menos 1 caractere especial</Text>}
            </View>
          )}

          {password.length > 0 && isPasswordStrong && (
            <View style={styles.successBox}>
              <Ionicons name="shield-checkmark" size={18} color="#7CB342" />
              <Text style={styles.successText}>Senha Forte e Segura!</Text>
            </View>
          )}

          <View style={styles.passwordContainer}>
            <TextInput placeholder="Confirme a Nova Senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} style={styles.passwordInput} placeholderTextColor="rgba(255,255,255,0.7)" />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}><Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="rgba(255,255,255,0.7)" /></TouchableOpacity>
          </View>

          {confirmPassword.length > 0 && !passwordsMatch && <Text style={[styles.errorText, { marginBottom: 12, marginLeft: 5 }]}>As senhas não coincidem!</Text>}

          <TouchableOpacity style={[styles.buttonRegister, (!isPasswordStrong || !passwordsMatch || !name) && styles.buttonDisabled]} onPress={handleSavePassword} activeOpacity={0.8} disabled={!isPasswordStrong || !passwordsMatch || !name}>
            <Ionicons name={isPasswordStrong && passwordsMatch && name ? "shield-checkmark" : "lock-closed"} size={24} color={Colors.textLight || '#FFF'} />
            <Text style={styles.buttonText}>{isPasswordStrong && passwordsMatch && name ? "Salvar e Entrar" : "Preencha os dados"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 25 }, logoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.textLight || '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, },
  appName: { fontSize: 32, fontWeight: 'bold', color: Colors.textLight || '#FFF', marginBottom: 5 }, subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' }, formContainer: { width: '100%' },
  input: { backgroundColor: 'rgba(255,255,255,0.15)', color: Colors.textLight || '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, marginBottom: 12, fontSize: 16, },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, marginBottom: 12, }, passwordInput: { flex: 1, color: Colors.textLight || '#FFF', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, }, eyeIcon: { padding: 14 },
  helperText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 15, marginLeft: 5 },
  errorBox: { backgroundColor: 'rgba(229, 57, 53, 0.15)', borderWidth: 1, borderColor: '#EF5350', borderRadius: 12, padding: 15, marginBottom: 15, }, errorBoxTitle: { color: '#FFCDD2', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }, errorText: { color: '#FFCDD2', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  successBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(124, 179, 66, 0.15)', borderWidth: 1, borderColor: '#7CB342', borderRadius: 12, padding: 12, marginBottom: 15, gap: 8 }, successText: { color: '#AED581', fontSize: 14, fontWeight: 'bold' },
  buttonRegister: { backgroundColor: Colors.accent || '#7CB342', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginBottom: 16, marginTop: 5, gap: 12, }, buttonDisabled: { backgroundColor: 'rgba(255,255,255,0.2)' }, buttonText: { color: Colors.textLight || '#FFF', fontSize: 16, fontWeight: 'bold' },
});