/**
 * azeTextCorrector - Frontend JavaScript
 *
 * Architecture:
 * - Editor: Main text input/output management
 * - CorrectionRenderer: Renders corrections with interactive highlights
 * - ContextMenu: Right-click menu for correction actions
 * - DictionaryManager: Personal dictionary panel
 * - StateManager: Loading/error states
 * - ToastManager: Notifications
 */

// Tauri 2.x: capture invoke and remove global exposure
const { invoke } = window.__TAURI__.core;
delete window.__TAURI__;

// ============================================================================
// Constants
// ============================================================================

const MAX_TOAST_DURATION = 4000;
const CHAR_COUNT_THRESHOLD = 100000;
const MAX_MENU_SUGGESTIONS = 3;

// ============================================================================
// DOM Elements
// ============================================================================

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

// ============================================================================
// State
// ============================================================================

const state = {
  /** @type {string} */
  originalText: '',

  /** @type {Array<{offset: number, length: number, original: string, replacement: string, message: string, ruleId: string}>} */
  corrections: [],

  /** @type {string} */
  correctedText: '',

  /** @type {boolean} */
  isLoading: false,

  /** @type {boolean} */
  isProcessing: false,

  /** @type {boolean} */
  engineReady: false,

  /** @type {number|null} */
  selectedCorrectionIndex: null,

  /** @type {string[]} */
  dictionary: [],
};

// ============================================================================
// Toast Manager
// ============================================================================

const ToastManager = {
  /**
   * Show a toast notification
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   */
  show(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');

    elements.toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-remove
    setTimeout(() => {
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 300);
    }, MAX_TOAST_DURATION);
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error');
  },

  info(message) {
    this.show(message, 'info');
  },
};

// ============================================================================
// State Manager
// ============================================================================

const StateManager = {
  setLoading(loading, message = 'Correction...') {
    state.isLoading = loading;

    if (loading) {
      elements.loadingOverlay.classList.remove('hidden');
      elements.loadingMessage.textContent = message;
      elements.errorState.classList.add('hidden');
      elements.status.textContent = 'correction...';
      elements.status.className = 'status loading';
    } else {
      elements.loadingOverlay.classList.add('hidden');
    }
  },

  setError(error) {
    elements.loadingOverlay.classList.add('hidden');
    elements.errorState.classList.remove('hidden');
    elements.errorMessage.textContent = error || 'Une erreur s\'est produite.';
    elements.status.textContent = 'erreur';
    elements.status.className = 'status error';
  },

  clearError() {
    elements.errorState.classList.add('hidden');
  },

  setReady() {
    elements.status.textContent = 'prêt';
    elements.status.className = 'status';
  },

  setDone(corrections) {
    const flagged = corrections.filter(c => c.flagged).length;
    const applied = corrections.length - flagged;
    const parts = [];
    if (applied > 0) parts.push(`${applied} correction${applied > 1 ? 's' : ''}`);
    if (flagged > 0) parts.push(`${flagged} à vérifier`);
    elements.status.textContent = parts.length > 0 ? parts.join(', ') : 'aucune erreur';
    elements.status.className = 'status done';
  },
};

// ============================================================================
// Correction Renderer
// ============================================================================

const CorrectionRenderer = {
  /**
   * Render the corrected text with highlighted corrections
   */
  render() {
    if (!state.correctedText) {
      elements.output.innerHTML = '';
      elements.outputPlaceholder.classList.remove('hidden');
      return;
    }

    elements.outputPlaceholder.classList.add('hidden');

    if (state.corrections.length === 0) {
      // No corrections, just show plain text
      elements.output.textContent = state.correctedText;
      return;
    }

    // Build HTML with correction highlights
    const html = this.buildHighlightedHtml();
    elements.output.innerHTML = html;

    // Attach event listeners to correction spans
    this.attachCorrectionListeners();
  },

  /**
   * Build HTML with correction highlights
   * @returns {string}
   */
  buildHighlightedHtml() {
    const text = state.correctedText;
    const parts = [];
    let lastIndex = 0;

    // Sort corrections by their position in the corrected text
    const sortedCorrections = this.calculateCorrectedPositions();

    for (const correction of sortedCorrections) {
      // Add text before this correction
      if (correction.correctedOffset > lastIndex) {
        parts.push(this.escapeHtml(text.slice(lastIndex, correction.correctedOffset)));
      }

      // Add the correction highlight
      const correctedWord = text.slice(
        correction.correctedOffset,
        correction.correctedOffset + correction.replacement.length
      );

      const tip = correction.flagged ? 'Mot inconnu, laissé tel quel' : correction.original;
      const label = correction.flagged
        ? `Mot inconnu : ${correction.original}`
        : `Correction : ${correction.original} remplacé par ${correctedWord}`;

      parts.push(
        `<span class="correction${correction.flagged ? ' flagged' : ''}" ` +
        `data-index="${correction.index}" ` +
        `data-tip="${this.escapeAttr(tip)}" ` +
        `data-message="${this.escapeAttr(correction.message)}" ` +
        `tabindex="0" ` +
        `role="button" ` +
        `aria-label="${this.escapeAttr(label)}">` +
        `${this.escapeHtml(correctedWord)}` +
        `</span>`
      );

      lastIndex = correction.correctedOffset + correction.replacement.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(this.escapeHtml(text.slice(lastIndex)));
    }

    return parts.join('');
  },

  /**
   * Calculate positions of corrections in the corrected text
   * @returns {Array}
   */
  calculateCorrectedPositions() {
    const result = [];
    let offset = 0;

    // Sort by original offset
    const sorted = [...state.corrections]
      .map((c, i) => ({ ...c, index: i }))
      .sort((a, b) => a.offset - b.offset);

    for (const correction of sorted) {
      const correctedOffset = correction.offset + offset;
      result.push({
        ...correction,
        correctedOffset,
      });

      // Update offset for next correction
      offset += correction.replacement.length - correction.length;
    }

    return result.sort((a, b) => a.correctedOffset - b.correctedOffset);
  },

  /**
   * Attach event listeners to correction spans
   */
  attachCorrectionListeners() {
    const spans = elements.output.querySelectorAll('.correction');

    spans.forEach(span => {
      // Click to show context menu
      span.addEventListener('click', (e) => {
        e.preventDefault();
        const index = parseInt(span.dataset.index, 10);
        ContextMenu.show(e.clientX, e.clientY, index);
      });

      // Right-click
      span.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const index = parseInt(span.dataset.index, 10);
        ContextMenu.show(e.clientX, e.clientY, index);
      });

      // Keyboard navigation
      span.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const rect = span.getBoundingClientRect();
          const index = parseInt(span.dataset.index, 10);
          ContextMenu.show(rect.left, rect.bottom, index);
        }
      });
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
};

// ============================================================================
// Context Menu
// ============================================================================

const ContextMenu = {
  currentIndex: null,

  show(x, y, correctionIndex) {
    this.currentIndex = correctionIndex;
    state.selectedCorrectionIndex = correctionIndex;

    const menu = elements.contextMenu;
    this.renderSuggestions(state.corrections[correctionIndex]);
    menu.classList.remove('hidden');

    // Position the menu
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = x;
    let top = y;

    // Adjust if menu would go off-screen
    if (left + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 8;
    }
    if (top + menuRect.height > viewportHeight) {
      top = viewportHeight - menuRect.height - 8;
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    // Focus first item
    const firstItem = menu.querySelector('.context-item');
    if (firstItem) firstItem.focus();

    // Highlight the correction
    const spans = elements.output.querySelectorAll('.correction');
    spans.forEach(span => span.classList.remove('active'));
    const activeSpan = elements.output.querySelector(`[data-index="${correctionIndex}"]`);
    if (activeSpan) activeSpan.classList.add('active');
  },

  /** Propositions de remplacement, uniquement pour un mot signalé. */
  renderSuggestions(correction) {
    const flagged = Boolean(correction?.flagged);
    const suggestions = flagged ? correction.suggestions.slice(0, MAX_MENU_SUGGESTIONS) : [];

    elements.contextSuggestions.innerHTML = suggestions.map((suggestion, i) => `
      <button class="context-item context-suggestion" data-action="replace" data-replacement="${CorrectionRenderer.escapeAttr(suggestion)}" role="menuitem">
        <span>${CorrectionRenderer.escapeHtml(suggestion)}</span>
        <kbd>${i + 1}</kbd>
      </button>
    `).join('');
    elements.contextSuggestions.classList.toggle('hidden', suggestions.length === 0);
    elements.contextRevert.classList.toggle('hidden', flagged);
  },

  hide() {
    elements.contextMenu.classList.add('hidden');
    this.currentIndex = null;
    state.selectedCorrectionIndex = null;

    // Remove highlight
    const spans = elements.output.querySelectorAll('.correction');
    spans.forEach(span => span.classList.remove('active'));
  },

  async handleAction(action, replacement) {
    if (this.currentIndex === null) return;

    const correction = state.corrections[this.currentIndex];
    if (!correction) return;

    switch (action) {
      case 'ignore':
        await this.ignoreWord(correction.original);
        break;
      case 'revert':
        if (!correction.flagged) this.revertCorrection(this.currentIndex);
        break;
      case 'replace':
        if (correction.flagged) this.replaceFlagged(this.currentIndex, replacement);
        break;
      case 'copy':
        await this.copyCorrection(correction);
        break;
    }

    this.hide();
  },

  async ignoreWord(word) {
    try {
      await invoke('add_to_dictionary', { word });
      state.dictionary.push(word);
      DictionaryManager.render();
      ToastManager.success(`"${word}" ajouté au dictionnaire`);

      // Re-run correction to update
      await Editor.correct();
    } catch (error) {
      console.error('Failed to add word:', error);
      ToastManager.error('Impossible d\'ajouter le mot');
    }
  },

  /** Remplace, dans le texte corrigé, le texte affiché d'une correction. */
  rewriteCorrection(index, text) {
    const correction = state.corrections[index];
    const shift = state.corrections
      .filter(c => c.offset < correction.offset)
      .reduce((total, c) => total + c.replacement.length - c.length, 0);
    const start = correction.offset + shift;

    state.correctedText =
      state.correctedText.slice(0, start) +
      text +
      state.correctedText.slice(start + correction.replacement.length);
    correction.replacement = text;
  },

  revertCorrection(index) {
    this.rewriteCorrection(index, state.corrections[index].original);
    state.corrections.splice(index, 1);

    CorrectionRenderer.render();
    StateManager.setDone(state.corrections);
    ToastManager.info('Correction annulée');
  },

  replaceFlagged(index, replacement) {
    this.rewriteCorrection(index, replacement);
    state.corrections[index].flagged = false;

    CorrectionRenderer.render();
    StateManager.setDone(state.corrections);
  },

  async copyCorrection(correction) {
    const text = correction.replacement;
    try {
      await navigator.clipboard.writeText(text);
      ToastManager.success('Copié');
    } catch {
      ToastManager.error('Impossible de copier');
    }
  },
};

// ============================================================================
// Dictionary Manager
// ============================================================================

const DictionaryManager = {
  async init() {
    try {
      state.dictionary = await invoke('get_dictionary');
      this.render();
    } catch (error) {
      console.error('Failed to load dictionary:', error);
    }
  },

  toggle() {
    const isOpening = elements.dictionaryPanel.classList.contains('hidden');
    elements.dictionaryPanel.classList.toggle('hidden');
    document.body.classList.toggle('dictionary-open', isOpening);
    if (isOpening) {
      elements.newWord.focus();
    }
  },

  close() {
    elements.dictionaryPanel.classList.add('hidden');
    document.body.classList.remove('dictionary-open');
  },

  render() {
    const words = state.dictionary.sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    elements.wordList.innerHTML = words.map(word => `
      <li class="word-item">
        <span class="word-text">${this.escapeHtml(word)}</span>
        <button class="word-delete" data-word="${this.escapeAttr(word)}" title="Supprimer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </li>
    `).join('');

    // Update count
    const count = words.length;
    elements.wordCount.textContent = `${count} mot${count !== 1 ? 's' : ''}`;

    // Attach delete listeners
    elements.wordList.querySelectorAll('.word-delete').forEach(btn => {
      btn.addEventListener('click', () => this.removeWord(btn.dataset.word));
    });
  },

  async addWord() {
    const word = elements.newWord.value.trim();
    if (!word) return;

    try {
      await invoke('add_to_dictionary', { word });
      state.dictionary.push(word);
      this.render();
      elements.newWord.value = '';
      ToastManager.success(`"${word}" ajouté`);
    } catch (error) {
      console.error('Failed to add word:', error);
      ToastManager.error(error.message || 'Impossible d\'ajouter le mot');
    }
  },

  async removeWord(word) {
    try {
      await invoke('remove_from_dictionary', { word });
      state.dictionary = state.dictionary.filter(w =>
        w.toLowerCase() !== word.toLowerCase()
      );
      this.render();
      ToastManager.success(`"${word}" supprimé`);
    } catch (error) {
      console.error('Failed to remove word:', error);
      ToastManager.error('Impossible de supprimer le mot');
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
};

// ============================================================================
// Editor
// ============================================================================

const Editor = {
  async correct() {
    const text = elements.input.value.trim().normalize('NFC');

    if (!text) {
      state.originalText = '';
      state.corrections = [];
      state.correctedText = '';
      CorrectionRenderer.render();
      StateManager.setReady();
      return;
    }

    // Prevent multiple concurrent corrections (race condition fix)
    if (state.isProcessing) {
      ToastManager.info('Correction en cours...');
      return;
    }

    // Check text length
    if (text.length > CHAR_COUNT_THRESHOLD) {
      ToastManager.error('Texte trop long (max 100 000 caractères)');
      return;
    }

    state.originalText = text;
    state.isProcessing = true;
    StateManager.clearError();

    const loadingMessage = state.engineReady
      ? 'Correction...'
      : 'Chargement du moteur...';
    StateManager.setLoading(true, loadingMessage);

    try {
      const result = await Corrector.correct(text, state.dictionary);

      state.corrections = result.corrections;
      state.correctedText = result.correctedText;

      StateManager.setLoading(false);
      StateManager.setDone(state.corrections);
      CorrectionRenderer.render();

    } catch (error) {
      console.error('Correction failed:', error);
      StateManager.setLoading(false);
      StateManager.setError(
        typeof error === 'string' ? error : error.message || 'Erreur de correction'
      );
    } finally {
      state.isProcessing = false;
    }
  },

  async copyOutput() {
    if (!state.correctedText) {
      ToastManager.info('Rien à copier');
      return;
    }

    try {
      await navigator.clipboard.writeText(state.correctedText);
      ToastManager.success('Texte copié');
    } catch {
      ToastManager.error('Impossible de copier');
    }
  },

  clear() {
    elements.input.value = '';
    state.originalText = '';
    state.corrections = [];
    state.correctedText = '';
    CorrectionRenderer.render();
    StateManager.setReady();
    this.updateCharCount();
    elements.input.focus();
  },

  updateCharCount() {
    const count = elements.input.value.length;
    if (count > 0) {
      elements.charCount.textContent = `${count.toLocaleString('fr-FR')} car.`;

      if (count > CHAR_COUNT_THRESHOLD) {
        elements.charCount.classList.add('warning');
      } else {
        elements.charCount.classList.remove('warning');
      }
    } else {
      elements.charCount.textContent = '';
    }
  },
};

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
  // Input events
  elements.input.addEventListener('input', () => {
    Editor.updateCharCount();
  });

  elements.clearInput.addEventListener('click', () => {
    Editor.clear();
  });

  // Output events
  elements.copyOutput.addEventListener('click', () => {
    Editor.copyOutput();
  });

  // Retry button
  elements.retryBtn.addEventListener('click', () => {
    Editor.correct();
  });

  // Dictionary panel
  elements.toggleDictionary.addEventListener('click', () => {
    DictionaryManager.toggle();
  });

  elements.closePanel.addEventListener('click', () => {
    DictionaryManager.close();
  });

  elements.addWordBtn.addEventListener('click', () => {
    DictionaryManager.addWord();
  });

  elements.newWord.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      DictionaryManager.addWord();
    }
  });

  // Context menu actions (suggestion buttons are rebuilt on each opening)
  elements.contextMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.context-item');
    if (item) ContextMenu.handleAction(item.dataset.action, item.dataset.replacement);
  });

  // Close context menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.contextMenu.contains(e.target) &&
        !e.target.closest('.correction')) {
      ContextMenu.hide();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape: close menus
    if (e.key === 'Escape') {
      ContextMenu.hide();
      DictionaryManager.close();
      return;
    }

    // Cmd+Enter: correct
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      Editor.correct();
      return;
    }

    // Cmd+Shift+C: copy output
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
      // Only if not in a text field with selection
      const active = document.activeElement;
      if (active !== elements.input || !elements.input.selectionStart) {
        e.preventDefault();
        Editor.copyOutput();
      }
      return;
    }

    // Cmd+D: toggle dictionary
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      DictionaryManager.toggle();
      return;
    }

    // Context menu keyboard shortcuts when menu is open
    if (!elements.contextMenu.classList.contains('hidden')) {
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        ContextMenu.handleAction('ignore');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        ContextMenu.handleAction('revert');
      } else if (/^[1-9]$/.test(e.key)) {
        const suggestion = elements.contextSuggestions.querySelectorAll('.context-suggestion')[Number(e.key) - 1];
        if (suggestion) {
          e.preventDefault();
          suggestion.click();
        }
      }
    }
  });

  // Context menu keyboard navigation
  elements.contextMenu.addEventListener('keydown', (e) => {
    const items = [...elements.contextMenu.querySelectorAll('.context-item:not(.hidden)')];
    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[(currentIndex + 1) % items.length];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[(currentIndex - 1 + items.length) % items.length];
      prev?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      document.activeElement?.click();
    }
  });
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
  startEngine();

  // Setup event listeners
  setupEventListeners();

  // Load dictionary
  await DictionaryManager.init();

  // Update char count
  Editor.updateCharCount();

  // Focus input
  elements.input.focus();
}

async function startEngine() {
  elements.status.textContent = 'chargement...';
  elements.status.className = 'status loading';

  try {
    await Corrector.start(words => invoke('spelling_suggestions', { words }));
    state.engineReady = true;
    StateManager.setReady();
  } catch (error) {
    console.error('Grammar engine failed to start:', error);
    StateManager.setError(`Moteur de correction indisponible : ${error.message}`);
  }
}

// Start the app
init().catch(console.error);
