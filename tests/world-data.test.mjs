import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const worldPath = resolve(testDirectory, '..', 'assets', 'world-data.js');
const source = await readFile(worldPath, 'utf8');
const context = { window: {} };

vm.runInNewContext(source, context, { filename: worldPath });

const world = context.window.PkaWorld;
assert.ok(world, 'assets/world-data.js 应暴露 PkaWorld');

test('资料库包含九大地区和关都官方地点', () => {
  assert.equal(Object.keys(world.regions).length, 9);
  assert.equal(world.regions.kanto.name, '关都地区');
  assert.ok(world.regions.kanto.towns.includes('真新镇'));
  assert.ok(world.regions.kanto.routes.includes('1号道路'));
});

test('地点规范化只接受当前地区资料库中的地点', () => {
  assert.equal(world.normalizeLocation('kanto', '真新镇'), '真新镇');
  assert.equal(world.normalizeLocation('kanto', '不存在的城镇'), '');
  assert.equal(world.normalizeLocation('kanto', '桌台市'), '');
});

test('皮卡丘和小火龙的中文名、类型、图片记录统一', () => {
  const pikachu = world.getPokemonRecord(25);
  const charmander = world.getPokemonRecord(4);

  assert.equal(pikachu.nameZh, '皮卡丘');
  assert.equal(pikachu.name, '皮卡丘');
  assert.equal(pikachu.nameEn, 'pikachu');
  assert.deepEqual(Array.from(pikachu.types), ['电']);
  assert.match(pikachu.sprite, /25\.png$/);
  assert.equal(charmander.nameZh, '小火龙');
  assert.equal(charmander.name, '小火龙');
  assert.match(charmander.sprite, /4\.png$/);
});

test('剧情生成上下文包含当前地区的正史约束', () => {
  const promptContext = world.promptContext('kanto');

  assert.match(promptContext, /关都地区/);
  assert.match(promptContext, /宝可梦中心/);
  assert.match(promptContext, /精灵球/);
  assert.match(promptContext, /不要连续两个回合生成新的宝可梦|普通探索回合不强制出现宝可梦/);
});
