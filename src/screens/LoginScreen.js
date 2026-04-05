import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useContext, useState } from "react";
// Importamos KeyboardAvoidingView, ScrollView e Platform
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useGoogleAuth } from "../components/UseGoogleAuth";
import Colors from "../constants/Colors";
import { AuthContext } from "../context/AuthContext";
import { auth, db } from "../firebase";

export default function LoginScreen({ navigation }) {
  const [loginType, setLoginType] = useState("titular");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { setUser } = useContext(AuthContext);
  const { promptAsync } = useGoogleAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha os campos obrigatórios.");
      return;
    }

    if (loginType === "titular") {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const userCredential = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        setUser(userCredential.user);
        navigation.replace("Home");
      } catch (error) {
        Alert.alert("Acesso Negado", "E-mail ou senha incorretos.");
      }
    } else {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const q = query(
          collection(db, "members"),
          where("guestEmail", "==", cleanEmail),
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          Alert.alert("Acesso Negado", "E-mail de convidado não encontrado.");
          return;
        }

        const memberDoc = snapshot.docs[0];
        const memberData = memberDoc.data();
        const memberId = memberDoc.id;

        const isPasswordCorrect = memberData.hasCustomPassword
          ? memberData.inviteCode === password
          : memberData.inviteCode === password.trim().toUpperCase();

        if (!isPasswordCorrect) {
          Alert.alert("Acesso Negado", "Senha incorreta.");
          return;
        }

        await signInAnonymously(auth);

        if (!memberData.hasCustomPassword) {
          Alert.alert(
            "Primeiro Acesso",
            "Por motivos de segurança, você precisa criar uma senha pessoal definitiva.",
          );
          navigation.replace("GuestPasswordChange", {
            memberId: memberId,
            guestEmail: memberData.guestEmail,
            parentEmail: memberData.parentEmail,
          });
        } else {
          Alert.alert(
            "Bem-vindo!",
            `Você acessou a conta familiar como ${memberData.name || "convidado"}.`,
          );
          navigation.replace("Home", {
            isGuest: true,
            parentEmail: memberData.parentEmail,
            guestEmail: memberData.guestEmail,
            guestName: memberData.name,
          });
        }
      } catch (error) {
        Alert.alert("Erro", "Ocorreu um erro ao validar o acesso.");
        console.error(error);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        "Atenção",
        'Por favor, digite o seu e-mail no campo acima e clique novamente em "Esqueci minha senha".',
      );
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      await sendPasswordResetEmail(auth, cleanEmail);
      Alert.alert(
        "E-mail Enviado!",
        "Um link seguro para redefinir sua senha foi enviado para a sua caixa de entrada (verifique também a pasta de spam).",
      );
    } catch (error) {
      let errorMessage = "Não foi possível enviar o e-mail de recuperação.";
      if (error.code === "auth/user-not-found")
        errorMessage = "Não encontramos nenhuma conta com este e-mail.";
      if (error.code === "auth/invalid-email")
        errorMessage = "Formato de e-mail inválido.";
      Alert.alert("Erro", errorMessage);
    }
  };

  return (
    <LinearGradient
      colors={Colors.gradientPrimary || ["#1E3B4D", "#26A69A"]}
      style={styles.container}
    >
      {/* Adicionado KeyboardAvoidingView e ScrollView para evitar cortes na tela */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons
                name="trending-up"
                size={48}
                color={Colors.accent || "#7CB342"}
              />
            </View>
            <Text style={styles.appName}>Sensus</Text>
            <Text style={styles.tagline}>Controle que faz sentido</Text>
            <Text style={styles.subtitle}>Crescimento que se vê</Text>
          </View>

          <View style={styles.loginContainer}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  loginType === "titular" && styles.activeTab,
                ]}
                onPress={() => {
                  setLoginType("titular");
                  setPassword("");
                  setShowPassword(false);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    loginType === "titular" && styles.activeTabText,
                  ]}
                >
                  Titular
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, loginType === "guest" && styles.activeTab]}
                onPress={() => {
                  setLoginType("guest");
                  setPassword("");
                  setShowPassword(false);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    loginType === "guest" && styles.activeTabText,
                  ]}
                >
                  Convidado
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder={
                loginType === "titular" ? "Seu E-mail" : "E-mail do Convidado"
              }
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor="rgba(255,255,255,0.7)"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                placeholder={
                  loginType === "titular" ? "Sua Senha" : "Senha ou Código"
                }
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.passwordInput}
                placeholderTextColor="rgba(255,255,255,0.7)"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={22}
                  color="rgba(255,255,255,0.7)"
                />
              </TouchableOpacity>
            </View>

            {/* BOTÃO DE RECUPERAR SENHA APENAS PARA O TITULAR */}
            {loginType === "titular" && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                activeOpacity={0.8}
              >
                <Text style={styles.forgotPasswordText}>
                  Esqueci minha senha
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.buttonEmail}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Ionicons
                name={loginType === "titular" ? "mail" : "key"}
                size={24}
                color={Colors.textLight || "#FFF"}
              />
              <Text style={styles.buttonText}>
                {loginType === "titular"
                  ? "Entrar na Conta"
                  : "Acessar Subconta"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonEmail}
              onPress={() => promptAsync()}
              activeOpacity={0.8}
            >
              <Ionicons
                name="logo-google"
                size={24}
                color="#FFF"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.buttonText}>Entrar com Google</Text>
            </TouchableOpacity>

            {loginType === "titular" && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate("Register")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-add"
                  size={24}
                  color={Colors.textLight || "#FFF"}
                />
                <Text style={styles.buttonText}>Criar nova conta familiar</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Substituímos content por scrollContent */
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  logoContainer: { alignItems: "center", marginBottom: 30 },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: { fontSize: 42, fontWeight: "bold", color: "#FFF", marginBottom: 8 },
  tagline: {
    fontSize: 16,
    color: "#7CB342",
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 15 },

  loginContainer: { width: "100%" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    marginBottom: 20,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 12 },
  activeTab: { backgroundColor: "#7CB342" },
  tabText: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "bold" },
  activeTabText: { color: "#FFF" },

  input: {
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    color: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeIcon: { padding: 14 },

  /* ESTILO CORRIGIDO: Agora ocupa 100% da largura com o texto alinhado à direita */
  forgotPasswordButton: {
    width: "100%",
    alignItems: "flex-end",
    marginBottom: 20,
    paddingRight: 5,
  },
  forgotPasswordText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  buttonEmail: {
    backgroundColor: "#7CB342",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  linkButton: {
    backgroundColor: "#7CB342",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
