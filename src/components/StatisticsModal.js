import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function StatisticsModal({ visible, onClose, incomes = [], expenses = [], categories = [] }) {
  const today = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  const formatarParaInput = (data) => {
    const dd = String(data.getDate()).padStart(2, '0');
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const yyyy = data.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const [startDate, setStartDate] = useState(formatarParaInput(threeMonthsAgo));
  const [endDate, setEndDate] = useState(formatarParaInput(today));

  // Dados processados
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState([]);

  const formatarMoeda = (valor) => Number(valor).toFixed(2).replace('.', ',');

  const getCategoryColor = (categoryName) => {
    const found = categories.find(c => c.name === categoryName);
    return found ? found.color : '#BDBDBD';
  };
  const getCategoryIcon = (categoryName) => {
    const found = categories.find(c => c.name === categoryName);
    return found ? found.icon : '🏷️';
  };

  const handleDateChange = (text, setDateState) => {
    let v = text.replace(/\D/g, ''); 
    if (v.length > 8) v = v.substring(0, 8); 
    if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)/, "$1/$2");
    setDateState(v);
  };

  useEffect(() => {
    if (startDate.length !== 10 || endDate.length !== 10) return;

    const [diaI, mesI, anoI] = startDate.split('/');
    const startBanco = `${anoI}-${mesI}-${diaI}`;
    const [diaF, mesF, anoF] = endDate.split('/');
    const endBanco = `${anoF}-${mesF}-${diaF}`;

    // 1. Filtrar transações pelo período
    const filteredIncomes = incomes.filter(t => {
      const d = t.date || t.createdAt.split('T')[0];
      return d >= startBanco && d <= endBanco;
    });
    
    const filteredExpenses = expenses.filter(t => {
      const d = t.date || t.createdAt.split('T')[0];
      return d >= startBanco && d <= endBanco;
    });

    // 2. Calcular Totais
    const sumInc = filteredIncomes.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const sumExp = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    setTotalReceitas(sumInc);
    setTotalDespesas(sumExp);

    // 3. Preparar Dados do Gráfico de Pizza (Despesas por Categoria)
    const catMap = {};
    filteredExpenses.forEach(exp => {
      const cat = exp.category || 'Geral';
      if (!catMap[cat]) catMap[cat] = 0;
      catMap[cat] += Number(exp.amount);
    });

    const pieArr = Object.keys(catMap).map(key => ({
      name: key,
      population: catMap[key],
      color: getCategoryColor(key),
      icon: getCategoryIcon(key),
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    })).sort((a, b) => b.population - a.population);
    setPieData(pieArr);

    // 4. Preparar Dados do Gráfico de Barras (Meses)
    const monthMap = {};
    const getMonthKey = (dateStr) => dateStr.substring(0, 7); // "YYYY-MM"
    
    filteredIncomes.forEach(inc => {
      const mk = getMonthKey(inc.date || inc.createdAt);
      if(!monthMap[mk]) monthMap[mk] = { income: 0, expense: 0 };
      monthMap[mk].income += Number(inc.amount);
    });
    
    filteredExpenses.forEach(exp => {
      const mk = getMonthKey(exp.date || exp.createdAt);
      if(!monthMap[mk]) monthMap[mk] = { income: 0, expense: 0 };
      monthMap[mk].expense += Number(exp.amount);
    });

    const barArr = Object.keys(monthMap).sort().map(key => {
      const [y, m] = key.split('-');
      const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return {
        label: `${monthNames[parseInt(m)-1]} ${y.slice(2)}`,
        income: monthMap[key].income,
        expense: monthMap[key].expense
      };
    });
    setBarData(barArr);

  }, [incomes, expenses, startDate, endDate]);

  const saldo = totalReceitas - totalDespesas;
  const maxBarValue = Math.max(...barData.map(d => Math.max(d.income, d.expense)), 1); // Evita divisão por zero
  const MAX_BAR_HEIGHT = 150;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="stats-chart" size={24} color="#1E3B4D" />
              <Text style={styles.title}>Estatísticas</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={styles.closeBtnText}>X</Text></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Filtro de Datas Personalizado */}
            <View style={styles.filterDateRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Data Inicial</Text>
                <TextInput style={styles.inputDate} value={startDate} onChangeText={(t) => handleDateChange(t, setStartDate)} keyboardType="numeric" maxLength={10} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Data Final</Text>
                <TextInput style={styles.inputDate} value={endDate} onChangeText={(t) => handleDateChange(t, setEndDate)} keyboardType="numeric" maxLength={10} />
              </View>
            </View>

            {/* Cards de Resumo */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#7CB342' }]}>
                <Text style={styles.summaryCardTitle}>Receitas</Text>
                <Text style={styles.summaryCardValue}>R$ {formatarMoeda(totalReceitas)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#EF5350' }]}>
                <Text style={styles.summaryCardTitle}>Despesas</Text>
                <Text style={styles.summaryCardValue}>R$ {formatarMoeda(totalDespesas)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#1E3B4D' }]}>
                <Text style={styles.summaryCardTitle}>Saldo</Text>
                <Text style={styles.summaryCardValue}>R$ {formatarMoeda(saldo)}</Text>
              </View>
            </View>

            {/* Gráfico de Pizza - Despesas */}
            <Text style={styles.sectionTitle}>Despesas por Categoria</Text>
            {pieData.length > 0 ? (
              <View style={styles.pieContainer}>
                <PieChart
                  data={pieData}
                  width={screenWidth - 40}
                  height={180}
                  chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={(screenWidth / 4 - 30).toString()} // Centraliza a pizza
                  hasLegend={false} 
                />
                
                {/* Legenda Customizada idêntica ao design */}
                <View style={styles.customLegendContainer}>
                  {pieData.map((item, index) => {
                    const percentage = ((item.population / totalDespesas) * 100).toFixed(0);
                    return (
                      <View key={index} style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.icon} {item.name}</Text>
                        <Text style={[styles.legendPercentage, { color: item.color }]}>{percentage}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text style={styles.emptyText}>Nenhuma despesa no período.</Text>
            )}

            {/* Gráfico de Barras - Receitas vs Despesas */}
            <Text style={styles.sectionTitle}>Receitas vs Despesas (Período)</Text>
            {barData.length > 0 ? (
              <View style={styles.barChartContainer}>
                <View style={styles.chartArea}>
                  {barData.map((dataPoint, index) => {
                    const incHeight = (dataPoint.income / maxBarValue) * MAX_BAR_HEIGHT;
                    const expHeight = (dataPoint.expense / maxBarValue) * MAX_BAR_HEIGHT;
                    return (
                      <View key={index} style={styles.barGroup}>
                        <View style={styles.bars}>
                          <View style={[styles.bar, styles.barIncome, { height: incHeight || 5 }]} />
                          <View style={[styles.bar, styles.barExpense, { height: expHeight || 5 }]} />
                        </View>
                        <Text style={styles.barLabel}>{dataPoint.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text style={styles.emptyText}>Nenhuma movimentação no período.</Text>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }, backdrop: { flex: 1 },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 25, paddingHorizontal: 20, paddingBottom: 20, height: '92%', elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }, headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { fontSize: 18, fontWeight: 'bold', color: '#1E3B4D' },
  closeBtn: { padding: 5 }, closeBtnText: { fontSize: 20, color: '#333', fontWeight: 'bold' },
  
  filterDateRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  inputGroup: { flex: 1 }, label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5, marginLeft: 2 },
  inputDate: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', textAlign: 'center' },
  
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 25 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'flex-start', justifyContent: 'center' },
  summaryCardTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  summaryCardValue: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  emptyText: { color: '#999', textAlign: 'center', marginBottom: 20 },

  pieContainer: { alignItems: 'center', marginBottom: 30 },
  customLegendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 15, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  legendColorBox: { width: 12, height: 12, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: '#555', marginRight: 6 },
  legendPercentage: { fontSize: 12, fontWeight: 'bold' },

  barChartContainer: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#EEE' },
  chartArea: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 180, paddingBottom: 25 },
  barGroup: { alignItems: 'center', width: 50 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 150 },
  bar: { width: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barIncome: { backgroundColor: '#7CB342' },
  barExpense: { backgroundColor: '#EF5350' },
  barLabel: { position: 'absolute', bottom: -20, fontSize: 11, color: '#666', width: 60, textAlign: 'center' }
});