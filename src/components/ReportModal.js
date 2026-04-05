import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ReportModal({ visible, onClose, incomes = [], expenses = [], categories = [] }) {
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

  // Estados de dados processados
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [qtdReceitas, setQtdReceitas] = useState(0);
  const [qtdDespesas, setQtdDespesas] = useState(0);

  const formatarMoeda = (valor) => Number(valor).toFixed(2).replace('.', ',');

  const getCategoryDetails = (categoryName) => {
    const found = categories.find(c => c.name === categoryName);
    return { icon: found?.icon || '🏷️', color: found?.color || '#BDBDBD' };
  };

  const handleDateChange = (text, setDateState) => {
    let v = text.replace(/\D/g, ''); 
    if (v.length > 8) v = v.substring(0, 8); 
    if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)/, "$1/$2");
    setDateState(v);
  };

  // Motor de Filtro (Igual ao das Estatísticas)
  useEffect(() => {
    if (startDate.length !== 10 || endDate.length !== 10) return;

    const [diaI, mesI, anoI] = startDate.split('/');
    const startBanco = `${anoI}-${mesI}-${diaI}`;
    const [diaF, mesF, anoF] = endDate.split('/');
    const endBanco = `${anoF}-${mesF}-${diaF}`;

    const filteredIncomes = incomes.filter(t => {
      const d = t.date || t.createdAt.split('T')[0];
      return d >= startBanco && d <= endBanco;
    });
    
    const filteredExpenses = expenses.filter(t => {
      const d = t.date || t.createdAt.split('T')[0];
      return d >= startBanco && d <= endBanco;
    });

    setQtdReceitas(filteredIncomes.length);
    setQtdDespesas(filteredExpenses.length);

    const sumInc = filteredIncomes.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const sumExp = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    setTotalReceitas(sumInc);
    setTotalDespesas(sumExp);

    const catMap = {};
    filteredExpenses.forEach(exp => {
      const cat = exp.category || 'Geral';
      if (!catMap[cat]) catMap[cat] = 0;
      catMap[cat] += Number(exp.amount);
    });

    const catArr = Object.keys(catMap).map(key => ({
      name: key,
      total: catMap[key],
      percentage: sumExp > 0 ? (catMap[key] / sumExp) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    setCategoryData(catArr);

  }, [incomes, expenses, startDate, endDate]);

  const saldo = totalReceitas - totalDespesas;
  const dataHojeStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth()+1).padStart(2, '0')}/${today.getFullYear()}`;

  // --- MOTOR GERADOR DE PDF ---
  const handleGeneratePDF = async () => {
    try {
      // Cria a tabela de categorias em HTML
      let categoriesHTML = '';
      categoryData.forEach(cat => {
        categoriesHTML += `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #EEE; padding-bottom: 5px;">
            <span style="color: #555; font-size: 14px;">${cat.name}</span>
            <span style="color: #333; font-weight: bold; font-size: 14px;">R$ ${formatarMoeda(cat.total)} (${cat.percentage.toFixed(0)}%)</span>
          </div>
        `;
      });

      // Template HTML do PDF
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              h1 { color: #1E3B4D; text-align: center; margin-bottom: 5px; }
              p.subtitle { text-align: center; color: #888; font-size: 14px; margin-top: 0; margin-bottom: 40px; }
              .summary-container { display: flex; justify-content: space-between; margin-bottom: 40px; }
              .card { width: 30%; padding: 20px; border-radius: 10px; text-align: center; }
              .card-green { background-color: #E8F5E9; border: 1px solid #C8E6C9; }
              .card-red { background-color: #FFEBEE; border: 1px solid #FFCDD2; }
              .card-gray { background-color: #F5F5F5; border: 1px solid #E0E0E0; }
              .card-title { font-size: 14px; color: #666; margin-bottom: 10px; }
              .card-value { font-size: 20px; font-weight: bold; }
              .val-green { color: #4CAF50; }
              .val-red { color: #F44336; }
              .val-gray { color: #607D8B; }
              h2 { color: #1E3B4D; border-bottom: 2px solid #1E3B4D; padding-bottom: 10px; margin-bottom: 20px; }
              .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #AAA; }
            </style>
          </head>
          <body>
            <h1>Relatório Financeiro</h1>
            <p class="subtitle">Período: ${startDate} a ${endDate} <br/> Gerado em: ${dataHojeStr}</p>
            
            <div class="summary-container">
              <div class="card card-green">
                <div class="card-title">Receitas</div>
                <div class="card-value val-green">R$ ${formatarMoeda(totalReceitas)}</div>
              </div>
              <div class="card card-red">
                <div class="card-title">Despesas</div>
                <div class="card-value val-red">R$ ${formatarMoeda(totalDespesas)}</div>
              </div>
              <div class="card card-gray">
                <div class="card-title">Saldo</div>
                <div class="card-value val-gray">R$ ${formatarMoeda(saldo)}</div>
              </div>
            </div>

            <h2>Despesas por Categoria</h2>
            ${categoriesHTML || '<p style="color:#999; text-align:center;">Nenhuma despesa registrada neste período.</p>'}

            <div class="footer">
              Total de transações: ${qtdReceitas + qtdDespesas} (${qtdReceitas} receitas • ${qtdDespesas} despesas)<br/>
              Gerado automaticamente pelo Aplicativo de Gestão Financeira
            </div>
          </body>
        </html>
      `;

      // Gera o PDF a partir do HTML
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Abre a janela para o usuário salvar/compartilhar (ex: enviar pro WhatsApp)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert('Erro', 'O compartilhamento não está disponível neste dispositivo.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Ocorreu um erro ao gerar o PDF.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.modalContent}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="document-text-outline" size={24} color="#1E3B4D" />
              <Text style={styles.title}>Gerar Relatório</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Selecione o período e baixe um relatório completo em PDF</Text>

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

            {/* PREVIEW DO RELATÓRIO (MOCKUP) */}
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Relatório Financeiro</Text>
              <Text style={styles.previewSubtitle}>Gerado em {dataHojeStr}</Text>

              <View style={styles.summaryRow}>
                <View style={[styles.summaryBox, { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }]}>
                  <Text style={styles.summaryBoxLabel}>Receitas</Text>
                  <Text style={[styles.summaryBoxValue, { color: '#4CAF50' }]}>R$ {formatarMoeda(totalReceitas)}</Text>
                </View>
                <View style={[styles.summaryBox, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}>
                  <Text style={styles.summaryBoxLabel}>Despesas</Text>
                  <Text style={[styles.summaryBoxValue, { color: '#F44336' }]}>R$ {formatarMoeda(totalDespesas)}</Text>
                </View>
                <View style={[styles.summaryBox, { backgroundColor: '#E0F2F1', borderColor: '#B0BEC5' }]}>
                  <Text style={styles.summaryBoxLabel}>Saldo</Text>
                  <Text style={[styles.summaryBoxValue, { color: '#607D8B' }]}>R$ {formatarMoeda(saldo)}</Text>
                </View>
              </View>

              <Text style={styles.previewSectionTitle}>Despesas por Categoria</Text>
              {categoryData.slice(0, 4).map((cat, index) => {
                const { icon, color } = getCategoryDetails(cat.name);
                return (
                  <View key={index} style={styles.categoryItem}>
                    <View style={styles.categoryRow}>
                      <Text style={styles.categoryName}>{icon}  {cat.name}</Text>
                      <Text style={styles.categoryValue}>R$ {formatarMoeda(cat.total)}</Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: `${cat.percentage}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.percentageText}>{cat.percentage.toFixed(0)}%</Text>
                  </View>
                );
              })}
              {categoryData.length > 4 && <Text style={styles.moreCategoriesText}>+ {categoryData.length - 4} categorias no PDF...</Text>}
              {categoryData.length === 0 && <Text style={styles.emptyText}>Nenhuma despesa no período.</Text>}

              <View style={styles.previewFooter}>
                <Text style={styles.previewFooterText}>Total de transações: {qtdReceitas + qtdDespesas}</Text>
                <Text style={styles.previewFooterSub}>{qtdReceitas} receitas • {qtdDespesas} despesas</Text>
              </View>
            </View>

            {/* BOTÕES DE AÇÃO */}
            <TouchableOpacity style={styles.downloadBtn} onPress={handleGeneratePDF}>
              <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.downloadBtnText}>Baixar Relatório em PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
              <Text style={styles.footerBtnText}>Fechar</Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }, backdrop: { flex: 1 },
  modalContent: { backgroundColor: '#F0F2F5', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 25, paddingHorizontal: 20, paddingBottom: 20, height: '92%', elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }, headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { fontSize: 18, fontWeight: 'bold', color: '#1E3B4D' },
  closeBtn: { padding: 5 }, closeBtnText: { fontSize: 20, color: '#333', fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 20 },
  
  filterDateRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  inputGroup: { flex: 1 }, label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5, marginLeft: 2 },
  inputDate: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', textAlign: 'center' },
  
  // PREVIEW CARD STYLES
  previewCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 20 },
  previewTitle: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  previewSubtitle: { textAlign: 'center', fontSize: 11, color: '#888', marginBottom: 15 },
  
  summaryRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  summaryBox: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  summaryBoxLabel: { fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 4 },
  summaryBoxValue: { fontSize: 13, fontWeight: 'bold' },

  previewSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  categoryItem: { marginBottom: 12 }, categoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }, categoryName: { fontSize: 12, color: '#333', fontWeight: '500' }, categoryValue: { fontSize: 12, color: '#333', fontWeight: 'bold' },
  progressBarBackground: { height: 6, backgroundColor: '#EEEEEE', borderRadius: 3, overflow: 'hidden' }, progressBarFill: { height: '100%', borderRadius: 3 }, percentageText: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 2, fontWeight: 'bold' },
  moreCategoriesText: { fontSize: 11, color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 5 },
  emptyText: { color: '#999', textAlign: 'center', fontSize: 12, marginVertical: 10 },

  previewFooter: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15, marginTop: 15, alignItems: 'center' },
  previewFooterText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  previewFooterSub: { fontSize: 11, color: '#888', marginTop: 2 },

  // BOTÕES
  downloadBtn: { flexDirection: 'row', backgroundColor: '#7CB342', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10, elevation: 2 },
  downloadBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  footerBtn: { backgroundColor: '#E0E0E0', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  footerBtnText: { color: '#666', fontSize: 16, fontWeight: 'bold' }
});