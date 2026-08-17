/*
 * 宝可梦 AI 漫画冒险 —— 网页版
 *
 * 这版先使用无构建依赖的模块化原生 JavaScript，方便直接部署到静态托管。
 * 核心对象：冒险回合、漫画分镜、故事章节、玩家资料与本地存档。
 */
(function () {
  'use strict';

  const root = document.getElementById('root');
  const APP_VERSION = '3.0.0-rpg';
  const SETTINGS_KEY = 'pka_ai_config_v4';
  const LEGACY_SETTINGS_KEY = 'pka_ai_config_v3';
  const AUTOSAVE_KEY = 'pka_autosave_v2';
  const SAVE_PREFIX = 'pka_save_v2_';
  const DEFAULT_IMAGE_COLLAPSED = true;
  const BUILTIN_CONFIG = {
    textBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
    textApiKey: '316830467d0546a4a7a0902b838f9780.kqbFeID2E9IYHzne',
    textModel: 'glm-4.7-flash',
    imageBaseURL: 'https://apihub.agnes-ai.com/v1',
    imageApiKey: 'sk-r0GcH1YJo8s8zdyE1CWEAO4GDEGf5tr3teRgiLUNzlnt8mpB',
    imageModel: 'agnes-image-2.1-flash',
    images: true
  };
  const pokemonCache = new Map();

  const regions = window.PkaWorld && window.PkaWorld.regions ? window.PkaWorld.regions : {
    kanto: { name: '关都地区', generation: 1, towns: ['真新镇', '常青市', '深灰市'] }
  };

  const typeColors = {
    一般: '#8B8B6A', 火: '#C4512D', 水: '#3976A8', 草: '#4E8454', 电: '#B78B13', 冰: '#5C9DA0',
    格斗: '#934036', 毒: '#744678', 地面: '#A87D46', 飞行: '#7769A3', 超能力: '#B34D79', 虫: '#6E7F35',
    岩石: '#857143', 幽灵: '#5D507A', 龙: '#5542A5', 恶: '#534842', 钢: '#737E89', 妖精: '#A55F80'
  };

  const iconPaths = {
    adventure: '<path d="M4 17.5 8.2 5l4.4 6.4L18 7l2 12H4Z"/><path d="m8.2 5 2.1 4.2M14.1 13.1l3.2-6"/>',
    comic: '<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 15h17M9 4v16M16 4v11"/>',
    story: '<path d="M4 5.5c3-.8 5.4-.2 8 1.5v13c-2.6-1.7-5-2.3-8-1.5v-13ZM20 5.5c-3-.8-5.4-.2-8 1.5v13c2.6-1.7 5-2.3 8-1.5v-13Z"/>',
    profile: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-3.3 3-5 7-5s6.3 1.7 7 5"/>',
    dex: '<path d="M6 4.5h12v15H6z"/><path d="M9 7.5h6M9 11h6M9 14.5h3"/>',
    pokemon: '<circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h5.1M15.1 12h5.1"/><circle cx="12" cy="12" r="2.7"/>',
    people: '<circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.3"/><path d="M3.5 20c.5-3.5 2.4-5.2 5.5-5.2s5 1.7 5.5 5.2M14 15c3.1-.6 5.2 1 6 4.5"/>',
    bag: '<path d="M5 8.5h14l1 11H4l1-11Z"/><path d="M8.5 8.5V6.8a3.5 3.5 0 0 1 7 0v1.7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.3.9a7.3 7.3 0 0 0-1.9-1.1L14.4 3h-4l-.4 2.8a7.3 7.3 0 0 0-1.9 1.1l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5.7 12c0 .4 0 .7.1 1.1l-2 1.5 2 3.4 2.3-.9c.6.5 1.2.8 1.9 1.1l.4 2.8h4l.4-2.8a7.3 7.3 0 0 0 1.9-1.1l2.3.9 2-3.4-2-1.5c.1-.4.1-.7.1-1.1Z"/>',
    save: '<path d="M5 4h11l3 3v13H5V4Z"/><path d="M8 4v6h7V4M8 20v-6h8v6"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    back: '<path d="m14.5 5-7 7 7 7M8 12h11"/>',
    send: '<path d="m4 4 16 8-16 8 3.3-8L4 4Z"/><path d="M7.3 12H20"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5 17 4.5-4 3 2.5 2.5-2 4.5 3.5"/>',
    location: '<path d="M19 10.5c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10.5" r="2.2"/>',
    arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    refresh: '<path d="M19 8a7.5 7.5 0 0 0-13.2-1.7L4 8.5M5 16a7.5 7.5 0 0 0 13.2 1.7l1.8-2.2"/><path d="M4 4.5v4h4M20 19.5v-4h-4"/>',
    download: '<path d="M12 4v10M8 10l4 4 4-4M5 19h14"/>',
    spark: '<path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3ZM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/>'
  };

  function icon(name, className) {
    return '<svg class="icon ' + (className || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (iconPaths[name] || '') + '</g></svg>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function safeUrl(value) {
    const url = String(value || '').trim();
    return /^https?:\/\//i.test(url) ? url : '';
  }

  function normalizeBaseUrl(value) {
    return String(value || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '');
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getSettings() {
    const saved = readJson(SETTINGS_KEY, null) || readJson(LEGACY_SETTINGS_KEY, {});
    const legacyBaseURL = normalizeBaseUrl(saved.baseURL || '');
    const legacyApiKey = String(saved.apiKey || '');
    const legacyIsBigModel = legacyBaseURL.indexOf('open.bigmodel.cn') >= 0;
    const hasSaved = function (key) { return Object.prototype.hasOwnProperty.call(saved, key); };
    const savedValue = function (key, fallback) { return hasSaved(key) ? String(saved[key] || '') : fallback; };
    return {
      textBaseURL: normalizeBaseUrl(savedValue('textBaseURL', legacyIsBigModel ? legacyBaseURL : BUILTIN_CONFIG.textBaseURL)),
      textApiKey: savedValue('textApiKey', legacyIsBigModel ? legacyApiKey : BUILTIN_CONFIG.textApiKey),
      textModel: savedValue('textModel', legacyIsBigModel ? (saved.model || BUILTIN_CONFIG.textModel) : BUILTIN_CONFIG.textModel),
      imageBaseURL: normalizeBaseUrl(savedValue('imageBaseURL', legacyIsBigModel ? BUILTIN_CONFIG.imageBaseURL : (legacyBaseURL || BUILTIN_CONFIG.imageBaseURL))),
      imageApiKey: savedValue('imageApiKey', legacyIsBigModel ? BUILTIN_CONFIG.imageApiKey : (legacyApiKey || BUILTIN_CONFIG.imageApiKey)),
      imageModel: savedValue('imageModel', legacyIsBigModel ? BUILTIN_CONFIG.imageModel : (saved.imageModel || BUILTIN_CONFIG.imageModel)),
      images: saved.images !== false,
      theme: saved.theme === 'night' ? 'night' : 'light'
    };
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      textBaseURL: normalizeBaseUrl(settings.textBaseURL),
      textApiKey: String(settings.textApiKey || ''),
      textModel: String(settings.textModel || BUILTIN_CONFIG.textModel),
      imageBaseURL: normalizeBaseUrl(settings.imageBaseURL),
      imageApiKey: String(settings.imageApiKey || ''),
      imageModel: String(settings.imageModel || BUILTIN_CONFIG.imageModel),
      images: settings.images !== false,
      theme: settings.theme === 'night' ? 'night' : 'light'
    }));
  }

  function blankState() {
    return {
      screen: 'adventure',
      identity: null,
      region: 'kanto',
      location: '',
      turns: 0,
      pokemon: [],
      companions: [],
      inventory: {},
      messages: [],
      storyboards: [],
      currentTurn: null,
      error: '',
      loading: false
    };
  }

  function loadState() {
    const saved = readJson(AUTOSAVE_KEY, null);
    if (!saved || !saved.version || !saved.state) return blankState();
    return normalizeState(saved.state);
  }

  function normalizeState(value) {
    const base = blankState();
    const next = Object.assign(base, value || {});
    next.pokemon = Array.isArray(next.pokemon) ? next.pokemon : [];
    next.companions = Array.isArray(next.companions) ? next.companions : [];
    next.messages = Array.isArray(next.messages) ? next.messages : [];
    next.storyboards = Array.isArray(next.storyboards) ? next.storyboards : [];
    next.inventory = next.inventory && typeof next.inventory === 'object' ? next.inventory : {};
    next.loading = false;
    next.error = '';
    return next;
  }

  function serializableState() {
    return JSON.parse(JSON.stringify(Object.assign({}, state, { loading: false, error: '' })));
  }

  function persistState() {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ version: 2, updatedAt: Date.now(), state: serializableState() }));
    } catch (error) {
      state.error = '本地存档空间不足，请先导出或删除旧存档。';
    }
  }

  function writeSlot(slot) {
    const data = serializableState();
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify({ version: 2, updatedAt: Date.now(), state: data }));
  }

  function readSlot(slot) {
    const saved = readJson(SAVE_PREFIX + slot, null);
    return saved && saved.state ? normalizeState(saved.state) : null;
  }

  function listSlots() {
    return [1, 2, 3].map(function (slot) {
      const saved = readJson(SAVE_PREFIX + slot, null);
      return { slot: slot, saved: !!saved, updatedAt: saved && saved.updatedAt, state: saved && saved.state };
    });
  }

  function formatDate(timestamp) {
    if (!timestamp) return '空存档';
    return new Date(timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function regionData() {
    return regions[state.region] || regions.kanto;
  }

  function randomChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function createRandomIdentity(name, gender) {
    const regionKey = randomChoice(Object.keys(regions));
    const region = regions[regionKey];
    const identity = {
      name: name,
      gender: ['male', 'female', 'unspecified'].indexOf(gender) >= 0 ? gender : 'unspecified',
      age: randomChoice([14, 15, 16, 17, 18, 19, 20, 21]),
      hometown: randomChoice(region.towns),
      personality: randomChoice(['好奇直觉型', '沉着观察型', '热情行动派', '安静专注型', '乐观随机应变型']),
      appearance: randomChoice(['短发与轻便外套', '卷发与彩色围巾', '利落马尾与旅行背包', '蓬松头发与护腕', '帽衫与旧运动鞋']),
      goal: randomChoice(['寻找第一只真正理解你的伙伴', '记录一段属于自己的冒险', '找到传闻中的神秘地点', '证明温柔也能成为训练家的力量', '完成一张完整的地区地图']),
      backstory: randomChoice(['刚从研究所领取旅行许可', '刚结束一段短暂的家庭旅行', '带着一本旧图鉴踏上旅途', '在清晨收到了一封没有署名的信', '为了寻找失落的纪念品离开家乡'])
    };
    return { regionKey: regionKey, hometown: identity.hometown, identity: identity };
  }

  function createRandomOpeningAction() {
    const region = regionData();
    const hometown = state.location || (state.identity && state.identity.hometown) || randomChoice(region.towns || ['真新镇']);
    const route = randomChoice(region.routes || []);
    const landmark = randomChoice(region.landmarks || []);
    const openingBeats = [
      '清晨在' + hometown + '整理背包，沿着通往' + route + '的路牌正式出发。',
      '在' + hometown + '的宝可梦中心外发现一张被露水打湿的便签，决定顺着线索调查。',
      '从' + hometown + '的研究所门前出发，记录一段来自' + route + '方向的陌生环境声。',
      '在' + hometown + '边缘停下脚步，翻开旧地图，准备寻找通往' + landmark + '的安全路线。',
      '午后的' + hometown + '忽然起风，决定先观察街道与远方' + route + '的天气变化。',
      '带着刚领到的旅行许可走出' + hometown + '，把前往' + route + '的第一段路写进图鉴笔记。'
    ];
    return '【随机开场】' + randomChoice(openingBeats);
  }

  function currentTurn() {
    return state.currentTurn || state.storyboards[state.storyboards.length - 1] || null;
  }

  function imageIsCollapsed(turn) {
    return !turn || turn.imageCollapsed !== false;
  }

  function setState(patch, shouldPersist) {
    state = Object.assign({}, state, patch || {});
    if (shouldPersist !== false) persistState();
    render();
  }

  let state = loadState();
  let activeDialog = null;
  let pendingImage = false;

  function render() {
    if (!root) return;
    document.title = state.identity ? '冒险 · 宝可梦 AI 漫画冒险' : '宝可梦 AI 漫画冒险';
    root.innerHTML = state.identity ? renderGame() : renderStart();
  }

  function renderStart() {
    const slots = listSlots();
    const savedSlots = slots.filter(function (item) { return item.saved; });
    return '<main class="start-screen">' +
      '<section class="start-brand">' +
        '<div class="brand-ball" aria-hidden="true"><span></span></div>' +
        '<p class="eyebrow">WEB EDITION · ' + escapeHtml(APP_VERSION) + '</p>' +
        '<h1>宝可梦<br><em>漫画冒险</em></h1>' +
        '<p class="start-lede">每一个选择，都会成为下一格画面。</p>' +
      '</section>' +
      '<section class="start-card">' +
        '<div class="start-card-label">开始</div>' +
        '<button class="primary-button wide-button" data-action="new-adventure">' + icon('plus') + '<span>新的冒险</span></button>' +
        '<button class="secondary-button wide-button" data-action="open-dialog" data-dialog="settings">' + icon('settings') + '<span>AI 设置</span></button>' +
        '<div class="save-list">' +
          '<div class="section-heading"><span>本地存档</span><span class="muted">' + savedSlots.length + '/3</span></div>' +
          (savedSlots.length ? savedSlots.map(renderStartSave).join('') : '<p class="empty-copy">还没有存档。</p>') +
        '</div>' +
      '</section>' +
      renderDialog() +
    '</main>';
  }

  function renderStartSave(slot) {
    const savedState = slot.state || {};
    const identity = savedState.identity && savedState.identity.name ? savedState.identity.name : '训练师';
    const meta = identity + ' · ' + (savedState.location || '未知地点') + ' · ' + (savedState.turns || 0) + ' 回合';
    return '<button class="save-row" data-action="load-slot" data-slot="' + slot.slot + '">' +
      '<span class="save-row-main"><strong>存档 ' + slot.slot + '</strong><span>' + escapeHtml(meta) + '</span></span>' +
      '<span class="save-row-time">' + escapeHtml(formatDate(slot.updatedAt)) + '</span>' + icon('arrow') +
    '</button>';
  }

  function renderGame() {
    return '<main class="game-shell screen-' + escapeHtml(state.screen || 'adventure') + '">' +
      renderTopBar() +
      '<div class="game-scroll">' + (state.screen === 'adventure' ? renderAdventure() : state.screen === 'comic' ? renderComic() : renderStory()) + '</div>' +
      renderBottomNav() +
      renderDialog() +
    '</main>';
  }

  function renderTopBar() {
    const region = regionData();
    const identity = state.identity || {};
    return '<header class="top-bar">' +
      '<div class="top-brand"><div class="mini-ball" aria-hidden="true"><span></span></div><div><strong>宝可梦漫画冒险</strong><span>' + escapeHtml(identity.name || '训练师') + '的旅行手册</span></div></div>' +
      '<div class="top-meta"><span class="top-region">' + escapeHtml(region.name) + '</span><span>' + icon('location') + escapeHtml(state.location || '起点') + '</span><span class="turn-badge">第 ' + String(state.turns).padStart(2, '0') + ' 回合</span></div>' +
      '<div class="top-actions"><button class="icon-button" data-action="open-dialog" data-dialog="save" aria-label="打开存档">' + icon('save') + '</button><button class="icon-button" data-action="open-dialog" data-dialog="settings" aria-label="打开设置">' + icon('settings') + '</button></div>' +
      '<span class="sr-only">当前地区：' + escapeHtml(region.name) + '</span>' +
    '</header>';
  }

  function renderAdventure() {
    const turn = currentTurn();
    const config = getSettings();
    const panels = turn && Array.isArray(turn.panels) ? turn.panels : [];
    const options = turn && Array.isArray(turn.options) ? turn.options : [];
    const hasKey = !!config.apiKey;
    return '<section class="adventure-page">' +
      '<div class="page-intro"><div><span class="eyebrow">冒险 / 分镜回合</span><h2>把下一步画出来</h2></div><span class="location-chip">' + icon('location') + escapeHtml(state.location || '等待起点') + '</span></div>' +
      renderSceneImage(turn) +
      '<section class="storyboard-sheet">' +
        '<div class="sheet-heading"><div><span class="eyebrow">STORYBOARD</span><h3>' + (turn ? '第 ' + String(state.turns).padStart(2, '0') + ' 回合' : '第一幕还没有开始') + '</h3></div><span class="sheet-count">' + (panels.length ? panels.length + ' 格' : '空白页') + '</span></div>' +
        (panels.length ? '<div class="panel-grid">' + panels.map(renderPanel).join('') + '</div>' : '<div class="story-empty"><div class="empty-frame">' + icon('comic') + '</div><div><strong>这一页还没有画面</strong><p>配置 AI 后，输入一个动作，故事会以 4–6 格漫画分镜展开。</p></div></div>') +
      '</section>' +
      (state.error ? '<div class="error-note">' + icon('close') + '<span>' + escapeHtml(state.error) + '</span></div>' : '') +
      '<section class="choice-zone">' +
        '<div class="choice-heading"><span>下一步</span><span class="muted">' + (state.loading ? '正在写分镜…' : '选择一个动作继续') + '</span></div>' +
        (options.length && !state.loading ? '<div class="choice-list">' + options.map(function (option, index) { return '<button class="choice-button choice-' + (index + 1) + '" data-action="submit-action" data-value="' + escapeHtml(option) + '"><span>' + String(index + 1).padStart(2, '0') + '</span><strong>' + escapeHtml(option) + '</strong>' + icon('arrow') + '</button>'; }).join('') + '</div>' : '') +
        '<form class="action-form" data-form="action"><input name="action" maxlength="240" placeholder="描述你的行动…" autocomplete="off" ' + (state.loading ? 'disabled' : '') + ' /><button class="send-button" type="submit" ' + (state.loading ? 'disabled' : '') + ' aria-label="发送行动">' + (state.loading ? '<span class="loading-ring"></span>' : icon('send')) + '</button></form>' +
        (!hasKey ? '<div class="config-note"><span>' + icon('settings') + '</span><div><strong>还没有连接 AI</strong><p>先在设置中填写你的兼容接口和 API Key。</p></div><button class="text-button" data-action="open-dialog" data-dialog="settings">设置</button></div>' : '') +
      '</section>' +
    '</section>';
  }

  function renderSceneImage(turn) {
    if (!turn) {
      return '<section class="scene-card scene-card-empty"><div class="scene-topline"><span>镜头组 01</span><span>插图</span></div><div class="scene-placeholder"><div class="placeholder-orbit">' + icon('image') + '</div><strong>根据分镜生成的插图</strong><span>完成第一回合后，画面会出现在这里。</span></div></section>';
    }
    const image = safeUrl(turn.image);
    const imageState = turn.imageStatus === 'generating' ? '正在生成动漫插图…' : turn.imageStatus === 'unavailable' ? '文字已保存，插图暂时不可用' : '根据本回合分镜生成';
    return '<section class="scene-card ' + (image ? 'has-image' : '') + '">' +
      '<div class="scene-topline"><span>镜头组 ' + String(state.turns).padStart(2, '0') + '</span><span>' + escapeHtml(imageState) + '</span></div>' +
      (image ? '<img class="scene-image" src="' + escapeHtml(image) + '" alt="第 ' + String(state.turns) + ' 回合的动漫分镜插图" loading="lazy" />' : '<div class="scene-placeholder"><div class="placeholder-orbit ' + (turn.imageStatus === 'generating' ? 'is-generating' : '') + '">' + icon(turn.imageStatus === 'generating' ? 'spark' : 'image') + '</div><strong>' + (turn.imageStatus === 'generating' ? '画师正在绘制这一页' : '插图还没有生成') + '</strong><span>' + (turn.imagePrompt ? '插图提示已从分镜中提取。' : '本回合暂无插图提示。') + '</span>' + (turn.imagePrompt && turn.imageStatus !== 'generating' ? '<button class="secondary-button compact-button" data-action="generate-image">' + icon('spark') + '生成插图</button>' : '') + '</div>') +
    '</section>';
  }

  function renderPanel(panel, index) {
    const shot = panel.shot || ['远景', '中景', '特写', '动作', '转场', '收束'][index] || '分镜';
    return '<article class="comic-panel panel-' + ((index % 5) + 1) + '">' +
      '<div class="panel-topline"><span class="panel-number">' + String(index + 1).padStart(2, '0') + '</span><span>' + escapeHtml(shot) + '</span></div>' +
      '<h4>' + escapeHtml(panel.title || '镜头 ' + String(index + 1).padStart(2, '0')) + '</h4>' +
      '<p>' + escapeHtml(panel.text || panel.narrative || '') + '</p>' +
      (panel.dialogue ? '<div class="dialogue"><span>对白</span>“' + escapeHtml(panel.dialogue) + '”</div>' : '') +
    '</article>';
  }

  function renderComic() {
    const boards = state.storyboards.filter(function (board) { return board && (board.image || board.panels && board.panels.length); }).slice().reverse();
    return '<section class="module-page comic-page">' +
      '<div class="page-intro"><div><span class="eyebrow">漫画 / 长廊</span><h2>把冒险装订起来</h2></div><span class="folio">' + boards.length + ' 页</span></div>' +
      (boards.length ? '<div class="comic-gallery">' + boards.map(renderComicBoard).join('') + '</div>' : '<div class="module-empty"><div class="empty-frame large">' + icon('comic') + '</div><h3>漫画长廊还是空白的</h3><p>完成冒险回合并生成插图后，整页分镜会收录在这里。</p><button class="primary-button" data-action="switch-screen" data-screen="adventure">' + icon('adventure') + '回到冒险</button></div>') +
    '</section>';
  }

  function renderComicBoard(board) {
    return '<article class="gallery-board">' +
      '<div class="gallery-board-head"><span>第 ' + String(board.turn || 0).padStart(2, '0') + ' 回合</span><span>' + escapeHtml(board.location || '') + '</span></div>' +
      (safeUrl(board.image) ? '<img src="' + escapeHtml(board.image) + '" alt="第 ' + String(board.turn || 0) + ' 回合漫画插图" loading="lazy" />' : '<div class="gallery-no-image">' + icon('image') + '<span>本页没有插图</span></div>') +
      '<div class="gallery-copy"><div class="mini-panel-row">' + (board.panels || []).slice(0, 4).map(function (panel, index) { return '<span><b>' + String(index + 1).padStart(2, '0') + '</b>' + escapeHtml(panel.shot || '分镜') + '</span>'; }).join('') + '</div><p>' + escapeHtml((board.panels || []).map(function (panel) { return panel.text || ''; }).join(' ').slice(0, 220)) + '</p></div>' +
    '</article>';
  }

  function renderStory() {
    const chapters = [];
    for (let index = 0; index < state.storyboards.length; index += 8) {
      chapters.push(state.storyboards.slice(index, index + 8));
    }
    return '<section class="module-page story-page">' +
      '<div class="page-intro"><div><span class="eyebrow">故事 / 章节</span><h2>冒险留下的文字</h2></div><button class="secondary-button compact-button" data-action="export-story">' + icon('download') + '导出 Markdown</button></div>' +
      (chapters.length ? '<div class="chapter-list">' + chapters.map(function (chapter, index) { return '<article class="chapter-card"><div class="chapter-number">' + String(index + 1).padStart(2, '0') + '</div><div><h3>第 ' + (index + 1) + ' 章</h3><p>' + escapeHtml(chapter.map(function (turn) { return (turn.panels || []).map(function (panel) { return panel.text || ''; }).join(' '); }).join(' ').slice(0, 260)) + '</p><span>' + chapter.length + ' 个回合</span></div></article>'; }).join('') + '</div>' : '<div class="module-empty"><div class="empty-frame large">' + icon('story') + '</div><h3>还没有章节</h3><p>冒险开始后，系统会每 8 个回合整理一章。</p><button class="primary-button" data-action="switch-screen" data-screen="adventure">' + icon('adventure') + '开始冒险</button></div>') +
    '</section>';
  }

  function renderBottomNav() {
    const primary = [
      ['adventure', '冒险', 'adventure'],
      ['comic', '漫画', 'comic'],
      ['story', '故事', 'story']
    ];
    const info = [
      ['profile', '个人信息', 'profile'],
      ['dex', '图鉴', 'dex'],
      ['team', '宝可梦', 'pokemon'],
      ['companions', '伙伴', 'people'],
      ['bag', '背包', 'bag']
    ];
    return '<nav class="bottom-nav" aria-label="游戏功能导航"><div class="nav-scroll primary-nav">' + primary.map(function (item) { return '<button class="nav-button ' + (state.screen === item[0] ? 'is-active' : '') + '" data-action="switch-screen" data-screen="' + item[0] + '" aria-label="' + item[1] + '">' + icon(item[2]) + '<span>' + item[1] + '</span></button>'; }).join('') + '</div><div class="nav-divider"></div><div class="nav-scroll info-nav">' + info.map(function (item) { return '<button class="nav-button" data-action="open-dialog" data-dialog="' + item[0] + '" aria-label="打开' + item[1] + '">' + icon(item[2]) + '<span>' + item[1] + '</span>' + (item[0] === 'dex' ? '<b>' + state.pokemon.length + '</b>' : item[0] === 'team' ? '<b>' + state.pokemon.filter(function (pokemon) { return pokemon.caught; }).length + '</b>' : '') + '</button>'; }).join('') + '</div></nav>';
  }

  function renderDialog() {
    if (!activeDialog) return '';
    if (activeDialog === 'identity') return renderIdentityDialog();
    if (activeDialog === 'settings') return renderSettingsDialog();
    if (activeDialog === 'save') return renderSaveDialog();
    if (activeDialog.indexOf('info:') === 0) return renderInfoDialog(activeDialog.slice(5));
    return '';
  }

  function dialogFrame(title, content, wide) {
    return '<div class="dialog-backdrop" data-action="close-dialog"><section class="dialog-card ' + (wide ? 'dialog-wide ' : '') + (title === '创建角色' ? 'identity-dialog' : '') + '" role="dialog" aria-modal="true" aria-label="' + escapeHtml(title) + '" data-dialog-card><div class="dialog-head"><div><span class="eyebrow">' + escapeHtml(title) + '</span><h2>' + escapeHtml(title) + '</h2></div><button class="icon-button" data-action="close-dialog" aria-label="关闭">' + icon('close') + '</button></div>' + content + '</section></div>';
  }

  function renderIdentityDialog() {
    const content = '<form class="dialog-form identity-form" data-form="identity">' +
      '<div class="identity-intro"><div class="identity-badge">' + icon('profile') + '</div><div><strong>建立你的训练师档案</strong><span>只填写姓名和性别，其余设定交给随机旅程。</span></div></div>' +
      '<p class="dialog-note">冒险地区、故乡、年龄、外观、性格与旅行目标会在创建时随机决定。你的选择会从第一回合开始影响故事。</p>' +
      '<div class="identity-fields"><label class="dialog-field"><span>训练师姓名</span><small>最多 12 个字</small><input name="name" maxlength="12" required placeholder="输入你的名字" autocomplete="nickname" /></label><label class="dialog-field"><span>性别</span><small>用于角色叙事</small><select name="gender" required><option value="unspecified">不指定</option><option value="male">男</option><option value="female">女</option></select></label></div>' +
      '<div class="identity-random-note"><span class="identity-random-icon">' + icon('spark') + '</span><div><strong>随机档案</strong><span>地区 · 故乡 · 年龄 · 训练风格</span></div><b>自动生成</b></div>' +
      '<div class="dialog-actions identity-actions"><button class="secondary-button" type="button" data-action="close-dialog"><span>取消</span></button><button class="primary-button identity-submit" type="submit"><span>生成档案</span><small>开始冒险</small>' + icon('arrow') + '</button></div>' +
      '</form>';
    return dialogFrame('创建角色', content);
  }

  function renderProviderSettingsCard(number, eyebrow, title, badge, description, baseName, baseURL, modelName, model, apiKeyName, apiKey, className) {
    return '<section class="provider-card ' + className + '"><div class="provider-card-head"><div><span class="eyebrow">' + number + ' · ' + eyebrow + '</span><strong>' + title + '</strong></div><span class="provider-badge">' + badge + '</span></div>' +
      '<p class="provider-description">' + description + '</p>' +
      '<label class="provider-field"><span>API Base URL</span><input name="' + baseName + '" value="' + escapeHtml(baseURL) + '" autocomplete="url" /></label>' +
      '<label class="provider-field"><span>模型</span><input name="' + modelName + '" value="' + escapeHtml(model) + '" autocomplete="off" /></label>' +
      '<label class="provider-field"><span>API Key</span><input name="' + apiKeyName + '" type="password" placeholder="' + (apiKey ? '已内置或已保存，留空保持不变' : '填写此通道的 API Key') + '" autocomplete="off" /></label></section>';
  }

  function renderSettingsContent(config) {
    return '<form class="dialog-form provider-settings-form" data-form="settings"><p class="dialog-note">已拆分两个 AI 通道：智谱负责中文剧情与漫画分镜，Agnes 负责整页动漫插图。两边可以独立更换模型和密钥。</p><div class="provider-grid">' +
      renderProviderSettingsCard('01', '剧情通道', '智谱 AI', '中文叙事', '生成连续的小说化剧情、4–6 格漫画分镜、行动选项和游戏事件。', 'textBaseURL', config.textBaseURL, 'textModel', config.textModel, 'textApiKey', config.textApiKey, 'provider-card-text') +
      renderProviderSettingsCard('02', '插图通道', 'Agnes AI', '整页插图', '根据已确认的分镜和角色资料，在后台生成竖版整页漫画插图。', 'imageBaseURL', config.imageBaseURL, 'imageModel', config.imageModel, 'imageApiKey', config.imageApiKey, 'provider-card-image') +
      '</div><label class="switch-row"><span>启用每回合整页插图</span><input name="images" type="checkbox" ' + (config.images ? 'checked' : '') + ' /><span class="switch-ui"></span></label><label class="switch-row"><span>夜间阅读模式</span><input name="theme" value="night" type="checkbox" ' + (config.theme === 'night' ? 'checked' : '') + ' /><span class="switch-ui"></span></label><div class="provider-footnote">文字通道不可用时无法推进剧情；插图通道不可用时仍会保留文字剧情，并允许之后单独重试。</div><div class="dialog-actions"><button class="text-button danger-text" type="button" data-action="clear-api-key">清除已保存的两个 API Key</button><button class="primary-button" type="submit">保存双通道设置 ' + icon('check') + '</button></div></form>';
  }

  function renderSettingsDialog() {
    const config = getSettings();
    return dialogFrame('AI 设置', renderSettingsContent(config));
  }

  function renderSaveDialog() {
    const slots = listSlots();
    const content = '<div class="slot-list">' + slots.map(function (slot) {
      const savedState = slot.state || {};
      const identity = savedState.identity && savedState.identity.name ? savedState.identity.name : '空存档';
      const meta = slot.saved ? identity + ' · ' + (savedState.location || '未知地点') + ' · ' + (savedState.turns || 0) + ' 回合' : '点击保存当前冒险';
      return '<div class="slot-row"><button class="slot-main" data-action="save-slot" data-slot="' + slot.slot + '"><strong>存档 ' + slot.slot + '</strong><span>' + escapeHtml(meta) + '</span><small>' + escapeHtml(formatDate(slot.updatedAt)) + '</small></button>' + (slot.saved ? '<button class="icon-button small-icon danger-text" data-action="delete-slot" data-slot="' + slot.slot + '" aria-label="删除存档 ' + slot.slot + '">' + icon('close') + '</button>' : '') + '</div>';
    }).join('') + '</div><p class="dialog-note">网页存档只在当前浏览器设备中保存。需要换设备时，请使用故事导出；完整 JSON 备份将在下一步补上。</p>';
    return dialogFrame('本地存档', content);
  }

  function renderSettingsDialog() {
    var config = getSettings();
    return dialogFrame('AI 设置', renderSettingsContent(config));
  }

  function renderInfoDialog(type) {
    const titles = { profile: '个人信息', dex: '宝可梦图鉴', team: '同行宝可梦', companions: '同行伙伴', bag: '背包' };
    let content = '';
    if (type === 'profile') content = renderProfile();
    if (type === 'dex') content = renderPokemonList(false);
    if (type === 'team') content = renderPokemonList(true);
    if (type === 'companions') content = renderCompanions();
    if (type === 'bag') content = renderBag();
    return dialogFrame(titles[type] || '信息', content, type === 'dex' || type === 'team');
  }

  function renderProfile() {
    const identity = state.identity || {};
    const region = regionData();
    const rows = [['名字', identity.name], ['性别', identity.gender === 'male' ? '男' : identity.gender === 'female' ? '女' : '未指定'], ['故乡', identity.hometown || '由故事决定'], ['地区', region.name], ['当前地点', state.location || '尚未出发'], ['冒险回合', state.turns], ['图鉴记录', state.pokemon.length + ' 只']];
    return '<div class="info-list">' + rows.map(function (row) { return '<div class="info-row"><span>' + row[0] + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>'; }).join('') + '</div>';
  }

  function renderPokemonList(onlyCaught) {
    const list = onlyCaught ? state.pokemon.filter(function (pokemon) { return pokemon.caught; }) : state.pokemon;
    if (!list.length) return '<div class="info-empty"><div class="empty-frame">' + icon(onlyCaught ? 'pokemon' : 'dex') + '</div><p>' + (onlyCaught ? '还没有同行的宝可梦。' : '还没有遇到宝可梦。') + '</p></div>';
    return '<div class="pokemon-list">' + list.map(function (pokemon) {
      const color = typeColors[pokemon.types && pokemon.types[0]] || '#6C6A57';
      return '<article class="pokemon-row"><div class="pokemon-sprite" style="--type-color:' + color + '">' + (safeUrl(pokemon.sprite) ? '<img src="' + escapeHtml(pokemon.sprite) + '" alt="' + escapeHtml(pokemon.name) + '" />' : icon('pokemon')) + '</div><div><strong>' + escapeHtml(pokemon.name || ('宝可梦 #' + pokemon.id)) + '</strong><span>' + escapeHtml((pokemon.types || []).join(' / ')) + '</span><small>' + (pokemon.caught ? '已加入同行队伍' : '已记录在图鉴') + '</small></div></article>';
    }).join('') + '</div>';
  }

  function renderCompanions() {
    if (!state.companions.length) return '<div class="info-empty"><div class="empty-frame">' + icon('people') + '</div><p>还没有同行人物。</p></div>';
    return '<div class="simple-list">' + state.companions.map(function (companion) { return '<div class="simple-row"><div class="avatar-mark">' + icon('profile') + '</div><div><strong>' + escapeHtml(companion.name) + '</strong><span>' + escapeHtml(companion.relation || '同行人物') + '</span>' + (companion.note ? '<small>' + escapeHtml(companion.note) + '</small>' : '') + '</div></div>'; }).join('') + '</div>';
  }

  function renderBag() {
    const items = Object.entries(state.inventory).filter(function (entry) { return entry[1] > 0; });
    if (!items.length) return '<div class="info-empty"><div class="empty-frame">' + icon('bag') + '</div><p>背包里还没有道具。</p></div>';
    return '<div class="simple-list">' + items.map(function (entry) { return '<div class="simple-row"><div class="item-mark">' + icon('bag') + '</div><div><strong>' + escapeHtml(entry[0]) + '</strong><span>数量 ×' + escapeHtml(entry[1]) + '</span></div></div>'; }).join('') + '</div>';
  }

  function closeDialog() {
    activeDialog = null;
    state.error = '';
    render();
  }

  function beginAdventure(form) {
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    if (!name) return;
    const profile = createRandomIdentity(name, String(formData.get('gender') || 'unspecified'));
    state = blankState();
    state.identity = profile.identity;
    state.region = profile.regionKey;
    state.location = profile.hometown;
    activeDialog = null;
    persistState();
    render();
    window.setTimeout(function () {
      submitAction(createRandomOpeningAction());
    }, 0);
  }

  function addMessage(role, content) {
    state.messages = state.messages.concat([{ role: role, content: content, timestamp: Date.now() }]).slice(-60);
  }

  function buildSystemPrompt() {
    const region = regionData();
    const identity = state.identity || {};
    const seen = state.pokemon.map(function (pokemon) { return pokemon.name; }).filter(Boolean).join('、') || '暂无';
    const companions = state.companions.map(function (companion) { return companion.name; }).filter(Boolean).join('、') || '暂无';
    return '你是原创宝可梦风格冒险漫画的分镜导演和叙事者。不要输出普通的200字小说，要把每次回合写成可视化的漫画分镜。\n\n' +
      '玩家：' + (identity.name || '训练师') + '；性别：' + (identity.gender || '未指定') + '；年龄：18；故乡：' + (identity.hometown || '未知') + '\n' +
      '地区：' + region.name + '，当前地点：' + (state.location || '未知地点') + '；已遇宝可梦：' + seen + '；同行伙伴：' + companions + '\n\n' +
      '创作要求：\n' +
      '1. 每回合输出4到6格漫画分镜，总中文叙事不少于350字，建议350到600字。\n' +
      '2. 分镜必须有镜头类型（远景、中景、特写、动作、转场等）、画面动作、环境、情绪和节奏变化。\n' +
      '3. 宝可梦只作为世界中的生物自然出现，不要每格都塞宝可梦；角色对白要少而有用。\n' +
      '4. 每回合提供2到4个以动词开头的选项，每个选项不超过30字。\n' +
      '5. 插图提示词要描述整组分镜的关键画面，使用“宝可梦风格日式动画冒险”的视觉语言，但不复刻具体官方海报或角色。\n\n' +
      '只返回纯JSON，不要Markdown围栏：\n' +
      '{"panels":[{"title":"镜头标题","shot":"远景","text":"该格的画面与叙事","dialogue":"可选对白","imagePrompt":"该格画面提示"}],"options":["行动选项"],"illustrationPrompt":"整组分镜插图提示词","events":{"pokemonSeen":null,"pokemonCaught":null,"location":null,"itemGained":null,"companionMet":null}}';
  }

  function buildMessages(action) {
    const context = state.messages.slice(-8).map(function (message) {
      return { role: message.role, content: message.content };
    });
    if (!context.length || context[context.length - 1].role !== 'user' || context[context.length - 1].content !== action) {
      context.push({ role: 'user', content: action });
    }
    return [{ role: 'system', content: buildSystemPrompt() }].concat(context);
  }

  async function callChat(config, action) {
    const endpoint = normalizeBaseUrl(config.baseURL) + '/chat/completions';
    const baseBody = {
      model: config.model,
      messages: buildMessages(action),
      temperature: 0.85,
      max_tokens: 2400
    };
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.apiKey },
      body: JSON.stringify(Object.assign({}, baseBody, { response_format: { type: 'json_object' } }))
    });
    if (!response.ok && (response.status === 400 || response.status === 422)) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.apiKey },
        body: JSON.stringify(baseBody)
      });
    }
    if (!response.ok) {
      const detail = await response.text().catch(function () { return ''; });
      const error = new Error(response.status === 401 ? 'API Key 无效，请检查 AI 设置。' : response.status === 429 ? '请求过于频繁，请稍后再试。' : 'AI 请求失败（' + response.status + '）。');
      error.detail = detail.slice(0, 160);
      throw error;
    }
    const payload = await response.json();
    const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
    return parseStory(content || '');
  }

  function parseStory(content) {
    let text = String(content || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
    let data;
    try { data = JSON.parse(text); } catch (error) { data = { panels: splitIntoPanels(text), options: ['继续前进', '观察周围', '寻找附近的宝可梦'], events: {} }; }
    const rawPanels = Array.isArray(data.panels) ? data.panels : [];
    const panels = rawPanels.slice(0, 6).map(function (panel, index) {
      return {
        title: String(panel && (panel.title || panel.name) || '镜头 ' + String(index + 1).padStart(2, '0')).slice(0, 40),
        shot: String(panel && (panel.shot || panel.camera) || ['远景', '中景', '特写', '动作', '转场', '收束'][index] || '分镜').slice(0, 16),
        text: String(panel && (panel.text || panel.narrative || panel.content) || '').trim().slice(0, 420),
        dialogue: String(panel && panel.dialogue || '').trim().slice(0, 100),
        imagePrompt: String(panel && (panel.imagePrompt || panel.illustration) || '').trim().slice(0, 500)
      };
    }).filter(function (panel) { return panel.text; });
    const fallbackPanels = panels.length ? panels : splitIntoPanels(String(data.narrative || text));
    const options = Array.isArray(data.options) ? data.options.map(function (option) { return String(option).trim().slice(0, 30); }).filter(Boolean).slice(0, 4) : [];
    const events = normalizeEvents(data.events || data);
    const panelPrompt = fallbackPanels.map(function (panel) { return panel.imagePrompt; }).filter(Boolean).join('；');
    return {
      panels: fallbackPanels,
      options: options.length ? options : ['继续前进', '观察周围', '稍作休息'],
      imagePrompt: String(data.illustrationPrompt || data.imagePrompt || panelPrompt || '').trim().slice(0, 900),
      events: events
    };
  }

  function splitIntoPanels(text) {
    const clean = String(text || '').trim() || '前方的道路暂时没有传来新的动静。';
    const sentences = clean.split(/(?<=[。！？；])/).filter(Boolean);
    const panels = [];
    let buffer = '';
    sentences.forEach(function (sentence) {
      if ((buffer + sentence).length > 95 && buffer) {
        panels.push({ title: '镜头 ' + String(panels.length + 1).padStart(2, '0'), shot: ['远景', '中景', '特写', '动作'][panels.length % 4], text: buffer.trim(), dialogue: '', imagePrompt: '' });
        buffer = '';
      }
      buffer += sentence;
    });
    if (buffer.trim()) panels.push({ title: '镜头 ' + String(panels.length + 1).padStart(2, '0'), shot: '收束', text: buffer.trim(), dialogue: '', imagePrompt: '' });
    return panels.slice(0, 6);
  }

  function normalizeEvents(events) {
    const seen = Number(events.pokemonSeen);
    const caught = Number(events.pokemonCaught);
    const companion = events.companionMet;
    return {
      pokemonSeen: Number.isInteger(seen) && seen >= 1 && seen <= 1025 ? seen : null,
      pokemonCaught: Number.isInteger(caught) && caught >= 1 && caught <= 1025 ? caught : null,
      location: typeof events.location === 'string' && events.location.trim() ? events.location.trim().slice(0, 32) : null,
      itemGained: typeof events.itemGained === 'string' && events.itemGained.trim() ? events.itemGained.trim().slice(0, 32) : null,
      companionMet: companion && typeof companion === 'object' && companion.name ? { name: String(companion.name).slice(0, 30), relation: String(companion.relation || '同行人物').slice(0, 30), note: String(companion.note || '').slice(0, 80) } : null
    };
  }

  async function fetchPokemon(id) {
    const pokemonId = Number(id);
    if (!Number.isInteger(pokemonId) || pokemonId < 1 || pokemonId > 1025) throw new Error('宝可梦编号无效');
    if (pokemonCache.has(pokemonId)) return Object.assign({}, pokemonCache.get(pokemonId));
    const localRecord = window.PkaWorld && window.PkaWorld.getPokemonRecord ? window.PkaWorld.getPokemonRecord(pokemonId) : null;
    if (localRecord) {
      const local = Object.assign({}, localRecord);
      pokemonCache.set(pokemonId, local);
      return Object.assign({}, local);
    }
    const response = await fetch('https://pokeapi.co/api/v2/pokemon/' + pokemonId);
    if (!response.ok) throw new Error('PokéAPI 请求失败');
    const pokemon = await response.json();
    const speciesUrl = pokemon.species && pokemon.species.url;
    let chineseName = '';
    if (speciesUrl) {
      try {
        const speciesResponse = await fetch(speciesUrl);
        const species = await speciesResponse.json();
        const name = (species.names || []).find(function (entry) { return entry.language && ['zh-hans', 'zh-hant', 'zh'].indexOf(String(entry.language.name || '').toLowerCase()) >= 0; });
        if (name) chineseName = name.name;
      } catch (error) { /* 宝可梦基本数据已经足够显示 */ }
    }
    const artwork = pokemon.sprites && pokemon.sprites.other && pokemon.sprites.other['official-artwork'] && pokemon.sprites.other['official-artwork'].front_default;
    const typeNames = window.PkaWorld && window.PkaWorld.typeNames ? window.PkaWorld.typeNames : ({ normal: '一般', fire: '火', water: '水', electric: '电', grass: '草', ice: '冰', fighting: '格斗', poison: '毒', ground: '地面', flying: '飞行', psychic: '超能力', bug: '虫', rock: '岩石', ghost: '幽灵', dragon: '龙', dark: '恶', steel: '钢', fairy: '妖精' });
    const record = {
      id: pokemon.id || pokemonId,
      name: chineseName || '宝可梦 #' + String(pokemon.id || pokemonId),
      englishName: pokemon.name || '',
      slug: pokemon.name || '',
      types: (pokemon.types || []).map(function (entry) { return entry.type && entry.type.name || ''; }).map(function (type) { return typeNames[type] || type; }),
      sprite: artwork || pokemon.sprites && pokemon.sprites.front_default || ''
    };
    pokemonCache.set(pokemonId, record);
    return Object.assign({}, record);
  }

  async function applyEvents(events) {
    const nextLocation = events.location || state.location;
    if (events.pokemonSeen && !state.pokemon.some(function (pokemon) { return pokemon.id === events.pokemonSeen; })) {
      try {
        const pokemon = await fetchPokemon(events.pokemonSeen);
        pokemon.seenAt = nextLocation;
        pokemon.caught = false;
        state.pokemon = state.pokemon.concat([pokemon]);
      } catch (error) {
        state.pokemon = state.pokemon.concat([{ id: events.pokemonSeen, name: '宝可梦 #' + events.pokemonSeen, englishName: '', slug: '', types: [], sprite: '', seenAt: nextLocation, caught: false }]);
      }
    }
    if (events.pokemonCaught) {
      state.pokemon = state.pokemon.map(function (pokemon) { return pokemon.id === events.pokemonCaught ? Object.assign({}, pokemon, { caught: true }) : pokemon; });
    }
    if (events.itemGained) state.inventory[events.itemGained] = (state.inventory[events.itemGained] || 0) + 1;
    if (events.companionMet && !state.companions.some(function (companion) { return companion.name === events.companionMet.name; })) state.companions = state.companions.concat([events.companionMet]);
    state.location = nextLocation;
  }

  async function generateImage(config, prompt) {
    return window.PkaImageClient.generate({
      images: config.images,
      imageBaseURL: config.imageBaseURL || config.baseURL,
      imageApiKey: config.imageApiKey || config.apiKey,
      imageModel: config.imageModel
    }, prompt);
  }

  async function submitAction(action) {
    const cleanAction = String(action || '').trim();
    if (!cleanAction || state.loading) return;
    const config = getSettings();
    if (!config.apiKey) {
      state.error = '请先在 AI 设置中填写 API Key。';
      activeDialog = 'settings';
      render();
      return;
    }
    state.loading = true;
    state.error = '';
    addMessage('user', cleanAction);
    render();
    try {
      const result = await callChat(config, cleanAction);
      await applyEvents(result.events);
      state.turns += 1;
      const turn = { turn: state.turns, location: state.location, playerAction: cleanAction, panels: result.panels, options: result.options, imagePrompt: result.imagePrompt, image: '', imageStatus: result.imagePrompt && config.images ? 'waiting' : 'unavailable', timestamp: Date.now() };
      state.currentTurn = turn;
      state.storyboards = state.storyboards.concat([turn]);
      addMessage('assistant', JSON.stringify(result));
      state.loading = false;
      persistState();
      render();
      if (result.imagePrompt && config.images) {
        pendingImage = true;
        state.currentTurn.imageStatus = 'generating';
        state.storyboards[state.storyboards.length - 1] = state.currentTurn;
        render();
        try {
          const image = await generateImage(config, result.imagePrompt);
          state.currentTurn.image = image;
          state.currentTurn.imageStatus = image ? 'ready' : 'unavailable';
          state.storyboards[state.storyboards.length - 1] = state.currentTurn;
          persistState();
        } catch (imageError) {
          state.currentTurn.imageStatus = 'unavailable';
          state.storyboards[state.storyboards.length - 1] = state.currentTurn;
          persistState();
        } finally {
          pendingImage = false;
          render();
        }
      }
    } catch (error) {
      state.loading = false;
      state.error = error.message || 'AI 请求失败。';
      persistState();
      render();
    }
  }

  async function regenerateCurrentImage() {
    const turn = currentTurn();
    const config = getSettings();
    if (!turn || !turn.imagePrompt || !config.apiKey || pendingImage) return;
    pendingImage = true;
    turn.imageStatus = 'generating';
    render();
    try {
      turn.image = await generateImage(config, turn.imagePrompt);
      turn.imageStatus = turn.image ? 'ready' : 'unavailable';
    } catch (error) {
      turn.imageStatus = 'unavailable';
    } finally {
      pendingImage = false;
      persistState();
      render();
    }
  }

  function exportStory() {
    const identity = state.identity || {};
    let markdown = '# ' + (identity.name || '训练师') + '的宝可梦漫画冒险\n\n';
    state.storyboards.forEach(function (turn) {
      markdown += '## 第 ' + turn.turn + ' 回合 · ' + (turn.location || '') + '\n\n';
      markdown += '行动：' + turn.playerAction + '\n\n';
      (turn.panels || []).forEach(function (panel, index) { markdown += '**' + (index + 1) + '. ' + (panel.shot || '分镜') + '｜' + (panel.title || '') + '**\n\n' + (panel.text || '') + '\n\n'; if (panel.dialogue) markdown += '> “' + panel.dialogue + '”\n\n'; });
      markdown += '---\n\n';
    });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (identity.name || '训练师') + '-漫画冒险.md';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'new-adventure') { activeDialog = 'identity'; render(); return; }
    if (action === 'close-dialog') {
      if (target.classList.contains('dialog-backdrop') && event.target.closest('[data-dialog-card]')) return;
      closeDialog();
      return;
    }
    if (action === 'open-dialog') {
      const dialog = target.dataset.dialog || 'settings';
      activeDialog = ['profile', 'dex', 'team', 'companions', 'bag'].indexOf(dialog) >= 0 ? 'info:' + dialog : dialog;
      render();
      return;
    }
    if (action === 'switch-screen') { state.screen = target.dataset.screen || 'adventure'; persistState(); render(); return; }
    if (action === 'open-info') { activeDialog = 'info:' + target.dataset.info; render(); return; }
    if (action === 'submit-action') { submitAction(target.dataset.value || ''); return; }
    if (action === 'generate-image') { regenerateCurrentImage(); return; }
    if (action === 'clear-api-key') { const config = getSettings(); config.apiKey = ''; saveSettings(config); activeDialog = 'settings'; render(); return; }
    if (action === 'load-slot') {
      const loaded = readSlot(target.dataset.slot);
      if (loaded) { state = loaded; activeDialog = null; persistState(); render(); }
      return;
    }
    if (action === 'save-slot') {
      writeSlot(target.dataset.slot);
      activeDialog = 'save';
      render();
      return;
    }
    if (action === 'delete-slot') {
      if (window.confirm('确定删除这个存档吗？')) { localStorage.removeItem(SAVE_PREFIX + target.dataset.slot); activeDialog = 'save'; render(); }
      return;
    }
    if (action === 'export-story') { exportStory(); return; }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const kind = form.dataset.form;
    if (kind === 'identity') { beginAdventure(form); return; }
    if (kind === 'action') {
      const value = new FormData(form).get('action');
      form.reset();
      submitAction(value);
      return;
    }
    if (kind === 'settings') {
      const data = new FormData(form);
      const current = getSettings();
      const apiKey = String(data.get('apiKey') || '').trim();
      saveSettings({ baseURL: String(data.get('baseURL') || '').trim(), apiKey: apiKey || current.apiKey, model: String(data.get('model') || '').trim(), imageModel: String(data.get('imageModel') || '').trim(), images: data.get('images') === 'on' });
      activeDialog = null;
      state.error = '';
      render();
    }
  }

  /* ----------------------------------------------------------------------
   * RPG 漫画回合增强层
   * 规则与媒体分别位于 assets/game-rules.js / assets/media-store.js。
   * 这里保留原有静态页面入口，同时把旧存档迁移到 v3 数据模型。
   * ---------------------------------------------------------------------- */
  var dialogTrigger = null;

  function blankState() {
    return PkaRules.createInitialState();
  }

  function normalizeState(value) {
    var next = PkaRules.normalizeState(value);
    next.storyboards = next.storyboards.map(function (turn) {
      return Object.assign({}, turn, { image: '', imageStatus: turn.imageStatus || (turn.imageRef ? 'ready' : 'unavailable'), imageCollapsed: Object.prototype.hasOwnProperty.call(turn, 'imageCollapsed') ? turn.imageCollapsed !== false : DEFAULT_IMAGE_COLLAPSED });
    });
    if (next.currentTurn) {
      next.currentTurn = next.storyboards.find(function (turn) { return turn.turn === next.currentTurn.turn; }) || next.storyboards[next.storyboards.length - 1] || null;
    }
    return next;
  }

  function loadState() {
    var saved = readJson(AUTOSAVE_KEY, null);
    return saved && saved.state ? normalizeState(saved.state) : blankState();
  }

  function serializableState() {
    var data = JSON.parse(JSON.stringify(Object.assign({}, state, { loading: false, error: '', utilityOpen: false })));
    data.storyboards = (data.storyboards || []).map(function (turn) {
      delete turn.image;
      return turn;
    });
    if (data.currentTurn) delete data.currentTurn.image;
    return data;
  }

  function persistState() {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ version: 3, updatedAt: Date.now(), state: serializableState() }));
    } catch (error) {
      state.error = '本地存档空间不足。图片已改为独立缓存，请导出 JSON 存档后清理旧数据。';
    }
  }

  function writeSlot(slot) {
    try {
      localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify({ version: 3, updatedAt: Date.now(), state: serializableState() }));
    } catch (error) {
      state.error = '这个存档槽空间不足，请先导出 JSON 存档。';
    }
  }

  function itemKey(value) {
    var text = String(value || '').trim();
    var labels = PkaRules.ITEM_LABELS || {};
    if (labels[text]) return text;
    var byLabel = Object.keys(labels).find(function (key) { return labels[key] === text; });
    if (byLabel) return byLabel;
    if (window.PkaWorld && window.PkaWorld.itemNames && window.PkaWorld.itemNames[text]) return text;
    if (window.PkaWorld && window.PkaWorld.itemNames) {
      var worldKey = Object.keys(window.PkaWorld.itemNames).find(function (key) { return window.PkaWorld.itemNames[key] === text; });
      if (worldKey) return worldKey;
    }
    return '';
  }

  function itemLabel(value) {
    return PkaRules.ITEM_LABELS[value] || value;
  }

  function getPokemonRecord(id) {
    return state.pokemon.find(function (pokemon) { return Number(pokemon.id) === Number(id); });
  }

  async function refreshPokemonRecords() {
    if (!state.pokemon.length) return;
    var changed = false;
    var refreshed = await Promise.all(state.pokemon.map(async function (record) {
      if (!record || !record.id) return record;
      try {
        var canonical = await fetchPokemon(record.id);
        changed = changed || canonical.name !== record.name || canonical.sprite !== record.sprite || JSON.stringify(canonical.types || []) !== JSON.stringify(record.types || []);
        return Object.assign({}, record, canonical);
      } catch (error) {
        return Object.assign({}, record, { name: isLikelyNonChinesePokemonName(record.name) ? '宝可梦 #' + record.id : record.name });
      }
    }));
    if (!changed) return;
    state.pokemon = refreshed;
    if (state.activeEncounter) {
      var active = getPokemonRecord(state.activeEncounter.pokemonId);
      if (active) state.activeEncounter = Object.assign({}, state.activeEncounter, { name: active.name, types: active.types, sprite: active.sprite });
    }
    persistState();
  }

  function syncCurrentTurn(turn) {
    var isCurrent = state.currentTurn && Number(state.currentTurn.turn) === Number(turn.turn);
    state.storyboards = state.storyboards.map(function (item) { return item.turn === turn.turn ? turn : item; });
    if (isCurrent || !state.currentTurn) state.currentTurn = turn;
  }

  function updateQuestProgress(kind) {
    var completed = [];
    state.quests = state.quests.map(function (quest) {
      if (quest.completed) return quest;
      var matches = quest.kind === kind || (quest.kind === 'explore' && kind === 'location');
      if (!matches) return quest;
      var progress = Math.min(Number(quest.target) || 1, (Number(quest.progress) || 0) + 1);
      var next = Object.assign({}, quest, { progress: progress });
      if (progress >= next.target) {
        next.completed = true;
        completed.push(next);
      }
      return next;
    });
    completed.forEach(function (quest) {
      if (state.completedQuests.indexOf(quest.id) < 0) state.completedQuests.push(quest.id);
      var rewardKey = quest.reward && quest.reward.item ? itemKey(quest.reward.item) : '';
      if (rewardKey) state.inventory[rewardKey] = (state.inventory[rewardKey] || 0) + (Number(quest.reward.amount) || 1);
    });
    return completed;
  }

  async function applyRuleEvents(action, proposal) {
    var resolution = PkaRules.resolve(action, state, proposal);
    var outcomes = [];
    var encounterRecord = null;
    var proposedEncounterName = proposal && proposal.encounter && proposal.encounter.name ? String(proposal.encounter.name).trim() : '';
    for (var index = 0; index < resolution.events.length; index += 1) {
      var event = resolution.events[index];
      if (event.type === 'encounter') {
        var encounter = event.encounter;
        var record = getPokemonRecord(encounter.pokemonId);
        try {
          var canonicalRecord = await fetchPokemon(encounter.pokemonId);
          record = Object.assign({}, record || {}, canonicalRecord);
        } catch (error) {
          record = Object.assign({}, record || {}, { id: encounter.pokemonId, name: isLikelyNonChinesePokemonName(record && record.name) ? '宝可梦 #' + encounter.pokemonId : record.name, types: (record && record.types) || [], sprite: (record && record.sprite) || '' });
        }
        if (getPokemonRecord(encounter.pokemonId)) state.pokemon = state.pokemon.map(function (pokemon) { return Number(pokemon.id) === Number(encounter.pokemonId) ? record : pokemon; });
        else state.pokemon.push(record);
        record = getPokemonRecord(encounter.pokemonId) || record;
        record.caught = record.caught === true;
        record.seenAt = encounter.location || state.location;
        record.seenCount = record.seenCount || 0;
        record.caughtCount = record.caughtCount || 0;
        encounterRecord = record;
        record.seenCount = (record.seenCount || 0) + 1;
        record.seenAt = encounter.location || state.location;
        state.activeEncounter = Object.assign({}, encounter, { name: record.name, types: record.types, sprite: record.sprite, weakened: false });
        state.stats.encounters += 1;
        state.worldFlags.lastEncounterTurn = state.turns;
        updateQuestProgress('encounter');
        outcomes.push('发现了 ' + record.name + '。');
      } else if (event.type === 'location') {
        state.location = event.value;
        updateQuestProgress('location');
        outcomes.push('抵达 ' + event.value + '。');
      } else if (event.type === 'battle') {
        state.stats.battles += 1;
        if (state.activeEncounter) state.activeEncounter = Object.assign({}, state.activeEncounter, { weakened: event.outcome === 'win' });
        if (event.outcome === 'win') {
          var active = state.party.length ? getPokemonRecord(state.party[0]) : null;
          if (active) { active.xp = (active.xp || 0) + 10; active.level = Math.min(50, (active.level || 1) + (active.xp >= 100 ? 1 : 0)); }
          updateQuestProgress('battle');
          outcomes.push(event.assisted ? '伙伴和你一起稳住了局面。' : '战斗取得了优势，可以尝试捕获。');
        } else {
          state.activeEncounter = null;
          outcomes.push('你选择拉开距离，暂时结束了对战。');
        }
      } else if (event.type === 'capture') {
        if (event.outcome === 'success' || event.outcome === 'proposal') {
          var captured = getPokemonRecord(event.pokemonId);
          if (captured) {
            captured.caught = true;
            captured.caughtCount = (captured.caughtCount || 0) + 1;
            captured.caughtAt = state.location;
            captured.level = captured.level || (state.activeEncounter && state.activeEncounter.level) || 3;
            captured.maxHp = captured.maxHp || 10;
            captured.hp = captured.hp || captured.maxHp;
            if (state.party.indexOf(captured.id) < 0 && state.party.length < PkaRules.MAX_PARTY) state.party.push(captured.id);
          }
          state.stats.captures += 1;
          state.activeEncounter = null;
          updateQuestProgress('capture');
          outcomes.push('捕获成功，' + (captured ? captured.name : '新的伙伴') + ' 加入了你的记录。');
        } else if (event.outcome === 'no-ball') {
          outcomes.push('背包里没有精灵球，先准备道具吧。');
        } else {
          outcomes.push('精灵球晃了几下，还是被挣脱了。');
        }
      } else if (event.type === 'item-delta') {
        var deltaKey = itemKey(event.item);
        state.inventory[deltaKey] = Math.max(0, (state.inventory[deltaKey] || 0) + Number(event.amount || 0));
        if (Number(event.amount) > 0) state.stats.itemsFound += Number(event.amount);
      } else if (event.type === 'reward') {
        var rewardKey = itemKey(event.item);
        var rewardAmount = Math.max(0, Number(event.amount || 1));
        if (rewardAmount) {
          state.inventory[rewardKey] = (state.inventory[rewardKey] || 0) + rewardAmount;
          state.stats.itemsFound += rewardAmount;
          outcomes.push('获得了 ' + itemLabel(rewardKey) + ' ×' + rewardAmount + '。');
        }
      } else if (event.type === 'heal') {
        state.party.forEach(function (id) {
          var member = getPokemonRecord(id);
          if (member) member.hp = Math.min(member.maxHp || 10, (member.hp || 0) + Number(event.amount || 0));
        });
        outcomes.push('队伍状态恢复了一些。');
      } else if (event.type === 'escape') {
        state.activeEncounter = null;
        outcomes.push('你记住了这次相遇，选择继续前进。');
      } else if (event.type === 'encounter-note') {
        outcomes.push(event.value);
      } else if (event.type === 'companion') {
        var companion = event.value || {};
        var companionName = String(companion.name || '新伙伴').slice(0, 30);
        if (!state.companions.some(function (item) { return item.name === companionName; })) state.companions.push({ name: companionName, relation: String(companion.relation || '同行人物').slice(0, 30), note: String(companion.note || '').slice(0, 100) });
        state.relationships[companionName] = Math.min(100, (state.relationships[companionName] || 0) + 5);
        updateQuestProgress('companion');
        outcomes.push(companionName + ' 对你的选择有了新的认识。');
      }
    }
    if (!encounterRecord && state.activeEncounter) encounterRecord = getPokemonRecord(state.activeEncounter.pokemonId);
    return { resolution: resolution, outcomes: outcomes, encounterRecord: encounterRecord, proposedEncounterName: proposedEncounterName, suppressedEncounter: resolution.suppressedEncounter || null };
  }

  function buildSystemPrompt() {
    var region = regionData();
    var worldContext = window.PkaWorld ? window.PkaWorld.promptContext(state.region) : '';
    var identity = state.identity || {};
    var seen = state.pokemon.map(function (pokemon) { return pokemon.name; }).filter(Boolean).join('、') || '暂无';
    var party = state.party.map(function (id) { var pokemon = getPokemonRecord(id); return pokemon && pokemon.name + ' Lv.' + (pokemon.level || 1) + ' HP ' + (pokemon.hp || 0) + '/' + (pokemon.maxHp || 10); }).filter(Boolean).join('、') || '暂无';
    var companions = state.companions.map(function (companion) { return companion.name + '（关系值 ' + (state.relationships[companion.name] || 0) + '）'; }).filter(Boolean).join('、') || '暂无';
    var encounter = state.activeEncounter ? state.activeEncounter.name + '（等级 ' + state.activeEncounter.level + '）' : '暂无';
    var continuity = buildContinuityContext();
    var activeQuests = state.quests.filter(function (quest) { return !quest.completed; }).map(function (quest) { return quest.title + ' ' + quest.progress + '/' + quest.target; }).join('、') || '暂无';
    var completedQuests = state.completedQuests.length ? state.completedQuests.join('、') : '暂无';
    return '你是原创宝可梦风格冒险漫画的分镜导演和叙事者。每个回合必须是可视化的漫画分镜，而不是一段普通短文。\n\n' +
      '玩家：' + (identity.name || '训练师') + '；性别：' + (identity.gender || '未指定') + '；年龄：' + (identity.age || '未知') + '；地区：' + region.name + '；故乡：' + (identity.hometown || '未知') + '；地点：' + (state.location || '未知地点') + '\n' +
      '训练风格：' + (identity.personality || '未知') + '；外观：' + (identity.appearance || '由故事决定') + '；当前目标：' + (identity.goal || '寻找属于自己的冒险') + '；出发背景：' + (identity.backstory || '刚刚踏上旅途') + '\n' +
      '同行宝可梦：' + party + '；已遇宝可梦：' + seen + '；同行伙伴：' + companions + '；当前遭遇：' + encounter + '\n' +
      '背包：' + JSON.stringify(state.inventory) + '；进行中的任务：' + activeQuests + '；已完成任务：' + completedQuests + '；回合：' + state.turns + '\n\n' +
      '【故事连续性档案】\n' + continuity + '\n\n' +
      '本回合必须遵守的世界观资料：' + worldContext + '\n\n' +
      '输出要求：\n' +
      '1. 输出4到6格分镜，总中文叙事约500到900字；每格包含标题、镜头类型、画面构图、动作、环境、情绪、对白、音效和imagePrompt。\n' +
      '2. 选项为2到4个短动作，不能替玩家直接宣判捕获、奖励或战斗结果。\n' +
      '3. 宝可梦不是每回合必然出现；没有明确线索时必须返回encounter:null。只有发现、声音、足迹、气味、任务、地点或战斗线索明确时才允许遭遇。\n' +
      '4. 遭遇只从1到1025的宝可梦编号中选择；pokemonId是唯一准确信息，name必须填写该编号对应的中文名，trigger只能是story、sound、trace、quest、location或battle。\n' +
      '5. 不要连续两个回合生成新的宝可梦；普通回合优先描写探索、训练、伙伴互动和环境变化。\n' +
      '6. illustrationPrompt描述整页漫画，不要文字、水印、官方角色复刻；保持玩家、队伍、伙伴、地点的视觉连续性，并使用与encounter相同的宝可梦中文名、类型和视觉特征。\n' +
      '7. 必须承接故事连续性档案：保留玩家姓名、性别、外观、性格、目标、已经发生的事件、关系变化和地点因果；不要重新介绍已经完成的出发，不要无理由重置人物、队伍、道具或任务。\n' +
      '8. 先从最近一回合的结尾继续，再根据玩家本回合行动推进新的变化；如果历史中已经出现某个伙伴或宝可梦，优先让其保持一致，不要无理由替换。\n' +
      '9. 主角、伙伴和主线原创，不直接复刻官方动画角色；不要创造新的属性类型、道具、地区或地点。\n' +
      '10. 返回纯JSON，不要Markdown围栏。\n\n' +
      '{"panels":[{"title":"镜头标题","shot":"远景","composition":"画面构图","action":"角色动作","text":"叙事与环境","dialogue":"对白","sfx":"音效","imagePrompt":"画面提示"}],"options":["观察周围","继续前进"],"illustrationPrompt":"整页插图提示","events":{"encounter":{"pokemonId":null,"name":"对应的中文名","trigger":"story","level":3,"mood":"警觉"},"pokemonSeen":null,"location":null,"itemGained":null,"companionMet":null}}';
  }

  function buildContinuityContext() {
    var boards = Array.isArray(state.storyboards) ? state.storyboards.filter(function (turn) { return turn && (turn.panels || turn.playerAction); }) : [];
    if (!boards.length) return '这是第一回合，必须从训练师档案中的出发背景开始，不要假设玩家已经遇到过其他人物或宝可梦。';

    function compactEvents(turn) {
      var outcomes = Array.isArray(turn.outcomes) ? turn.outcomes.filter(Boolean).join('；') : '';
      var eventNames = Array.isArray(turn.events) ? turn.events.map(function (event) {
        if (!event || !event.type) return '';
        if (event.type === 'encounter' && event.encounter) return 'encounter:' + (event.encounter.pokemonId || 'unknown');
        if (event.type === 'location') return 'location:' + (event.value || '');
        if (event.type === 'companion' && event.value) return 'companion:' + (event.value.name || '');
        if (event.type === 'capture') return 'capture:' + (event.outcome || '');
        return event.type;
      }).filter(Boolean).join('、') : '';
      return [outcomes, eventNames].filter(Boolean).join('；').slice(0, 220);
    }

    function panelText(turn, limit) {
      return (turn.panels || []).map(function (panel) { return panel && panel.text ? panel.text : ''; }).filter(Boolean).join(' ').replace(/\s+/g, '').slice(0, limit);
    }

    var recentStart = Math.max(0, boards.length - 6);
    var older = boards.slice(0, recentStart).map(function (turn) {
      return '第' + Number(turn.turn || 0) + '回合：地点' + (turn.location || '未知') + '；行动' + (turn.playerAction || '未知') + '；' + panelText(turn, 120) + (compactEvents(turn) ? '；结果' + compactEvents(turn) : '');
    }).join('\n').slice(0, 3600);
    var recent = boards.slice(recentStart).map(function (turn) {
      return '第' + Number(turn.turn || 0) + '回合：地点' + (turn.location || '未知') + '；玩家行动：' + (turn.playerAction || '未知') + '；分镜：' + panelText(turn, 560) + (compactEvents(turn) ? '；已确认结果：' + compactEvents(turn) : '');
    }).join('\n');

    return (older ? '较早主线摘要（只作为已发生事实，不要覆盖最近内容）：\n' + older + '\n' : '') +
      '最近分镜（必须从最后一回合的结尾接续）：\n' + recent.slice(0, 5200);
  }

  function isRandomOpeningAction(action) {
    return String(action || '').indexOf('【随机开场】') === 0;
  }

  function normalizeEvents(events) {
    var source = events && typeof events === 'object' ? events : {};
    var encounter = source.encounter && typeof source.encounter === 'object' ? source.encounter : null;
    var seen = Number(source.pokemonSeen);
    if (!encounter && Number.isInteger(seen)) encounter = { pokemonId: seen, level: 3, mood: '警觉', trigger: 'legacy' };
    if (encounter) {
      var encounterId = Number(encounter.pokemonId || encounter.id);
      encounter = Number.isInteger(encounterId) && encounterId >= 1 && encounterId <= 1025 ? { pokemonId: encounterId, name: String(encounter.name || '').trim().slice(0, 40), trigger: String(encounter.trigger || '').trim().toLowerCase().slice(0, 16), level: Math.max(1, Math.min(30, Number(encounter.level) || 3)), mood: String(encounter.mood || '警觉').slice(0, 24) } : null;
    }
    var companion = source.companionMet;
    return {
      encounter: encounter,
      pokemonSeen: encounter ? encounter.pokemonId : null,
      pokemonCaught: Number.isInteger(Number(source.pokemonCaught)) ? Number(source.pokemonCaught) : null,
      location: typeof source.location === 'string' && source.location.trim() ? source.location.trim().slice(0, 32) : null,
      itemGained: typeof source.itemGained === 'string' && source.itemGained.trim() ? source.itemGained.trim().slice(0, 32) : null,
      companionMet: companion && typeof companion === 'object' && companion.name ? { name: String(companion.name).slice(0, 30), relation: String(companion.relation || '同行人物').slice(0, 30), note: String(companion.note || '').slice(0, 100) } : null
    };
  }

  function splitIntoPanels(text) {
    var clean = String(text || '').trim() || '道路尽头传来一阵细小的响动，你决定先停下来观察。';
    var sentences = clean.split(/(?<=[。！？；])/).filter(Boolean);
    var groups = [];
    var size = Math.max(1, Math.ceil(sentences.length / 4));
    for (var index = 0; index < sentences.length; index += size) groups.push(sentences.slice(index, index + size).join(''));
    while (groups.length < 4) groups.push(groups[groups.length - 1] || clean);
    return groups.slice(0, 6).map(function (value, index) { return { title: '镜头 ' + String(index + 1).padStart(2, '0'), shot: ['远景', '中景', '特写', '动作', '转场', '收束'][index] || '分镜', composition: '纵向漫画画面', action: '推进当前行动', text: value.slice(0, 420), dialogue: '', sfx: '', imagePrompt: '' }; });
  }

  function isLikelyNonChinesePokemonName(name) {
    var value = String(name || '').trim();
    return !value || /^宝可梦\s*#/i.test(value) || /^#?\d+$/.test(value) || /^[a-z0-9 ._'()-]+$/i.test(value);
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function replacePokemonName(text, aliases, canonicalName) {
    var value = String(text || '');
    aliases.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (alias) {
      if (!alias || alias === canonicalName) return;
      value = value.replace(new RegExp(escapeRegExp(alias), 'gi'), canonicalName);
    });
    return value;
  }

  function canonicalizeNarrative(result, encounterRecord, proposedName) {
    if (!result || !encounterRecord || !encounterRecord.name) return result;
    var canonicalName = encounterRecord.name;
    var aliases = [proposedName, encounterRecord.englishName, encounterRecord.slug].filter(function (value, index, list) {
      return value && list.indexOf(value) === index;
    });
    result.panels = (result.panels || []).map(function (panel) {
      var next = Object.assign({}, panel);
      ['title', 'composition', 'action', 'text', 'dialogue', 'sfx', 'imagePrompt'].forEach(function (field) {
        next[field] = replacePokemonName(next[field], aliases, canonicalName);
      });
      return next;
    });
    result.options = (result.options || []).map(function (option) { return replacePokemonName(option, aliases, canonicalName); });
    result.imagePrompt = replacePokemonName(result.imagePrompt, aliases, canonicalName);
    var narrativeText = result.panels.map(function (panel) { return Object.keys(panel).map(function (key) { return panel[key]; }).join(' '); }).join(' ');
    if (narrativeText.indexOf(canonicalName) < 0 && result.panels.length) {
      result.panels[0].text = (result.panels[0].text + ' 图鉴确认：这只宝可梦名为“' + canonicalName + '”。').slice(0, 520);
    }
    if (result.imagePrompt.indexOf(canonicalName) < 0) result.imagePrompt = (result.imagePrompt + ' 画面中的宝可梦为' + canonicalName + '。').slice(0, 1200);
    return result;
  }

  function sanitizeSuppressedEncounter(result, proposedName) {
    if (!result || !proposedName) return result;
    var aliases = [proposedName];
    var replacement = '草丛深处的动静';
    result.panels = (result.panels || []).map(function (panel) {
      var next = Object.assign({}, panel);
      ['title', 'composition', 'action', 'text', 'dialogue', 'sfx', 'imagePrompt'].forEach(function (field) {
        next[field] = replacePokemonName(next[field], aliases, replacement);
      });
      return next;
    });
    result.options = (result.options || []).map(function (option) { return replacePokemonName(option, aliases, replacement); });
    result.imagePrompt = replacePokemonName(result.imagePrompt, aliases, replacement);
    return result;
  }

  function parseStory(content) {
    var text = String(content || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    var first = text.indexOf('{');
    var last = text.lastIndexOf('}');
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
    var data;
    try { data = JSON.parse(text); } catch (error) { data = { narrative: text, options: ['继续前进', '观察周围', '寻找附近的宝可梦'], events: {} }; }
    var rawPanels = Array.isArray(data.panels) ? data.panels : [];
    var panels = rawPanels.slice(0, 6).map(function (panel, index) {
      return {
        title: String(panel && (panel.title || panel.name) || '镜头 ' + String(index + 1).padStart(2, '0')).slice(0, 50),
        shot: String(panel && (panel.shot || panel.camera) || ['远景', '中景', '特写', '动作', '转场', '收束'][index] || '分镜').slice(0, 16),
        composition: String(panel && (panel.composition || panel.scene) || '纵向漫画画面').slice(0, 120),
        action: String(panel && (panel.action || panel.movement) || '').slice(0, 180),
        text: String(panel && (panel.text || panel.narrative || panel.content) || '').trim().slice(0, 520),
        dialogue: String(panel && panel.dialogue || '').trim().slice(0, 120),
        sfx: String(panel && (panel.sfx || panel.sound) || '').trim().slice(0, 50),
        imagePrompt: String(panel && (panel.imagePrompt || panel.illustration) || '').trim().slice(0, 500)
      };
    }).filter(function (panel) { return panel.text; });
    if (panels.length < 4) panels = splitIntoPanels(String(data.narrative || text));
    var options = Array.isArray(data.options) ? data.options.map(function (option) { return String(option).trim().slice(0, 36); }).filter(Boolean).slice(0, 4) : [];
    var normalizedEvents = normalizeEvents(data.events || data);
    var panelPrompt = panels.map(function (panel) { return panel.imagePrompt; }).filter(Boolean).join('；');
    return { panels: panels.slice(0, 6), options: options.length ? options : ['继续前进', '观察周围', '寻找附近的宝可梦'], imagePrompt: String(data.illustrationPrompt || data.imagePrompt || panelPrompt || '').trim().slice(0, 1200), events: normalizedEvents };
  }

  async function callChat(config, action) {
    var endpoint = normalizeBaseUrl(config.textBaseURL) + '/chat/completions';
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 60000);
    var body = { model: config.textModel, messages: buildMessages(action), temperature: 0.82, max_tokens: 5200, response_format: { type: 'json_object' } };
    var response;
    try {
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.textApiKey }, body: JSON.stringify(body), signal: controller.signal });
      if (!response.ok && (response.status === 400 || response.status === 422)) {
        body.response_format = undefined;
        response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.textApiKey }, body: JSON.stringify(body), signal: controller.signal });
      }
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('剧情生成超时，请保留当前行动后重试。');
      throw error;
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      var detail = await response.text().catch(function () { return ''; });
      var message = response.status === 401 ? 'API Key 无效，请检查 AI 设置。' : response.status === 429 ? '请求过于频繁，请稍后再试。' : 'AI 请求失败（' + response.status + '）。';
      var errorResult = new Error(message);
      errorResult.detail = detail.slice(0, 180);
      throw errorResult;
    }
    var payload = await response.json();
    var content = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
    return parseStory(content || '');
  }

  async function generateImage(config, prompt) {
    return window.PkaImageClient.generate(config, buildIllustrationPrompt(prompt));
  }

  function formatImageError(error) {
    var message = String(error && error.message || '').trim();
    var status = Number(error && error.status) || Number((message.match(/插图接口错误（(\d+)）/) || [])[1] || 0);
    var detail = message.replace(/^插图接口错误（\d+）：?\s*/, '').trim();
    if (status === 401) return 'Agnes API Key 无效或已过期，请在 AI 设置中更新插图 Key。';
    if (status === 402) return 'Agnes 账户额度不足，请检查余额或套餐。';
    if (status === 403) return '当前 Agnes API Key 没有插图模型权限，请检查账号或模型权限。';
    if (status === 422) return 'Agnes 拒绝了插图参数（尺寸已使用 1024x768）。' + (detail ? ' 服务端原因：' + detail : '');
    if (status === 429) return 'Agnes 请求过于频繁，系统已自动重试仍未成功，请稍后再试。';
    if (status >= 500) return 'Agnes 服务暂时不可用，系统已自动重试仍未成功，请稍后再试。';
    if (/Failed to fetch|NetworkError|网络请求失败/i.test(message)) return '无法连接 Agnes 插图服务，请检查网络后重试。';
    return message || '插图暂时不可用，请点击重试。';
  }

  function buildIllustrationPrompt(prompt) {
    var identity = state.identity || {};
    var party = state.party.map(function (id) { var pokemon = getPokemonRecord(id); return pokemon && pokemon.name + ' Lv.' + (pokemon.level || 1); }).filter(Boolean).join('、') || '暂无同行宝可梦';
    var companions = state.companions.map(function (companion) { return companion.name; }).filter(Boolean).join('、') || '暂无同行伙伴';
    var region = regionData();
    return '原创宝可梦式怪兽伙伴日式动画冒险插图，整页漫画构图，纸张印刷质感，鲜艳色彩，粗线条。' +
      '必须保持角色和故事连续：训练师“' + (identity.name || '训练师') + '”，性别“' + (identity.gender || '未指定') + '”，' +
      '外观设定“' + (identity.appearance || '按角色档案保持一致') + '”，性格“' + (identity.personality || '按角色档案保持一致') + '”；' +
      '当前地区“' + region.name + '”，当前地点“' + (state.location || '未知地点') + '”；' +
      '同行宝可梦“' + party + '”，同行伙伴“' + companions + '”。' +
      '本回合剧情与画面要求：' + String(prompt || '').slice(0, 1800) +
      '不要文字、不要水印、不要复刻具体官方角色，不要擅自添加未在本回合剧情或角色档案中出现的宝可梦。';
  }

  function getImageSource(turn) {
    return PkaMedia.url(turn && turn.imageRef) || (turn && safeUrl(turn.image)) || '';
  }

  function renderLiveStatus() {
    if (state.loading) return '<div class="live-status" aria-live="polite">正在请求智谱生成文字剧情与漫画分镜，完成后会交给 Agnes 后台绘制插图。</div>';
    if (state.error) return '<div class="live-status live-status-error" aria-live="assertive">' + escapeHtml(state.error) + '</div>';
    var turn = currentTurn();
    if (turn && turn.imageStatus === 'skipped') return '<div class="live-status" aria-live="polite">开场剧情已生成，本回合暂不绘制插图；选择下一步后将恢复后台生成。</div>';
    if (turn && turn.imageStatus === 'generating') return '<div class="live-status" aria-live="polite">智谱剧情已经生成，Agnes 正在后台绘制整页插图；你可以先阅读分镜或选择下一步。</div>';
    return '<div class="live-status" aria-live="polite">' + (state.activeEncounter ? '当前有遭遇未结束，可以选择战斗、捕获或离开。' : '选择一个动作，继续把下一页漫画画出来。') + '</div>';
  }

  function renderEncounter() {
    var encounter = state.activeEncounter;
    if (!encounter) return '<section class="encounter-card encounter-empty"><div class="encounter-mark">?</div><div><span class="eyebrow">EVENT</span><strong>暂时没有遭遇</strong><p>继续探索，新的宝可梦会从分镜里出现。</p></div></section>';
    var color = typeColors[encounter.types && encounter.types[0]] || 'var(--yellow)';
    return '<section class="encounter-card" style="--encounter-color:' + color + '"><div class="encounter-avatar">' + (safeUrl(encounter.sprite) ? '<img src="' + escapeHtml(encounter.sprite) + '" alt="' + escapeHtml(encounter.name || '遭遇的宝可梦') + '" />' : icon('pokemon')) + '</div><div class="encounter-copy"><span class="eyebrow">野外遭遇 · Lv.' + String(encounter.level || 3) + '</span><strong>' + escapeHtml(encounter.name || '未知宝可梦') + '</strong><span>' + escapeHtml((encounter.types || []).join(' / ') || encounter.mood || '保持警觉') + '</span><p>' + (encounter.weakened ? '对方的动作慢了下来，捕获时机出现了。' : '它还在观察你，先判断下一步行动。') + '</p></div></section>';
  }

  function renderJourneyCard() {
    var region = regionData();
    var quest = state.quests.find(function (item) { return !item.completed; });
    var lead = state.party.length ? getPokemonRecord(state.party[0]) : null;
    return '<section class="journey-card" aria-label="当前旅程状态"><div class="journey-card-head"><div><span class="eyebrow">旅程记录</span><strong>' + escapeHtml(state.location || '尚未出发') + '</strong></div><span class="journey-folio">' + String(state.turns).padStart(2, '0') + '</span></div>' +
      '<dl class="journey-facts"><div><dt>地区</dt><dd>' + escapeHtml(region.name) + '</dd></div><div><dt>同行</dt><dd>' + escapeHtml(lead ? lead.name : '暂无宝可梦') + '</dd></div><div><dt>精灵球</dt><dd>' + Number(state.inventory['poke-ball'] || 0) + ' 个</dd></div></dl>' +
      '<div class="journey-quest"><span>当前任务</span><strong>' + escapeHtml(quest ? quest.title : '继续自由探索') + '</strong>' + (quest ? '<small>' + Number(quest.progress || 0) + ' / ' + Number(quest.target || 1) + '</small>' : '') + '</div></section>';
  }

  function renderAdventure() {
    var turn = currentTurn();
    var panels = turn && Array.isArray(turn.panels) ? turn.panels : [];
    var options = turn && Array.isArray(turn.options) ? turn.options : [];
    var turnTitle = turn && panels[0] && panels[0].title ? panels[0].title : state.turns ? '继续当前旅程' : '准备出发';
    var outcomes = turn && turn.outcomes && turn.outcomes.length ? '<section class="outcome-strip"><span class="eyebrow">本回合结果</span><div>' + turn.outcomes.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join('') + '</div></section>' : '';
    var openingControl = !turn && !state.loading ? '<button class="primary-button wide-button opening-button" data-action="start-random-opening">' + icon('spark') + '随机生成开场剧情</button><p class="opening-note">先生成文字分镜，不绘制插图；选择下一步后恢复后台绘图。</p>' : '';
    var choices = '<section class="choice-zone"><div class="choice-heading"><div><span class="eyebrow">你的行动</span><strong>下一步</strong></div><span class="muted">' + (state.loading ? '正在生成分镜…' : '选择或输入行动') + '</span></div>' + openingControl +
      (state.activeEncounter && !state.loading ? '<div class="quick-actions"><button class="secondary-button compact-button" data-action="submit-action" data-value="观察这只宝可梦">观察</button><button class="primary-button compact-button" data-action="submit-action" data-value="发起战斗">战斗</button><button class="secondary-button compact-button" data-action="submit-action" data-value="投掷精灵球捕获">捕获</button><button class="secondary-button compact-button" data-action="submit-action" data-value="使用伤药">使用伤药</button><button class="text-button" data-action="submit-action" data-value="暂时逃跑">逃跑</button></div>' : '') +
      (options.length && !state.loading ? '<div class="choice-list">' + options.map(function (option, index) { return '<button class="choice-button choice-' + (index + 1) + '" data-action="submit-action" data-value="' + escapeHtml(option) + '"><span>' + String(index + 1).padStart(2, '0') + '</span><strong>' + escapeHtml(option) + '</strong>' + icon('arrow') + '</button>'; }).join('') + '</div>' : '') +
      '<form class="action-form" data-form="action"><input name="action" maxlength="240" placeholder="描述你的行动…" autocomplete="off" ' + (state.loading ? 'disabled' : '') + ' /><button class="send-button" type="submit" ' + (state.loading ? 'disabled' : '') + ' aria-label="发送行动">' + (state.loading ? '<span class="loading-ring"></span>' : icon('send')) + '</button></form></section>';
    return '<section class="adventure-page"><div class="page-intro adventure-intro"><div><span class="eyebrow">第 ' + String(state.turns).padStart(2, '0') + ' 回合 · ' + escapeHtml(regionData().name) + '</span><h2>' + escapeHtml(turnTitle) + '</h2></div><span class="location-chip">' + icon('location') + escapeHtml(state.location || '等待起点') + '</span></div>' +
      '<div class="adventure-layout"><div class="adventure-main">' + renderLiveStatus() + renderSceneImage(turn) +
      '<section class="storyboard-sheet"><div class="sheet-binding" aria-hidden="true"></div><div class="sheet-heading"><div><span class="eyebrow">漫画分镜</span><h3>' + (turn ? '第 ' + String(turn.turn).padStart(2, '0') + ' 回合' : '第一幕还没有开始') + '</h3></div><span class="sheet-count">' + (panels.length ? panels.length + ' 格' : '空白页') + '</span></div>' +
      (panels.length ? '<div class="panel-grid">' + panels.map(renderPanel).join('') + '</div>' : '<div class="story-empty"><div class="empty-frame">' + icon('comic') + '</div><div><strong>' + (state.loading ? '正在抽取开场剧情' : '这一页还没有画面') + '</strong><p>' + (state.loading ? '正在生成4–6格文字分镜，开场不会调用插图接口。' : '新角色会自动抽取开场；也可以点击右侧按钮重新随机一段开场剧情。') + '</p></div></div>') + '</section></div>' +
      '<aside class="adventure-sidebar">' + renderJourneyCard() + renderEncounter() + outcomes + choices + '</aside></div></section>';
  }

  function renderSceneImage(turn) {
    if (!turn) return '<section class="scene-card scene-card-empty"><div class="scene-topline"><span>镜头组 01</span><span>插图</span></div><div class="scene-placeholder"><div class="placeholder-orbit">' + icon('image') + '</div><strong>根据分镜生成的整页插图</strong><span>随机开场先生成文字分镜，选择下一步后再开始绘制。</span></div></section>';
    var image = getImageSource(turn);
    var collapsed = imageIsCollapsed(turn);
    var imageState = turn.imageStatus === 'skipped' ? '开场暂不绘图' : turn.imageStatus === 'generating' ? '后台绘制中' : turn.imageStatus === 'unavailable' ? '插图暂不可用' : image ? (collapsed ? '已生成 · 已折叠' : '本回合整页漫画') : '等待绘制';
    var turnNumber = String(turn.turn || state.turns);
    var toggle = '<button class="scene-toggle compact-button" data-action="toggle-image" data-turn="' + turnNumber + '" aria-expanded="' + String(!collapsed) + '">' + icon(collapsed ? 'image' : 'close') + (collapsed ? (image ? '显示插图' : '展开插图区') : '折叠插图区') + '</button>';
    var retry = turn.imagePrompt && turn.imageStatus === 'unavailable' ? '<button class="secondary-button compact-button" data-action="generate-image" data-turn="' + turnNumber + '">' + icon('refresh') + '重新生成</button>' : '';
    var content = '';
    if (collapsed) {
      var collapsedTitle = image ? '插图已在后台生成' : turn.imageStatus === 'skipped' ? '开场暂不绘图' : turn.imageStatus === 'generating' ? '插图正在后台生成' : turn.imageStatus === 'unavailable' ? '插图生成失败' : '插图等待生成';
      var collapsedCopy = image ? '剧情已先展示，点击按钮后查看整页漫画。' : turn.imageStatus === 'skipped' ? '本回合先阅读文字分镜，下一步行动后恢复插图。' : turn.imageStatus === 'unavailable' ? '剧情不受影响，可展开查看详情并重新生成。' : '剧情已先展示，插图状态可以稍后查看。';
      content = '<div class="scene-collapsed scene-collapsed-status" aria-live="polite"><div class="scene-collapsed-copy"><div class="placeholder-orbit is-static">' + icon(image ? 'image' : turn.imageStatus === 'skipped' ? 'comic' : 'spark') + '</div><div><strong>' + collapsedTitle + '</strong><span>' + collapsedCopy + '</span></div></div>' + toggle + '</div>';
    } else if (image) {
      content = '<div class="scene-image"><img src="' + escapeHtml(image) + '" alt="第 ' + turnNumber + ' 回合的整页动漫冒险插图" loading="lazy" /></div>';
    } else {
      var skipped = turn.imageStatus === 'skipped';
      content = '<div class="scene-placeholder' + (skipped ? ' scene-placeholder-skipped' : '') + '"><div class="placeholder-orbit ' + (turn.imageStatus === 'generating' ? 'is-generating' : '') + '">' + icon(skipped ? 'comic' : turn.imageStatus === 'generating' ? 'spark' : 'image') + '</div><strong>' + (skipped ? '开场先阅读剧情' : turn.imageStatus === 'generating' ? '画师正在后台绘制这一页' : turn.imageStatus === 'unavailable' ? '插图生成失败' : '插图正在排队') + '</strong><span>' + (skipped ? '这是随机开场回合，为了先让故事展开，本回合不生成插图。下一次行动会恢复插图。' : turn.imageError ? escapeHtml(turn.imageError) : '剧情和分镜已经保存，不会影响下一步。') + '</span>' + (skipped ? '' : retry) + '</div>';
    }
    return '<section class="scene-card ' + (image ? 'has-image ' : '') + (collapsed ? 'is-collapsed ' : '') + (turn.imageStatus === 'skipped' ? 'is-opening ' : '') + '"><div class="scene-topline"><span>镜头组 ' + turnNumber.padStart(2, '0') + '</span><div class="scene-top-actions"><span>' + escapeHtml(imageState) + '</span>' + (!collapsed ? toggle : '') + '</div></div>' + content + '</section>';
  }

  function renderPanel(panel, index) {
    var shot = panel.shot || ['远景', '中景', '特写', '动作', '转场', '收束'][index] || '分镜';
    return '<article class="comic-panel panel-' + ((index % 5) + 1) + '"><div class="panel-topline"><span class="panel-number">' + String(index + 1).padStart(2, '0') + '</span><span>' + escapeHtml(shot) + '</span></div><h4>' + escapeHtml(panel.title || '镜头 ' + String(index + 1).padStart(2, '0')) + '</h4><div class="panel-visual"><span>' + escapeHtml(panel.composition || '漫画画面') + '</span><b>' + escapeHtml(panel.action || '动作推进') + '</b></div><p>' + escapeHtml(panel.text || '') + '</p>' + (panel.dialogue ? '<div class="dialogue"><span>对白</span>“' + escapeHtml(panel.dialogue) + '”</div>' : '') + (panel.sfx ? '<div class="panel-sfx">' + escapeHtml(panel.sfx) + '</div>' : '') + '</article>';
  }

  function renderComic() {
    var boards = state.storyboards.filter(function (board) { return board && board.panels && board.panels.length; }).slice().reverse();
    return '<section class="module-page comic-page"><div class="page-intro"><div><span class="eyebrow">漫画 / 长廊</span><h2>把冒险装订起来</h2></div><span class="folio">' + boards.length + ' 页</span></div>' +
      (boards.length ? '<div class="comic-gallery">' + boards.map(renderComicBoard).join('') + '</div>' : '<div class="module-empty"><div class="empty-frame large">' + icon('comic') + '</div><h3>漫画长廊还是空白的</h3><p>完成冒险回合后，整页分镜会收录在这里。</p><button class="primary-button" data-action="switch-screen" data-screen="adventure">' + icon('adventure') + '回到冒险</button></div>') + '</section>';
  }

  function renderComicBoard(board) {
    var image = getImageSource(board);
    return '<article class="gallery-board"><div class="gallery-board-head"><span>第 ' + String(board.turn || 0).padStart(2, '0') + ' 回合</span><span>' + escapeHtml(board.location || '') + '</span></div>' +
      (image ? '<img src="' + escapeHtml(image) + '" alt="第 ' + String(board.turn || 0) + ' 回合漫画插图" loading="lazy" />' : '<div class="gallery-no-image">' + icon(board.imageStatus === 'skipped' ? 'comic' : 'image') + '<span>' + (board.imageStatus === 'skipped' ? '开场回合暂不绘制插图' : board.imageStatus === 'generating' ? '正在绘制本页' : '本页插图暂不可用') + '</span>' + (board.imagePrompt && board.imageStatus !== 'generating' && board.imageStatus !== 'skipped' ? '<button class="secondary-button compact-button" data-action="generate-image" data-turn="' + String(board.turn) + '">' + icon('refresh') + '重新生成</button>' : '') + '</div>') +
      '<div class="gallery-copy"><div class="mini-panel-row">' + (board.panels || []).slice(0, 6).map(function (panel, index) { return '<span><b>' + String(index + 1).padStart(2, '0') + '</b>' + escapeHtml(panel.shot || '分镜') + '</span>'; }).join('') + '</div><p>' + escapeHtml((board.panels || []).map(function (panel) { return panel.text || ''; }).join(' ').slice(0, 420)) + '</p></div></article>';
  }

  function renderStory() {
    var chapters = [];
    for (var index = 0; index < state.storyboards.length; index += 8) chapters.push(state.storyboards.slice(index, index + 8));
    return '<section class="module-page story-page"><div class="page-intro"><div><span class="eyebrow">故事 / 章节</span><h2>冒险留下的文字</h2></div><button class="secondary-button compact-button" data-action="export-story">' + icon('download') + '导出 Markdown</button></div>' +
      (chapters.length ? '<div class="chapter-list">' + chapters.map(function (chapter, chapterIndex) { return '<article class="chapter-card"><div class="chapter-number">' + String(chapterIndex + 1).padStart(2, '0') + '</div><div><h3>第 ' + (chapterIndex + 1) + ' 章</h3><p>' + escapeHtml(chapter.map(function (turn) { return (turn.panels || []).map(function (panel) { return panel.text || ''; }).join(' '); }).join(' ').slice(0, 320)) + '</p><span>' + chapter.length + ' 个回合</span></div></article>'; }).join('') + '</div>' : '<div class="module-empty"><div class="empty-frame large">' + icon('story') + '</div><h3>还没有章节</h3><p>冒险开始后，系统会每8个回合整理一章。</p><button class="primary-button" data-action="switch-screen" data-screen="adventure">' + icon('adventure') + '开始冒险</button></div>') + '</section>';
  }

  function renderBottomNav() {
    var primary = [['adventure', '冒险', 'adventure'], ['comic', '漫画', 'comic'], ['story', '故事', 'story']];
    var info = [['profile', '个人信息', 'profile'], ['dex', '图鉴', 'dex'], ['team', '宝可梦', 'pokemon'], ['companions', '伙伴', 'people'], ['bag', '背包', 'bag']];
    return '<nav class="bottom-nav ' + (state.utilityOpen ? 'is-utility-open' : '') + '" aria-label="游戏功能导航"><div class="nav-scroll primary-nav">' + primary.map(function (item) { return '<button class="nav-button ' + (state.screen === item[0] ? 'is-active' : '') + '" data-action="switch-screen" data-screen="' + item[0] + '" aria-current="' + (state.screen === item[0] ? 'page' : 'false') + '">' + icon(item[2]) + '<span>' + item[1] + '</span></button>'; }).join('') + '<button class="nav-button utility-toggle" data-action="toggle-utility" aria-expanded="' + String(!!state.utilityOpen) + '">' + icon('plus') + '<span>更多</span></button></div><div class="nav-divider"></div><div class="nav-scroll info-nav">' + info.map(function (item) { var count = item[0] === 'dex' ? state.pokemon.length : item[0] === 'team' ? state.party.length : ''; return '<button class="nav-button" data-action="open-dialog" data-dialog="' + item[0] + '" aria-label="打开' + item[1] + '">' + icon(item[2]) + '<span>' + item[1] + '</span>' + (count !== '' ? '<b>' + count + '</b>' : '') + '</button>'; }).join('') + '</div></nav>';
  }

  function renderProfile() {
    var identity = state.identity || {};
    var region = regionData();
    var gender = identity.gender === 'male' ? '男' : identity.gender === 'female' ? '女' : '未指定';
    var rows = [['名字', identity.name || '训练师'], ['性别', gender], ['年龄', identity.age ? identity.age + ' 岁' : '随机'], ['地区', region.name], ['故乡', identity.hometown || state.location || '随机'], ['性格', identity.personality || '随机'], ['当前地点', state.location || '尚未出发'], ['冒险回合', state.turns], ['图鉴记录', state.pokemon.length + ' 只'], ['同行队伍', state.party.length + '/' + PkaRules.MAX_PARTY], ['战斗次数', state.stats.battles], ['捕获次数', state.stats.captures]];
    var quests = state.quests.filter(function (quest) { return !quest.completed; }).slice(0, 3);
    return '<div class="info-list">' + rows.map(function (row) { return '<div class="info-row"><span>' + row[0] + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>'; }).join('') + '</div><div class="dialog-section"><span class="eyebrow">正在进行</span><div class="quest-list">' + (quests.length ? quests.map(function (quest) { return '<div class="quest-row"><strong>' + escapeHtml(quest.title) + '</strong><span>' + quest.progress + '/' + quest.target + '</span></div>'; }).join('') : '<p class="info-empty">当前没有未完成任务。</p>') + '</div></div>';
  }

  function renderPokemonList(onlyCaught) {
    var list = onlyCaught ? state.pokemon.filter(function (pokemon) { return state.party.indexOf(pokemon.id) >= 0; }) : state.pokemon;
    if (!list.length) return '<div class="info-empty"><div class="empty-frame">' + icon(onlyCaught ? 'pokemon' : 'dex') + '</div><p>' + (onlyCaught ? '还没有同行的宝可梦。' : '还没有遇到宝可梦。') + '</p></div>';
    return '<div class="pokemon-list">' + list.map(function (pokemon) { var color = typeColors[pokemon.types && pokemon.types[0]] || '#6C6A57'; return '<article class="pokemon-row"><div class="pokemon-sprite" style="--type-color:' + color + '">' + (safeUrl(pokemon.sprite) ? '<img src="' + escapeHtml(pokemon.sprite) + '" alt="' + escapeHtml(pokemon.name) + '" />' : icon('pokemon')) + '</div><div><strong>' + escapeHtml(pokemon.name || ('宝可梦 #' + pokemon.id)) + '</strong><span>' + escapeHtml((pokemon.types || []).join(' / ') || '资料整理中') + '</span><small>' + (pokemon.caught ? '已捕获 · Lv.' + (pokemon.level || 3) + ' · HP ' + (pokemon.hp || 0) + '/' + (pokemon.maxHp || 10) : '已遇到 · ' + (pokemon.seenCount || 1) + ' 次') + '</small></div></article>'; }).join('') + '</div>';
  }

  function renderCompanions() {
    if (!state.companions.length) return '<div class="info-empty"><div class="empty-frame">' + icon('people') + '</div><p>还没有同行人物。</p></div>';
    return '<div class="simple-list">' + state.companions.map(function (companion) { return '<div class="simple-row"><div class="avatar-mark">' + icon('profile') + '</div><div><strong>' + escapeHtml(companion.name) + '</strong><span>' + escapeHtml(companion.relation || '同行人物') + ' · 关系 ' + (state.relationships[companion.name] || 0) + '</span>' + (companion.note ? '<small>' + escapeHtml(companion.note) + '</small>' : '') + '</div></div>'; }).join('') + '</div>';
  }

  function renderBag() {
    var items = Object.entries(state.inventory).filter(function (entry) { return entry[1] > 0; });
    if (!items.length) return '<div class="info-empty"><div class="empty-frame">' + icon('bag') + '</div><p>背包里还没有道具。</p></div>';
    return '<div class="simple-list">' + items.map(function (entry) { return '<div class="simple-row"><div class="item-mark">' + icon('bag') + '</div><div><strong>' + escapeHtml(itemLabel(entry[0])) + '</strong><span>数量 ×' + escapeHtml(entry[1]) + '</span></div></div>'; }).join('') + '</div>';
  }

  function renderSaveDialog() {
    var slots = listSlots();
    var content = '<div class="slot-list">' + slots.map(function (slot) { var savedState = slot.state || {}; var identity = savedState.identity && savedState.identity.name ? savedState.identity.name : '空存档'; var meta = slot.saved ? identity + ' · ' + (savedState.location || '未知地点') + ' · ' + (savedState.turns || 0) + ' 回合' : '点击保存当前冒险'; return '<div class="slot-row"><button class="slot-main" data-action="save-slot" data-slot="' + slot.slot + '"><strong>存档 ' + slot.slot + '</strong><span>' + escapeHtml(meta) + '</span><small>' + escapeHtml(formatDate(slot.updatedAt)) + '</small></button>' + (slot.saved ? '<button class="icon-button small-icon danger-text" data-action="delete-slot" data-slot="' + slot.slot + '" aria-label="删除存档 ' + slot.slot + '">' + icon('close') + '</button>' : '') + '</div>'; }).join('') + '</div><p class="dialog-note">存档保存在当前浏览器。图片单独缓存在 IndexedDB，不会把大图塞进文字存档。</p><div class="dialog-actions"><button class="secondary-button" type="button" data-action="export-save">' + icon('download') + '导出 JSON 存档</button><button class="secondary-button" type="button" data-action="import-save">导入 JSON 存档</button></div>';
    return dialogFrame('本地存档', content);
  }

  function closeDialog() {
    var trigger = dialogTrigger;
    activeDialog = null;
    dialogTrigger = null;
    state.error = '';
    render();
    if (trigger && document.contains(trigger)) trigger.focus();
  }

  async function submitAction(action) {
    var cleanAction = String(action || '').trim();
    if (!cleanAction || state.loading) return;
    var config = getSettings();
    if (!config.textApiKey) { state.error = '请先在 AI 设置中填写智谱剧情通道的 API Key。'; activeDialog = 'settings'; render(); return; }
    state.loading = true;
    state.error = '';
    addMessage('user', cleanAction);
    render();
    try {
      var result = await callChat(config, cleanAction);
      var applied = await applyRuleEvents(cleanAction, result.events);
      result = applied.suppressedEncounter ? sanitizeSuppressedEncounter(result, applied.proposedEncounterName) : canonicalizeNarrative(result, applied.encounterRecord, applied.proposedEncounterName);
      state.turns += 1;
      var opening = isRandomOpeningAction(cleanAction);
      var imageReady = config.images && !!config.imageApiKey;
      var turn = { turn: state.turns, location: state.location, playerAction: cleanAction, panels: result.panels, options: result.options, imagePrompt: opening ? '' : result.imagePrompt, imageRef: '', image: '', imageStatus: opening ? 'skipped' : (result.imagePrompt && imageReady ? 'waiting' : 'unavailable'), imageCollapsed: DEFAULT_IMAGE_COLLAPSED, imageError: !opening && result.imagePrompt && !imageReady ? '插图通道未配置，文字剧情已保存。' : '', outcomes: applied.outcomes, events: applied.resolution.events, timestamp: Date.now() };
      state.currentTurn = turn;
      state.storyboards = state.storyboards.concat([turn]);
      addMessage('assistant', JSON.stringify({ panels: result.panels, options: result.options, events: applied.resolution.events }));
      state.loading = false;
      persistState();
      render();
      if (!opening && result.imagePrompt && imageReady) {
        pendingImage = true;
        turn.imageStatus = 'generating';
        syncCurrentTurn(turn);
        render();
        try {
          var image = await generateImage(config, result.imagePrompt);
          turn.imageRef = image ? await PkaMedia.put(image) : '';
          turn.imageStatus = turn.imageRef ? 'ready' : 'unavailable';
          turn.image = '';
        } catch (imageError) {
          turn.imageStatus = 'unavailable';
          turn.imageError = formatImageError(imageError);
        } finally {
          pendingImage = false;
          syncCurrentTurn(turn);
          persistState();
          render();
        }
      }
    } catch (error) {
      state.loading = false;
      state.error = error.message || 'AI 请求失败。';
      persistState();
      render();
    }
  }

  async function regenerateCurrentImage(turnNumber) {
    var turn = turnNumber ? state.storyboards.find(function (item) { return Number(item.turn) === Number(turnNumber); }) : currentTurn();
    var config = getSettings();
    if (!turn || !turn.imagePrompt || pendingImage) return;
    if (!config.imageApiKey) { state.error = '请先在 AI 设置中填写 Agnes 插图通道的 API Key。'; activeDialog = 'settings'; render(); return; }
    pendingImage = true;
    turn.imageStatus = 'generating';
    turn.imageError = '';
    render();
    try {
      var image = await generateImage(config, turn.imagePrompt);
      turn.imageRef = image ? await PkaMedia.put(image) : '';
      turn.imageStatus = turn.imageRef ? 'ready' : 'unavailable';
    } catch (error) {
      turn.imageStatus = 'unavailable';
      turn.imageError = formatImageError(error);
    } finally {
      pendingImage = false;
      syncCurrentTurn(turn);
      persistState();
      render();
    }
  }

  function exportSave() {
    var blob = new Blob([JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), state: serializableState() }, null, 2)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = (state.identity && state.identity.name || '训练师') + '-冒险存档.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function importSave() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var payload = JSON.parse(String(reader.result || ''));
          state = normalizeState(payload.state || payload);
          activeDialog = null;
          persistState();
          PkaMedia.hydrate(state).then(render);
          render();
        } catch (error) {
          state.error = '存档文件无法读取，请选择游戏导出的 JSON 文件。';
          render();
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function render() {
    if (!root) return;
    document.documentElement.dataset.theme = getSettings().theme;
    document.title = state.identity ? '冒险 · 宝可梦漫画冒险' : '宝可梦漫画冒险';
    root.innerHTML = state.identity ? renderGame() : renderStart();
    if (activeDialog) {
      requestAnimationFrame(function () {
        var closeButton = root.querySelector('[data-dialog-card] .dialog-head .icon-button');
        if (closeButton) closeButton.focus();
      });
    }
  }

  function handleClick(event) {
    var target = event.target.closest('[data-action]');
    if (!target) return;
    var action = target.dataset.action;
    if (action === 'toggle-utility') { state.utilityOpen = !state.utilityOpen; render(); return; }
    if (action === 'new-adventure') { dialogTrigger = target; activeDialog = 'identity'; render(); return; }
    if (action === 'start-random-opening') { submitAction(createRandomOpeningAction()); return; }
    if (action === 'close-dialog') { if (target.classList.contains('dialog-backdrop') && event.target.closest('[data-dialog-card]')) return; closeDialog(); return; }
    if (action === 'open-dialog') { dialogTrigger = target; var dialog = target.dataset.dialog || 'settings'; activeDialog = ['profile', 'dex', 'team', 'companions', 'bag'].indexOf(dialog) >= 0 ? 'info:' + dialog : dialog; state.utilityOpen = false; render(); return; }
    if (action === 'switch-screen') { state.screen = target.dataset.screen || 'adventure'; state.utilityOpen = false; persistState(); render(); return; }
    if (action === 'submit-action') { submitAction(target.dataset.value || ''); return; }
    if (action === 'toggle-image') {
      var imageTurn = state.storyboards.find(function (item) { return Number(item.turn) === Number(target.dataset.turn); });
      if (imageTurn) {
        imageTurn.imageCollapsed = !imageIsCollapsed(imageTurn);
        syncCurrentTurn(imageTurn);
        persistState();
        render();
      }
      return;
    }
    if (action === 'generate-image') { regenerateCurrentImage(target.dataset.turn); return; }
    if (action === 'clear-api-key') { var config = getSettings(); config.textApiKey = ''; config.imageApiKey = ''; saveSettings(config); activeDialog = 'settings'; render(); return; }
    if (action === 'load-slot') { var loaded = readSlot(target.dataset.slot); if (loaded) { state = normalizeState(loaded); activeDialog = null; PkaMedia.hydrate(state).then(render); persistState(); render(); } return; }
    if (action === 'save-slot') { writeSlot(target.dataset.slot); activeDialog = 'save'; render(); return; }
    if (action === 'delete-slot') { if (window.confirm('确定删除这个存档吗？')) { localStorage.removeItem(SAVE_PREFIX + target.dataset.slot); activeDialog = 'save'; render(); } return; }
    if (action === 'export-story') { exportStory(); return; }
    if (action === 'export-save') { exportSave(); return; }
    if (action === 'import-save') { importSave(); return; }
  }

  function handleSubmit(event) {
    event.preventDefault();
    var form = event.target;
    var kind = form.dataset.form;
    if (kind === 'identity') { beginAdventure(form); return; }
    if (kind === 'action') { var value = new FormData(form).get('action'); form.reset(); submitAction(value); return; }
    if (kind === 'settings') {
      var data = new FormData(form);
      var current = getSettings();
      var textApiKey = String(data.get('textApiKey') || '').trim();
      var imageApiKey = String(data.get('imageApiKey') || '').trim();
      saveSettings({
        textBaseURL: String(data.get('textBaseURL') || current.textBaseURL).trim(),
        textApiKey: textApiKey || current.textApiKey,
        textModel: String(data.get('textModel') || current.textModel).trim(),
        imageBaseURL: String(data.get('imageBaseURL') || current.imageBaseURL).trim(),
        imageApiKey: imageApiKey || current.imageApiKey,
        imageModel: String(data.get('imageModel') || current.imageModel).trim(),
        images: data.get('images') === 'on',
        theme: data.get('theme') === 'night' ? 'night' : 'light'
      });
      activeDialog = null;
      state.error = '';
      render();
    }
  }

  root.addEventListener('click', handleClick);
  root.addEventListener('submit', handleSubmit);
  root.addEventListener('click', function (event) {
    if (event.target.classList.contains('dialog-backdrop')) closeDialog();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && activeDialog) {
      event.preventDefault();
      closeDialog();
    }
  });

  render();
  PkaMedia.hydrate(state).then(function () { return refreshPokemonRecords(); }).then(function () { render(); });
})();
