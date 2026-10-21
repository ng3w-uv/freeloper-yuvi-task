const { checkTitleH1, checkJsonLd, checkRobots, isValidHttpUrl, isUnsafeTarget } = require('./checks');

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 500_000;

async function fetchBounded(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      return { ok: false, text: '', error: 'redirect_blocked' };
    }
    const text = await res.text();
    return { ok: res.ok, text: text.slice(0, MAX_BYTES) };
  } catch (err) {
    return { ok: false, text: '', error: err.name === 'AbortError' ? 'timeout' : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  const input = req.method === 'GET' ? req.query.url : req.body?.url;
  const url = typeof input === 'string' ? isValidHttpUrl(input) : null;
  if (!url) {
    res.status(400).json({ error: 'invalid_url' });
    return;
  }
  if (isUnsafeTarget(url.hostname)) {
    res.status(400).json({ error: 'target_not_allowed' });
    return;
  }

  const base = `${url.protocol}//${url.hostname}`;
  const findings = [];

  const home = await fetchBounded(`${base}/`);
  if (home.error) {
    findings.push({ id: 'title_h1', status: 'error', evidence: home.error });
    findings.push({ id: 'json_ld', status: 'error', evidence: home.error });
  } else {
    findings.push(checkTitleH1(home.text));
    findings.push(checkJsonLd(home.text));
  }

  const robots = await fetchBounded(`${base}/robots.txt`);
  if (robots.error) {
    findings.push({ id: 'robots_txt', status: 'error', evidence: robots.error });
  } else {
    findings.push(checkRobots(robots.text, robots.ok));
  }

  res.status(200).json({
    url: base,
    findings,
    note: 'Technical observations only; not an AI-visibility measurement.',
  });
};
