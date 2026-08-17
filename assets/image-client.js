/*
 * Agnes 图像请求客户端。
 * 将请求体、超时和响应解析集中在这里，避免页面逻辑吞掉服务端的具体错误。
 */
(function (root) {
  'use strict';

  var DEFAULT_MODEL = 'agnes-image-2.1-flash';
  var DEFAULT_SIZE = '1024x1536';

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

  async function generate(config, prompt, fetchImpl) {
    if (!config.images || !prompt) return '';
    if (!config.imageApiKey) throw new Error('插图 API Key 未配置，请在 AI 设置中填写 Agnes 插图通道。');

    var transport = fetchImpl || (root.fetch && root.fetch.bind(root));
    if (!transport) throw new Error('当前浏览器不支持网络请求。');

    var controller = new root.AbortController();
    var timer = root.setTimeout(function () { controller.abort(); }, 90000);
    var request = buildRequest(config, prompt);

    try {
      var response = await transport(request.endpoint, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: controller.signal
      });
      var payload = await readPayload(response);
      if (!response.ok) {
        var detail = payload && payload.error && payload.error.message;
        throw new Error('插图接口错误（' + response.status + '）：' + String(detail || '服务端拒绝了请求。').slice(0, 240));
      }

      var image = payload && payload.data && payload.data[0];
      var result = image && (image.url || (image.b64_json ? 'data:image/png;base64,' + image.b64_json : ''));
      if (!result) throw new Error('插图接口未返回图片地址。');
      return result;
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('插图生成超时，请稍后重试。');
      throw error;
    } finally {
      root.clearTimeout(timer);
    }
  }

  root.PkaImageClient = {
    DEFAULT_SIZE: DEFAULT_SIZE,
    buildRequest: buildRequest,
    generate: generate
  };
})(window);
