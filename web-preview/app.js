'use strict';
const { DEFAULT_THEMES, createContent, parseInstagramExport, mergeImport, filterItems } = CollectionsLibrary;
const KEY = 'collections-web-v1';
const $ = id => document.getElementById(id);
let items = [];
let selectedTheme = null;
let editingId = null;
let deletingId = null;
let canPersist = true;

function notice(text, error = false) {
  $('notice').textContent = text;
  $('notice').classList.toggle('error', error);
  $('notice').hidden = false;
}
function persist() {
  if (!canPersist) { notice('La sauvegarde locale est indisponible. Utilisez « Sauvegarder » pour conserver vos modifications.', true); return; }
  try { localStorage.setItem(KEY, JSON.stringify(items)); }
  catch { notice('Le navigateur n’a pas pu sauvegarder les contenus. Téléchargez une sauvegarde avant de fermer cette page.', true); }
}
function themes() { return [...new Set([...DEFAULT_THEMES, ...items.map(item => item.theme)])]; }
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function render() {
  $('total-count').textContent = items.length;
  $('nav-count').textContent = items.length;
  $('theme-count').textContent = new Set(items.filter(item => item.theme !== 'À classer').map(item => item.theme)).size;
  $('pending-count').textContent = items.filter(item => item.theme === 'À classer').length;
  const nav = $('themes');
  nav.replaceChildren();
  for (const theme of [null, ...themes()]) {
    const button = element('button', '', theme || 'Tous');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(selectedTheme === theme));
    const count = items.filter(item => !theme || item.theme === theme).length;
    button.append(element('span', 'theme-count', ' ' + count));
    button.addEventListener('click', () => { selectedTheme = theme; render(); });
    nav.append(button);
  }
  $('theme-options').replaceChildren(...themes().map(theme => {
    const option = element('option'); option.value = theme; return option;
  }));
  const visible = filterItems(items, selectedTheme, $('search').value);
  $('result-count').textContent = visible.length;
  $('empty').hidden = visible.length > 0;
  $('empty-actions').hidden = items.length > 0;
  $('reset-filter').hidden = items.length === 0;
  $('empty-title').textContent = items.length ? 'Aucun contenu pour cette recherche.' : 'Toutes vos inspirations, au même endroit.';
  $('empty-description').textContent = items.length ? 'Essayez un autre thème ou une autre recherche.' : 'Importez les publications enregistrées de votre export Instagram, puis donnez à chaque idée le thème qui lui ressemble.';
  $('cards').replaceChildren();
  for (const item of visible) {
    const card = element('article', 'card');
    const head = element('div', 'card-head');
    head.append(element('span', 'tag', item.theme));
    const date = element('time', 'card-date', new Date(item.savedAt).toLocaleDateString('fr-FR'));
    date.dateTime = item.savedAt; head.append(date);
    card.append(head, element('h3', '', item.title));
    if (item.note) card.append(element('p', 'card-note', item.note));
    card.append(element('span', 'card-url', item.url));
    const actions = element('div', 'card-actions');
    const link = element('a', '', 'Voir sur Instagram ↗');
    link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    const edit = element('button', '', 'Modifier');
    edit.setAttribute('aria-label', 'Modifier ' + item.title);
    edit.addEventListener('click', () => openEditor(item));
    const remove = element('button', '', 'Supprimer');
    remove.setAttribute('aria-label', 'Supprimer ' + item.title);
    remove.addEventListener('click', () => { deletingId = item.id; $('delete-dialog').showModal(); });
    actions.append(link, edit, remove); card.append(actions); $('cards').append(card);
  }
}
function openEditor(item = null) {
  editingId = item?.id || null;
  $('editor-title').textContent = item ? 'Modifier le contenu' : 'Ajouter un contenu';
  $('content-url').value = item?.url || '';
  $('content-title').value = item?.title || '';
  $('content-theme').value = item?.theme || 'À classer';
  $('content-note').value = item?.note || '';
  $('editor-error').hidden = true;
  $('editor').showModal();
}
function chooseImport() { $('import-file').click(); }
for (const id of ['import-main', 'import-empty']) $(id).addEventListener('click', chooseImport);
$('help').addEventListener('click', () => $('help-dialog').showModal());
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('help-import').addEventListener('click', () => { $('help-dialog').close(); chooseImport(); });
$('add').addEventListener('click', () => openEditor());
for (const id of ['close-editor', 'cancel-editor']) $(id).addEventListener('click', () => $('editor').close());
$('search').addEventListener('input', render);
function resetFilters() { selectedTheme = null; $('search').value = ''; render(); }
$('all-library').addEventListener('click', resetFilters);
$('reset-filter').addEventListener('click', resetFilters);
$('editor-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const existing = items.find(item => item.id === editingId);
    const item = createContent({
      id: editingId || undefined, title: $('content-title').value, url: $('content-url').value,
      theme: $('content-theme').value, note: $('content-note').value, savedAt: existing?.savedAt
    });
    if (items.some(other => other.url === item.url && other.id !== item.id)) throw new Error('Ce lien existe déjà dans votre bibliothèque. Modifiez le contenu existant.');
    if (existing) items = items.map(other => other.id === editingId ? item : other);
    else items.unshift(item);
    resetFilters(); persist(); $('editor').close();
  } catch (error) { $('editor-error').textContent = error.message; $('editor-error').hidden = false; }
});
$('cancel-delete').addEventListener('click', () => { deletingId = null; $('delete-dialog').close(); });
$('confirm-delete').addEventListener('click', () => {
  items = items.filter(item => item.id !== deletingId);
  deletingId = null; persist(); render(); $('delete-dialog').close();
});
$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('Ce fichier dépasse 20 Mo. Sélectionnez uniquement le JSON des publications enregistrées.');
    const parsed = parseInstagramExport(JSON.parse(await file.text()));
    const merged = mergeImport(items, parsed.items);
    items = merged.items;
    resetFilters();
    notice(`${merged.added} nouveau(x) contenu(s) importé(s). ${merged.duplicates + parsed.skipped} doublon(s) ou entrée(s) ignoré(s).`);
    persist();
  } catch (error) {
    notice(error instanceof SyntaxError ? 'Ce fichier n’est pas un JSON valide. Décompressez votre export et choisissez le fichier des publications enregistrées.' : error.message, true);
  } finally { event.target.value = ''; }
});
$('backup').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ format: 'collections-v1', exportedAt: new Date().toISOString(), items }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = element('a'); link.href = url; link.download = 'collections-sauvegarde.json';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) throw new Error('Invalid storage');
    items = saved.map(item => {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string') throw new Error('Invalid content');
      return createContent(item);
    });
  }
} catch {
  canPersist = false;
  notice('La bibliothèque locale est inaccessible ou illisible. Elle a été préservée ; sauvegardez vos nouvelles modifications avec le bouton « Sauvegarder ».', true);
}
render();
