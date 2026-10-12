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
