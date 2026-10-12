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

const StateManager = {
  setLoading(loading, message = 'Correction...') {
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
