import type { FirebaseOptions } from 'firebase/app';

/**
 * Конфиг веб-приложения Firebase (console.firebase.google.com → Настройки проекта → Ваши приложения).
 * Ключи здесь не секретные: доступ ограничивают правила базы (см. README).
 * Если поставить null — пульт и экран общаются через BroadcastChannel, только в одном браузере (для проверки).
 */
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyAEeAiGSsGc9gmb4hMvZbhXW1xcI04hv8E',
  authDomain: 'presentation-9b671.firebaseapp.com',
  databaseURL: 'https://presentation-9b671-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'presentation-9b671',
  storageBucket: 'presentation-9b671.firebasestorage.app',
  messagingSenderId: '138620770528',
  appId: '1:138620770528:web:58943d2f0c4d2a944b1885',
};
