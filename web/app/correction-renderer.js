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
        parts.push(escapeHtml(text.slice(lastIndex, correction.correctedOffset)));
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
        `data-tip="${escapeAttr(tip)}" ` +
        `data-message="${escapeAttr(correction.message)}" ` +
        `tabindex="0" ` +
        `role="button" ` +
        `aria-label="${escapeAttr(label)}">` +
        `${escapeHtml(correctedWord)}` +
        `</span>`
      );

      lastIndex = correction.correctedOffset + correction.replacement.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(escapeHtml(text.slice(lastIndex)));
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
};
