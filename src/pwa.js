// ============================================================
//  PWA: Service Worker & Update-Hinweis (nur im GitHub-Pages-Build)
// ============================================================
(() => {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  const offerUpdate = worker => {
    if (document.querySelector('.update-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'update-bar'; bar.setAttribute('role', 'status');
    bar.innerHTML = '<span>Eine neue Version ist da.</span><button class="btn primary small" id="update-reload">Jetzt laden</button>';
    bar.querySelector('button').addEventListener('click', () => { save(); worker.postMessage('skipWaiting'); });
    document.body.append(bar);
  };
  navigator.serviceWorker.register('./sw.js').then(reg => {
    if (reg.waiting && hadController) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); });
    });
    const check = () => reg.update().catch(() => { });
    setInterval(check, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }).catch(err => console.warn('Service Worker nicht registriert:', err));
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true; save(); location.reload();
  });
})();
