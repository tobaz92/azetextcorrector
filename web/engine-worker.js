/**
 * Moteur de correction : Grammalecte (GPL v3) exécuté dans un Web Worker,
 * pour que l'analyse d'un long texte ne fige pas l'interface.
 *
 * Messages reçus  : { id, text }
 * Messages émis   : { type: 'ready' } | { type: 'init-error', message }
 *                   { id, errors } | { id, error }
 */

const ROOT = 'grammalecte/';

importScripts(
  ROOT + 'graphspell/helpers.js',
  ROOT + 'graphspell/str_transform.js',
  ROOT + 'graphspell/char_player.js',
  ROOT + 'graphspell/lexgraph_fr.js',
  ROOT + 'graphspell/ibdawg.js',
  ROOT + 'graphspell/spellchecker.js',
  ROOT + 'text.js',
  ROOT + 'graphspell/tokenizer.js',
  ROOT + 'fr/conj.js',
  ROOT + 'fr/mfsp.js',
  ROOT + 'fr/phonet.js',
  ROOT + 'fr/cregex.js',
  ROOT + 'fr/gc_options.js',
  ROOT + 'fr/gc_functions.js',
  ROOT + 'fr/gc_rules.js',
  ROOT + 'fr/gc_rules_graph.js',
  ROOT + 'fr/gc_engine.js',
);

// Les corrections sont appliquées d'office, sans validation : on coupe les
// règles qui réécrivent un texte correct (guillemets et apostrophes droits →
// typographiques, "10000" → "10 000") ou qui en changent le sens
// ("31 février" → "28 février").
const DISABLED_OPTIONS = new Map([['typo', false], ['apos', false], ['num', false], ['date', false]]);
const MAX_SPELLING_SUGGESTIONS = 3;

let spellChecker = null;

function loadData(path) {
  const content = helpers.loadFile(ROOT + path);
  if (content === null) {
    throw new Error(`Fichier du moteur introuvable : ${path}`);
  }
  return content;
}

function initEngine() {
  conj.init(loadData('fr/conj_data.json'));
  phonet.init(loadData('fr/phonet_data.json'));
  mfsp.init(loadData('fr/mfsp_data.json'));

  // gc_engine.load() journalise ses erreurs sans les propager : on vérifie le résultat.
  gc_engine.load('JavaScript', 'aHSL', ROOT + 'graphspell/_dictionaries');
  spellChecker = gc_engine.getSpellChecker();
  if (!spellChecker || !spellChecker.oMainDic) {
    throw new Error('Dictionnaire français non chargé');
  }
  gc_engine.setOptions(DISABLED_OPTIONS);
}

function spellingSuggestions(word) {
  const suggestions = [];
  for (const group of spellChecker.suggest(word, MAX_SPELLING_SUGGESTIONS)) {
    suggestions.push(...group);
  }
  return suggestions.slice(0, MAX_SPELLING_SUGGESTIONS);
}

function grammarError(error, paragraphStart, groupId) {
  return {
    kind: 'grammar',
    start: paragraphStart + error.nStart,
    end: paragraphStart + error.nEnd,
    message: error.sMessage,
    suggestions: error.aSuggestions,
    ruleId: error.sRuleId,
    groupId,
  };
}

function checkParagraph(paragraph, paragraphStart) {
  const errors = [];

  // Les corrections alternatives d'un même accord ("Ils mange" : Ils→Il ou
  // mange→mangent) partagent le sLineId de leur règle, au sein d'une phrase.
  // Le mode détaillé (dernier argument) donne le découpage en phrases.
  const [paragraphErrors, sentences] = gc_engine.parse(paragraph, 'FR', false, null, false, true);

  for (const error of paragraphErrors) {
    errors.push(grammarError(error, paragraphStart, `${paragraphStart}:${error.sLineId}`));
  }
  for (const sentence of sentences) {
    for (const error of sentence.lGrammarErrors) {
      errors.push(grammarError(error, paragraphStart, `${paragraphStart}.${sentence.nStart}:${error.sLineId}`));
    }
  }

  for (const token of spellChecker.parseParagraph(paragraph)) {
    errors.push({
      kind: 'spelling',
      start: paragraphStart + token.nStart,
      end: paragraphStart + token.nEnd,
      message: 'Mot inconnu du dictionnaire',
      suggestions: spellingSuggestions(token.sValue),
      ruleId: 'SPELLING',
      groupId: null,
    });
  }

  return errors;
}

function check(text) {
  const errors = [];
  let paragraphStart = 0;

  for (const paragraph of text.split('\n')) {
    if (paragraph.trim()) {
      errors.push(...checkParagraph(paragraph, paragraphStart));
    }
    paragraphStart += paragraph.length + 1;
  }

  return errors;
}

try {
  initEngine();
  postMessage({ type: 'ready' });
} catch (error) {
  postMessage({ type: 'init-error', message: String(error && error.message || error) });
}

onmessage = (event) => {
  const { id, text } = event.data;
  try {
    postMessage({ id, errors: check(text) });
  } catch (error) {
    postMessage({ id, error: String(error && error.message || error) });
  }
};
