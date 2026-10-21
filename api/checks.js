const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i;
const H1_RE = /<h1[^>]*>([^<]*)<\/h1>/i;
const JSONLD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

// Pulls @type values from the top level and from a nested @graph array, the two
// shapes real sites actually use (e.g. Yoast/RankMath-style SEO plugins emit @graph).
function extractTypes(data) {
  if (Array.isArray(data)) return data.flatMap(extractTypes);
  if (!data || typeof data !== 'object') return [];
  const types = data['@type'] ? [].concat(data['@type']) : [];
  if (Array.isArray(data['@graph'])) types.push(...data['@graph'].flatMap(extractTypes));
  return types;
}

function isValidHttpUrl(input) {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

// shortcut: checks the literal hostname/IP only, does not resolve DNS - a hostname that
// resolves to a private IP (DNS rebinding) would slip through. Upgrade by resolving and
// re-checking the IP before fetching if this ever goes public-facing.
function isUnsafeTarget(hostname) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // includes the cloud metadata address
    return false;
  }

  if (host.startsWith('fc') || host.startsWith('fd')) return true; // IPv6 unique local
  if (/^fe[89ab]/.test(host)) return true; // IPv6 link-local

  return false;
}

function checkTitleH1(html) {
  const title = html.match(TITLE_RE)?.[1]?.trim();
  const h1 = html.match(H1_RE)?.[1]?.trim();
  if (!title && !h1) {
    return { id: 'title_h1', status: 'unavailable', evidence: 'No <title> or <h1> found on the homepage.' };
  }
  return { id: 'title_h1', status: 'observed', evidence: { title: title || null, h1: h1 || null } };
}

function checkJsonLd(html) {
  const tags = [...html.matchAll(JSONLD_RE)];
  if (tags.length === 0) {
    return { id: 'json_ld', status: 'unavailable', evidence: 'No JSON-LD script tag found on the homepage.' };
  }

  const types = [];
  let parsedCount = 0;
  for (const tag of tags) {
    try {
      types.push(...extractTypes(JSON.parse(tag[1].trim())));
      parsedCount++;
    } catch {
      // this tag's content isn't valid JSON; other tags may still parse
    }
  }

  if (parsedCount === 0) {
    return { id: 'json_ld', status: 'error', evidence: `${tags.length} JSON-LD script tag(s) present but none parsed as valid JSON.` };
  }
  return {
    id: 'json_ld',
    status: 'observed',
    evidence: { tagCount: tags.length, parseable: parsedCount, type: types.length ? [...new Set(types)] : null },
  };
}

function checkRobots(robotsTxt, robotsReachable) {
  if (!robotsReachable) {
    // Unavailable is not automatically a failure: a missing robots.txt is valid.
    return { id: 'robots_txt', status: 'unavailable', evidence: 'robots.txt could not be fetched (missing robots.txt is not automatically a problem).' };
  }
  const hasDisallow = /disallow/i.test(robotsTxt);
  return {
    id: 'robots_txt',
    status: 'observed',
    evidence: { length: robotsTxt.length, hasDisallowRules: hasDisallow, snippet: robotsTxt.slice(0, 200) },
  };
}

module.exports = { checkTitleH1, checkJsonLd, checkRobots, isValidHttpUrl, isUnsafeTarget };
