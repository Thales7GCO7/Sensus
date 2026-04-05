import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

export default function ExpensesScreen({ navigation, data }) {
  const [filterType, setFilterType] = useState('all');
  const { expenses, categories } = data;

  const filteredExpenses =
    filterType === 'all'
      ? expenses
      : expenses.filter(e => e.type === filterType);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Despesas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setFilterType('all')}
          >
            <Text
              style={[
                styles.filterText,
                filterType === 'all' && styles.filterTextActive,
              ]}
            >
              Todas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === 'geral' && styles.filterChipActive,
            ]}
            onPress={() => setFilterType('geral')}
          >
            <Text
              style={[
                styles.filterText,
                filterType === 'geral' && styles.filterTextActive,
              ]}
            >
              👥 Gerais
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === 'particular' && styles.filterChipActive,
            ]}
            onPress={() => setFilterType('particular')}
          >
            <Text
              style={[
                styles.filterText,
                filterType === 'particular' && styles.filterTextActive,
              ]}
            >
              👤 Particulares
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Expenses List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredExpenses.map(expense => {
          const category = categories.find(c => c.name === expense.category);
          return (
            <View key={expense.id} style={styles.expenseCard}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: category?.color + '20' },
                ]}
              >
                <Text style={styles.categoryEmoji}>{category?.icon}</Text>
              </View>

              <View style={styles.expenseInfo}>
                <Text style={styles.expenseName}>{expense.name}</Text>
                <Text style={styles.expenseCategory}>
                  {expense.category} •{' '}
                  {expense.type === 'geral' ? '👥 Geral' : '👤 Particular'}
                </Text>
                <Text style={styles.expenseDetails}>
                  {expense.user} • {expense.date}
                </Text>
                {expense.observation ? (
                  <View style={styles.observationBox}>
                    <Text style={styles.observationText}>
                      💬 {expense.observation}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.expenseActions}>
                <Text style={styles.expenseValue}>
                  R$ {expense.value.toFixed(2)}
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.editButton}>
                    <Ionicons name="create-outline" size={18} color={Colors.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={18} color={Colors.warning} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {filteredExpenses.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={Colors.neutral} />
            <Text style={styles.emptyTitle}>Nenhuma despesa encontrada</Text>
            <Text style={styles.emptySubtitle}>
              Adicione uma despesa para começar
            </Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={26} color={Colors.textMuted} />
          <Text style={styles.navLabel}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="wallet" size={26} color={Colors.accent} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Despesas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Reports')}
        >
          <Ionicons name="bar-chart-outline" size={26} color={Colors.textMuted} />
          <Text style={styles.navLabel}>Relatórios</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={26} color={Colors.textMuted} />
          <Text style={styles.navLabel}>Config</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  filtersContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.cardBackground,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.neutral + '40',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.secondary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterTextActive: {
    color: Colors.textLight,
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  expenseCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  expenseDetails: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  observationBox: {
    backgroundColor: Colors.neutral + '40',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  observationText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  expenseActions: {
    alignItems: 'flex-end',
  },
  expenseValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.warning,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textMuted,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 8,
    paddingTop: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  navLabelActive: {
    color: Colors.accent,
  },
});