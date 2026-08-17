/* ============================================================
 * PWA 引导 —— Service Worker 注册 + 安装提示条
 * AI 配置在网页设置中按剧情通道与插图通道分别管理。
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- Service Worker 注册 ---------- */
  /* Capacitor 原生壳内不注册 SW：游戏文件已打包进 APK，
     避免 SW 以固定缓存名缓存旧外壳导致升级后内容不刷新 */
  if ('serviceWorker' in navigator && !window.Capacitor) {
    window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js?v=20260817-image-size-a').catch(function () {
        /* 注册失败（如 file:// 环境）不影响游戏 */
      });
    });
  }

  /* ---------- 安装提示 ---------- */
  var deferredPrompt = null;
  var dismissed = false;

  try {
    dismissed = localStorage.getItem('pka_install_dismissed') === '1';
  } catch (e) {}

  /* 已安装（standalone）则不提示 */
  var isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (!dismissed && !isStandalone) showBanner();
  });

  function showBanner() {
    if (document.getElementById('pka-install-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'pka-install-banner';
    banner.className = 'install-banner';
    banner.innerHTML =
      '<img class="ib-icon" src="./icons/icon-192.png" alt="">' +
      '<div class="ib-text"><strong>安装到主屏幕</strong>像 App 一样随时开始冒险</div>' +
      '<button class="ib-install" type="button">安装</button>' +
      '<button class="ib-close" type="button" aria-label="关闭">✕</button>';

    banner.querySelector('.ib-install').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
        removeBanner();
      });
    });
    banner.querySelector('.ib-close').addEventListener('click', function () {
      try { localStorage.setItem('pka_install_dismissed', '1'); } catch (e) {}
      removeBanner();
    });

    document.body.appendChild(banner);
  }

  function removeBanner() {
    var b = document.getElementById('pka-install-banner');
    if (b) b.remove();
  }

  window.addEventListener('appinstalled', function () {
    removeBanner();
  });
})();
