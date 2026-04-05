import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

export default function ReportsScreen({ navigation, userRole, data }) {
  const { expenses, categories, members } = data;
  const selectedMonth = 'Outubro 2025';

  // Cálculos
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.value, 0);
  const generalExpenses = expenses
    .filter(exp => exp.type === 'geral')
    .reduce((sum, exp) => sum + exp.value, 0);
  const myShare = generalExpenses / members.filter(m => !m.pending).length;

  // Totais por categoria
  const categoryTotals = categories
    .map(cat => ({
      ...cat,
      total: expenses
        .filter(e => e.category === cat.name)
        .reduce((sum, e) => sum + e.value, 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  // Totais por membro
  const memberTotals = members
    .filter(m => !m.pending)
    .map(member => ({
      ...member,
      total: expenses
        .filter(e => e.user === member.name)
        .reduce((sum, e) => sum + e.value, 0),
      count: expenses.filter(e => e.user === member.name).length,
    }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={Colors.gradientSuccess} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Relatórios</Text>
            {userRole === 'admin' && (
              <TouchableOpacity style={styles.exportButton}>
                <Ionicons name="download-outline" size={20} color={Colors.textLight} />
                <Text style={styles.exportText}>Exportar</Text>
              </TouchableOpacity>
            )}
            {userRole !== 'admin' && <View style={{ width: 40 }} />}
          </View>
          <Text style={styles.headerSubtitle}>{selectedMonth}</Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Geral</Text>
              <Text style={styles.summaryValue}>
                R$ {totalExpenses.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardAccent]}>
              <Text style={styles.summaryLabel}>Por Pessoa</Text>
              <Text style={[styles.summaryValue, styles.summaryValueAccent]}>
                R$ {myShare.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Category Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gastos por Categoria</Text>
            {categoryTotals.map(cat => (
              <View key={cat.id} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLeft}>
                    <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </View>
                  <Text style={styles.categoryValue}>
                    R$ {cat.total.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(cat.total / totalExpenses) * 100}%`,
                        backgroundColor: cat.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Member Contribution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contribuição por Membro</Text>
            {memberTotals.map(member => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{member.avatar}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberCount}>
                    {member.count} lançamentos
                  </Text>
                </View>
                <View style={styles.memberStats}>
                  <Text style={styles.memberTotal}>
                    R$ {member.total.toFixed(2)}
                  </Text>
                  <Text style={styles.memberPercent}>
                    {((member.total / totalExpenses) * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Close Period Button - Admin Only */}
          {userRole === 'admin' && (
            <TouchableOpacity style={styles.closePeriodButton} activeOpacity={0.8}>
              <Ionicons name="document-text" size={24} color={Colors.textLight} />
              <Text style={styles.closePeriodText}>
                Fechar Período e Gerar Relatório
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 80 }} />
        </View>
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
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Expenses')}
        >
          <Ionicons name="wallet-outline" size={26} color={Colors.textMuted} />
          <Text style={styles.navLabel}>Despesas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="bar-chart" size={26} color={Colors.accent} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Relatórios</Text>
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
    padding: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  exportText: {
    color: Colors.textLight,
    fontSize: 13,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardAccent: {
    backgroundColor: Colors.secondaryLight,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  summaryValueAccent: {
    color: Colors.secondary,
  },
  section: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.neutral,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  memberStats: {
    alignItems: 'flex-end',
  },
  memberTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.warning,
    marginBottom: 2,
  },
  memberPercent: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  closePeriodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    marginTop: 8,
  },
  closePeriodText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
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