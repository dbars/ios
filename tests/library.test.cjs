const { test } = require('node:test');
const assert = require('node:assert/strict');
const library = require('../web-preview/library.js');
const row = (url, title = 'Une inspiration') => ({
  title,
  string_map_data: { 'Saved on': { href: url, timestamp: 1720000000 } }
});

test('normalizes Instagram URLs and strips tracking', () => {
  assert.equal(library.normalizeURL(' www.instagram.com/p/ABC/?igsh=x#comment '), 'https://instagram.com/p/ABC/');
  assert.equal(library.normalizeURL('http://instagr.am/reel/XYZ'), 'https://instagr.am/reel/XYZ/');
});
test('rejects unsafe URLs and unrelated hosts', () => {
  for (const url of ['javascript:alert(1)', 'https://instagram.com.evil.test/p/a/', 'https://evil.test/p/a/', 'https://user:pass@instagram.com/p/a/', 'https://instagram.com:123/p/a/', 'https://instagram.com/', '']) {
    assert.equal(library.normalizeURL(url), null, url);
  }
});
test('imports Saved on entries from the Instagram saved export', () => {
  const result = library.parseInstagramExport({ saved_saved_media: [row('https://www.instagram.com/p/ABC/', 'Cuisine')] });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, 'Cuisine');
  assert.equal(result.items[0].theme, 'À classer');
  assert.equal(result.items[0].savedAt, new Date(1720000000000).toISOString());
});
test('supports string_list_data and array exports', () => {
  const result = library.parseInstagramExport([{ title: 'Voyage', string_list_data: [{ href: 'https://instagram.com/reel/XYZ/', timestamp: 1720000000 }] }]);
  assert.equal(result.items[0].title, 'Voyage');
});
test('ignores invalid entries and duplicate tracked links', () => {
  const result = library.parseInstagramExport({ saved_posts: [null, row('https://evil.test/a/'), row('https://instagram.com/p/ABC/?a=1'), row('https://www.instagram.com/p/ABC/?a=2')] });
  assert.equal(result.items.length, 1);
  assert.equal(result.skipped, 3);
});
test('repeat imports preserve existing themes and notes', () => {
  const original = library.createContent({ url: 'https://instagram.com/p/ABC/', title: 'Recette', theme: 'Cuisine', note: 'À essayer' });
  const imported = library.parseInstagramExport({ saved_saved_media: [row('https://instagram.com/p/ABC/')] });
  const result = library.mergeImport([original], imported.items);
  assert.equal(result.added, 0);
  assert.equal(result.duplicates, 1);
  assert.deepEqual(result.items, [original]);
});
test('searches themes and notes without accent sensitivity', () => {
  const items = [library.createContent({ url: 'https://instagram.com/p/ABC/', title: 'Une maison', theme: 'Décoration', note: 'Étagère à fabriquer' })];
  assert.equal(library.filterItems(items, 'Décoration', 'etagere').length, 1);
  assert.equal(library.filterItems(items, 'Cuisine', '').length, 0);
  assert.equal(library.filterItems(items, null, 'DECORATION').length, 1);
});
test('rejects unrelated JSON while accepting an empty saved export', () => {
  assert.throws(() => library.parseInstagramExport({ followers: [] }), /reconnues/);
  assert.throws(() => library.parseInstagramExport({ saved_posts: [row('https://example.com/a/')] }), /Aucun lien/);
  assert.equal(library.parseInstagramExport({ saved_saved_media: [] }).items.length, 0);
});
test('restores library backups including personal themes and notes', () => {
  const original = library.createContent({ url: 'https://instagram.com/p/ABC/', title: 'Recette', theme: 'À cuisiner', note: 'Dimanche' });
  const imported = library.parseInstagramExport({ format: 'collections-v1', items: [original] });
  assert.equal(imported.items[0].theme, 'À cuisiner');
  assert.equal(imported.items[0].note, 'Dimanche');
  assert.notEqual(imported.items[0].id, original.id);
});
test('handles extreme timestamps without failing the import', () => {
  const entry = row('https://instagram.com/p/ABC/');
  entry.string_map_data['Saved on'].timestamp = 1e99;
  const imported = library.parseInstagramExport({ saved_posts: [entry] });
  assert.equal(imported.items.length, 1);
  assert.ok(Number.isFinite(Date.parse(imported.items[0].savedAt)));
});
