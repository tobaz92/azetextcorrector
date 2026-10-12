/**
 * azeTextCorrector frontend: shared constants, DOM handles and state.
 *
 * The app/ files are classic scripts loaded in order by index.html and
 * share one global scope (no bundler): this one must come first.
 */

// Tauri 2.x: capture invoke and remove global exposure
const { invoke } = window.__TAURI__.core;
delete window.__TAURI__;

const MAX_TOAST_DURATION = 4000;
const CHAR_COUNT_THRESHOLD = 100000;
const MAX_MENU_SUGGESTIONS = 3;

const elements = {
  // Input pane
  input: document.getElementById('input'),
  clearInput: document.getElementById('clear-input'),

  // Output pane
  output: document.getElementById('output'),
  outputPlaceholder: document.getElementById('output-placeholder'),
  copyOutput: document.getElementById('copy-output'),

  // Loading/Error states
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingMessage: document.getElementById('loading-message'),
  errorState: document.getElementById('error-state'),
  errorMessage: document.getElementById('error-message'),
  retryBtn: document.getElementById('retry-btn'),

  // Footer
  status: document.getElementById('status'),
  charCount: document.getElementById('char-count'),

  // Context menu
  contextMenu: document.getElementById('context-menu'),
  contextSuggestions: document.getElementById('context-suggestions'),
  contextRevert: document.querySelector('#context-menu [data-action="revert"]'),

  // Dictionary panel
  toggleDictionary: document.getElementById('toggle-dictionary'),
  dictionaryPanel: document.getElementById('dictionary-panel'),
  closePanel: document.getElementById('close-panel'),
  newWord: document.getElementById('new-word'),
  addWordBtn: document.getElementById('add-word-btn'),
  wordList: document.getElementById('word-list'),
  wordCount: document.getElementById('word-count'),

  // Toast
  toastContainer: document.getElementById('toast-container'),
};

const state = {
  /** @type {Array<{offset: number, length: number, original: string, replacement: string, suggestions: string[], flagged: boolean, message: string, ruleId: string}>} */
  corrections: [],

  /** @type {string} */
  correctedText: '',

  /** @type {boolean} */
  isProcessing: false,

  /** @type {boolean} */
  engineReady: false,

  /** @type {string[]} */
  dictionary: [],
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** For double-quoted attributes; & first, or "&quot;" in a word would decode. */
function escapeAttr(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
}
