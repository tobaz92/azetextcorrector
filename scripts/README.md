# Scripts de build - azeTextCorrector

## Prérequis

- Rust (rustup), Node.js 18+
- `curl`, `unzip`, `shasum` (présents par défaut sur macOS)

`./scripts/check-env.sh` vérifie l'environnement.

## Scripts disponibles

### build-assets.sh

Télécharge l'extension Firefox officielle de Grammalecte (version figée,
empreinte SHA-256 vérifiée) et en extrait le moteur JavaScript et les données
françaises dans `web/grammalecte/` (~9 Mo, ignoré par git).

```bash
npm run build:assets
```

Pour changer de version : mettre à jour `GRAMMALECTE_VERSION`,
`GRAMMALECTE_URL` et `GRAMMALECTE_SHA256` en tête du script, puis relancer.

### build-production.sh

Build release pour une architecture (`--target aarch64-apple-darwin` par
défaut, ou `x86_64-apple-darwin`).

### Commandes npm

| Commande | Description |
|----------|-------------|
| `npm run build:assets` | Télécharge Grammalecte |
| `npm run build:macos` | Build complet (assets + Tauri) |
| `npm run dev` | Mode développement |
| `npm run clean:assets` | Supprime Grammalecte et l'archive téléchargée |
| `npm run clean:all` | Nettoie tout (assets + node_modules + target) |

## Troubleshooting

### Le statut affiche « Moteur de correction indisponible »

Le Worker n'a pas pu charger Grammalecte. Vérifier que `web/grammalecte/VERSION`
existe, sinon relancer `npm run build:assets`.

### `shasum` échoue

L'archive téléchargée ne correspond pas à l'empreinte attendue. Supprimer
`.tmp-build/` et relancer ; si l'erreur persiste, ne pas forcer : l'archive
publiée a changé.
