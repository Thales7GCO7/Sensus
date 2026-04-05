import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HistoryModal({ visible, onClose, transactions = [], categories = [] }) {
  // Configura datas padrão (Hoje e 3 meses atrás)
  const today = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  const formatarParaInput = (data) => {
    const dd = String(data.getDate()).padStart(2, '0');
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const yyyy = data.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Estados dos Filtros
  const [filterType, setFilterType] = useState('todos'); // todos, receitas, despesas
  const [filterCategory, setFilterCategory] = useState('Todas as categorias');
  const [filterOrder, setFilterOrder] = useState('Mais recentes');
  
  // Novos Estados de Data
  const [startDate, setStartDate] = useState(formatarParaInput(threeMonthsAgo));
  const [endDate, setEndDate] = useState(formatarParaInput(today));

  // Controles de Dropdown
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);

  // Lista Filtrada
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  const orderOptions = ['Mais recentes', 'Mais antigas', 'Maior valor', 'Menor valor'];

  const formatarMoeda = (valor) => Number(valor).toFixed(2).replace('.', ',');

  const getCategoryDetails = (categoryName) => {
    const found = categories.find(c => c.name === categoryName);
    if (found) return { icon: found.icon || '🏷️', color: found.color || '#BDBDBD' };
    if (categoryName === 'Geral') return { icon: '📋', color: '#78909C' };
    return { icon: '🏷️', color: '#BDBDBD' }; 
  };

  // Função para formatar a digitação da data com barras "/"
  const handleDateChange = (text, setDateState) => {
    let v = text.replace(/\D/g, ''); 
    if (v.length > 8) v = v.substring(0, 8); 
    if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)/, "$1/$2");
    setDateState(v);
  };

  // Motor de Filtros e Ordenação
  useEffect(() => {
    let result = [...transactions];

    // 1. Filtro de Tipo
    if (filterType === 'receitas') result = result.filter(t => !t.isExpense);
    if (filterType === 'despesas') result = result.filter(t => t.isExpense);

    // 2. Filtro de Categoria
    if (filterCategory !== 'Todas as categorias') {
      result = result.filter(t => (t.category || 'Geral') === filterCategory);
    }

    // 3. Filtro de Data Personalizada
    if (startDate.length === 10 && endDate.length === 10) {
      const [diaI, mesI, anoI] = startDate.split('/');
      const startBanco = `${anoI}-${mesI}-${diaI}`;

      const [diaF, mesF, anoF] = endDate.split('/');
      const endBanco = `${anoF}-${mesF}-${diaF}`;

      result = result.filter(t => {
        // Pega a data formato AAAA-MM-DD
        const tDate = t.date || (t.createdAt ? t.createdAt.split('T')[0] : '');
        return tDate >= startBanco && tDate <= endBanco;
      });
    }

    // 4. Ordenação
    if (filterOrder === 'Mais recentes') result.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    if (filterOrder === 'Mais antigas') result.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
    if (filterOrder === 'Maior valor') result.sort((a, b) => b.amount - a.amount);
    if (filterOrder === 'Menor valor') result.sort((a, b) => a.amount - b.amount);

    setFilteredTransactions(result);
  }, [transactions, filterType, filterCategory, startDate, endDate, filterOrder]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.modalContent}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="filter-outline" size={24} color="#1E3B4D" />
              <Text style={styles.title}>Histórico de Transações</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Abas de Tipo (Todos / Receitas / Despesas) */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity style={[styles.tab, filterType === 'todos' && styles.tabActive]} onPress={() => setFilterType('todos')}>
              <Text style={[styles.tabText, filterType === 'todos' && styles.tabTextActive]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, filterType === 'receitas' && styles.tabActiveLight]} onPress={() => setFilterType('receitas')}>
              <Text style={[styles.tabText, filterType === 'receitas' && styles.tabTextActiveLight]}>Receitas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, filterType === 'despesas' && styles.tabActiveLight]} onPress={() => setFilterType('despesas')}>
              <Text style={[styles.tabText, filterType === 'despesas' && styles.tabTextActiveLight]}>Despesas</Text>
            </TouchableOpacity>
          </View>

          {/* Dropdown: Categorias */}
          <TouchableOpacity style={styles.dropdown} onPress={() => {setShowCategoryDropdown(!showCategoryDropdown); setShowOrderDropdown(false);}}>
            <Text style={styles.dropdownText}>{filterCategory}</Text>
            <Ionicons name="chevron-expand" size={20} color="#333" />
          </TouchableOpacity>
          {showCategoryDropdown && (
            <View style={styles.dropdownMenu}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => {setFilterCategory('Todas as categorias'); setShowCategoryDropdown(false);}}>
                  <Text style={styles.dropdownItemText}>Todas as categorias</Text>
                </TouchableOpacity>
                {categories.map(cat => (
                  <TouchableOpacity key={cat.id} style={styles.dropdownItem} onPress={() => {setFilterCategory(cat.name); setShowCategoryDropdown(false);}}>
                    <Text style={styles.dropdownItemText}>{cat.icon} {cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Dropdown: Ordenação */}
          <TouchableOpacity style={[styles.dropdown, { marginTop: 10 }]} onPress={() => {setShowOrderDropdown(!showOrderDropdown); setShowCategoryDropdown(false);}}>
            <Text style={styles.dropdownText}>{filterOrder}</Text>
            <Ionicons name="chevron-expand" size={20} color="#333" />
          </TouchableOpacity>
          {showOrderDropdown && (
            <View style={styles.dropdownMenu}>
              {orderOptions.map(option => (
                <TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => {setFilterOrder(option); setShowOrderDropdown(false);}}>
                  <Text style={styles.dropdownItemText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Novo Filtro de Datas no lugar das Pílulas */}
          <View style={styles.filterDateRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data Inicial</Text>
              <TextInput
                style={styles.inputDate}
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
                style={styles.inputDate}
                value={endDate}
                onChangeText={(t) => handleDateChange(t, setEndDate)}
                keyboardType="numeric"
                maxLength={10}
                placeholder="DD/MM/AAAA"
              />
            </View>
          </View>

          {/* Lista de Transações Limpa */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.listContainer}>
            {filteredTransactions.map((t, index) => {
              const { icon, color } = getCategoryDetails(t.category);
              const isExpense = t.isExpense;
              const itemName = t.name || t.description || 'Transação';
              const displayDate = t.date?.split('-').reverse().join('/') || '';

              return (
                <View key={t.id || index} style={styles.transactionCard}>
                  <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                    <Text style={styles.transactionEmoji}>{isExpense ? icon : '📈'}</Text>
                  </View>
                  
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionName} numberOfLines={1}>{itemName}</Text>
                    <View style={styles.subtitleRow}>
                      <Text style={styles.transactionSubtitle}>{displayDate} • {t.category || 'Receita'}</Text>
                      {isExpense && t.type && (
                        <View style={styles.tag}><Text style={styles.tagText}>{t.type === 'geral' ? 'Geral' : 'Part.'}</Text></View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.actionColumn}>
                    <Text style={[styles.transactionValue, { color: isExpense ? '#EF5350' : '#7CB342' }]}>
                      {isExpense ? '- ' : ''}R$ {formatarMoeda(t.amount)}
                    </Text>
                  </View>
                </View>
              );
            })}

            {filteredTransactions.length === 0 && (
              <Text style={styles.emptyText}>Nenhuma transação encontrada para este período.</Text>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Botão Fechar do Rodapé */}
          <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
            <Text style={styles.footerBtnText}>Fechar</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  backdrop: { flex: 1 },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 25, paddingHorizontal: 20, paddingBottom: 30, height: '90%', elevation: 10 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E3B4D' },
  closeBtn: { padding: 5 },
  closeBtnText: { fontSize: 20, color: '#333', fontWeight: 'bold' },

  tabsContainer: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 12, padding: 4, marginBottom: 15 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#1E3B4D' },
  tabActiveLight: { backgroundColor: '#E0E0E0' },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#666' },
  tabTextActive: { color: '#FFF' },
  tabTextActiveLight: { color: '#333' },

  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12 },
  dropdownText: { fontSize: 14, color: '#333', fontWeight: '500' },
  dropdownMenu: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, marginTop: 5, padding: 5, elevation: 3, zIndex: 10 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemText: { fontSize: 14, color: '#333' },

  filterDateRow: { flexDirection: 'row', gap: 10, marginTop: 15, marginBottom: 10 },
  inputGroup: { flex: 1 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5, marginLeft: 2 },
  inputDate: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', textAlign: 'center' },

  listContainer: { flex: 1, marginTop: 10 },
  transactionCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionEmoji: { fontSize: 22 },
  transactionDetails: { flex: 1, justifyContent: 'center' },
  transactionName: { fontSize: 15, color: '#333', fontWeight: 'bold', marginBottom: 4 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  transactionSubtitle: { fontSize: 11, color: '#888' },
  tag: { backgroundColor: '#1E3B4D', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8 },
  tagText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  
  actionColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  transactionValue: { fontSize: 15, fontWeight: 'bold' },

  emptyText: { textAlign: 'center', color: '#999', marginTop: 30, fontSize: 14 },
  
  footerBtn: { backgroundColor: '#7CB342', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  footerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});