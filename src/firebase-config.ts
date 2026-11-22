import type { FirebaseOptions } from 'firebase/app';

/**
 * Конфиг веб-приложения Firebase (console.firebase.google.com → Настройки проекта → Ваши приложения).
 * Ключи здесь не секретные: доступ ограничивают правила базы (см. README).
 * Пока null — пульт и экран общаются через BroadcastChannel, только в одном браузере (для проверки).
 */
export const firebaseConfig: FirebaseOptions | null = null;
