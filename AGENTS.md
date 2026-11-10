# Instructions pour les Agents IA et Développeurs (`AGENTS.md`)

Ce document définit les directives d'ingénierie logicielle, les conventions Git, les règles de contribution, l'outillage et l'automatisation du versioning pour ce projet (`ergonomic-review` / SEGA).

---

## 1. Gestion des Branches et Bonnes Pratiques Git

Toute contribution doit suivre le modèle standardisé **GitHub Flow / Trunk-Based Development** avec des branches de travail dédiées.

### Conventions de nommage des branches
Les branches doivent impérativement utiliser la casse `kebab-case` et être préfixées par la nature du changement :
- `feat/<nom-fonctionnalite>` : Ajout d'une nouvelle fonctionnalité, nouvelle règle d'audit ou enrichissement du skill.
- `fix/<nom-correctif>` : Correction d'un bug (ex. faux positif dans l'analyseur, plantage Playwright, calcul de score).
- `hotfix/<description-urgence>` : Correctif critique en production / branche principale.
- `refactor/<nom-refactoring>` : Refactorisation de code TypeScript ou restructuration sans altération fonctionnelle.
- `perf/<optimisation>` : Amélioration de performance (ex. vitesse du crawler Playwright, scanning statique parallélisé).
- `docs/<sujet>` : Documentation seule (README, matrices heuristiques, fiches de spécifications).
- `chore/<sujet>` : Tâches d'infrastructure, mise à jour des dépendances, configuration tooling ou CI/CD.

*Exemples :*
- `feat/playwright-shadow-dom-inspection`
- `fix/color-contrast-false-positive`
- `hotfix/broken-cli-entrypoint`
- `docs/update-unified-matrix`

---

## 2. Cycle de Vie des Modifications : Pull Requests & `main`

### Règle d'or : PR obligatoire pour merger sur `main`
- **Toute modification doit impérativement passer par une Pull Request (PR)** validée avant d'être intégrée sur la branche par défaut (`main`).
- La PR doit comporter un résumé clair des modifications, les impacts sur le score SEGA ou sur les analyseurs, et faire référence à l'issue ou la spécification associée (ex: `SPEC-XX`).

### Exception d'urgence : Hotfixes directs sur `main`
- Les commits et pushs directs sur `main` sont **strictement réservés aux hotfixes d'extrême urgence** (ex: rupture critique du package d'outils, CLI bloquant).
- Même dans ce cas d'exception, le message de commit doit expliciter la nature critique du hotfix (`hotfix: ...`), et le bon fonctionnement de la suite TypeScript (`npm run build` dans `tools`) doit être validé localement avant le push.

---

## 3. Normes de Commits (Conventional Commits)

Les messages de commit doivent strictement respecter la spécification **Conventional Commits** :

```text
<type>(<périmètre optionnel>): <description courte et impérative en minuscules>

[corps optionnel expliquant le 'pourquoi' et le détail fonctionnel]

[footer optionnel : BREAKING CHANGE: ..., Closes #123]
```

### Types autorisés :
- `feat` : Nouvelle fonctionnalité (nouveau détecteur, nouvelle heuristique, nouvelle option CLI).
- `fix` : Correction de bug dans l'analyseur, la sonde Playwright ou le reporter.
- `hotfix` : Correctif urgent direct.
- `perf` : Gain de performances ou réduction de la consommation mémoire.
- `refactor` : Restructuration de code interne sans changement de comportement.
- `test` : Ajout ou mise à jour de jeux de tests / fixtures (`examples/`).
- `build` : Modification touchant TypeScript, bundling ou packaging (`tools/package.json`, `tsconfig.json`).
- `ci` : Configuration GitHub Actions ou scripts d'intégration continue.
- `docs` : Documentation (`README.md`, `references/`, spécifications, guides).
- `chore` : Maintenance courante, mise à jour de dépendances.

### Scopes recommandés :
- `crawler` : Sonde Playwright, injection axe-core, viewport mobile/desktop.
- `static` : Analyseur statique JSX/TSX/HTML, regex AST, détection heuristique.
- `reporter` : Moteur de génération des rapports Markdown, calcul du score SEGA, fiches SPEC.
- `skill` : Instructions du Skill Antigravity (`SKILL.md`), méta-prompts et personas.
- `matrix` : Référentiel unifié Bastien & Scapin × Nielsen (`references/unified-matrix.md`).
- `cli` : Point d'entrée de commande (`tools/src/index.ts`, parsing des arguments).
- `types` : Définitions TypeScript communes (`tools/src/types.ts`).

*Exemples :*
- `feat(crawler): extract focus-visible indicators from computed styles`
- `fix(reporter): handle division by zero in empty violation sets`
- `refactor(static): split heuristic analyzers into dedicated rule modules`
- `docs(matrix): clarify criterion 3.2 on action safety`

---

## 4. Tests et Débit de Travail : Local vs CI

Pour allier **qualité logicielle absolue** et **rapidité d'itération maximale**, nous appliquons un compromis pragmatique entre l'environnement local et l'environnement CI :

### En Pull Request (CI GitHub Actions) : Zéro compromis
- **La compilation TypeScript doit réussir sans la moindre erreur (`cd tools && npm run build`).**
- Les audits de régression sur les fixtures d'exemple (`examples/demo-app/`) doivent s'exécuter avec succès.
- Aucun fichier temporaire d'audit (`.audit-results/`) ne doit être versionné.
- Tout échec de compilation ou de test bloque le merge de la PR.

### En local : Accélérer la boucle de feedback
- **Commits intermédiaires rapides** : Pendant la phase de développement actif, il est permis d'effectuer des commits atomiques intermédiaires sans systématiquement recompiler l'intégralité des modules à chaque ligne éditée.
- **Tests ciblés** : Exécutez en priorité l'analyseur statique sur une fixture dédiée pour valider votre logique en une fraction de seconde :
  ```bash
  cd tools
  # Validation ciblée du scanner statique sur une fixture de test
  node dist/index.js code -p ../examples/demo-app/BadCheckoutForm.tsx
  # Ou depuis la racine du workspace :
  # npm test
  ```
- **Validation globale avant PR** : Avant d'ouvrir une PR, recompilez systématiquement le projet (`npm run build` dans `tools`) et vérifiez que `git status` est irréprochable.

---

## 5. Optimisation du Build & Prévention des Erreurs

Afin de préserver la vélocité sans introduire de pollution dans le dépôt :

1. **Hygiène du workspace et exclusions Git :**
   - Ne jamais versionner les résultats d'audit générés (`tools/.audit-results/`, captures d'écran temporaires, logs de navigation Playwright).
   - Ne jamais commiter `node_modules/` ni les fichiers générés dans `tools/dist/`.
   - Les fixtures d'exemples avec défauts intentionnels résident exclusivement dans `examples/demo-app/` et servent de référence de test.

2. **Cycle de compilation TypeScript :**
   - Privilégier `npm run build` (`tsc`) depuis le répertoire `tools/` lors de la finalisation d'une tâche.
   - En environnement conteneurisé ou CI, utiliser `npm ci` plutôt que `npm install` pour garantir des builds déterministes.

3. **Préservation des référentiels :**
   - Les fichiers sous `references/` constituent la source de vérité méthodologique (Bastien & Scapin, Nielsen). Toute modification de ces fichiers doit être justifiée dans la description du commit et documentée (`docs(matrix): ...`).

4. **Synthèse des règles d'or :**
   - Branche dédiée (`feat/...`, `fix/...`, `docs/...`) — jamais de travail direct sur `main`
   - Actions Git automatiques au fur et à mesure (commits atomiques et pushs continus)
   - Commits conventionnels et itérations locales rapides
   - Compilation TypeScript sans faute avant toute ouverture de PR
   - Merge sur `main` uniquement via PR (hotfix direct sur `main` réservé aux urgences absolues)

---

## 6. Automatisation du Versioning et Changelog (Semantic-Release)

Le projet adopte la mécanique de release automatisée **Semantic-Release** calquée sur les standards de nos outils d'ingénierie :

### Fonctionnement du cycle de release :
1. **Déclenchement automatique** : À chaque merge de Pull Request sur la branche principale (`main`), le pipeline de release s'exécute après succès des étapes de validation et build.
2. **Déduction stricte du SemVer** :
   - `feat(...)` : Incrément **MINEUR** (`1.0.0` $\rightarrow$ `1.1.0`).
   - `fix(...)`, `hotfix(...)`, `perf(...)` : Incrément **PATCH** (`1.0.0` $\rightarrow$ `1.0.1`).
   - `BREAKING CHANGE:` ou `feat(...!):` : Incrément **MAJEUR** (`1.0.0` $\rightarrow$ `2.0.0`).
   - `docs`, `chore`, `refactor`, `test`, `ci`, `build` : Aucun saut de version.
3. **Mise à jour du Changelog (`CHANGELOG.md`)** : Génération / actualisation automatique du journal des modifications avec classement par section (*Features*, *Bug Fixes*, *Hotfixes*, *Performance*).
4. **Mise à jour de `package.json` et Tag Git** : Création automatique du tag Git `vX.Y.Z` et synchronisation du numéro de version.
5. **Assets & Releases GitHub** : Publication automatique des notes de release sur GitHub avec récapitulatif détaillé des changements.

### Test local (Dry-run) :
Pour vérifier la détection de version et le changelog sans publier :
```bash
npx semantic-release --dry-run
```

---

## 7. Actions Git Automatiques au Fil de l'Eau (Obligation pour les Agents IA)

Pour garantir la traçabilité, éviter toute perte de travail et maintenir un historique Git clair et granulaire, **l'agent IA doit exécuter les actions Git de manière proactive et automatique au fur et à mesure de son travail**, sans attendre une demande explicite de l'utilisateur :

1. **Initialisation systématique de la tâche :**
   - Inspecter systématiquement l'état du dépôt (`git status`, `git branch`).
   - Si les modifications concernent un nouveau sujet ou si le workspace est sur la branche principale (`main` / `master`), basculer immédiatement sur une branche dédiée (`feat/...`, `fix/...`, `chore/...`, `docs/...`). **Ne jamais développer directement sur la branche principale.**

2. **Commits atomiques et réguliers au fil de l'eau :**
   - **Ne jamais accumuler l'ensemble des changements pour un unique commit en fin de session.**
   - Dès qu'une sous-tâche, un fichier clé, une règle d'analyse, un script ou un correctif est validé, exécuter immédiatement un commit conventionnel (`git add <fichiers>` puis `git commit`).
   - Chaque commit doit représenter une unité logique de changement claire et autonome.

3. **Synchronisation continue (`git push`) :**
   - Pousser régulièrement la branche de travail vers le dépôt distant (`git push -u origin <nom-branche>` dès le premier commit, puis `git push` au fur et à mesure des commits significatifs).
   - Cela assure la sauvegarde en temps réel du travail dans l'espace distant.

4. **Clôture et propreté :**
   - Avant de rendre la main à l'utilisateur, vérifier systématiquement `git status` pour s'assurer qu'aucun fichier orphelin (*untracked*) non désiré ou modification non commitée ne subsiste.
   - Nettoyer les éventuels artefacts de test temporaires non couverts par `.gitignore`.
   - Confirmer brièvement à l'utilisateur les commits réalisés et le statut de synchronisation de la branche.
