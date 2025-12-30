const wsRateLimitMap = new Map();

const WS_WINDOW = 60 * 1000; // 1 minute
const WS_MAX = 20; // max connections per IP per window

function isWsRateLimited(ip) {
  const now = Date.now();
  const entry = wsRateLimitMap.get(ip);

  if (!entry) {
    wsRateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }

  if (now - entry.start > WS_WINDOW) {
    wsRateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }

  entry.count += 1;
  return entry.count > WS_MAX;
}
