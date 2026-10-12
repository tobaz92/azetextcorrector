function setupEventListeners() {
  // macOS hides the traffic lights in fullscreen: the header drops their inset.
  const updateFullscreen = () => {
    document.body.classList.toggle('fullscreen',
      window.innerWidth === screen.width && window.innerHeight === screen.height);
  };
  window.addEventListener('resize', updateFullscreen);
  updateFullscreen();

  // WebKit copies a selection as styled HTML (font, colors, highlights),
  // which mail clients paste as is: keep plain text only.
  elements.output.addEventListener('copy', (e) => {
    e.preventDefault();
    e.clipboardData.setData('text/plain', window.getSelection().toString());
  });

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
