(function (root) {
  'use strict';
  const DEFAULT_THEMES = ['À classer', 'Voyage', 'Cuisine', 'Décoration', 'Sport', 'Inspiration'];
  function normalizeURL(input) {
    if (typeof input !== 'string' || !input.trim()) return null;
    const text = input.trim();
    try {
      const url = new URL(text.includes('://') ? text : 'https://' + text);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null;
      if (!['instagram.com', 'www.instagram.com', 'instagr.am', 'www.instagr.am'].includes(url.hostname.toLowerCase())) return null;
      if (url.pathname === '/') return null;
      url.protocol = 'https:';
      url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      url.search = '';
      url.hash = '';
      if (!url.pathname.endsWith('/')) url.pathname += '/';
      return url.href;
    } catch { return null; }
  }
  function createContent(input) {
    const url = normalizeURL(input.url);
    if (!url) throw new Error('Ajoutez un lien Instagram valide (instagram.com ou instagr.am).');
    const timestamp = new Date(input.savedAt || Date.now());
    return {
      id: typeof input.id === 'string' ? input.id : root.crypto.randomUUID(),
      title: String(input.title || '').trim().slice(0, 500) || 'Publication Instagram',
      url,
      theme: String(input.theme || '').trim().slice(0, 100) || 'À classer',
      note: String(input.note || '').slice(0, 10000),
      savedAt: Number.isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString()
    };
  }
  function parseInstagramExport(json) {
    const isBackup = json && json.format === 'collections-v1' && Array.isArray(json.items);
    const rows = isBackup ? json.items : Array.isArray(json) ? json : json && (json.saved_saved_media || json.saved_posts);
    if (!Array.isArray(rows)) throw new Error('Ce fichier ne contient pas de publications enregistrées reconnues. Choisissez le JSON des contenus enregistrés, pas le ZIP complet.');
    const items = [];
    let skipped = 0;
    const seen = new Set();
    for (const row of rows) {
      if (!row || typeof row !== 'object') { skipped++; continue; }
      const map = row.string_map_data || {};
      const saved = map['Saved on'] || {};
      const link = Array.isArray(row.string_list_data) ? row.string_list_data[0] || {} : {};
      const url = normalizeURL(isBackup ? row.url : saved.href || link.href);
      if (!url) { skipped++; continue; }
      if (seen.has(url)) { skipped++; continue; }
      seen.add(url);
      const seconds = saved.timestamp ?? link.timestamp;
      const input = isBackup ? { ...row, url, id: undefined } : {
        url,
        title: map.Title?.value || row.title || 'Publication Instagram',
        theme: 'À classer',
        note: '',
        savedAt: typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 && seconds < 32503680000 ? new Date(seconds * 1000).toISOString() : undefined
      };
      items.push(createContent(input));
    }
    if (rows.length && !items.length) throw new Error('Aucun lien Instagram reconnu dans ce fichier. Les formats d’export peuvent varier ; choisissez le fichier des publications enregistrées.');
    return { items, skipped, isBackup };
  }
  function mergeImport(existing, incoming) {
    const urls = new Set(existing.map(item => item.url));
    let duplicates = 0;
    const added = incoming.filter(item => {
      if (urls.has(item.url)) { duplicates++; return false; }
      urls.add(item.url);
      return true;
    });
    return { items: [...existing, ...added].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)), added: added.length, duplicates };
  }
  function filterItems(items, theme, query) {
    const fold = value => value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const needle = fold(query.trim());
    return items.filter(item => (!theme || item.theme === theme) && (!needle || fold([item.title, item.theme, item.note, item.url].join(' ')).includes(needle)));
  }
  const api = { DEFAULT_THEMES, normalizeURL, createContent, parseInstagramExport, mergeImport, filterItems };
  root.CollectionsLibrary = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
