import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../assets/image-client.js', import.meta.url), 'utf8');
const context = { window: { AbortController, setTimeout, clearTimeout }, AbortController, setTimeout, clearTimeout };
vm.runInNewContext(source, context, { filename: 'assets/image-client.js' });

const client = context.window.PkaImageClient;
assert.ok(client, '应暴露 PkaImageClient');

test('图像请求使用 Agnes 接受的像素尺寸并保留竖版比例', () => {
  const request = client.buildRequest({
    imageBaseURL: 'https://apihub.agnes-ai.com/v1',
    imageApiKey: 'test-key',
    imageModel: 'agnes-image-2.1-flash',
  }, '森林中的训练家');

  assert.equal(request.endpoint, 'https://apihub.agnes-ai.com/v1/images/generations');
  assert.equal(request.body.model, 'agnes-image-2.1-flash');
  assert.equal(request.body.size, '1024x768');
  assert.match(request.body.prompt, /森林中的训练家/);
});

test('图像响应返回 URL，并在 HTTP 错误中保留服务端原因', async () => {
  const calls = [];
  const fetchMock = async (endpoint, init) => {
    calls.push({ endpoint, init });
    return {
      ok: false,
      status: 422,
      async json() {
        return { error: { message: 'Invalid request (id: test)' } };
      },
    };
  };

  await assert.rejects(
    client.generate({
      images: true,
      imageBaseURL: 'https://apihub.agnes-ai.com/v1',
      imageApiKey: 'test-key',
      imageModel: 'agnes-image-2.1-flash',
    }, '森林中的训练家', fetchMock),
    /插图接口错误（422）：Invalid request/,
  );

  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].init.body).size, '1024x768');
});
