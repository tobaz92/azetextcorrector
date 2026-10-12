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
        <span class="word-text">${escapeHtml(word)}</span>
        <button class="word-delete" data-word="${escapeAttr(word)}" title="Supprimer">
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
};
