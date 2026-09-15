/* Translate rendered text without replacing controls, lesson state, or user input. */
(() => {
  'use strict';
  const supported = ['en', 'es'];
  const storageKey = 'rag-fieldguide-language';
  const sourceLanguage = document.documentElement.dataset.sourceLang || 'en';
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const codeOriginals = new WeakMap();
  const skip = 'script,style,pre,code,textarea,[contenteditable],[translate="no"],[data-no-translate]';
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const catalogs = window.RAG_TRANSLATIONS;
  const patterns = {};
  for (const source of supported) {
    // One pass, longest phrase first: translated output must never be translated again.
    const keys = Object.keys(catalogs[source]).sort((a, b) => b.length - a.length);
    patterns[source] = new RegExp('(?<![\\p{L}\\p{N}_])(?:' + keys.map(escapeRegex).join('|') + ')(?![\\p{L}\\p{N}_])', 'gu');
  }
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch {}
  const requested = new URL(location.href).searchParams.get('lang');
  const preferred = (navigator.language || '').split('-')[0];
  let language = [requested, saved, preferred, sourceLanguage].find(value => supported.includes(value));

  function translate(text, source = sourceLanguage) {
    if (language === source || !text.trim()) return text;
    const clean = normalize(text);
    const translated = catalogs[source][clean] ?? clean.replace(patterns[source], match => catalogs[source][match]);
    return text.match(/^\s*/)[0] + translated + text.match(/\s*$/)[0];
  }
  function originalValue(node, current, store) {
    let entry = store.get(node);
    if (!entry || current !== entry.applied) entry = {source: current, applied: current};
    store.set(node, entry);
    return entry;
  }
  function textRun(nodes, source) {
    const entries = nodes.map(node => originalValue(node, node.data, originals));
    const text = entries.map(entry => entry.source).join('');
    const output = translate(text, source);
    // Preserve individual source nodes so switching back restores the exact original.
    nodes.forEach((node, index) => {
      const value = language === source ? entries[index].source : index === 0 ? output : '';
      if (node.data !== value) node.data = value;
      entries[index].applied = value;
    });
  }
  function visit(element, inheritedSource) {
    if (element.nodeType !== 1) return;
    const source = element.dataset.sourceLang || inheritedSource;
    if (element.matches('[translate="no"],[data-no-translate]')) return;
    let values = attributes.get(element);
    if (!values) { values = new Map(); attributes.set(element, values); }
    for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
      if (!element.hasAttribute(name)) continue;
      const entry = originalValue(name, element.getAttribute(name), values);
      const output = translate(entry.source, source);
      if (element.getAttribute(name) !== output) element.setAttribute(name, output);
      entry.applied = output;
    }
    if (element.matches('code[data-localize-code]')) {
      const entry = originalValue(element, element.textContent, codeOriginals);
      const output = language === source ? entry.source : window.RAG_CODE_TRANSLATIONS?.[source]?.[entry.source] ?? entry.source;
      if (element.textContent !== output) element.textContent = output;
      entry.applied = output;
      element.lang = language;
      return;
    }
    if (element.matches(skip) && !(element.matches('pre') && element.querySelector('code[data-localize-code]'))) return;
    let run = [];
    const flush = () => { if (run.length) textRun(run, source); run = []; };
    for (const child of element.childNodes) {
      if (child.nodeType === 3) run.push(child);
      else { flush(); visit(child, source); }
    }
    flush();
  }
  function localizedHref(href) {
    const url = new URL(href, location.href);
    if (url.origin === location.origin && /\/(?:index|basics)\.html$|\/$/.test(url.pathname)) url.searchParams.set('lang', language);
    return url.href;
  }
  const observer = new MutationObserver(refresh);
  function refresh() {
    observer.disconnect();
    visit(document.documentElement, sourceLanguage);
    document.documentElement.lang = language;
    document.querySelectorAll('[data-source-lang][lang]').forEach(element => { element.lang = language; });
    document.querySelectorAll('[data-language-select]').forEach(select => { select.value = language; });
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href.startsWith('#') || link.hasAttribute('download')) return;
      const localized = localizedHref(href);
      if (link.href !== localized) link.href = localized;
    });
    observer.observe(document.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['aria-label','title','placeholder','alt']});
  }
  function setLanguage(next, announce = true) {
    if (!supported.includes(next)) return;
    language = next;
    try { localStorage.setItem(storageKey, language); } catch {}
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    try { history.replaceState(history.state, '', url.href); } catch {}
    refresh();
    if (announce) document.getElementById('language-status').textContent = language === 'es' ? 'Idioma actualizado.' : 'Language updated.';
  }
  document.querySelectorAll('[data-language-select]').forEach(select => {
    select.addEventListener('change', () => setLanguage(select.value));
  });
  window.RAGLanguage = {set: setLanguage, refresh, translate, href: localizedHref, get current() { return language; }};
  setLanguage(language, false);
})();
