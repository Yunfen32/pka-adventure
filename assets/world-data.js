(function (global) {
  'use strict';

  var typeNames = {
    normal: '一般', fire: '火', water: '水', electric: '电', grass: '草', ice: '冰',
    fighting: '格斗', poison: '毒', ground: '地面', flying: '飞行', psychic: '超能力', bug: '虫',
    rock: '岩石', ghost: '幽灵', dragon: '龙', dark: '恶', steel: '钢', fairy: '妖精'
  };

  var itemNames = {
    'poke-ball': '精灵球', potion: '伤药', revive: '活力碎片', 'ancient-map': '旧地图',
    'great-ball': '超级球', 'ultra-ball': '高级球', 'escape-rope': '离洞绳'
  };

  var pokemonCatalog = {
    1: { id: 1, nameZh: '妙蛙种子', nameEn: 'bulbasaur', types: ['草', '毒'], habitats: ['森林', '草地'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png' },
    4: { id: 4, nameZh: '小火龙', nameEn: 'charmander', types: ['火'], habitats: ['山地', '岩场'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png' },
    7: { id: 7, nameZh: '杰尼龟', nameEn: 'squirtle', types: ['水'], habitats: ['湖泊', '海岸'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png' },
    25: { id: 25, nameZh: '皮卡丘', nameEn: 'pikachu', types: ['电'], habitats: ['森林', '草地', '城镇附近'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' },
    39: { id: 39, nameZh: '胖丁', nameEn: 'jigglypuff', types: ['一般', '妖精'], habitats: ['草地', '城市边缘'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png' },
    52: { id: 52, nameZh: '喵喵', nameEn: 'meowth', types: ['一般'], habitats: ['城市边缘', '城镇附近'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/52.png' },
    54: { id: 54, nameZh: '可达鸭', nameEn: 'psyduck', types: ['水'], habitats: ['河流', '湖泊'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/54.png' },
    133: { id: 133, nameZh: '伊布', nameEn: 'eevee', types: ['一般'], habitats: ['森林', '城市边缘'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png' },
    147: { id: 147, nameZh: '迷你龙', nameEn: 'dratini', types: ['龙'], habitats: ['湖泊', '海岸'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/147.png' }
  };

  var facilities = ['宝可梦中心', '宝可梦商店', '研究所', '道馆', '宝可梦图鉴', '训练家学校'];

  var regions = {
    kanto: {
      name: '关都地区', generation: 1,
      towns: ['真新镇', '常青市', '深灰市', '华蓝市', '枯叶市', '彩虹市', '金黄市', '浅红市', '红莲岛'],
      routes: ['1号道路', '2号道路', '3号道路', '4号道路', '5号道路', '22号道路'],
      landmarks: ['常青森林', '月见山', '自行车道', '狩猎地带', '冠军之路'],
      habitats: ['草地', '森林', '洞窟', '海岸', '城市边缘'],
      mechanics: ['道馆挑战', '宝可梦图鉴记录', '野外捕获']
    },
    johto: {
      name: '城都地区', generation: 2,
      towns: ['若叶镇', '吉花市', '桔梗市', '桧皮镇', '满金市', '圆朱市', '浅葱市', '湛蓝市', '烟墨市'],
      routes: ['29号道路', '30号道路', '31号道路', '32号道路', '34号道路', '42号道路'],
      landmarks: ['桐树林', '烧焦塔', '钟之塔', '愤怒之湖', '冰雪小径'],
      habitats: ['森林', '湖泊', '古塔', '山路', '城市边缘'],
      mechanics: ['道馆挑战', '宝可梦图鉴记录', '野外捕获']
    },
    hoenn: {
      name: '丰缘地区', generation: 3,
      towns: ['未白镇', '古辰镇', '橙华市', '卡那兹市', '武斗镇', '紫堇市', '凯那市', '水静市', '绿岭市', '琉璃市'],
      routes: ['101号道路', '102号道路', '103号道路', '104号道路', '110号道路', '119号道路'],
      landmarks: ['橙华森林', '石之洞窟', '海底洞窟', '天气研究所', '天空之柱'],
      habitats: ['热带森林', '海岸', '火山地带', '洞窟', '水道'],
      mechanics: ['道馆挑战', '宝可梦图鉴记录', '野外捕获']
    },
    sinnoh: {
      name: '神奥地区', generation: 4,
      towns: ['双叶镇', '真砂镇', '祝庆市', '钢铁市', '百代市', '家缘市', '帷幕市', '湿原市', '水脉市', '雪峰市', '滨海市'],
      routes: ['201号道路', '202号道路', '203号道路', '204号道路', '205号道路', '210号道路'],
      landmarks: ['百代森林', '迷幻洞窟', '天冠山', '睿智湖', '冠军之路'],
      habitats: ['森林', '雪原', '山地', '湖泊', '城市边缘'],
      mechanics: ['道馆挑战', '宝可梦图鉴记录', '野外捕获']
    },
    unova: {
      name: '合众地区', generation: 5,
      towns: ['鹿子镇', '唐草镇', '三曜市', '七宝市', '飞云市', '雷文市', '帆巴市', '吹寄市', '双龙市', '涟漪镇'],
      routes: ['1号道路', '2号道路', '3号道路', '4号道路', '5号道路', '7号道路'],
      landmarks: ['梦之遗址', '矢车森林', '荒野名胜区', '古代城堡', '龙螺旋之塔'],
      habitats: ['森林', '沙漠', '城市', '海岸', '遗迹'],
      mechanics: ['道馆挑战', '宝可梦图鉴记录', '野外捕获']
    },
    kalos: {
      name: '卡洛斯地区', generation: 6,
      towns: ['朝香镇', '三色堇市', '密阿雷市', '香薰市', '娑罗市', '海翼市', '百刻市', '映雪市'],
      routes: ['1号道路', '2号道路', '3号道路', '4号道路', '5号道路', '10号道路'],
      landmarks: ['白檀森林', '闪耀洞窟', '精灵球工厂', '终结洞窟', '宝可梦村'],
      habitats: ['森林', '海岸', '洞窟', '花田', '城市'],
      mechanics: ['道馆挑战', '宝可梦图鉴记录', '野外捕获']
    },
    alola: {
      name: '阿罗拉地区', generation: 7,
      towns: ['利利小镇', '好奥乐市', '慷待市', '马利埃静市', '魄镇'],
      routes: ['1号道路', '2号道路', '3号道路', '4号道路', '5号道路', '8号道路'],
      landmarks: ['美乐美乐岛', '阿卡拉岛', '乌拉乌拉岛', '波尼岛', '以太乐园'],
      habitats: ['热带草地', '海滩', '火山', '雨林', '岛屿城市'],
      mechanics: ['岛屿巡礼', '队长试炼', '岛屿之王或女王', '野外捕获']
    },
    galar: {
      name: '伽勒尔地区', generation: 8,
      towns: ['木杆镇', '机擎市', '水舟镇', '拳关市', '舞姿镇', '迷光市', '战竞镇', '宫门市'],
      routes: ['1号道路', '2号道路', '3号道路', '4号道路', '5号道路', '6号道路'],
      landmarks: ['旷野地带', '伽勒尔矿山', '巨石原野', '逆鳞湖', '冠军杯场地'],
      habitats: ['旷野', '草原', '矿山', '雪原', '城市'],
      mechanics: ['道馆挑战', '宝可梦图鉴记录', '野外捕获']
    },
    paldea: {
      name: '帕底亚地区', generation: 9,
      towns: ['小匙镇', '桌台市', '圆模镇', '深钵镇', '酿光市', '玻瓶市', '锦汇镇', '霜抹山'],
      routes: ['南第1区', '南第2区', '南第3区', '东第1区', '西第1区', '北第1区'],
      landmarks: ['零之大空洞', '大锅湖', '烘烘沙漠', '北上乡入口', '帕底亚大坑'],
      habitats: ['草原', '海岸', '沙漠', '雪山', '城市边缘'],
      mechanics: ['道馆挑战', '传说之路', '星尘之路', '野外捕获']
    }
  };

  var WORLD_BIBLE = {
    canonScope: '官方宝可梦世界基础规则与官方地区资料，主角、伙伴、任务和主线原创。',
    rules: [
      '宝可梦是与人类共同生活的生物，训练家可以照顾、训练、对战并在合适情况下捕获野外宝可梦。',
      '精灵球是捕获道具；捕获必须基于当前有效的野外遭遇，不能凭空捕获城市居民或伙伴宝可梦。',
      '宝可梦类型、地区名称、地点、设施和道具必须使用资料库中的官方名称。',
      '普通探索回合不强制出现宝可梦，宝可梦只在有声音、足迹、气味、任务或战斗线索时出现。',
      '不创造新的属性类型、官方角色、官方宝可梦或与当前地区冲突的地点。',
      '轻量战斗只描述行动与结果，不擅自生成复杂数值、招式威力或进化结论。'
    ],
    vocabulary: ['宝可梦中心', '宝可梦商店', '宝可梦图鉴', '训练家', '道馆', '精灵球', '野外遭遇'],
    imageRules: ['原创日式动画冒险', '整页漫画构图', '粗线条与鲜艳色彩', '保持角色和宝可梦外观连续', '不添加文字水印', '不复刻具体官方角色或海报']
  };

  function getRegion(key) {
    return regions[key] || regions.kanto;
  }

  function getPokemonRecord(id) {
    var pokemonId = Number(id);
    var record = Number.isInteger(pokemonId) ? pokemonCatalog[pokemonId] : null;
    return record ? Object.assign({}, record, { name: record.nameZh, englishName: record.nameEn, slug: record.nameEn }) : null;
  }

  function allowedLocations(key) {
    var region = getRegion(key);
    return region.towns.concat(region.routes, region.landmarks);
  }

  function normalizeLocation(key, value) {
    var text = String(value || '').trim();
    if (!text) return '';
    var match = allowedLocations(key).find(function (location) { return location === text; });
    return match || '';
  }

  function promptContext(key) {
    var region = getRegion(key);
    return JSON.stringify({
      canonScope: WORLD_BIBLE.canonScope,
      region: { key: key, name: region.name, generation: region.generation, towns: region.towns, routes: region.routes, landmarks: region.landmarks, habitats: region.habitats, mechanics: region.mechanics },
      facilities: facilities,
      rules: WORLD_BIBLE.rules,
      vocabulary: WORLD_BIBLE.vocabulary,
      imageRules: WORLD_BIBLE.imageRules
    });
  }

  global.PkaWorld = {
    version: '1.0.0',
    regions: regions,
    typeNames: typeNames,
    itemNames: itemNames,
    pokemonCatalog: pokemonCatalog,
    getPokemonRecord: getPokemonRecord,
    facilities: facilities,
    bible: WORLD_BIBLE,
    getRegion: getRegion,
    allowedLocations: allowedLocations,
    normalizeLocation: normalizeLocation,
    promptContext: promptContext
  };
})(window);
