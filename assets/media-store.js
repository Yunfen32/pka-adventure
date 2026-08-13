(function (global) {
  'use strict';

  var DB_NAME = 'pka-media-v1';
  var STORE_NAME = 'images';
  var memory = new Map();
  var databasePromise = null;

  function openDatabase() {
    if (!('indexedDB' in global)) return Promise.resolve(null);
    if (databasePromise) return databasePromise;
    databasePromise = new Promise(function (resolve) {
      var request = global.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { resolve(null); };
    });
    return databasePromise;
  }

  function dataUrlToBlob(value) {
    var match = String(value || '').match(/^data:([^;,]+)?(;base64)?,(.*)$/i);
    if (!match) return null;
    var mime = match[1] || 'image/png';
    var body = match[3] || '';
    if (match[2]) {
      var bytes = atob(body);
      var array = new Uint8Array(bytes.length);
      for (var index = 0; index < bytes.length; index += 1) array[index] = bytes.charCodeAt(index);
      return new Blob([array], { type: mime });
    }
    return new Blob([decodeURIComponent(body)], { type: mime });
  }

  function toBlob(source) {
    if (source instanceof Blob) return Promise.resolve(source);
    var dataBlob = dataUrlToBlob(source);
    if (dataBlob) return Promise.resolve(dataBlob);
    if (/^https?:\/\//i.test(String(source || ''))) {
      return fetch(source).then(function (response) {
        if (!response.ok) throw new Error('image fetch failed');
        return response.blob();
      });
    }
    return Promise.resolve(null);
  }

  function put(source) {
    var id = 'media-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    return toBlob(source).catch(function () { return null; }).then(function (blob) {
      var record = { id: id, source: blob ? '' : String(source || ''), blob: blob, createdAt: Date.now() };
      if (blob) memory.set(id, global.URL.createObjectURL(blob));
      else if (record.source) memory.set(id, record.source);
      return openDatabase().then(function (db) {
        if (!db) return id;
        return new Promise(function (resolve) {
          var transaction = db.transaction(STORE_NAME, 'readwrite');
          transaction.objectStore(STORE_NAME).put(record);
          transaction.oncomplete = function () { resolve(id); };
          transaction.onerror = function () { resolve(id); };
        });
      });
    });
  }

  function load(id) {
    if (!id || memory.has(id)) return Promise.resolve(memory.get(id) || '');
    return openDatabase().then(function (db) {
      if (!db) return '';
      return new Promise(function (resolve) {
        var request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
        request.onsuccess = function () {
          var record = request.result;
          if (!record) return resolve('');
          var url = record.blob ? global.URL.createObjectURL(record.blob) : record.source || '';
          if (url) memory.set(id, url);
          resolve(url);
        };
        request.onerror = function () { resolve(''); };
      });
    });
  }

  function hydrate(state) {
    var turns = state && Array.isArray(state.storyboards) ? state.storyboards : [];
    return Promise.all(turns.map(function (turn) { return turn && turn.imageRef ? load(turn.imageRef) : Promise.resolve(''); })).then(function () {
      return state;
    });
  }

  function url(id) {
    return id && memory.get(id) || '';
  }

  global.PkaMedia = { put: put, load: load, hydrate: hydrate, url: url };
})(window);
