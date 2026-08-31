// ЗАМЕНИ значения ниже на конфиг из своего проекта Firebase:
// Firebase Console → Project settings (шестерёнка) → вкладка "General" →
// раздел "Your apps" → веб-приложение (</>) → "SDK setup and configuration" → "Config".
//
// apiKey тут — это НЕ секретный ключ, его можно спокойно публиковать в клиентском
// коде (так задумано у Firebase). Реальная защита данных — в Firestore Rules.
//
// Пока здесь заглушка — игра работает в локальном режиме (без аккаунтов и
// общего рейтинга). Как только вставишь свой конфиг и перезагрузишь страницу —
// на экране "Профиль" появится рабочая форма регистрации/входа.

const firebaseConfig = {
  apiKey: "ВСТАВЬ_СЮДА_apiKey",
  authDomain: "ВСТАВЬ_СЮДА.firebaseapp.com",
  projectId: "ВСТАВЬ_СЮДА",
  storageBucket: "ВСТАВЬ_СЮДА.appspot.com",
  messagingSenderId: "ВСТАВЬ_СЮДА",
  appId: "ВСТАВЬ_СЮДА",
};
