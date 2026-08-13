import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const worldPath = resolve(testDirectory, '..', 'assets', 'world-data.js');
const rulesPath = resolve(testDirectory, '..', 'assets', 'game-rules.js');
const worldSource = await readFile(worldPath, 'utf8');
const source = await readFile(rulesPath, 'utf8');
const context = { window: {} };

vm.runInNewContext(worldSource, context, { filename: worldPath });
vm.runInNewContext(source, context, { filename: rulesPath });

const rules = context.window.PkaRules;
assert.ok(rules, 'assets/game-rules.js 应暴露 PkaRules');

test('默认状态包含精灵球与初始任务', () => {
  const state = rules.createInitialState();

  assert.equal(state.inventory['poke-ball'], 5);
  assert.equal(state.worldFlags.lastEncounterTurn, null);
  assert.ok(Array.isArray(state.quests));
  assert.ok(state.quests.length >= 1);
});

test('没有精灵球时捕获返回 no-ball', () => {
  const state = rules.createInitialState();
  state.inventory['poke-ball'] = 0;
  state.activeEncounter = { pokemonId: 25, level: 3 };

  const result = rules.resolve('\u6355\u83b7', state);
  const captureEvent = result.events.find((event) => event.type === 'capture');

  assert.ok(captureEvent);
  assert.equal(captureEvent.type, 'capture');
  assert.equal(captureEvent.outcome, 'no-ball');
  assert.equal(captureEvent.pokemonId, 25);
});

test('战斗和捕获事件必须有 activeEncounter', () => {
  const state = rules.createInitialState();

  for (const action of ['\u6218\u6597', '\u6355\u83b7']) {
    const result = rules.resolve(action, state);
    const combatEvents = result.events.filter(
      (event) => event.type === 'battle' || event.type === 'capture',
    );

    assert.equal(combatEvents.length, 0);
  }
});

test('队伍上限为 6 只宝可梦', () => {
  const state = rules.normalizeState({
    party: [1, 2, 3, 4, 5, 6, 7],
  });

  assert.equal(rules.MAX_PARTY, 6);
  assert.equal(state.party.length, 6);
  assert.deepEqual(state.party, [1, 2, 3, 4, 5, 6]);
});

test('旧状态 normalize 后保留已有 pokemon 与 party', () => {
  const pokemon = [
    { id: 25, name: 'pikachu', caught: true },
    { id: 1, name: 'bulbasaur', caught: false },
  ];
  const party = [25];

  const state = rules.normalizeState({ pokemon, party });

  assert.deepEqual(state.pokemon, pokemon);
  assert.deepEqual(state.party, party);
});

test('有效遭遇使用官方地点并拒绝未知道具', () => {
  const state = rules.createInitialState();
  const result = rules.resolve('继续探索', state, {
    encounter: { pokemonId: 25, name: '错误名称', trigger: 'story' },
    location: '真新镇',
    itemGained: '神秘自造道具',
  });

  assert.ok(result.events.some((event) => event.type === 'encounter' && event.encounter.pokemonId === 25));
  assert.ok(result.events.some((event) => event.type === 'location' && event.value === '真新镇'));
  assert.equal(result.events.some((event) => event.type === 'reward'), false);
});

test('未知地点不会进入规则事件', () => {
  const state = rules.createInitialState();
  const result = rules.resolve('继续探索', state, { location: '不存在的城镇' });

  assert.equal(result.events.some((event) => event.type === 'location'), false);
});

test('遭遇记录中的地点也必须属于当前地区', () => {
  const state = rules.createInitialState();
  const result = rules.resolve('继续探索', state, {
    encounter: { pokemonId: 25, trigger: 'story', location: '桌台市' },
  });
  const encounter = result.events.find((event) => event.type === 'encounter');

  assert.ok(encounter);
  assert.equal(encounter.encounter.location, '');
});

test('遭遇不会连续出现，但冷却后允许同种宝可梦再次出现', () => {
  const state = rules.createInitialState();
  state.worldFlags.lastEncounterTurn = 0;
  state.turns = 1;

  const blocked = rules.resolve('继续探索', state, {
    encounter: { pokemonId: 25, trigger: 'sound' },
  });
  assert.equal(blocked.events.some((event) => event.type === 'encounter'), false);
  assert.ok(blocked.suppressedEncounter);

  state.turns = 2;
  const allowed = rules.resolve('继续探索', state, {
    encounter: { pokemonId: 25, trigger: 'sound' },
  });
  assert.ok(allowed.events.some((event) => event.type === 'encounter' && event.encounter.pokemonId === 25));
});

test('没有合法触发原因或编号的遭遇会被拒绝', () => {
  const state = rules.createInitialState();
  const missingTrigger = rules.resolve('继续探索', state, { encounter: { pokemonId: 25 } });
  const invalidId = rules.resolve('继续探索', state, { encounter: { pokemonId: 9999, trigger: 'story' } });

  assert.equal(missingTrigger.events.some((event) => event.type === 'encounter'), false);
  assert.equal(invalidId.events.some((event) => event.type === 'encounter'), false);
});

test('AI 返回 pokemonCaught 不能绕过捕获判定', () => {
  const state = rules.createInitialState();
  state.activeEncounter = { pokemonId: 25, level: 3 };
  state.inventory['poke-ball'] = 1;

  const result = rules.resolve('捕获', state, { pokemonCaught: 25 });
  const capture = result.events.find((event) => event.type === 'capture');

  assert.ok(capture);
  assert.notEqual(capture.outcome, 'proposal');
});
