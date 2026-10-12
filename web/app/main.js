function setupWindowEvents() {
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
}

function setupEditorEvents() {
  elements.input.addEventListener('input', () => Editor.updateCharCount());
  elements.clearInput.addEventListener('click', () => Editor.clear());
  elements.copyOutput.addEventListener('click', () => Editor.copyOutput());
  elements.retryBtn.addEventListener('click', () => Editor.correct());
}

function setupDictionaryEvents() {
  elements.toggleDictionary.addEventListener('click', () => DictionaryManager.toggle());
  elements.closePanel.addEventListener('click', () => DictionaryManager.close());
  elements.addWordBtn.addEventListener('click', () => DictionaryManager.addWord());

  elements.newWord.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      DictionaryManager.addWord();
    }
  });
}

function setupContextMenuEvents() {
  // Delegated: suggestion buttons are rebuilt on each opening
  elements.contextMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.context-item');
    if (item) ContextMenu.handleAction(item.dataset.action, item.dataset.replacement);
  });

  document.addEventListener('click', (e) => {
    if (!elements.contextMenu.contains(e.target) && !e.target.closest('.correction')) {
      ContextMenu.hide();
    }
  });

  elements.contextMenu.addEventListener('keydown', (e) => {
    const items = [...elements.contextMenu.querySelectorAll('.context-item:not(.hidden)')];
    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      document.activeElement?.click();
    }
  });
}

/** @returns {boolean} true if the key was a global shortcut */
function handleGlobalShortcut(e) {
  const command = e.metaKey || e.ctrlKey;

  if (e.key === 'Escape') {
    ContextMenu.hide();
    DictionaryManager.close();
  } else if (command && e.key === 'Enter') {
    e.preventDefault();
    Editor.correct();
  } else if (command && e.shiftKey && e.key.toLowerCase() === 'c') {
    // Leave ⌘⇧C alone while text is selected in the input
    if (document.activeElement !== elements.input || !elements.input.selectionStart) {
      e.preventDefault();
      Editor.copyOutput();
    }
  } else if (command && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    DictionaryManager.toggle();
  } else {
    return false;
  }
  return true;
}

function handleContextMenuKey(e) {
  const key = e.key.toLowerCase();

  if (key === 'i') {
    e.preventDefault();
    ContextMenu.handleAction('ignore');
  } else if (key === 'r') {
    e.preventDefault();
    ContextMenu.handleAction('revert');
  } else if (/^[1-9]$/.test(key)) {
    const suggestion = elements.contextSuggestions.querySelectorAll('.context-suggestion')[Number(key) - 1];
    if (suggestion) {
      e.preventDefault();
      suggestion.click();
    }
  }
}

function setupShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (handleGlobalShortcut(e)) return;
    if (!elements.contextMenu.classList.contains('hidden')) handleContextMenuKey(e);
  });
}

async function init() {
  startEngine();

  setupWindowEvents();
  setupEditorEvents();
  setupDictionaryEvents();
  setupContextMenuEvents();
  setupShortcuts();

  await DictionaryManager.init();
  Editor.updateCharCount();
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

init().catch(console.error);
