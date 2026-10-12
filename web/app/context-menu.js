const ContextMenu = {
  currentIndex: null,

  show(x, y, correctionIndex) {
    this.currentIndex = correctionIndex;

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
      <button class="context-item context-suggestion" data-action="replace" data-replacement="${escapeAttr(suggestion)}" role="menuitem">
        <span>${escapeHtml(suggestion)}</span>
        <kbd>${i + 1}</kbd>
      </button>
    `).join('');
    elements.contextSuggestions.classList.toggle('hidden', suggestions.length === 0);
    elements.contextRevert.classList.toggle('hidden', flagged);
  },

  hide() {
    elements.contextMenu.classList.add('hidden');
    this.currentIndex = null;

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
