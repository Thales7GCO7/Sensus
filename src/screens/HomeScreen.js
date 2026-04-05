import { Ionicons } from "@expo/vector-icons";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";
// Importações atualizadas para incluir updateDoc, doc e addDoc necessários para o robô de notificações
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Componentes
import AddCategoryModal from "../components/AddCategoryModal";
import AddExpenseModal from "../components/AddExpenseModal";
import AddIncomeModal from "../components/AddIncomeModal";
import BillsModal from "../components/BillsModal";
import GoalsModal from "../components/GoalsModal";
import HistoryModal from "../components/HistoryModal";
import ManageMembersModal from "../components/ManageMembersModal";
import NotificationsModal from "../components/NotificationsModal";
import RemoveExpenseModal from "../components/RemoveExpenseModal";
import RemoveIncomeModal from "../components/RemoveIncomeModal";
import ReportModal from "../components/ReportModal";
import ResumoFinanceiro from "../components/ResumoFinanceiro";
import SavingsModal from "../components/SavingsModal";
import StatisticsModal from "../components/StatisticsModal";

import { auth, db } from "../firebase";

const formatarMoeda = (valor) => {
  return Number(valor)
    .toFixed(2)
    .replace(".", ",")
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
};

const formatarDataRelativa = (dataStr) => {
  if (!dataStr) return "";
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  const dataObj = new Date(dataStr + "T12:00:00");

  if (dataObj.toDateString() === hoje.toDateString()) return "Hoje";
  if (dataObj.toDateString() === ontem.toDateString()) return "Ontem";

  const dia = String(dataObj.getDate()).padStart(2, "0");
  const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
};

export default function HomeScreen({ navigation, route }) {
  const [user, setUser] = useState(auth.currentUser);

  const isGuest = route?.params?.isGuest || false;
  const parentEmail = route?.params?.parentEmail || null;
  const guestEmail = route?.params?.guestEmail || null;
  const guestName = route?.params?.guestName || null;

  const emailLogado = user?.email || auth.currentUser?.email || "Desconhecido";
  const emailDonoDaConta = isGuest ? parentEmail : emailLogado;
  const emailExibicao = isGuest ? guestEmail : emailLogado;

  const nomeTitular = user?.displayName || emailLogado.split("@")[0];
  const nomeConvidado = guestName || guestEmail?.split("@")[0];
  const nomeExibicao = isGuest ? nomeConvidado : nomeTitular;

  // Modals Visibilidade
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [addCategoryVisible, setAddCategoryVisible] = useState(false);
  const [manageMembersVisible, setManageMembersVisible] = useState(false);
  const [removeIncomeVisible, setRemoveIncomeVisible] = useState(false);
  const [removeExpenseVisible, setRemoveExpenseVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [statisticsVisible, setStatisticsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [goalsVisible, setGoalsVisible] = useState(false);
  const [savingsVisible, setSavingsVisible] = useState(false);
  const [billsVisible, setBillsVisible] = useState(false);

  // Estados de Segurança e UI
  const [passwordPromptVisible, setPasswordPromptVisible] = useState(false);
  const [securityPassword, setSecurityPassword] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Estados de Dados
  const [categories, setCategories] = useState([]);
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [incomesList, setIncomesList] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) =>
      setUser(currentUser),
    );
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("userEmail", "==", emailDonoDaConta),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unreadCount = 0;
      snapshot.forEach((doc) => {
        if (doc.data().read === false) unreadCount++;
      });
      setUnreadNotifications(unreadCount);
    });
    return () => unsubscribe();
  }, [emailDonoDaConta]);

  useEffect(() => {
    const q = query(
      collection(db, "categories"),
      where("userEmail", "==", emailDonoDaConta),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setCategories(list);
    });
    return () => unsubscribe();
  }, [emailDonoDaConta]);

  useEffect(() => {
    const q = query(
      collection(db, "incomes"),
      where("userEmail", "==", emailDonoDaConta),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let soma = 0;
      const list = [];
      snapshot.forEach((doc) => {
        soma += Number(doc.data().amount || 0);
        list.push({ id: doc.id, ...doc.data(), isExpense: false });
      });
      setTotalReceitas(soma);
      setIncomesList(list);
    });
    return () => unsubscribe();
  }, [emailDonoDaConta]);

  useEffect(() => {
    const q = query(
      collection(db, "expenses"),
      where("userEmail", "==", emailDonoDaConta),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let soma = 0;
      const list = [];
      snapshot.forEach((doc) => {
        soma += Number(doc.data().amount || 0);
        list.push({ id: doc.id, ...doc.data(), isExpense: true });
      });
      setTotalDespesas(soma);
      setExpensesList(list);
    });
    return () => unsubscribe();
  }, [emailDonoDaConta]);

  const despesasGrafico = expensesList.reduce((acc, item) => {
    const date = item.date || item.createdAt?.split("T")[0];
    if (!date) return acc;

    const found = acc.find((d) => d.date === date);

    if (found) {
      found.value += Number(item.amount || 0);
    } else {
      acc.push({
        date,
        value: Number(item.amount || 0),
      });
    }

    return acc;
  }, []);

  // --- VERIFICADOR AUTOMÁTICO DE VENCIMENTOS (ROBÔ DE NOTIFICAÇÕES) ---
  useEffect(() => {
    if (!emailDonoDaConta) return;

    const q = query(
      collection(db, "bills"),
      where("userEmail", "==", emailDonoDaConta),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const anoAtual = hoje.getFullYear();
      const mesAtualStr = String(hoje.getMonth() + 1).padStart(2, "0");
      const mesAtualRef = `${anoAtual}-${mesAtualStr}`;

      snapshot.forEach(async (documento) => {
        const conta = { id: documento.id, ...documento.data() };

        // Se já está paga, ignora
        if (conta.type === "variable" && conta.status === "paid") return;
        if (
          conta.type === "fixed" &&
          conta.paymentHistory?.includes(mesAtualRef)
        )
          return;

        let dataVencimento;

        if (conta.type === "fixed") {
          dataVencimento = new Date(anoAtual, hoje.getMonth(), conta.dueDay);
        } else {
          const partes = conta.dueDate.split("/");
          if (partes.length === 3) {
            dataVencimento = new Date(
              `${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`,
            );
            dataVencimento.setHours(0, 0, 0, 0);
          } else {
            return;
          }
        }

        const difTempo = dataVencimento.getTime() - hoje.getTime();
        const difDias = Math.ceil(difTempo / (1000 * 3600 * 24));
        const contaRef = doc(db, "bills", conta.id);
        const logDataHoje = hoje.toISOString().split("T")[0];

        // 1. Vence em 2 dias
        if (difDias === 2 && conta.lastAlert2Days !== logDataHoje) {
          await addDoc(collection(db, "notifications"), {
            userEmail: emailDonoDaConta,
            title: "Vencimento Próximo ⚠️",
            message: `A conta "${conta.name}" vence em 2 dias!`,
            date: new Date().toISOString(),
            read: false,
            type: "bill_alert",
          });
          await updateDoc(contaRef, { lastAlert2Days: logDataHoje });
        }

        // 2. Vence Hoje
        else if (difDias === 0 && conta.lastAlertToday !== logDataHoje) {
          await addDoc(collection(db, "notifications"), {
            userEmail: emailDonoDaConta,
            title: "Vence Hoje! 🚨",
            message: `Não esqueça: a conta "${conta.name}" vence hoje.`,
            date: new Date().toISOString(),
            read: false,
            type: "bill_alert",
          });
          await updateDoc(contaRef, { lastAlertToday: logDataHoje });
        }

        // 3. Atrasada (difDias negativo)
        else if (difDias < 0 && conta.lastAlertOverdue !== logDataHoje) {
          await addDoc(collection(db, "notifications"), {
            userEmail: emailDonoDaConta,
            title: "Conta Atrasada! ❌",
            message: `A conta "${conta.name}" venceu há ${Math.abs(difDias)} dia(s) e ainda não foi paga.`,
            date: new Date().toISOString(),
            read: false,
            type: "bill_alert",
          });
          await updateDoc(contaRef, { lastAlertOverdue: logDataHoje });
        }
      });
    });

    return () => unsubscribe();
  }, [emailDonoDaConta]);

  useEffect(() => {
    const categoryMap = {};
    expensesList.forEach((exp) => {
      const cat = exp.category || "Geral";
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat] += Number(exp.amount || 0);
    });

    const categoryArray = Object.keys(categoryMap)
      .map((key) => ({
        name: key,
        total: categoryMap[key],
        percentage:
          totalDespesas > 0 ? (categoryMap[key] / totalDespesas) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    setExpensesByCategory(categoryArray);

    const combined = [...incomesList, ...expensesList].sort((a, b) => {
      return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
    });

    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - 5);
    limiteData.setHours(0, 0, 0, 0);

    const filtradas5Dias = combined.filter((t) => {
      const dStr = t.date || (t.createdAt ? t.createdAt.split("T")[0] : null);
      if (!dStr) return false;
      const dataTransacao = new Date(dStr + "T12:00:00");
      return dataTransacao >= limiteData;
    });

    setRecentTransactions(filtradas5Dias);
  }, [incomesList, expensesList, totalDespesas]);

  const getCategoryDetails = (categoryName) => {
    const found = categories.find((c) => c.name === categoryName);
    if (found)
      return { icon: found.icon || "🏷️", color: found.color || "#BDBDBD" };
    if (categoryName === "Geral") return { icon: "📋", color: "#78909C" };
    return { icon: "🏷️", color: "#BDBDBD" };
  };

  const handleVerifyPassword = async () => {
    if (!securityPassword)
      return Alert.alert("Atenção", "Digite sua senha para continue.");
    try {
      const credential = EmailAuthProvider.credential(
        emailExibicao,
        securityPassword,
      );

      if (isGuest) {
        Alert.alert(
          "Acesso Negado",
          "Apenas o titular da conta pode remover transações ou membros.",
        );
        setPasswordPromptVisible(false);
        setSecurityPassword("");
        return;
      }

      await reauthenticateWithCredential(auth.currentUser, credential);
      setPasswordPromptVisible(false);
      setSecurityPassword("");

      if (pendingAction === "receita") setRemoveIncomeVisible(true);
      else if (pendingAction === "despesa") setRemoveExpenseVisible(true);
      else if (pendingAction === "membros") setManageMembersVisible(true);
    } catch (error) {
      Alert.alert("Acesso Negado", "Senha incorreta.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair do aplicativo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: () => {
          signOut(auth).then(() => {
            if (navigation) {
              navigation.replace("Login");
            }
          });
        },
      },
    ]);
  };

  const saldoAtual = totalReceitas - totalDespesas;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Bem-vindo, {nomeExibicao}!</Text>
          {isGuest && (
            <Text style={styles.guestBadge}>
              Subconta de {parentEmail?.split("@")[0]}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setNotificationsVisible(true)}
          style={styles.bellContainer}
        >
          <Ionicons name="notifications-outline" size={28} color="#1E3B4D" />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ResumoFinanceiro
        saldo={saldoAtual}
        incomes={incomesList}
        expenses={expensesList}
        expensesSeries={despesasGrafico}
      />

      <View style={styles.quickActionsContainer}>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionButtonHalf}
            onPress={() => setHistoryVisible(true)}
          >
            <Ionicons name="time-outline" size={20} color="#1E3B4D" />
            <Text style={styles.quickActionText}>Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButtonHalf}
            onPress={() => setStatisticsVisible(true)}
          >
            <Ionicons name="trending-up-outline" size={20} color="#1E3B4D" />
            <Text style={styles.quickActionText}>Estatísticas</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.quickActionButtonFull}
          onPress={() => setReportVisible(true)}
        >
          <Ionicons name="document-text-outline" size={20} color="#1E3B4D" />
          <Text style={styles.quickActionText}>Relatórios PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.billsButton}
          onPress={() => setBillsVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.billsButtonContent}>
            <View style={styles.billsIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#7CB342" />
            </View>
            <View style={styles.billsTextContainer}>
              <Text style={styles.billsTitle}>Contas e Faturas</Text>
              <Text style={styles.billsSubtitle}>
                Lembretes e boletos a pagar
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Despesas do mês</Text>
      <View style={styles.whiteCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>Total</Text>
          <Text style={styles.cardHeaderValue}>
            R$ {formatarMoeda(totalDespesas)}
          </Text>
        </View>
        {expensesByCategory
          .slice(0, showAllCategories ? expensesByCategory.length : 4)
          .map((cat, index) => {
            const { icon, color } = getCategoryDetails(cat.name);
            return (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryRow}>
                  <Text style={styles.categoryName}>
                    <Text style={styles.emoji}>{icon}</Text> {cat.name}
                  </Text>
                  <Text style={styles.categoryValue}>
                    R$ {formatarMoeda(cat.total)}
                  </Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${cat.percentage}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={styles.percentageText}>
                  {cat.percentage.toFixed(0)}%
                </Text>
              </View>
            );
          })}
        {expensesByCategory.length > 4 && (
          <TouchableOpacity
            style={styles.verTodasButton}
            onPress={() => setShowAllCategories(!showAllCategories)}
          >
            <Text style={styles.verTodasText}>
              {showAllCategories ? "Ocultar ↑" : "Ver todas as categorias ↓"}
            </Text>
          </TouchableOpacity>
        )}
        {expensesByCategory.length === 0 && (
          <Text style={styles.emptyText}>Nenhuma despesa registrada.</Text>
        )}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Transações Recentes</Text>
        {!showAllTransactions && recentTransactions.length > 4 && (
          <TouchableOpacity
            style={styles.verTodasContainer}
            onPress={() => setShowAllTransactions(true)}
          >
            <Text style={styles.verTodasLink}>Ver todas</Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color="#7CB342"
              style={{ marginLeft: 4, marginTop: 1 }}
            />
          </TouchableOpacity>
        )}
      </View>

      {recentTransactions
        .slice(0, showAllTransactions ? 15 : 4)
        .map((t, index) => {
          const { icon } = getCategoryDetails(t.category);
          const isExpense = t.isExpense;
          const itemName = t.name || t.description || "Transação";

          const dataStr =
            t.date || (t.createdAt ? t.createdAt.split("T")[0] : null);
          const dataFormatada = formatarDataRelativa(dataStr);

          return (
            <View key={t.id || index} style={styles.transactionCard}>
              <View style={styles.transactionIconBox}>
                <Text style={styles.transactionEmoji}>
                  {isExpense ? icon : "📈"}
                </Text>
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionName}>{itemName}</Text>
                <Text style={styles.transactionSubtitle}>
                  {dataFormatada} • {t.category || "Receita"}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionValue,
                  { color: isExpense ? "#EF5350" : "#7CB342" },
                ]}
              >
                {isExpense ? "- " : "+ "}R$ {formatarMoeda(t.amount)}
              </Text>
            </View>
          );
        })}

      {showAllTransactions && (
        <TouchableOpacity
          style={styles.ocultarButton}
          onPress={() => setShowAllTransactions(false)}
        >
          <Text style={styles.ocultarText}>Ocultar Lista ↑</Text>
        </TouchableOpacity>
      )}

      {recentTransactions.length === 0 && (
        <Text style={styles.emptyText}>
          Nenhuma transação nos últimos 5 dias.
        </Text>
      )}
      <View style={{ height: 20 }} />

      <TouchableOpacity
        style={styles.actionButtonMain}
        onPress={() => setIncomeModalVisible(true)}
      >
        <Text style={styles.actionButtonText}>Adicionar Receita</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButtonMain}
        onPress={() => setExpenseModalVisible(true)}
      >
        <Text style={styles.actionButtonText}>Adicionar Despesa</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButtonMain}
        onPress={() => setAddCategoryVisible(true)}
      >
        <Text style={styles.actionButtonText}>Gerenciar Categoria</Text>
      </TouchableOpacity>

      {!isGuest && (
        <TouchableOpacity
          style={styles.actionButtonMain}
          onPress={() => {
            setPendingAction("membros");
            setPasswordPromptVisible(true);
          }}
        >
          <Text style={styles.actionButtonText}>Gerenciar Membros</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.actionButtonMain,
          {
            backgroundColor: "#26A69A",
            flexDirection: "row",
            justifyContent: "center",
          },
        ]}
        onPress={() => setSavingsVisible(true)}
      >
        <Ionicons
          name="wallet-outline"
          size={20}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.actionButtonText}>Meus Cofrinhos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButtonWarning}
        onPress={() => setGoalsVisible(true)}
      >
        <Ionicons
          name="disc-outline"
          size={20}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.actionButtonText}>Metas de gastos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButtonDanger}
        onPress={() => {
          setPendingAction("receita");
          setPasswordPromptVisible(true);
        }}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.actionButtonText}>Remover Receita</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButtonDanger}
        onPress={() => {
          setPendingAction("despesa");
          setPasswordPromptVisible(true);
        }}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.actionButtonText}>Remover Despesa</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#E53935" />
        <Text style={styles.logoutButtonText}>Sair do aplicativo</Text>
      </TouchableOpacity>

      <AddIncomeModal
        visible={incomeModalVisible}
        onClose={() => setIncomeModalVisible(false)}
        currentUser={emailDonoDaConta}
      />
      <AddExpenseModal
        visible={expenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        categories={categories}
        currentUser={emailDonoDaConta}
      />
      <AddCategoryModal
        visible={addCategoryVisible}
        onClose={() => setAddCategoryVisible(false)}
        categories={categories}
        currentUser={emailDonoDaConta}
      />
      {!isGuest && (
        <ManageMembersModal
          visible={manageMembersVisible}
          onClose={() => setManageMembersVisible(false)}
          currentUser={emailDonoDaConta}
        />
      )}
      <RemoveIncomeModal
        visible={removeIncomeVisible}
        onClose={() => setRemoveIncomeVisible(false)}
        currentUser={emailDonoDaConta}
      />
      <RemoveExpenseModal
        visible={removeExpenseVisible}
        onClose={() => setRemoveExpenseVisible(false)}
        currentUser={emailDonoDaConta}
      />
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        currentUser={emailDonoDaConta}
      />
      <HistoryModal
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        transactions={recentTransactions}
        categories={categories}
      />
      <StatisticsModal
        visible={statisticsVisible}
        onClose={() => setStatisticsVisible(false)}
        incomes={incomesList}
        expenses={expensesList}
        categories={categories}
      />
      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        incomes={incomesList}
        expenses={expensesList}
        categories={categories}
      />
      <GoalsModal
        visible={goalsVisible}
        onClose={() => setGoalsVisible(false)}
        currentUser={emailDonoDaConta}
        categories={categories}
        expenses={expensesList}
      />
      <SavingsModal
        visible={savingsVisible}
        onClose={() => setSavingsVisible(false)}
        currentUser={emailDonoDaConta}
      />

      <BillsModal
        visible={billsVisible}
        onClose={() => setBillsVisible(false)}
        currentUser={emailDonoDaConta}
      />

      <Modal
        visible={passwordPromptVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.passwordModalOverlay}>
          <View style={styles.passwordModalContent}>
            <Ionicons
              name="lock-closed"
              size={40}
              color="#E53935"
              style={{ marginBottom: 15 }}
            />
            <Text style={styles.passwordModalTitle}>Acesso Restrito</Text>
            <Text style={styles.passwordModalText}>
              Confirme sua senha de login.
            </Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Digite sua senha..."
              placeholderTextColor="#999"
              secureTextEntry={true}
              value={securityPassword}
              onChangeText={setSecurityPassword}
            />
            <View style={styles.passwordButtonRow}>
              <TouchableOpacity
                style={styles.passwordCancelButton}
                onPress={() => {
                  setPasswordPromptVisible(false);
                  setSecurityPassword("");
                }}
              >
                <Text style={styles.passwordCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.passwordConfirmButton}
                onPress={handleVerifyPassword}
              >
                <Text style={styles.passwordConfirmText}>Verificar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#EAEAEA",
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  welcome: { fontSize: 16, color: "#333333", fontWeight: "bold" },
  guestBadge: {
    fontSize: 12,
    color: "#7CB342",
    fontWeight: "bold",
    marginTop: 2,
  },
  bellContainer: { position: "relative", padding: 5 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#E53935",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EAEAEA",
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  quickActionsContainer: { marginBottom: 25 },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  quickActionButtonHalf: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    width: "48%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  quickActionButtonFull: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  quickActionText: { color: "#1E3B4D", fontSize: 15, fontWeight: "600" },
  sectionTitle: {
    fontSize: 16,
    color: "#1E3B4D",
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 5,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 5,
  },

  verTodasContainer: { flexDirection: "row", alignItems: "center" },
  verTodasLink: { color: "#7CB342", fontSize: 14, fontWeight: "600" },
  ocultarButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 5,
    marginBottom: 10,
  },
  ocultarText: { color: "#7F8C8D", fontSize: 14, fontWeight: "600" },

  whiteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardHeaderTitle: { fontSize: 18, color: "#333", fontWeight: "bold" },
  cardHeaderValue: { fontSize: 18, color: "#333", fontWeight: "bold" },
  categoryItem: { marginBottom: 15 },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  categoryName: { fontSize: 14, color: "#555", fontWeight: "500" },
  emoji: { fontSize: 16 },
  categoryValue: { fontSize: 14, color: "#333", fontWeight: "600" },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  percentageText: {
    fontSize: 12,
    color: "#888",
    textAlign: "right",
    marginTop: 4,
    fontWeight: "500",
  },
  verTodasButton: { paddingTop: 10, alignItems: "center", marginTop: 5 },
  verTodasText: { color: "#888", fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#999", marginVertical: 10 },

  transactionCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEEEEE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  transactionEmoji: { fontSize: 24 },
  transactionDetails: { flex: 1 },
  transactionName: {
    fontSize: 15,
    color: "#2C3E50",
    fontWeight: "500",
    marginBottom: 4,
  },
  transactionSubtitle: { fontSize: 13, color: "#7F8C8D" },
  transactionValue: { fontSize: 15, fontWeight: "600" },

  actionButtonMain: {
    backgroundColor: "#7CB342",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    elevation: 2,
  },
  actionButtonWarning: {
    flexDirection: "row",
    backgroundColor: "#FFCA28",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  actionButtonDanger: {
    flexDirection: "row",
    backgroundColor: "#EF5350",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" },

  billsButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
  },
  billsButtonContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  billsIconContainer: {
    backgroundColor: "rgba(124, 179, 66, 0.15)",
    padding: 10,
    borderRadius: 12,
  },
  billsTextContainer: { justifyContent: "center" },
  billsTitle: { color: "#1E3B4D", fontSize: 16, fontWeight: "bold" },
  billsSubtitle: { color: "#7F8C8D", fontSize: 13, marginTop: 2 },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    marginTop: 10,
    marginBottom: 25,
  },
  logoutButtonText: {
    color: "#E53935",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  passwordModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  passwordModalContent: {
    backgroundColor: "#FFF",
    width: "100%",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    elevation: 5,
  },
  passwordModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  passwordModalText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  passwordInput: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: "#333",
    marginBottom: 25,
    textAlign: "center",
  },
  passwordButtonRow: { flexDirection: "row", gap: 12, width: "100%" },
  passwordCancelButton: {
    flex: 1,
    backgroundColor: "#EEEEEE",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  passwordCancelText: { fontSize: 15, fontWeight: "bold", color: "#666" },
  passwordConfirmButton: {
    flex: 1,
    backgroundColor: "#E53935",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  passwordConfirmText: { fontSize: 15, fontWeight: "bold", color: "#FFF" },
});
