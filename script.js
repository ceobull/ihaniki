'use strict';

/* =========================================================================
   ihaniki — static data
   ========================================================================= */

const USERS_KEY = 'ihaniki_users_v2';
const ACTIVE_KEY = 'ihaniki_active_user_v2';
const BOTS_KEY = 'ihaniki_lb_bots_v2';

const RARITY_INFO = {
  common: { label: 'Обычный', color: '#9aa0a8', dupValue: 40 },
  rare:   { label: 'Редкий',   color: '#6fa8ff', dupValue: 120 },
  epic:   { label: 'Эпический', color: '#c58aff', dupValue: 300 },
};

const CHAR_DB = [
  { id: 'ronin',   name: 'Ронин',    rarity: 'common', attackType: 'melee',  color: '#e8c987', baseHp: 100, baseDamage: 14, speed: 175, range: 78,  desc: 'Быстрый клинок ближнего боя.' },
  { id: 'strelok', name: 'Стрелок',  rarity: 'common', attackType: 'ranged', color: '#8fb3ff', baseHp: 75,  baseDamage: 10, speed: 165, range: 300, desc: 'Лёгкий лук, стабильный урон издалека.' },
  { id: 'golem',   name: 'Голем',    rarity: 'rare',   attackType: 'melee',  color: '#a39c8f', baseHp: 190, baseDamage: 11, speed: 120, range: 90,  desc: 'Толстая шкура, медленные тяжёлые удары.' },
  { id: 'shaman',  name: 'Шаман',    rarity: 'rare',   attackType: 'ranged', color: '#b98aff', baseHp: 95,  baseDamage: 16, speed: 150, range: 260, desc: 'Плетёт заряды порчи по площади.' },
  { id: 'ghost',   name: 'Призрак',  rarity: 'epic',   attackType: 'melee',  color: '#5fe0c8', baseHp: 115, baseDamage: 22, speed: 210, range: 74,  desc: 'Мелькает между врагами почти неуловимо.' },
  { id: 'ranger',  name: 'Егерь',    rarity: 'epic',   attackType: 'ranged', color: '#ff9a6b', baseHp: 90,  baseDamage: 28, speed: 140, range: 380, desc: 'Разит на дистанции, куда не дотянуться.' },
];

const BOX_DB = [
  { id: 'field',   name: 'Полевой ящик',   icon: '📦', cost: 120, odds: { common: 0.68, rare: 0.27, epic: 0.05 } },
  { id: 'assault', name: 'Штурмовой ящик', icon: '🗝️', cost: 450, odds: { common: 0.30, rare: 0.50, epic: 0.20 } },
];

const MAX_LEVEL = 10;
const HP_PER_LEVEL = 0.12;
const DMG_PER_LEVEL = 0.10;
const SPEED_PER_LEVEL = 0.03;
const LEVEL_COST_BASE = 60;

const AVATAR_COLORS = ['#e8dcc8', '#8fd3ff', '#ff8f6b', '#c58aff', '#6be0b0', '#ff6b8f', '#f2b04a', '#9aa0a8'];
const AVATAR_ICONS = ['🙂', '🦊', '🐺', '🦉', '💀', '🔥', '🌙', '⚡', '🐍', '🌲'];
const THEMES = [
  { id: 'sand',   color: '#e8dcc8', label: 'Песок' },
  { id: 'ice',    color: '#8fd3ff', label: 'Лёд' },
  { id: 'ember',  color: '#ff8f6b', label: 'Пламя' },
  { id: 'violet', color: '#c58aff', label: 'Фиалка' },
  { id: 'mint',   color: '#6be0b0', label: 'Мята' },
];

const BOT_NAMES = ['Тень', 'Барсук', 'Феникс09', 'НочнойЛовчий', 'Кора', 'Ветер', 'Ирбис', 'sable_x', 'Уголёк', 'Стая'];

function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* =========================================================================
   multi-user profile storage
   ========================================================================= */

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}
function persistUsers(list) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}
function newUserId() { return 'u_' + Math.random().toString(36).slice(2, 9); }

function defaultUserSave() {
  return {
    coins: 150,
    selected: 'ronin',
    characters: { ronin: { owned: true, level: 1 } },
    bestWave: 0,
    bestCoinsRun: 0,
  };
}

function createUser(nickname) {
  const list = loadUsers();
  const user = {
    id: newUserId(),
    nickname: (nickname || ('Игрок' + (list.length + 1))).slice(0, 16),
    avatarColor: pick(AVATAR_COLORS),
    avatarIcon: pick(AVATAR_ICONS),
    theme: 'sand',
    createdAt: Date.now(),
    save: defaultUserSave(),
  };
  list.push(user);
  persistUsers(list);
  localStorage.setItem(ACTIVE_KEY, user.id);
  return user;
}

let users = loadUsers();
if (users.length === 0) createUser('Игрок');
users = loadUsers();
let activeId = localStorage.getItem(ACTIVE_KEY);
if (!users.find((u) => u.id === activeId)) activeId = users[0].id;
let currentUser = users.find((u) => u.id === activeId);
let save = currentUser.save;

function persist() {
  if (currentUser.isCloud) { persistCloud(); return; }
  const list = loadUsers();
  const idx = list.findIndex((u) => u.id === currentUser.id);
  if (idx >= 0) list[idx] = currentUser; else list.push(currentUser);
  persistUsers(list);
  localStorage.setItem(ACTIVE_KEY, currentUser.id);
}

function switchUser(id) {
  const list = loadUsers();
  const u = list.find((x) => x.id === id);
  if (!u) return;
  currentUser = u;
  save = currentUser.save;
  activeId = id;
  localStorage.setItem(ACTIVE_KEY, id);
  applyTheme(currentUser.theme || 'sand');
  renderAll();
}

function deleteUser(id) {
  let list = loadUsers();
  if (list.length <= 1) return; // keep at least one profile
  list = list.filter((u) => u.id !== id);
  persistUsers(list);
  if (currentUser.id === id) switchUser(list[0].id);
  else renderAll();
}

function applyTheme(themeId) {
  const t = THEMES.find((x) => x.id === themeId) || THEMES[0];
  document.documentElement.style.setProperty('--accent', t.color);
  document.documentElement.style.setProperty('--accent-dim', t.color + '59');
}

/* =========================================================================
   Firebase cloud accounts (optional — degrades gracefully if not configured)
   ========================================================================= */

let fbAuth = null;
let fbDb = null;
let cloudReady = false;
let cloudUid = null;
let localBackup = null; // holds the local guest currentUser/save while a cloud account is active
let cloudSaveTimer = null;

function initFirebaseIfConfigured() {
  const hasConfig = typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('ВСТАВЬ');
  const hasSdk = typeof firebase !== 'undefined';
  if (!hasConfig || !hasSdk) {
    setCloudStatus(!hasSdk
      ? 'Не удалось загрузить Firebase SDK (проверь интернет).'
      : 'Облако ещё не настроено — вставь конфиг в firebase-config.js.');
    return;
  }
  try {
    firebase.initializeApp(firebaseConfig);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    cloudReady = true;
    fbAuth.onAuthStateChanged(onCloudAuthChanged);
  } catch (e) {
    console.error('Firebase init failed', e);
    setCloudStatus('Ошибка инициализации Firebase — проверь конфиг.');
  }
}

function usernameToEmail(username) {
  return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') + '@ihaniki.local';
}
function validUsername(u) { return /^[a-zA-Z0-9_]{3,16}$/.test(u); }

function setCloudError(text) {
  const el = document.getElementById('cloud-error');
  if (el) el.textContent = text;
}
function setCloudStatus(text) {
  const el = document.getElementById('cloud-status');
  if (el) el.textContent = text;
}

async function cloudRegister(username, password) {
  if (!cloudReady) return setCloudError('Облако ещё не настроено — см. инструкцию.');
  if (!validUsername(username)) return setCloudError('Юзернейм: 3–16 символов, латиница/цифры/подчёркивание.');
  if (password.length < 6) return setCloudError('Пароль минимум 6 символов.');
  setCloudError('Регистрируем…');
  try {
    const cred = await fbAuth.createUserWithEmailAndPassword(usernameToEmail(username), password);
    const doc = {
      username, avatarColor: pick(AVATAR_COLORS), avatarIcon: pick(AVATAR_ICONS), theme: 'sand',
      ...defaultUserSave(), updatedAt: Date.now(),
    };
    await fbDb.collection('users').doc(cred.user.uid).set(doc);
    setCloudError('');
  } catch (e) {
    setCloudError(cloudErrorText(e));
  }
}

async function cloudLogin(username, password) {
  if (!cloudReady) return setCloudError('Облако ещё не настроено — см. инструкцию.');
  setCloudError('Входим…');
  try {
    await fbAuth.signInWithEmailAndPassword(usernameToEmail(username), password);
    setCloudError('');
  } catch (e) {
    setCloudError(cloudErrorText(e));
  }
}

function cloudLogout() { if (cloudReady) fbAuth.signOut(); }

function cloudErrorText(e) {
  const map = {
    'auth/email-already-in-use': 'Этот юзернейм уже занят.',
    'auth/invalid-email': 'Недопустимый юзернейм.',
    'auth/weak-password': 'Пароль слишком простой.',
    'auth/user-not-found': 'Такого юзернейма нет.',
    'auth/wrong-password': 'Неверный пароль.',
    'auth/invalid-credential': 'Неверный юзернейм или пароль.',
    'auth/network-request-failed': 'Нет соединения с сетью.',
    'auth/unauthorized-domain': 'Этот домен не разрешён в Firebase Auth (Authentication → Settings → Authorized domains).',
  };
  return map[e.code] || ('Ошибка: ' + e.message);
}

async function onCloudAuthChanged(user) {
  if (user) {
    cloudUid = user.uid;
    let data;
    try {
      const docSnap = await fbDb.collection('users').doc(user.uid).get();
      data = docSnap.exists ? docSnap.data() : null;
    } catch (e) {
      setCloudError('Не удалось загрузить облачный профиль.');
      return;
    }
    if (!data) {
      data = { username: user.email.split('@')[0], avatarColor: pick(AVATAR_COLORS), avatarIcon: pick(AVATAR_ICONS), theme: 'sand', ...defaultUserSave() };
      await fbDb.collection('users').doc(user.uid).set(data);
    }
    localBackup = { currentUser, save };
    currentUser = {
      id: 'cloud_' + user.uid, isCloud: true,
      nickname: data.username, avatarColor: data.avatarColor, avatarIcon: data.avatarIcon, theme: data.theme || 'sand',
    };
    save = {
      coins: data.coins, selected: data.selected, characters: data.characters,
      bestWave: data.bestWave || 0, bestCoinsRun: data.bestCoinsRun || 0,
    };
    applyTheme(currentUser.theme);
  } else {
    cloudUid = null;
    if (localBackup) {
      currentUser = localBackup.currentUser;
      save = localBackup.save;
      localBackup = null;
      applyTheme(currentUser.theme || 'sand');
    }
  }
  renderAll();
}

function persistCloud() {
  if (!cloudReady || !cloudUid) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    fbDb.collection('users').doc(cloudUid).set({
      username: currentUser.nickname, avatarColor: currentUser.avatarColor,
      avatarIcon: currentUser.avatarIcon, theme: currentUser.theme,
      coins: save.coins, selected: save.selected, characters: save.characters,
      bestWave: save.bestWave || 0, bestCoinsRun: save.bestCoinsRun || 0,
      updatedAt: Date.now(),
    }, { merge: true }).catch((e) => console.error('cloud save failed', e));
  }, 500);
}

document.getElementById('cloud-register-btn').addEventListener('click', () => {
  cloudRegister(document.getElementById('cloud-username').value, document.getElementById('cloud-password').value);
});
document.getElementById('cloud-login-btn').addEventListener('click', () => {
  cloudLogin(document.getElementById('cloud-username').value, document.getElementById('cloud-password').value);
});
document.getElementById('cloud-logout-btn').addEventListener('click', cloudLogout);

/* ---------- character helpers ---------- */

function getCharState(id) {
  if (!save.characters[id]) save.characters[id] = { owned: false, level: 1 };
  return save.characters[id];
}
function levelUpCost(level) { return LEVEL_COST_BASE * level; }
function statsFor(charDefId, level) {
  const def = CHAR_DB.find((c) => c.id === charDefId);
  const l = level - 1;
  return {
    maxHp: Math.round(def.baseHp * (1 + HP_PER_LEVEL * l)),
    damage: Math.round(def.baseDamage * (1 + DMG_PER_LEVEL * l)),
    speed: Math.round(def.speed * (1 + SPEED_PER_LEVEL * l)),
    range: def.range,
    attackType: def.attackType,
    color: def.color,
    name: def.name,
  };
}

/* =========================================================================
   navigation
   ========================================================================= */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-menu') renderMenu();
  if (id === 'screen-profile') renderProfile();
  if (id === 'screen-characters') renderCharacters();
  if (id === 'screen-shop') renderShop();
  if (id === 'screen-leaderboard') renderLeaderboard();
  if (id === 'screen-game') startGame();
  else stopGame();
}

document.querySelectorAll('[data-goto]').forEach((btn) => {
  btn.addEventListener('click', () => showScreen(btn.dataset.goto));
});
document.getElementById('menu-profile-chip').addEventListener('click', () => showScreen('screen-profile'));

function renderAll() {
  renderMenu();
  const active = document.querySelector('.screen.active');
  if (active && active.id === 'screen-profile') renderProfile();
  if (active && active.id === 'screen-characters') renderCharacters();
  if (active && active.id === 'screen-shop') renderShop();
  if (active && active.id === 'screen-leaderboard') renderLeaderboard();
}

/* =========================================================================
   menu
   ========================================================================= */

function renderMenu() {
  document.getElementById('menu-coins').textContent = save.coins;
  document.getElementById('menu-nickname').textContent = currentUser.nickname;
  const av = document.getElementById('menu-avatar');
  av.textContent = currentUser.avatarIcon;
  av.style.background = currentUser.avatarColor;
}

/* =========================================================================
   profile screen
   ========================================================================= */

function renderProfile() {
  const loggedIn = !!cloudUid;
  document.getElementById('cloud-logged-out').classList.toggle('hidden', loggedIn);
  document.getElementById('cloud-logged-in').classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    document.getElementById('cloud-username-display').textContent = currentUser.nickname;
    const av = document.getElementById('cloud-avatar');
    av.textContent = currentUser.avatarIcon;
    av.style.background = currentUser.avatarColor;
    setCloudStatus('Ты в облаке — прогресс синхронизируется и виден в общем рейтинге.');
  } else if (cloudReady) {
    setCloudStatus('Зарегистрируйся, чтобы прогресс и место в рейтинге были видны с любого устройства.');
  }

  document.getElementById('profile-nickname').value = currentUser.nickname;
  const preview = document.getElementById('profile-avatar-preview');
  preview.textContent = currentUser.avatarIcon;
  preview.style.background = currentUser.avatarColor;

  const colorRow = document.getElementById('avatar-color-row');
  colorRow.innerHTML = '';
  AVATAR_COLORS.forEach((c) => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (currentUser.avatarColor === c ? ' selected' : '');
    sw.style.background = c;
    sw.addEventListener('click', () => {
      currentUser.avatarColor = c;
      renderProfile();
    });
    colorRow.appendChild(sw);
  });

  const iconRow = document.getElementById('avatar-icon-row');
  iconRow.innerHTML = '';
  AVATAR_ICONS.forEach((ic) => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (currentUser.avatarIcon === ic ? ' selected' : '');
    sw.textContent = ic;
    sw.addEventListener('click', () => {
      currentUser.avatarIcon = ic;
      renderProfile();
    });
    iconRow.appendChild(sw);
  });

  const themeRow = document.getElementById('theme-row');
  themeRow.innerHTML = '';
  THEMES.forEach((t) => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + ((currentUser.theme || 'sand') === t.id ? ' selected' : '');
    sw.style.background = t.color;
    sw.title = t.label;
    sw.addEventListener('click', () => {
      currentUser.theme = t.id;
      applyTheme(t.id);
      renderProfile();
    });
    themeRow.appendChild(sw);
  });

  const usersList = document.getElementById('users-list');
  usersList.innerHTML = '';
  loadUsers().forEach((u) => {
    const row = document.createElement('div');
    row.className = 'user-row' + (u.id === currentUser.id ? ' active' : '');
    row.innerHTML = `
      <div class="user-row-avatar" style="background:${u.avatarColor}">${u.avatarIcon}</div>
      <div class="user-row-info">
        <div class="user-row-name">${escapeHtml(u.nickname)}</div>
        <div class="user-row-sub">◆ ${u.save.coins} · лучшая волна ${u.save.bestWave}</div>
      </div>
      ${u.id === currentUser.id ? '' : `<button class="btn btn-small" data-switch="${u.id}">Войти</button>`}
      <button class="btn btn-small btn-ghost" data-delete="${u.id}">✕</button>
    `;
    usersList.appendChild(row);
  });
  usersList.querySelectorAll('[data-switch]').forEach((b) => {
    b.addEventListener('click', () => switchUser(b.dataset.switch));
  });
  usersList.querySelectorAll('[data-delete]').forEach((b) => {
    b.addEventListener('click', () => {
      if (loadUsers().length <= 1) return;
      if (confirm('Удалить этот профиль вместе с прогрессом?')) deleteUser(b.dataset.delete);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('profile-save-btn').addEventListener('click', () => {
  const nick = document.getElementById('profile-nickname').value.trim();
  currentUser.nickname = (nick || currentUser.nickname).slice(0, 16);
  persist();
  const note = document.getElementById('profile-save-note');
  note.textContent = 'Сохранено ✓';
  setTimeout(() => { note.textContent = ''; }, 1800);
  renderAll();
});

document.getElementById('new-user-btn').addEventListener('click', () => {
  const nick = prompt('Ник нового профиля:', 'Игрок' + (loadUsers().length + 1));
  if (nick === null) return;
  const u = createUser(nick.trim());
  switchUser(u.id);
  showScreen('screen-profile');
});

/* =========================================================================
   characters screen
   ========================================================================= */

function renderCharacters() {
  document.getElementById('chars-coins').textContent = save.coins;
  const grid = document.getElementById('character-grid');
  grid.innerHTML = '';

  CHAR_DB.forEach((def) => {
    const st = getCharState(def.id);
    const rarity = RARITY_INFO[def.rarity];
    const card = document.createElement('div');
    card.className = 'char-card' + (!st.owned ? ' locked' : '') + (save.selected === def.id ? ' selected' : '');
    card.style.setProperty('--rc', rarity.color);

    if (!st.owned) {
      card.innerHTML = `
        <div class="char-top">
          <div class="char-avatar" style="background:#333;"></div>
          <div class="char-name-block">
            <div class="char-name">???</div>
            <div class="char-rarity">${rarity.label}</div>
          </div>
        </div>
        <div class="locked-note">Найди в ящике магазина</div>
      `;
      grid.appendChild(card);
      return;
    }

    const s = statsFor(def.id, st.level);
    const nextCost = st.level < MAX_LEVEL ? levelUpCost(st.level) : null;
    const canAfford = nextCost !== null && save.coins >= nextCost;

    card.innerHTML = `
      <div class="char-top">
        <div class="char-avatar" style="background:${def.color}"></div>
        <div class="char-name-block">
          <div class="char-name">${def.name}</div>
          <div class="char-rarity">${rarity.label}</div>
        </div>
      </div>
      <div class="char-stats">
        <div>❤ HP <b>${s.maxHp}</b></div>
        <div>⚔ Урон <b>${s.damage}</b></div>
        <div>👣 Скорость <b>${s.speed}</b></div>
        <div>📏 Радиус <b>${s.range}</b></div>
      </div>
      <div class="char-level-row">
        <span>Уровень ${st.level}${st.level >= MAX_LEVEL ? ' (макс.)' : ''}</span>
        ${nextCost !== null ? `<span>${nextCost} монет</span>` : ''}
      </div>
      <div class="char-actions">
        <button class="btn btn-small" data-action="select" data-id="${def.id}" ${save.selected === def.id ? 'disabled' : ''}>
          ${save.selected === def.id ? 'В отряде' : 'Выбрать'}
        </button>
        ${nextCost !== null ? `<button class="btn btn-small btn-primary" data-action="levelup" data-id="${def.id}" ${canAfford ? '' : 'disabled'}>Улучшить</button>` : ''}
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('[data-action="select"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      save.selected = btn.dataset.id;
      persist();
      renderCharacters();
    });
  });
  grid.querySelectorAll('[data-action="levelup"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const st = getCharState(id);
      const cost = levelUpCost(st.level);
      if (st.level >= MAX_LEVEL || save.coins < cost) return;
      save.coins -= cost;
      st.level += 1;
      persist();
      renderCharacters();
    });
  });
}

/* =========================================================================
   shop / boxes
   ========================================================================= */

function renderShop() {
  document.getElementById('shop-coins').textContent = save.coins;
  const row = document.getElementById('box-row');
  row.innerHTML = '';

  BOX_DB.forEach((box) => {
    const el = document.createElement('div');
    el.className = 'box-card';
    el.innerHTML = `
      <div class="box-icon">${box.icon}</div>
      <div class="box-name">${box.name}</div>
      <div class="box-odds">
        Обычный <span>${Math.round(box.odds.common * 100)}%</span> ·
        Редкий <span>${Math.round(box.odds.rare * 100)}%</span> ·
        Эпический <span>${Math.round(box.odds.epic * 100)}%</span>
      </div>
      <button class="btn btn-primary" data-box="${box.id}" ${save.coins < box.cost ? 'disabled' : ''}>
        Открыть · ${box.cost}
      </button>
    `;
    row.appendChild(el);
  });

  row.querySelectorAll('[data-box]').forEach((btn) => {
    btn.addEventListener('click', () => openBox(btn.dataset.box));
  });
}

function weightedRarity(odds) {
  const r = Math.random();
  let acc = 0;
  for (const rarity of Object.keys(odds)) {
    acc += odds[rarity];
    if (r <= acc) return rarity;
  }
  return 'common';
}

function openBox(boxId) {
  const box = BOX_DB.find((b) => b.id === boxId);
  if (!box || save.coins < box.cost) return;
  save.coins -= box.cost;

  const rarity = weightedRarity(box.odds);
  const pool = CHAR_DB.filter((c) => c.rarity === rarity);
  const unownedInPool = pool.filter((c) => !getCharState(c.id).owned);
  const isNew = unownedInPool.length > 0;
  const picked = isNew ? pick(unownedInPool) : pick(pool);

  let resultText;
  if (isNew) {
    getCharState(picked.id).owned = true;
    resultText = 'Новый боец в отряде!';
  } else {
    const refund = RARITY_INFO[rarity].dupValue;
    save.coins += refund;
    resultText = `Уже в отряде · +${refund} монет`;
  }
  persist();
  renderShop();
  showReveal(picked, rarity, resultText);
}

function showReveal(charDef, rarity, resultText) {
  const overlay = document.getElementById('reveal-overlay');
  const content = document.getElementById('reveal-content');
  const card = document.getElementById('reveal-card');
  const glow = document.getElementById('reveal-glow');
  const rc = RARITY_INFO[rarity].color;
  card.style.setProperty('--rc', rc);
  glow.style.setProperty('--rc', rc);
  content.innerHTML = `
    <div class="reveal-avatar" style="background:${charDef.color}"></div>
    <div class="reveal-name">${charDef.name}</div>
    <div class="reveal-rarity">${RARITY_INFO[rarity].label}</div>
    <div class="reveal-sub">${resultText}</div>
  `;
  overlay.classList.remove('hidden');
}

document.getElementById('reveal-close').addEventListener('click', () => {
  document.getElementById('reveal-overlay').classList.add('hidden');
});

/* =========================================================================
   leaderboard (local device only)
   ========================================================================= */

function getBots() {
  try {
    const raw = localStorage.getItem(BOTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const bots = BOT_NAMES.map((name) => {
    const wave = Math.floor(rand(4, 20));
    return {
      nickname: name,
      avatarColor: pick(AVATAR_COLORS),
      avatarIcon: pick(AVATAR_ICONS),
      bestWave: wave,
      bestCoinsRun: Math.round(wave * rand(18, 34)),
    };
  });
  try { localStorage.setItem(BOTS_KEY, JSON.stringify(bots)); } catch (e) { /* ignore */ }
  return bots;
}

async function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  const note = document.querySelector('#screen-leaderboard .lb-note');

  let entries;
  if (cloudReady) {
    list.innerHTML = '<p class="lb-note">Загружаем рейтинг…</p>';
    if (note) note.textContent = 'Общий рейтинг всех зарегистрированных игроков (топ-25).';
    try {
      const snap = await fbDb.collection('users').orderBy('bestWave', 'desc').limit(25).get();
      entries = snap.docs.map((d) => {
        const data = d.data();
        return {
          nickname: data.username, avatarColor: data.avatarColor, avatarIcon: data.avatarIcon,
          bestWave: data.bestWave || 0, bestCoinsRun: data.bestCoinsRun || 0,
          you: d.id === cloudUid,
        };
      });
    } catch (e) {
      console.error('leaderboard fetch failed', e);
      list.innerHTML = '<p class="lb-note">Не удалось загрузить облачный рейтинг.</p>';
      return;
    }
  } else {
    if (note) note.textContent = 'Локальный рейтинг на этом устройстве: твои профили и несколько соперников для азарта.';
    entries = [
      ...loadUsers().map((u) => ({
        nickname: u.nickname, avatarColor: u.avatarColor, avatarIcon: u.avatarIcon,
        bestWave: u.save.bestWave || 0, bestCoinsRun: u.save.bestCoinsRun || 0,
        you: u.id === currentUser.id && !currentUser.isCloud,
      })),
      ...getBots().map((b) => ({ ...b, you: false })),
    ];
  }

  entries.sort((a, b) => (b.bestWave - a.bestWave) || (b.bestCoinsRun - a.bestCoinsRun));
  list.innerHTML = '';
  if (entries.length === 0) { list.innerHTML = '<p class="lb-note">Пока никто не сыграл — стань первым!</p>'; return; }

  entries.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row' + (e.you ? ' you' : '');
    row.innerHTML = `
      <div class="lb-rank">${i + 1}</div>
      <div class="lb-avatar" style="background:${e.avatarColor}">${e.avatarIcon}</div>
      <div class="lb-name">${escapeHtml(e.nickname)}${e.you ? '<span class="lb-you-tag">ТЫ</span>' : ''}</div>
      <div class="lb-stats">волна <b>${e.bestWave}</b><br>◆ <b>${e.bestCoinsRun}</b></div>
    `;
    list.appendChild(row);
  });
}

/* =========================================================================
   GAME — canvas survival + combat
   ========================================================================= */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let WORLD_W = canvas.width;
let WORLD_H = canvas.height;
const canvasWrap = document.querySelector('.canvas-wrap');

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;

let gs = null;
let rafId = null;
let lastTs = 0;

const keys = {};
const justPressed = {};
const mouse = { x: 0, y: 0, down: false, hasMoved: false };
const touchMove = { x: 0, y: 0, active: false };

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (!keys[k]) justPressed[k] = true;
  keys[k] = true;
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * WORLD_W;
  mouse.y = ((e.clientY - rect.top) / rect.height) * WORLD_H;
  mouse.hasMoved = true;
});
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) mouse.down = true; });
window.addEventListener('mouseup', () => { mouse.down = false; });

document.getElementById('btn-exit-game').addEventListener('click', () => showScreen('screen-menu'));
document.getElementById('go-menu-btn').addEventListener('click', () => showScreen('screen-menu'));

/* ---------- touch: movement joystick + big attack button + action buttons ---------- */

function setupJoystick(baseEl, knobEl, onChange) {
  const maxR = 42;
  let active = false;
  let touchId = null;
  let originX = 0;
  let originY = 0;

  function apply(clientX, clientY) {
    const dx = clientX - originX;
    const dy = clientY - originY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    knobEl.style.transform = `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`;
    onChange(Math.min(dist / maxR, 1), angle, true);
  }
  function start(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    touchId = t.identifier;
    const rect = baseEl.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
    active = true;
    apply(t.clientX, t.clientY);
  }
  function move(e) {
    if (!active) return;
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === touchId) { apply(t.clientX, t.clientY); return; }
  }
  function end(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) {
        active = false; touchId = null;
        knobEl.style.transform = 'translate(0,0)';
        onChange(0, 0, false);
      }
    }
  }
  baseEl.addEventListener('touchstart', start, { passive: false });
  baseEl.addEventListener('touchmove', move, { passive: false });
  baseEl.addEventListener('touchend', end, { passive: false });
  baseEl.addEventListener('touchcancel', end, { passive: false });
}

setupJoystick(document.getElementById('joy-move'), document.getElementById('joy-move-knob'), (mag, angle, active) => {
  if (active && mag > 0.1) {
    touchMove.active = true;
    touchMove.x = Math.cos(angle) * mag;
    touchMove.y = Math.sin(angle) * mag;
  } else {
    touchMove.active = false; touchMove.x = 0; touchMove.y = 0;
  }
});

const attackBtn = document.getElementById('btn-attack-touch');
attackBtn.addEventListener('touchstart', (e) => { e.preventDefault(); mouse.down = true; }, { passive: false });
attackBtn.addEventListener('touchend', (e) => { e.preventDefault(); mouse.down = false; }, { passive: false });
attackBtn.addEventListener('touchcancel', () => { mouse.down = false; });

function bindTapButton(el, key) {
  el.addEventListener('touchstart', (e) => { e.preventDefault(); justPressed[key] = true; }, { passive: false });
}
bindTapButton(document.getElementById('btn-collect-touch'), 'e');
bindTapButton(document.getElementById('btn-build-touch'), 'q');

/* ---------- responsive canvas sizing (works in portrait & landscape) ---------- */

function computeWorldSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const targetRatio = Math.max(0.55, Math.min(1.8, vw / vh)); // clamp extreme ratios
  const area = 960 * 600;
  let w = Math.round(Math.sqrt(area * targetRatio));
  let h = Math.round(area / w);
  w = Math.max(420, Math.min(1100, w));
  h = Math.max(420, Math.min(1100, h));
  return { w, h };
}

function fitCanvasWrap() {
  const ratio = WORLD_W / WORLD_H;
  const availW = window.innerWidth;
  const availH = window.innerHeight;
  let w = availW;
  let h = w / ratio;
  if (h > availH) { h = availH; w = h * ratio; }
  canvasWrap.style.width = Math.round(w) + 'px';
  canvasWrap.style.height = Math.round(h) + 'px';
}

window.addEventListener('resize', () => { fitCanvasWrap(); });
window.addEventListener('orientationchange', () => { fitCanvasWrap(); });

/* ---------- helpers ---------- */

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function startGame() {
  const size = computeWorldSize();
  WORLD_W = size.w; WORLD_H = size.h;
  canvas.width = WORLD_W; canvas.height = WORLD_H;
  fitCanvasWrap();

  const s = statsFor(save.selected, getCharState(save.selected).level);
  gs = {
    player: {
      x: WORLD_W / 2, y: WORLD_H / 2, r: 16,
      hp: s.maxHp, maxHp: s.maxHp, damage: s.damage, speed: s.speed,
      range: s.range, attackType: s.attackType, color: s.color,
      name: s.name, level: getCharState(save.selected).level,
      cooldown: 0, facing: -Math.PI / 2,
      speedBuffUntil: 0, damageBuffUntil: 0,
    },
    enemies: [],
    projectiles: [],
    particles: [],
    nodes: [],
    walls: [],
    pickups: [],
    wave: 0,
    waveState: 'pending',
    waveTimer: 0.6,
    pickupTimer: rand(6, 10),
    wood: 0,
    stone: 0,
    runCoins: 0,
    running: true,
  };

  spawnNodes();
  updateHudStatic();
  document.getElementById('wave-banner').classList.add('hidden');
  mouse.x = WORLD_W / 2; mouse.y = WORLD_H / 2 - 100; mouse.hasMoved = false;

  lastTs = 0;
  rafId = requestAnimationFrame(loop);
}

function stopGame() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  gs = null;
}

function spawnNodes() {
  gs.nodes = [];
  const count = Math.round((WORLD_W * WORLD_H) / 42000);
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(40, WORLD_W - 40);
      y = rand(40, WORLD_H - 40);
    } while (dist(x, y, WORLD_W / 2, WORLD_H / 2) < 90);
    gs.nodes.push({ x, y, r: 12, type: Math.random() < 0.5 ? 'wood' : 'stone', amount: 3 + Math.floor(Math.random() * 3) });
  }
}

function isBossWave(n) { return n > 0 && n % 5 === 0; }

function spawnWave() {
  gs.wave += 1;
  const n = gs.wave;
  const banner_ = document.getElementById('wave-banner');

  if (isBossWave(n)) {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = rand(0, WORLD_W); y = -30; }
    else if (edge === 1) { x = rand(0, WORLD_W); y = WORLD_H + 30; }
    else if (edge === 2) { x = -30; y = rand(0, WORLD_H); }
    else { x = WORLD_W + 30; y = rand(0, WORLD_H); }
    gs.enemies.push({
      x, y, r: 27,
      hp: 140 + n * 20, maxHp: 140 + n * 20,
      damage: 9 + n * 1.4, speed: 62, cooldown: 0, boss: true,
    });
    for (let i = 0; i < Math.floor(n / 2); i++) spawnMinion(n);
    banner_.className = 'wave-banner boss';
    banner_.textContent = `⚠ БОСС · Волна ${n}`;
  } else {
    const count = 2 + n;
    for (let i = 0; i < count; i++) spawnMinion(n);
    banner_.className = 'wave-banner';
    banner_.textContent = `Волна ${n}`;
  }
  gs.waveState = 'active';
  banner_.classList.remove('hidden');
  void banner_.offsetWidth;
  banner_.style.animation = 'none';
  void banner_.offsetWidth;
  banner_.style.animation = '';
}

function spawnMinion(n) {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = rand(0, WORLD_W); y = -20; }
  else if (edge === 1) { x = rand(0, WORLD_W); y = WORLD_H + 20; }
  else if (edge === 2) { x = -20; y = rand(0, WORLD_H); }
  else { x = WORLD_W + 20; y = rand(0, WORLD_H); }
  gs.enemies.push({
    x, y, r: 14,
    hp: 24 + n * 8, maxHp: 24 + n * 8,
    damage: 5 + n * 1.2, speed: Math.min(60 + n * 4, 150), cooldown: 0,
  });
}

function addParticle(x, y, text, color) { gs.particles.push({ x, y, text, color, life: 0.8, age: 0 }); }

function addCoins(n) {
  gs.runCoins += n;
  save.coins += n;
  save.bestCoinsRun = Math.max(save.bestCoinsRun || 0, gs.runCoins);
  persist();
}

function findNearestEnemy(x, y, maxRange) {
  let best = null, bestD = Infinity;
  for (const e of gs.enemies) {
    const d = dist(x, y, e.x, e.y);
    if (d <= maxRange + e.r && d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function currentDamage(p) {
  return p.damageBuffUntil > performance.now() ? Math.round(p.damage * 1.5) : p.damage;
}
function currentSpeed(p) {
  return p.speedBuffUntil > performance.now() ? Math.round(p.speed * 1.4) : p.speed;
}

function performAttack() {
  const p = gs.player;
  p.cooldown = 0.4;
  const dmg = currentDamage(p);

  if (p.attackType === 'melee') {
    // forgiving: hits every enemy within range, no precise aim required
    let hitAny = false;
    for (const e of gs.enemies) {
      if (dist(p.x, p.y, e.x, e.y) <= p.range + e.r) {
        e.hp -= dmg;
        hitAny = true;
        addParticle(e.x, e.y - 20, '-' + dmg, '#ff8f6b');
      }
    }
    gs.slashAge = 0;
    if (hitAny) gs.slashHit = true;
  } else {
    const target = findNearestEnemy(p.x, p.y, p.range);
    const angle = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.facing;
    if (target) p.facing = angle;
    gs.projectiles.push({
      x: p.x, y: p.y,
      vx: Math.cos(angle) * 480, vy: Math.sin(angle) * 480,
      r: 5, damage: dmg, life: 1.2, color: p.color,
    });
  }
}

function update(dt) {
  const p = gs.player;

  // movement: keyboard (digital) or touch joystick (analog)
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  const keyboardActive = dx !== 0 || dy !== 0;
  if (keyboardActive) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
  } else if (touchMove.active) {
    dx = touchMove.x; dy = touchMove.y;
  }
  const spd = currentSpeed(p);
  if (dx || dy) {
    p.x += dx * spd * dt;
    p.y += dy * spd * dt;
    if (isTouchDevice || !mouse.hasMoved) p.facing = Math.atan2(dy, dx);
  }
  p.x = Math.max(p.r, Math.min(WORLD_W - p.r, p.x));
  p.y = Math.max(p.r, Math.min(WORLD_H - p.r, p.y));

  if (!isTouchDevice && mouse.hasMoved) {
    p.facing = Math.atan2(mouse.y - p.y, mouse.x - p.x);
  } else if (!dx && !dy) {
    // idle: face nearest threat so ranged auto-aim still looks intentional
    const near = findNearestEnemy(p.x, p.y, 400);
    if (near) p.facing = Math.atan2(near.y - p.y, near.x - p.x);
  }

  if (p.cooldown > 0) p.cooldown -= dt;
  if (mouse.down && p.cooldown <= 0) performAttack();

  // resource collection (edge-triggered)
  if (justPressed['e']) {
    for (const node of gs.nodes) {
      if (dist(p.x, p.y, node.x, node.y) < node.r + 30) {
        node.amount -= 1;
        if (node.type === 'wood') gs.wood += 1; else gs.stone += 1;
        addParticle(node.x, node.y - 16, node.type === 'wood' ? '+1 дерево' : '+1 камень', '#e8dcc8');
        break;
      }
    }
    gs.nodes = gs.nodes.filter((n) => n.amount > 0);
  }

  // build wall (edge-triggered)
  if (justPressed['q'] && gs.wood >= 3 && gs.stone >= 2) {
    const wx = p.x + Math.cos(p.facing) * 46;
    const wy = p.y + Math.sin(p.facing) * 46;
    const tooClose = gs.walls.some((w) => dist(w.x, w.y, wx, wy) < 40);
    if (!tooClose) {
      gs.wood -= 3; gs.stone -= 2;
      gs.walls.push({ x: wx, y: wy, r: 18, hp: 30, maxHp: 30 });
    }
  }

  // projectiles
  for (const pr of gs.projectiles) { pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt; }
  for (const pr of gs.projectiles) {
    if (pr.dead) continue;
    for (const e of gs.enemies) {
      if (dist(pr.x, pr.y, e.x, e.y) < pr.r + e.r) {
        e.hp -= pr.damage;
        pr.dead = true;
        addParticle(e.x, e.y - 20, '-' + Math.round(pr.damage), '#ff8f6b');
        break;
      }
    }
  }
  gs.projectiles = gs.projectiles.filter((pr) => !pr.dead && pr.life > 0 && pr.x > -20 && pr.x < WORLD_W + 20 && pr.y > -20 && pr.y < WORLD_H + 20);

  // enemies
  for (const e of gs.enemies) {
    if (e.cooldown > 0) e.cooldown -= dt;
    let blocked = null;
    for (const w of gs.walls) if (dist(e.x, e.y, w.x, w.y) < e.r + w.r + 2) { blocked = w; break; }
    if (blocked) {
      if (e.cooldown <= 0) { blocked.hp -= 6; e.cooldown = 0.6; }
    } else {
      const d = dist(e.x, e.y, p.x, p.y);
      if (d > e.r + p.r) {
        e.x += ((p.x - e.x) / d) * e.speed * dt;
        e.y += ((p.y - e.y) / d) * e.speed * dt;
      } else if (e.cooldown <= 0) {
        p.hp -= e.damage;
        e.cooldown = 0.9;
        addParticle(p.x, p.y - 24, '-' + Math.round(e.damage), '#d9534f');
      }
    }
  }
  gs.walls = gs.walls.filter((w) => w.hp > 0);

  const before = gs.enemies.length;
  const deadBosses = gs.enemies.filter((e) => e.hp <= 0 && e.boss).length;
  gs.enemies = gs.enemies.filter((e) => e.hp > 0);
  const killed = before - gs.enemies.length;
  if (killed > 0) {
    const normalKills = killed - deadBosses;
    let coinGain = normalKills * (4 + gs.wave);
    coinGain += deadBosses * (40 + gs.wave * 8);
    addCoins(coinGain);
  }

  // power-up pickups
  gs.pickupTimer -= dt;
  if (gs.pickupTimer <= 0 && gs.pickups.length < 2) {
    gs.pickupTimer = rand(9, 14);
    const kinds = ['heal', 'speed', 'damage'];
    const kind = pick(kinds);
    let x, y;
    do { x = rand(40, WORLD_W - 40); y = rand(40, WORLD_H - 40); } while (dist(x, y, p.x, p.y) < 120);
    gs.pickups.push({ x, y, r: 13, kind });
  }
  for (const pu of gs.pickups) {
    if (dist(p.x, p.y, pu.x, pu.y) < p.r + pu.r) {
      pu.dead = true;
      if (pu.kind === 'heal') {
        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3));
        addParticle(p.x, p.y - 30, '+HP', '#6be0b0');
      } else if (pu.kind === 'speed') {
        p.speedBuffUntil = performance.now() + 6000;
        addParticle(p.x, p.y - 30, 'Ускорение!', '#8fd3ff');
      } else {
        p.damageBuffUntil = performance.now() + 6000;
        addParticle(p.x, p.y - 30, 'Урон +50%!', '#ff8f6b');
      }
    }
  }
  gs.pickups = gs.pickups.filter((pu) => !pu.dead);

  for (const pt of gs.particles) { pt.age += dt; pt.y -= 24 * dt; }
  gs.particles = gs.particles.filter((pt) => pt.age < pt.life);

  // wave flow
  if (gs.waveState === 'pending') {
    gs.waveTimer -= dt;
    if (gs.waveTimer <= 0) spawnWave();
  } else if (gs.waveState === 'active') {
    if (gs.enemies.length === 0) {
      gs.waveState = 'cleared';
      gs.waveTimer = 2.0;
      const bonus = 20 + gs.wave * 6;
      addCoins(bonus);
      banner(`Волна ${gs.wave} пройдена! +${bonus}`, '');
    }
  } else if (gs.waveState === 'cleared') {
    gs.waveTimer -= dt;
    if (gs.waveTimer <= 0) { gs.waveState = 'active'; spawnWave(); }
  }

  if (p.hp <= 0) { p.hp = 0; endRun(); }

  for (const k in justPressed) justPressed[k] = false;
  updateHud();
}

function banner(text, cls) {
  const el = document.getElementById('wave-banner');
  el.className = 'wave-banner' + (cls ? ' ' + cls : '');
  el.textContent = text;
  el.classList.remove('hidden');
  void el.offsetWidth;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

function endRun() {
  gs.running = false;
  const isRecord = gs.wave > (save.bestWave || 0);
  save.bestWave = Math.max(save.bestWave || 0, gs.wave);
  save.bestCoinsRun = Math.max(save.bestCoinsRun || 0, gs.runCoins);
  persist();

  document.getElementById('go-record-line').textContent = isRecord ? '🏆 Новый личный рекорд!' : '';
  document.getElementById('go-wave').textContent = gs.wave;
  document.getElementById('go-coins').textContent = gs.runCoins;
  showScreen('screen-gameover');
}

/* ---------- rendering ---------- */

function render() {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = '#101013';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WORLD_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke(); }
  for (let y = 0; y < WORLD_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke(); }

  for (const n of gs.nodes) {
    ctx.beginPath();
    ctx.fillStyle = n.type === 'wood' ? '#5d8a4f' : '#7c7c84';
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.stroke();
  }

  for (const w of gs.walls) {
    ctx.fillStyle = '#3a3630';
    ctx.strokeStyle = '#5a5348';
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(w.x - 16, w.y - w.r - 10, 32, 4);
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(w.x - 16, w.y - w.r - 10, 32 * (w.hp / w.maxHp), 4);
  }

  for (const pu of gs.pickups) {
    const colors = { heal: '#6be0b0', speed: '#8fd3ff', damage: '#ff8f6b' };
    const icons = { heal: '✚', speed: '»', damage: '↑' };
    ctx.beginPath();
    ctx.fillStyle = colors[pu.kind];
    ctx.globalAlpha = 0.85;
    ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a0a0c';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(icons[pu.kind], pu.x, pu.y + 4);
  }

  for (const pr of gs.projectiles) {
    ctx.beginPath();
    ctx.fillStyle = pr.color;
    ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of gs.enemies) {
    ctx.beginPath();
    ctx.fillStyle = e.boss ? '#caa23c' : '#7a3b3b';
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a1414';
    ctx.stroke();
    if (e.boss) {
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♛', e.x, e.y - e.r - 14);
    }
    const barW = e.boss ? 50 : 32;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - barW / 2, e.y - e.r - 10, barW, 4);
    ctx.fillStyle = e.boss ? '#f2b04a' : '#d9534f';
    ctx.fillRect(e.x - barW / 2, e.y - e.r - 10, barW * (e.hp / e.maxHp), 4);
  }

  const p = gs.player;
  const buffed = p.speedBuffUntil > performance.now() || p.damageBuffUntil > performance.now();
  if (buffed) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(232,220,200,0.5)';
    ctx.lineWidth = 2;
    ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.fillStyle = p.color;
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  const fx = p.x + Math.cos(p.facing) * (p.r + 6);
  const fy = p.y + Math.sin(p.facing) * (p.r + 6);
  ctx.arc(fx, fy, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(232,220,200,0.07)';
  ctx.arc(p.x, p.y, p.range, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = '13px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (const pt of gs.particles) {
    const alpha = 1 - pt.age / pt.life;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(alpha, 0);
    ctx.fillText(pt.text, pt.x, pt.y);
  }
  ctx.globalAlpha = 1;
}

/* ---------- HUD (DOM) ---------- */

function updateHudStatic() {
  document.getElementById('hud-char-name').textContent = gs.player.name;
  document.getElementById('hud-level').textContent = gs.player.level;
}
function updateHud() {
  document.getElementById('hp-bar').style.width = Math.max(0, (gs.player.hp / gs.player.maxHp) * 100) + '%';
  document.getElementById('hud-wood').textContent = gs.wood;
  document.getElementById('hud-stone').textContent = gs.stone;
  document.getElementById('hud-wave').textContent = gs.wave;
  document.getElementById('hud-run-coins').textContent = gs.runCoins;
}

/* ---------- loop ---------- */

function loop(ts) {
  if (!gs || !gs.running) return;
  if (!lastTs) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;
  update(dt);
  render();
  rafId = requestAnimationFrame(loop);
}

/* =========================================================================
   init
   ========================================================================= */

applyTheme(currentUser.theme || 'sand');
initFirebaseIfConfigured();
renderMenu();
