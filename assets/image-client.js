/*
 * Agnes 图像请求客户端。
 * 将请求体、超时和响应解析集中在这里，避免页面逻辑吞掉服务端的具体错误。
 */
(function (root) {
  'use strict';

  var DEFAULT_MODEL = 'agnes-image-2.1-flash';
  var DEFAULT_SIZE = '1024x768';
  var MAX_ATTEMPTS = 3;
  var RETRYABLE_STATUS = { 408: true, 429: true, 500: true, 502: true, 503: true, 504: true, 520: true, 522: true, 524: true };

  function normalizeBaseUrl(value) {
    return String(value || 'https://apihub.agnes-ai.com/v1').trim().replace(/\/+$/, '');
  }

  function buildRequest(config, prompt) {
    var body = {
      model: String(config.imageModel || DEFAULT_MODEL),
      prompt: String(prompt || '').trim(),
      size: DEFAULT_SIZE
    };

    return {
      endpoint: normalizeBaseUrl(config.imageBaseURL) + '/images/generations',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + String(config.imageApiKey || '')
      },
      body: body
    };
  }

  async function readPayload(response) {
    try {
      return await response.json();
    } catch (error) {
      return { error: { message: '服务端返回了无法解析的响应。' } };
    }
  }

  function wait(rootObject, milliseconds) {
    var timer = rootObject.setTimeout || (typeof setTimeout === 'function' ? setTimeout : null);
    if (!timer || milliseconds <= 0) return Promise.resolve();
    return new Promise(function (resolve) { timer(resolve, milliseconds); });
  }

  function requestError(response, payload) {
    var detail = payload && payload.error && payload.error.message;
    var error = new Error('插图接口错误（' + response.status + '）：' + String(detail || '服务端拒绝了请求。').slice(0, 240));
    error.status = Number(response.status) || 0;
    error.retryable = !!RETRYABLE_STATUS[error.status];
    return error;
  }

  async function requestOnce(config, request, transport) {
    var AbortControllerCtor = root.AbortController || (typeof AbortController === 'function' ? AbortController : null);
    var controller = AbortControllerCtor ? new AbortControllerCtor() : null;
    var timerFunction = root.setTimeout || (typeof setTimeout === 'function' ? setTimeout : null);
    var clearTimer = root.clearTimeout || (typeof clearTimeout === 'function' ? clearTimeout : null);
    var timer = timerFunction && controller ? timerFunction(function () { controller.abort(); }, 90000) : null;

    try {
      var options = {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body)
      };
      if (controller) options.signal = controller.signal;
      var response = await transport(request.endpoint, options);
      var payload = await readPayload(response);
      if (!response.ok) throw requestError(response, payload);

      var image = payload && payload.data && payload.data[0];
      var result = image && (image.url || (image.b64_json ? 'data:image/png;base64,' + image.b64_json : ''));
      if (!result) throw new Error('插图接口未返回图片地址。');
      return result;
    } catch (error) {
      if (error && error.name === 'AbortError') {
        var timeoutError = new Error('插图生成超时，请稍后重试。');
        timeoutError.retryable = false;
        throw timeoutError;
      }
      throw error;
    } finally {
      if (timer && clearTimer) clearTimer(timer);
    }
  }

  async function generate(config, prompt, fetchImpl) {
    if (!config.images || !prompt) return '';
    if (!config.imageApiKey) throw new Error('插图 API Key 未配置，请在 AI 设置中填写 Agnes 插图通道。');

    var transport = fetchImpl || (root.fetch && root.fetch.bind(root));
    if (!transport) throw new Error('当前浏览器不支持网络请求。');

    var request = buildRequest(config, prompt);
    var retryDelay = typeof config.imageRetryDelay === 'number' ? Math.max(0, config.imageRetryDelay) : 1200;
    for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        return await requestOnce(config, request, transport);
      } catch (error) {
        var retryable = !!(error && error.retryable);
        if (!retryable && error && !error.status && error.name !== 'AbortError') retryable = true;
        if (!retryable || attempt >= MAX_ATTEMPTS - 1) throw error;
        await wait(root, retryDelay * Math.pow(2, attempt));
      }
    }
    return '';
  }

  root.PkaImageClient = {
    DEFAULT_SIZE: DEFAULT_SIZE,
    buildRequest: buildRequest,
    generate: generate
  };
})(window);
