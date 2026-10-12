// Logique de sélection des corrections (web/corrector.js) : ce qui n'est pas
// signalé est appliqué d'office, une erreur ici corrompt le texte de l'utilisateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadCorrector({ errors, nativeGuesses = {}, englishWords = [] }) {
  const source = readFileSync(new URL('../web/corrector.js', import.meta.url), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(`${source}\nglobalThis.Corrector = Corrector;`, context);

  const corrector = context.Corrector;
  corrector.ready = Promise.resolve();
  corrector.analyze = async () => structuredClone(errors);
  corrector.fetchSpellingInfo = async (words) => words.map(word => ({
    guesses: nativeGuesses[word] ?? [],
    english: englishWords.includes(word),
  }));
  return corrector;
}

function grammar(text, original, suggestions, groupId, from = 0) {
  const start = text.indexOf(original, from);
  return { kind: 'grammar', start, end: start + original.length, suggestions, message: '', ruleId: 'R', groupId };
}

function spelling(text, original, suggestions = []) {
  const start = text.indexOf(original);
  return { kind: 'spelling', start, end: start + original.length, suggestions, message: '', ruleId: 'SPELLING', groupId: null };
}

test('garde une seule alternative par accord', async () => {
  const text = 'Ils mange une pomme.';
  const corrector = loadCorrector({
    errors: [grammar(text, 'mange', ['mangent'], '0.0:#10500'), grammar(text, 'Ils', ['Il'], '0.0:#10500')],
  });

  const result = await corrector.correct(text, []);

  assert.equal(result.correctedText, 'Ils mangent une pomme.');
});

test('applique la même règle dans deux phrases distinctes', async () => {
  const text = 'Ils mange. Ils mange.';
  const corrector = loadCorrector({
    errors: [
      grammar(text, 'mange', ['mangent'], '0.0:#10500'),
      grammar(text, 'mange', ['mangent'], '0.11:#10500', 11),
    ],
  });

  const result = await corrector.correct(text, []);

  assert.equal(result.correctedText, 'Ils mangent. Ils mangent.');
});

test('écarte une correction qui chevauche la précédente', async () => {
  const text = 'Malgré que il pleuvait.';
  const corrector = loadCorrector({
    errors: [grammar(text, 'Malgré que', ['Bien que'], 'a'), grammar(text, 'que il', ["qu'il"], 'b')],
  });

  const result = await corrector.correct(text, []);

  assert.equal(result.correctedText, 'Bien que il pleuvait.');
  assert.equal(result.corrections.length, 1);
});

test('ignore les mots du dictionnaire personnel, sans tenir compte de la casse', async () => {
  const text = 'Kévin est là.';
  const corrector = loadCorrector({ errors: [spelling(text, 'Kévin', ['Kevin'])] });

  const result = await corrector.correct(text, ['kévin']);

  assert.equal(result.correctedText, text);
});

test('place les suggestions natives de macOS devant celles de Grammalecte', async () => {
  const text = 'Je suis fatiqué.';
  const corrector = loadCorrector({
    errors: [spelling(text, 'fatiqué', ['phatique', 'fatigué'])],
    nativeGuesses: { 'fatiqué': ['fatigué'] },
  });

  const result = await corrector.correct(text, []);

  assert.equal(result.correctedText, 'Je suis fatigué.');
});

test('signale sans le modifier un mot inconnu sans suggestion', async () => {
  const text = 'Le kubectl tourne.';
  const corrector = loadCorrector({ errors: [spelling(text, 'kubectl')] });

  const result = await corrector.correct(text, []);

  assert.equal(result.correctedText, text);
  assert.equal(result.corrections.length, 1);
  assert.equal(result.corrections[0].flagged, true);
});

async function correctOneWord(text, word, suggestions, options = {}) {
  const corrector = loadCorrector({ errors: [spelling(text, word, suggestions)], ...options });
  return corrector.correct(text, []);
}

test('remplace une faute qui ne diffère que par les accents', async () => {
  const result = await correctOneWord('Il est tres tard.', 'tres', ['très']);
  assert.equal(result.correctedText, 'Il est très tard.');
  assert.equal(result.corrections[0].flagged, false);
});

test('remplace une inversion de deux lettres', async () => {
  const result = await correctOneWord('Une belle maisno.', 'maisno', ['maison']);
  assert.equal(result.correctedText, 'Une belle maison.');
});

test('accepte la majuscule en début de phrase', async () => {
  const result = await correctOneWord('Fin. Tres bien.', 'Tres', ['Très']);
  assert.equal(result.correctedText, 'Fin. Très bien.');
});

const KEPT_AS_IS = [
  ['suggestion éloignée', 'On lance le cron.', 'cron', ['Crau']],
  ['majuscule hors début de phrase', 'Le webhook Slack répond.', 'Slack', ['Clac']],
  ['majuscule interne', "L'API GraphQL répond.", 'GraphQL', ['Graphe']],
  ['chiffre dans le mot', 'Le serveur pgbouncer2 tombe.', 'pgbouncer2', ['pgbouncer']],
  ['mot court', 'On utilise npm ici.', 'npm', ['nom']],
];

for (const [reason, text, word, suggestions] of KEPT_AS_IS) {
  test(`signale sans remplacer : ${reason}`, async () => {
    const result = await correctOneWord(text, word, suggestions);
    assert.equal(result.correctedText, text);
    assert.equal(result.corrections[0].flagged, true);
    assert.deepEqual([...result.corrections[0].suggestions], suggestions);
  });
}

test('corrige les accents même si le mot existe en anglais', async () => {
  const result = await correctOneWord('Il est tres tard.', 'tres', ['très'], { englishWords: ['tres'] });
  assert.equal(result.correctedText, 'Il est très tard.');
});

test('signale un mot anglais même proche d\'un mot français', async () => {
  const result = await correctOneWord('Le payload part.', 'payload', ['paylord'], { englishWords: ['payload'] });
  assert.equal(result.correctedText, 'Le payload part.');
  assert.equal(result.corrections[0].flagged, true);
});

test('expose les positions dans le texte original', async () => {
  const text = 'Les enfant jouent.';
  const corrector = loadCorrector({ errors: [grammar(text, 'enfant', ['enfants'], 'g')] });

  const [correction] = (await corrector.correct(text, [])).corrections;

  assert.deepEqual(
    { offset: correction.offset, length: correction.length, original: correction.original, replacement: correction.replacement },
    { offset: 4, length: 6, original: 'enfant', replacement: 'enfants' },
  );
});
