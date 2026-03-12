let timerId = null;

self.onmessage = (e) => {
  if (e.data.action === 'start') {
    if (timerId) clearInterval(timerId);
    // This heartbeat bypasses the browser's aggressive requestAnimationFrame throttling
    // for inactive tabs, keeping background processing alive.
    timerId = setInterval(() => {
      self.postMessage({ type: 'tick' });
    }, e.data.interval || 100);
  } else if (e.data.action === 'stop') {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
};
