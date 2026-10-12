/**
 * Corrector : pilote le Worker Grammalecte et transforme ses erreurs en
 * corrections (une suggestion par erreur, sans conflit).
 *
 * Les suggestions orthographiques de Grammalecte sont faibles ("fatiqué" →
 * "phatique") : on place devant celles du correcteur natif de macOS.
 *
 * Un mot inconnu n'est remplacé d'office que si la suggestion en est une
 * variante évidente (accents, une lettre). Sinon c'est souvent du jargon ou
 * un nom propre ("cron" → "Crau") : il est seulement signalé, intact.
 */

const MIN_TYPO_WORD_LENGTH = 4;
const SENTENCE_END = /(^|[.!?…:]\s*|\n\s*)$/;

const Corrector = {
  worker: null,
  ready: null,
  pending: new Map(),
  nextId: 1,
  fetchSpellingInfo: null,

  /**
   * @param {(words: string[]) => Promise<Array<{guesses: string[], english: boolean}>>} fetchSpellingInfo
   * @returns {Promise<void>} résolue quand le moteur est chargé
   */
  start(fetchSpellingInfo) {
    this.fetchSpellingInfo = fetchSpellingInfo;
    this.worker = new Worker('engine-worker.js');

    this.ready = new Promise((resolve, reject) => {
      this.worker.onerror = (event) => {
        const error = new Error(event.message || 'Moteur indisponible');
        reject(error);
        // Sans ça, une correction en cours resterait bloquée sur « Correction... ».
        for (const request of this.pending.values()) request.reject(error);
        this.pending.clear();
      };
      this.worker.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'ready') {
          resolve();
        } else if (data.type === 'init-error') {
          reject(new Error(data.message));
        } else {
          this.settle(data);
        }
      };
    });

    return this.ready;
  },

  settle({ id, errors, error }) {
    const request = this.pending.get(id);
    if (!request) return;
    this.pending.delete(id);
    if (error) {
      request.reject(new Error(error));
    } else {
      request.resolve(errors);
    }
  },

  analyze(text) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, text });
    });
  },

  /**
   * @param {string} text texte normalisé NFC
   * @param {string[]} ignoredWords dictionnaire personnel
   * @returns {Promise<{corrections: Array, correctedText: string}>}
   */
  async correct(text, ignoredWords) {
    await this.ready;
    const ignored = new Set(ignoredWords.map(word => word.toLowerCase()));

    const errors = (await this.analyze(text))
      .filter(error => !ignored.has(text.slice(error.start, error.end).toLowerCase()));

    await this.addSpellingInfo(text, errors);

    const corrections = this.selectApplicable(errors).map(error => {
      const original = text.slice(error.start, error.end);
      const flagged = error.kind === 'spelling' && !this.isObviousTypo(text, error);
      return {
        offset: error.start,
        length: error.end - error.start,
        original,
        replacement: flagged ? original : error.suggestions[0],
        suggestions: error.suggestions,
        flagged,
        message: error.message,
        ruleId: error.ruleId,
      };
    });

    return { corrections, correctedText: this.apply(text, corrections) };
  },

  async addSpellingInfo(text, errors) {
    const spelling = errors.filter(error => error.kind === 'spelling');
    if (spelling.length === 0) return;

    const words = [...new Set(spelling.map(error => text.slice(error.start, error.end)))];
    const infos = await this.fetchSpellingInfo(words);
    const infoByWord = new Map(words.map((word, i) => [word, infos[i]]));

    for (const error of spelling) {
      const info = infoByWord.get(text.slice(error.start, error.end));
      error.suggestions = [...new Set([...info.guesses, ...error.suggestions])];
      error.english = info.english;
    }
  },

  /**
   * Faute de frappe évidente sur un mot français : seul cas où un mot
   * inconnu est remplacé sans validation.
   */
  isObviousTypo(text, error) {
    const word = text.slice(error.start, error.end);
    const suggestion = error.suggestions[0];

    if (!suggestion) return false;
    if (/\d/.test(word) || /.\p{Lu}/u.test(word)) return false;
    if (/^\p{Lu}/u.test(word) && !SENTENCE_END.test(text.slice(0, error.start))) return false;
    if (/^\p{Lu}/u.test(word) !== /^\p{Lu}/u.test(suggestion)) return false;

    // Avant le test de l'anglais : "tres" figure dans le dictionnaire anglais.
    if (stripAccents(word.toLowerCase()) === stripAccents(suggestion.toLowerCase())) return true;
    if (error.english) return false;
    return word.length >= MIN_TYPO_WORD_LENGTH && isOneEditAway(word.toLowerCase(), suggestion.toLowerCase());
  },

  /**
   * Une seule alternative par accord, pas de chevauchement. Un mot inconnu
   * sans suggestion est gardé : il sera signalé.
   */
  selectApplicable(errors) {
    const seenGroups = new Set();
    const candidates = errors.filter(error => {
      if (error.suggestions.length === 0 && error.kind !== 'spelling') return false;
      if (error.groupId === null) return true;
      if (seenGroups.has(error.groupId)) return false;
      seenGroups.add(error.groupId);
      return true;
    });

    const selected = [];
    let lastEnd = -1;
    for (const error of candidates.sort((a, b) => a.start - b.start)) {
      if (error.start >= lastEnd) {
        selected.push(error);
        lastEnd = error.end;
      }
    }
    return selected;
  },

  apply(text, corrections) {
    const parts = [];
    let cursor = 0;
    for (const correction of corrections) {
      parts.push(text.slice(cursor, correction.offset), correction.replacement);
      cursor = correction.offset + correction.length;
    }
    parts.push(text.slice(cursor));
    return parts.join('');
  },
};

function stripAccents(word) {
  return word.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Substitution, insertion, suppression ou inversion de deux lettres voisines. */
function isOneEditAway(a, b) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;

  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;

  if (a.length === b.length) {
    const swapped = a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
    return swapped || a.slice(i + 1) === b.slice(i + 1);
  }
  const [longer, shorter] = a.length > b.length ? [a, b] : [b, a];
  return longer.slice(i + 1) === shorter.slice(i);
}
