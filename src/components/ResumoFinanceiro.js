import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const formatarMoeda = (valor) => {
  return Number(valor)
    .toFixed(2)
    .replace(".", ",")
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
};

const getDate = (item) => {
  return item.date || (item.createdAt ? item.createdAt.split("T")[0] : null);
};

const toNumberSafe = (value) => {
  const n = Number(value);
  return isNaN(n) || !isFinite(n) ? 0 : n;
};

// Substitui a função sanitizeArray atual
const sanitizeArray = (arr) => {
  if (!arr || arr.length === 0) return [0];
  const clean = arr.map((v) => (isNaN(v) || !isFinite(v) ? 0 : v));
  // Garante pelo menos um valor não-zero para evitar divisão por zero
  return clean;
};

export default function ResumoFinanceiro({
  saldo,
  incomes = [],
  expenses = [],
}) {
  const { labels, incomeValues, expenseValues } = useMemo(() => {
    const mapIncome = {};
    const mapExpense = {};

    incomes.forEach((item) => {
      const date = getDate(item);
      if (!date) return;
      mapIncome[date] = (mapIncome[date] || 0) + toNumberSafe(item.amount);
    });

    expenses.forEach((item) => {
      const date = getDate(item);
      if (!date) return;
      mapExpense[date] = (mapExpense[date] || 0) + toNumberSafe(item.amount);
    });

    const allDates = Array.from(
      new Set([...Object.keys(mapIncome), ...Object.keys(mapExpense)]),
    )
      .filter(Boolean)
      .sort();

    // 🔥 GUARD: sem dados, retorna placeholder
    if (allDates.length === 0) {
      return {
        labels: ["--"],
        incomeValues: [0],
        expenseValues: [0],
      };
    }

    const labels = allDates.map((date) => {
      const d = new Date(date + "T00:00:00"); // 🔥 força timezone local
      return `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1,
      ).padStart(2, "0")}`;
    });

    return {
      labels,
      incomeValues: allDates.map((date) => mapIncome[date] || 0),
      expenseValues: allDates.map((date) => mapExpense[date] || 0),
    };
  }, [incomes, expenses]);

  // 🔥 AQUI ESTÁ O "ZOOM"
  // Quanto mais dados, mais largo fica o gráfico (scroll horizontal)
  const dynamicWidth = Math.max(screenWidth, labels.length * 60);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Saldo Total Atual</Text>
      <Text style={styles.saldoValue}>R$ {formatarMoeda(saldo)}</Text>

      <View style={styles.chartTitleRow}>
        <Ionicons name="trending-up" size={16} color="#A0B4B7" />
        <Text style={styles.chartTitle}>Receitas vs Despesas</Text>
      </View>

      {/* 🔥 SCROLL = ZOOM */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{
            labels: labels,
            datasets: [
              {
                data: sanitizeArray(incomeValues),
                color: () => "#4CAF50",
                strokeWidth: 3,
              },
              {
                data: sanitizeArray(expenseValues),
                color: () => "#E53935",
                strokeWidth: 3,
              },
            ],
            legend: ["Receitas", "Despesas"],
          }}
          width={dynamicWidth}
          height={220}
          yAxisLabel="R$ "
          chartConfig={{
            backgroundGradientFrom: "#FFFFFF",
            backgroundGradientTo: "#FFFFFF",
            decimalPlaces: 0,
            color: () => "#333",
            labelColor: () => "#666",
            propsForDots: {
              r: "4",
            },
          }}
          bezier
          style={{
            borderRadius: 12,
          }}
        />
      </ScrollView>

      <View style={styles.axisXRow}>
        <Text style={styles.axisXText}>
          Arraste para o lado → (zoom automático)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E3B4D",
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
    elevation: 6,
  },

  title: {
    color: "#A0B4B7",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  saldoValue: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "bold",
    marginBottom: 25,
  },

  chartTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 15,
  },

  chartTitle: {
    color: "#A0B4B7",
    fontSize: 14,
    fontWeight: "600",
  },

  axisXRow: {
    width: "100%",
    marginTop: 10,
    alignItems: "center",
  },

  axisXText: {
    color: "#8CA5A8",
    fontSize: 12,
    fontWeight: "600",
  },
});
