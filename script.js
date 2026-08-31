'use strict';

/* =========================================================================
   ihaniki — data
   ========================================================================= */

const STORAGE_KEY = 'ihaniki_save_v1';

const RARITY_INFO = {
  common: { label: 'Обычный', color: '#9aa0a8', dupValue: 40 },
  rare:   { label: 'Редкий',   color: '#6fa8ff', dupValue: 120 },
  epic:   { label: 'Эпический', color: '#c58aff', dupValue: 300 },
};

// speed in px/sec, range in px, damage/hp are base values at level 1
const CHAR_DB = [
  { id: 'ronin',   name: 'Ронин',    rarity: 'common', attackType: 'melee',  color: '#e8c987', baseHp: 100, baseDamage: 14, speed: 175, range: 72,  desc: 'Быстрый клинок ближнего боя.' },
  { id: 'strelok', name: 'Стрелок',  rarity: 'common', attackType: 'ranged', color: '#8fb3ff', baseHp: 75,  baseDamage: 10, speed: 165, range: 300, desc: 'Лёгкий лук, стабильный урон издалека.' },
  { id: 'golem',   name: 'Голем',    rarity: 'rare',   attackType: 'melee',  color: '#a39c8f', baseHp: 190, baseDamage: 11, speed: 120, range: 82,  desc: 'Толстая шкура, медленные тяжёлые удары.' },
  { id: 'shaman',  name: 'Шаман',    rarity: 'rare',   attackType: 'ranged', color: '#b98aff', baseHp: 95,  baseDamage: 16, speed: 150, range: 260, desc: 'Плетёт заряды порчи по площади.' },
  { id: 'ghost',   name: 'Призрак',  rarity: 'epic',   attackType: 'melee',  color: '#5fe0c8', baseHp: 115, baseDamage: 22, speed: 210, range: 66,  desc: 'Мелькает между врагами почти неуловимо.' },
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

/* =========================================================================
   save / persistence
   ========================================================================= */

function defaultSave() {
  return {
    coins: 150,
    selected: 'ronin',
    characters: {
      ronin: { owned: true, level: 1 },
    },
  };
}

let save = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    if (!parsed.characters || !parsed.characters[parsed.selected]) return defaultSave();
    return parsed;
  } catch (e) {
    return defaultSave();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch (e) { /* storage unavailable — continue without persistence */ }
}

function getCharState(id) {
  if (!save.characters[id]) save.characters[id] = { owned: false, level: 1 };
  return save.characters[id];
}

function ownedCharIds() {
  return Object.keys(save.characters).filter((id) => save.characters[id].owned);
}

function levelUpCost(level) {
  return LEVEL_COST_BASE * level;
}

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
  if (id === 'screen-characters') renderCharacters();
  if (id === 'screen-shop') renderShop();
  if (id === 'screen-game') startGame();
  else stopGame();
  updateRotateHint();
}

document.querySelectorAll('[data-goto]').forEach((btn) => {
  btn.addEventListener('click', () => showScreen(btn.dataset.goto));
});

/* =========================================================================
   menu
   ========================================================================= */

function renderMenu() {
  document.getElementById('menu-coins').textContent = save.coins;
}

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
  const picked = isNew
    ? unownedInPool[Math.floor(Math.random() * unownedInPool.length)]
    : pool[Math.floor(Math.random() * pool.length)];

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
   GAME — canvas survival + combat
   ========================================================================= */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const WORLD_W = canvas.width;
const WORLD_H = canvas.height;
const canvasWrap = document.querySelector('.canvas-wrap');

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;

let gs = null;          // game state, created in startGame()
let rafId = null;
let lastTs = 0;

const keys = {};
const justPressed = {};
const mouse = { x: WORLD_W / 2, y: WORLD_H / 2, down: false };
const touchMove = { x: 0, y: 0, active: false };
const touchAim = { active: false, angle: 0 };

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
});
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) mouse.down = true; });
window.addEventListener('mouseup', () => { mouse.down = false; });

document.getElementById('btn-exit-game').addEventListener('click', () => showScreen('screen-menu'));
document.getElementById('go-menu-btn').addEventListener('click', () => showScreen('screen-menu'));

/* ---------- touch controls: joysticks + action buttons ---------- */

function setupJoystick(baseEl, knobEl, onChange) {
  const maxR = 40;
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
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    knobEl.style.transform = `translate(${kx}px, ${ky}px)`;
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
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { apply(t.clientX, t.clientY); return; }
    }
  }

  function end(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) {
        active = false;
        touchId = null;
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
  if (active && mag > 0.12) {
    touchMove.active = true;
    touchMove.x = Math.cos(angle) * mag;
    touchMove.y = Math.sin(angle) * mag;
  } else {
    touchMove.active = false;
    touchMove.x = 0;
    touchMove.y = 0;
  }
});

setupJoystick(document.getElementById('joy-aim'), document.getElementById('joy-aim-knob'), (mag, angle, active) => {
  touchAim.active = active && mag > 0.18;
  touchAim.angle = angle;
  mouse.down = touchAim.active;
});

function bindTapButton(el, key) {
  el.addEventListener('touchstart', (e) => { e.preventDefault(); justPressed[key] = true; }, { passive: false });
  el.addEventListener('click', () => { justPressed[key] = true; });
}
bindTapButton(document.getElementById('btn-collect-touch'), 'e');
bindTapButton(document.getElementById('btn-build-touch'), 'q');

/* ---------- responsive canvas + rotate-to-landscape hint ---------- */

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

function updateRotateHint() {
  const hint = document.getElementById('rotate-hint');
  const gameActive = document.getElementById('screen-game').classList.contains('active');
  const portrait = window.innerHeight > window.innerWidth;
  hint.classList.toggle('hidden', !(gameActive && isTouchDevice && portrait));
}

window.addEventListener('resize', () => { fitCanvasWrap(); updateRotateHint(); });
window.addEventListener('orientationchange', () => { fitCanvasWrap(); updateRotateHint(); });
fitCanvasWrap();

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function rand(min, max) { return min + Math.random() * (max - min); }

function startGame() {
  const s = statsFor(save.selected, getCharState(save.selected).level);
  gs = {
    player: {
      x: WORLD_W / 2, y: WORLD_H / 2, r: 16,
      hp: s.maxHp, maxHp: s.maxHp, damage: s.damage, speed: s.speed,
      range: s.range, attackType: s.attackType, color: s.color,
      name: s.name, level: getCharState(save.selected).level,
      cooldown: 0, facing: 0,
    },
    enemies: [],
    projectiles: [],
    particles: [],
    nodes: [],
    walls: [],
    wave: 0,
    waveEnemiesTotal: 0,
    waveState: 'pending', // pending -> active -> cleared
    waveTimer: 0.6,
    wood: 0,
    stone: 0,
    runCoins: 0,
    running: true,
  };

  spawnNodes();
  updateHudStatic();
  document.getElementById('wave-banner').classList.add('hidden');
  fitCanvasWrap();
  updateRotateHint();

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
  for (let i = 0; i < 14; i++) {
    let x, y;
    do {
      x = rand(40, WORLD_W - 40);
      y = rand(40, WORLD_H - 40);
    } while (dist(x, y, WORLD_W / 2, WORLD_H / 2) < 90);
    gs.nodes.push({
      x, y, r: 12,
      type: Math.random() < 0.5 ? 'wood' : 'stone',
      amount: 3 + Math.floor(Math.random() * 3),
    });
  }
}

function spawnWave() {
  gs.wave += 1;
  const n = 2 + gs.wave;
  gs.waveEnemiesTotal = n;
  for (let i = 0; i < n; i++) {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = rand(0, WORLD_W); y = -20; }
    else if (edge === 1) { x = rand(0, WORLD_W); y = WORLD_H + 20; }
    else if (edge === 2) { x = -20; y = rand(0, WORLD_H); }
    else { x = WORLD_W + 20; y = rand(0, WORLD_H); }
    gs.enemies.push({
      x, y, r: 14,
      hp: 26 + gs.wave * 9,
      maxHp: 26 + gs.wave * 9,
      damage: 5 + gs.wave * 1.3,
      speed: Math.min(60 + gs.wave * 4, 150),
      cooldown: 0,
    });
  }
  gs.waveState = 'active';
  banner(`Волна ${gs.wave}`);
}

function banner(text) {
  const el = document.getElementById('wave-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  void el.offsetWidth; // restart animation
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

function addParticle(x, y, text, color) {
  gs.particles.push({ x, y, text, color, life: 0.8, age: 0 });
}

function addCoins(n) {
  gs.runCoins += n;
  save.coins += n;
  persist();
}

function performAttack() {
  const p = gs.player;
  p.cooldown = 0.42;
  if (p.attackType === 'melee') {
    let hitAny = false;
    for (const e of gs.enemies) {
      const d = dist(p.x, p.y, e.x, e.y);
      if (d > p.range + e.r) continue;
      const angleToEnemy = Math.atan2(e.y - p.y, e.x - p.x);
      let diff = Math.abs(angleToEnemy - p.facing);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff <= Math.PI / 2.4) {
        e.hp -= p.damage;
        hitAny = true;
        addParticle(e.x, e.y - 20, '-' + p.damage, '#ff8f6b');
      }
    }
    gs.slash = { x: p.x, y: p.y, angle: p.facing, age: 0 };
    if (hitAny) { /* small hit feedback could go here */ }
  } else {
    gs.projectiles.push({
      x: p.x, y: p.y,
      vx: Math.cos(p.facing) * 460,
      vy: Math.sin(p.facing) * 460,
      r: 5, damage: p.damage, life: 1.2,
      color: p.color,
    });
  }
}

function update(dt) {
  const p = gs.player;

  // movement — keyboard (digital, normalized) or touch joystick (analog)
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
  if (dx || dy) {
    p.x += dx * p.speed * dt;
    p.y += dy * p.speed * dt;
  }
  p.x = Math.max(p.r, Math.min(WORLD_W - p.r, p.x));
  p.y = Math.max(p.r, Math.min(WORLD_H - p.r, p.y));

  // facing — aim joystick > movement direction (touch, no aim held) > mouse cursor
  if (touchAim.active) {
    p.facing = touchAim.angle;
  } else if (isTouchDevice && (dx || dy)) {
    p.facing = Math.atan2(dy, dx);
  } else if (!isTouchDevice) {
    p.facing = Math.atan2(mouse.y - p.y, mouse.x - p.x);
  }
  if (p.cooldown > 0) p.cooldown -= dt;
  if (mouse.down && p.cooldown <= 0) performAttack();

  // resource collection (E, edge-triggered)
  if (justPressed['e']) {
    for (const node of gs.nodes) {
      if (dist(p.x, p.y, node.x, node.y) < node.r + 28) {
        node.amount -= 1;
        if (node.type === 'wood') gs.wood += 1; else gs.stone += 1;
        addParticle(node.x, node.y - 16, node.type === 'wood' ? '+1 дерево' : '+1 камень', '#e8dcc8');
        break;
      }
    }
    gs.nodes = gs.nodes.filter((n) => n.amount > 0);
  }

  // build wall (Q, edge-triggered)
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
  for (const pr of gs.projectiles) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
  }
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
  gs.projectiles = gs.projectiles.filter((pr) =>
    !pr.dead && pr.life > 0 && pr.x > -20 && pr.x < WORLD_W + 20 && pr.y > -20 && pr.y < WORLD_H + 20
  );

  // enemies
  for (const e of gs.enemies) {
    if (e.cooldown > 0) e.cooldown -= dt;

    // check wall blocking
    let blocked = null;
    for (const w of gs.walls) {
      if (dist(e.x, e.y, w.x, w.y) < e.r + w.r + 2) { blocked = w; break; }
    }

    if (blocked) {
      if (e.cooldown <= 0) {
        blocked.hp -= 6;
        e.cooldown = 0.6;
      }
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

  // enemy deaths
  const before = gs.enemies.length;
  gs.enemies = gs.enemies.filter((e) => e.hp > 0);
  const killed = before - gs.enemies.length;
  if (killed > 0) {
    const coinGain = killed * (4 + gs.wave);
    addCoins(coinGain);
  }

  // particles
  for (const pt of gs.particles) { pt.age += dt; pt.y -= 24 * dt; }
  gs.particles = gs.particles.filter((pt) => pt.age < pt.life);

  // wave flow
  if (gs.waveState === 'pending') {
    gs.waveTimer -= dt;
    if (gs.waveTimer <= 0) spawnWave();
  } else if (gs.waveState === 'active') {
    if (gs.enemies.length === 0) {
      gs.waveState = 'cleared';
      gs.waveTimer = 2.2;
      const bonus = 20 + gs.wave * 6;
      addCoins(bonus);
      banner(`Волна ${gs.wave} пройдена! +${bonus}`);
    }
  } else if (gs.waveState === 'cleared') {
    gs.waveTimer -= dt;
    if (gs.waveTimer <= 0) {
      gs.waveState = 'active';
      spawnWave();
    }
  }

  if (p.hp <= 0) {
    p.hp = 0;
    endRun();
  }

  // clear edge-triggered keys
  for (const k in justPressed) justPressed[k] = false;

  updateHud();
}

function endRun() {
  gs.running = false;
  document.getElementById('go-wave').textContent = gs.wave;
  document.getElementById('go-coins').textContent = gs.runCoins;
  showScreen('screen-gameover');
}

/* ---------- rendering ---------- */

function render() {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);

  // background grid
  ctx.fillStyle = '#101013';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WORLD_W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
  }
  for (let y = 0; y < WORLD_H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
  }

  // resource nodes
  for (const n of gs.nodes) {
    ctx.beginPath();
    ctx.fillStyle = n.type === 'wood' ? '#5d8a4f' : '#7c7c84';
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.stroke();
  }

  // walls
  for (const w of gs.walls) {
    ctx.fillStyle = '#3a3630';
    ctx.strokeStyle = '#5a5348';
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // hp sliver
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(w.x - 16, w.y - w.r - 10, 32, 4);
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(w.x - 16, w.y - w.r - 10, 32 * (w.hp / w.maxHp), 4);
  }

  // projectiles
  for (const pr of gs.projectiles) {
    ctx.beginPath();
    ctx.fillStyle = pr.color;
    ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // enemies
  for (const e of gs.enemies) {
    ctx.beginPath();
    ctx.fillStyle = '#7a3b3b';
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a1414';
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - 16, e.y - e.r - 10, 32, 4);
    ctx.fillStyle = '#d9534f';
    ctx.fillRect(e.x - 16, e.y - e.r - 10, 32 * (e.hp / e.maxHp), 4);
  }

  // player
  const p = gs.player;
  ctx.beginPath();
  ctx.fillStyle = p.color;
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.stroke();
  // facing indicator
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  const fx = p.x + Math.cos(p.facing) * (p.r + 6);
  const fy = p.y + Math.sin(p.facing) * (p.r + 6);
  ctx.arc(fx, fy, 3, 0, Math.PI * 2);
  ctx.fill();
  // range ring hint for ranged
  if (p.attackType === 'ranged') {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(232,220,200,0.08)';
    ctx.arc(p.x, p.y, p.range, 0, Math.PI * 2);
    ctx.stroke();
  }

  // particles
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

renderMenu();
