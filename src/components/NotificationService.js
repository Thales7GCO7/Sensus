import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Define como o app se comporta se a notificação chegar com o app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Lembretes de Contas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7CB342', // Cor do seu app Sensus
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Falha ao obter permissão para notificações push!');
    return false;
  }

  return true;
}
export async function scheduleBillAlerts(billName, dueDateText) {
  // dueDateText deve ser uma string no formato 'YYYY-MM-DD'
  
  // 1. Data do vencimento (às 08:00 da manhã)
  const dueDate = new Date(`${dueDateText}T08:00:00`);
  
  // 2. Data de véspera (1 dia antes, às 08:00 da manhã)
  const dayBefore = new Date(dueDate);
  dayBefore.setDate(dayBefore.getDate() - 1);

  const agora = new Date();

  let idBefore = null;
  let idDay = null;

  // Só agenda se a véspera for no futuro
  if (dayBefore > agora) {
    idBefore = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sensus: Conta vence amanhã! ⚠️',
        body: `Sua conta de ${billName} vence amanhã.`,
      },
      trigger: dayBefore,
    });
  }

  // Só agenda se o dia do vencimento for no futuro
  if (dueDate > agora) {
    idDay = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sensus: Vencimento Hoje! 🚨',
        body: `Sua conta de ${billName} vence hoje. Não esqueça de pagar!`,
      },
      trigger: dueDate,
    });
  }

  // Retornamos os IDs para você salvar no Firebase
  return { idBefore, idDay };
}

export async function cancelBillAlerts(idBefore, idDay) {
  if (idBefore) await Notifications.cancelScheduledNotificationAsync(idBefore);
  if (idDay) await Notifications.cancelScheduledNotificationAsync(idDay);
}