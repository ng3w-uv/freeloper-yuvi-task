const assert = require('assert');
const { checkTitleH1, checkJsonLd, checkRobots, isValidHttpUrl, isUnsafeTarget } = require('./checks');

let r = checkTitleH1('<html><head><title>Hi</title></head><body><h1>Hello</h1></body></html>');
assert.strictEqual(r.status, 'observed');
assert.strictEqual(r.evidence.title, 'Hi');
assert.strictEqual(r.evidence.h1, 'Hello');

r = checkTitleH1('<html><body>no title or h1 here</body></html>');
assert.strictEqual(r.status, 'unavailable');

r = checkJsonLd('<script type="application/ld+json">{"@type":"Organization"}</script>');
assert.strictEqual(r.status, 'observed');
assert.strictEqual(r.evidence.parseable, 1);
assert.deepStrictEqual(r.evidence.type, ['Organization']);

r = checkJsonLd('<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Acme"}]}</script>');
assert.strictEqual(r.status, 'observed');
assert.deepStrictEqual(r.evidence.type, ['Organization']);

r = checkJsonLd('<script type="application/ld+json">{"@type":"Organization"}</script><script type="application/ld+json">{"@type":"FAQPage"}</script>');
assert.strictEqual(r.status, 'observed');
assert.strictEqual(r.evidence.tagCount, 2);
assert.deepStrictEqual(r.evidence.type, ['Organization', 'FAQPage']);

r = checkJsonLd('<script type="application/ld+json">{not valid json}</script>');
assert.strictEqual(r.status, 'error');

r = checkJsonLd('<div>nothing here</div>');
assert.strictEqual(r.status, 'unavailable');

r = checkRobots('User-agent: *\nDisallow: /admin', true);
assert.strictEqual(r.status, 'observed');
assert.strictEqual(r.evidence.hasDisallowRules, true);

r = checkRobots('', false);
assert.strictEqual(r.status, 'unavailable');

assert.ok(isValidHttpUrl('https://www.freelopers.com/'));
assert.ok(isValidHttpUrl('http://example.com'));
assert.strictEqual(isValidHttpUrl('not a url'), null);
assert.strictEqual(isValidHttpUrl('ftp://example.com'), null);
assert.strictEqual(isValidHttpUrl('file:///etc/passwd'), null);

assert.strictEqual(isUnsafeTarget('www.freelopers.com'), false);
assert.strictEqual(isUnsafeTarget('localhost'), true);
assert.strictEqual(isUnsafeTarget('127.0.0.1'), true);
assert.strictEqual(isUnsafeTarget('10.0.0.5'), true);
assert.strictEqual(isUnsafeTarget('172.16.0.1'), true);
assert.strictEqual(isUnsafeTarget('192.168.1.1'), true);
assert.strictEqual(isUnsafeTarget('169.254.169.254'), true);
assert.strictEqual(isUnsafeTarget('8.8.8.8'), false);
assert.strictEqual(isUnsafeTarget('::1'), true);
assert.strictEqual(isUnsafeTarget('fe80::1'), true);

console.log('all checks.js tests passed');
