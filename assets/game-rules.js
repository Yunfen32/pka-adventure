(function (global) {
  'use strict';

  var MAX_PARTY = 6;
  var ITEM_LABELS = {
    'poke-ball': '精灵球',
    potion: '伤药',
    revive: '活力碎片',
    'ancient-map': '旧地图'
  };
  var WORLD = global.PkaWorld || {};
  var ENCOUNTER_TRIGGERS = ['story', 'sound', 'trace', 'quest', 'location', 'battle', 'legacy'];
  Object.keys(WORLD.itemNames || {}).forEach(function (key) {
    if (!ITEM_LABELS[key]) ITEM_LABELS[key] = WORLD.itemNames[key];
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hash(value) {
    var text = String(value || '');
    var result = 2166136261;
    for (var index = 0; index < text.length; index += 1) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function random(seed) {
    var value = hash(seed) || 1;
    value = Math.imul(value ^ value >>> 16, 2246822507);
    value = Math.imul(value ^ value >>> 13, 3266489909);
    return ((value ^ value >>> 16) >>> 0) / 4294967296;
  }

  function emptyQuest(id, title, kind, target, reward) {
    return { id: id, title: title, kind: kind, progress: 0, target: target, reward: reward, completed: false };
  }

  function createInitialState() {
    return {
      screen: 'adventure',
      identity: null,
      region: 'kanto',
      location: '',
      turns: 0,
      pokemon: [],
      party: [],
      companions: [],
      relationships: {},
      inventory: { 'poke-ball': 5, potion: 2 },
      quests: [emptyQuest('first-step', '踏出第一步', 'explore', 1, { item: 'poke-ball', amount: 2 })],
      completedQuests: [],
      worldFlags: { lastEncounterTurn: null },
      stats: { encounters: 0, battles: 0, captures: 0, itemsFound: 0 },
      messages: [],
      storyboards: [],
      currentTurn: null,
      activeEncounter: null,
      utilityOpen: false,
      error: '',
      loading: false
    };
  }

  function normalizeState(value) {
    var base = createInitialState();
    var next = Object.assign({}, base, value || {});
    var regionKeys = WORLD.regions ? Object.keys(WORLD.regions) : ['kanto'];
    next.region = regionKeys.indexOf(next.region) >= 0 ? next.region : 'kanto';
    next.pokemon = Array.isArray(next.pokemon) ? next.pokemon.filter(function (item) {
      return item && Number.isInteger(Number(item.id)) && Number(item.id) >= 1 && Number(item.id) <= 1025;
    }) : [];
    next.party = Array.isArray(next.party) ? next.party : next.pokemon.filter(function (item) { return item.caught; }).map(function (item) { return item.id; });
    next.party = next.party.filter(function (id, index, list) {
      return Number.isInteger(Number(id)) && list.indexOf(id) === index;
    }).slice(0, MAX_PARTY);
    next.companions = Array.isArray(next.companions) ? next.companions : [];
    next.relationships = next.relationships && typeof next.relationships === 'object' ? next.relationships : {};
    next.inventory = next.inventory && typeof next.inventory === 'object' ? Object.keys(next.inventory).reduce(function (items, key) {
      var canonicalKey = normalizeItemKey(key);
      var amount = Math.max(0, Math.floor(Number(next.inventory[key]) || 0));
      if (canonicalKey && amount) items[canonicalKey] = (items[canonicalKey] || 0) + amount;
      return items;
    }, {}) : Object.assign({}, base.inventory);
    next.quests = Array.isArray(next.quests) && next.quests.length ? next.quests : base.quests;
    next.completedQuests = Array.isArray(next.completedQuests) ? next.completedQuests : [];
    next.worldFlags = next.worldFlags && typeof next.worldFlags === 'object' ? next.worldFlags : {};
    var lastEncounterTurn = next.worldFlags.lastEncounterTurn;
    next.worldFlags.lastEncounterTurn = lastEncounterTurn !== null && lastEncounterTurn !== '' && Number.isInteger(Number(lastEncounterTurn)) ? Number(lastEncounterTurn) : null;
    next.stats = Object.assign({}, base.stats, next.stats || {});
    next.messages = Array.isArray(next.messages) ? next.messages : [];
    next.storyboards = Array.isArray(next.storyboards) ? next.storyboards : [];
    if (next.location) next.location = normalizeLocation(next.region, next.location);
    if (next.activeEncounter && typeof next.activeEncounter === 'object') {
      var normalizedActiveEncounter = normalizeEncounter(next.activeEncounter);
      next.activeEncounter = normalizedActiveEncounter ? Object.assign({}, next.activeEncounter, normalizedActiveEncounter) : null;
    } else {
      next.activeEncounter = null;
    }
    next.loading = false;
    next.error = '';
    return next;
  }

  function classifyAction(action) {
    var text = String(action || '').toLowerCase();
    if (/捕获|收服|丢球|精灵球/.test(text)) return 'capture';
    if (/战斗|攻击|对战|迎战/.test(text)) return 'battle';
    if (/逃跑|离开|避开|撤退/.test(text)) return 'escape';
    if (/伤药|治疗|恢复|治愈/.test(text)) return 'item';
    if (/观察|倾听|调查|查看/.test(text)) return 'observe';
    if (/伙伴|呼喊|配合|求助/.test(text)) return 'companion';
    return 'explore';
  }

  function normalizeEncounter(value) {
    if (!value) return null;
    var source = typeof value === 'number' ? { pokemonId: value } : value;
    var id = Number(source.pokemonId || source.id);
    if (!Number.isInteger(id) || id < 1 || id > 1025) return null;
    return {
      pokemonId: id,
      level: clamp(Number(source.level) || 3, 1, 30),
      mood: String(source.mood || source.temperament || '警觉').slice(0, 24),
      location: String(source.location || '').slice(0, 32),
      trigger: String(source.trigger || '').trim().toLowerCase().slice(0, 16)
    };
  }

  function normalizeItemKey(value) {
    var text = String(value || '').trim();
    if (!text) return '';
    if (ITEM_LABELS[text]) return text;
    if (WORLD.itemNames && WORLD.itemNames[text]) return text;
    var key = Object.keys(ITEM_LABELS).find(function (item) { return ITEM_LABELS[item] === text; });
    return key || '';
  }

  function normalizeLocation(region, value) {
    if (!value) return '';
    if (WORLD.normalizeLocation) return WORLD.normalizeLocation(region, value);
    return String(value || '').trim().slice(0, 32);
  }

  function canStartEncounter(state, encounter) {
    if (!encounter || ENCOUNTER_TRIGGERS.indexOf(encounter.trigger) < 0) return false;
    var rawLastTurn = state.worldFlags && state.worldFlags.lastEncounterTurn;
    var lastTurn = rawLastTurn === null || rawLastTurn === '' || rawLastTurn === undefined ? null : Number(rawLastTurn);
    return !Number.isInteger(lastTurn) || state.turns - lastTurn >= 2;
  }

  function resolve(action, snapshot, proposal) {
    var state = normalizeState(snapshot);
    var raw = proposal || {};
    var requested = classifyAction(action);
    var events = [];
    var proposedEncounter = normalizeEncounter(raw.encounter);
    if (!proposedEncounter && raw.pokemonSeen) proposedEncounter = normalizeEncounter({ pokemonId: raw.pokemonSeen, trigger: 'legacy' });
    var encounter = state.activeEncounter || proposedEncounter;
    var suppressedEncounter = null;
    if (!state.activeEncounter && encounter && !canStartEncounter(state, encounter)) {
      suppressedEncounter = encounter;
      encounter = null;
    }
    var seed = state.turns + ':' + String(action || '') + ':' + (encounter ? encounter.pokemonId : 'none');
    var location = normalizeLocation(state.region, raw.location);
    if (encounter) encounter.location = normalizeLocation(state.region, encounter.location) || location || '';
    if (!state.activeEncounter && encounter) {
      events.push({ type: 'encounter', encounter: encounter });
    }
    if (location) events.push({ type: 'location', value: location });
    if (raw.companionMet) events.push({ type: 'companion', value: raw.companionMet });
    if (raw.itemGained) {
      var item = normalizeItemKey(raw.itemGained);
      if (item) events.push({ type: 'reward', item: item, amount: 1 });
    }

    if (encounter && requested === 'observe') {
      events.push({ type: 'encounter-note', value: '你先观察了对方的动作。' });
    } else if (encounter && requested === 'battle') {
      var battleWin = random(seed + ':battle') > 0.26;
      events.push({ type: 'battle', outcome: battleWin ? 'win' : 'retreat', pokemonId: encounter.pokemonId, damage: battleWin ? 0 : 1 });
      if (battleWin) events.push({ type: 'reward', item: 'potion', amount: random(seed + ':reward') > 0.55 ? 1 : 0 });
    } else if (encounter && requested === 'capture') {
      if ((state.inventory['poke-ball'] || 0) < 1) {
        events.push({ type: 'capture', outcome: 'no-ball', pokemonId: encounter.pokemonId });
      } else {
        var captureSuccess = random(seed + ':capture') > 0.38;
        events.push({ type: 'item-delta', item: 'poke-ball', amount: -1 });
        events.push({ type: 'capture', outcome: captureSuccess ? 'success' : 'fail', pokemonId: encounter.pokemonId });
      }
    } else if (encounter && requested === 'escape') {
      events.push({ type: 'escape', pokemonId: encounter.pokemonId });
    } else if (encounter && requested === 'item') {
      if ((state.inventory.potion || 0) > 0) {
        events.push({ type: 'item-delta', item: 'potion', amount: -1 });
        events.push({ type: 'heal', amount: 2 });
      } else {
        events.push({ type: 'encounter-note', value: '背包里没有可用的伤药。' });
      }
    } else if (encounter && requested === 'companion') {
      events.push({ type: 'battle', outcome: random(seed + ':companion') > 0.2 ? 'win' : 'retreat', pokemonId: encounter.pokemonId, assisted: true, damage: 0 });
    }

    return { actionType: requested, events: events, suppressedEncounter: suppressedEncounter, maxParty: MAX_PARTY, itemLabels: ITEM_LABELS };
  }

  global.PkaRules = {
    MAX_PARTY: MAX_PARTY,
    ITEM_LABELS: ITEM_LABELS,
    createInitialState: createInitialState,
    normalizeState: normalizeState,
    resolve: resolve
  };
})(window);
