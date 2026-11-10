# 🔍 Ergonomic Reviewer — Skill & Outils d'Audit Ergonomique Expert
> **Référentiel unifié : Bastien & Scapin (INRIA 1993) × Jakob Nielsen (NN/g 1994)**  
> Détection automatisée des problématiques IHM, calcul du score **SEGA** sur 100 et génération de **spécifications UX/UI prescriptives** avec micro-copie et code diff.

---

## 📑 Sommaire
- [Architecture du projet](#-architecture-du-projet)
- [Comment tester ? (Guide pas-à-pas)](#-comment-tester--guide-pas-à-pas)
  - [Prérequis](#1-prérequis)
  - [Test 1 : Audit statique de code source (Rapide)](#test-1--audit-statique-de-code-source-rapide)
  - [Test 2 : Audit live Playwright (DOM, WCAG, Mobile)](#test-2--audit-live-playwright-dom-wcag-mobile)
  - [Test 3 : Tester le Skill Antigravity dans le chat](#test-3--tester-le-skill-antigravity-dans-le-chat)
- [Comprendre les résultats d'audit](#-comprendre-les-résultats-daudit)
- [Référentiels & Documentation](#-référentiels--documentation)

---

## 📂 Architecture du Projet

```text
├── SKILL.md                          # Définition du Skill Antigravity (Ergonome IHM Senior)
├── SPECIFICATIONS.md                 # Cahier des charges et spécifications complètes
├── README.md                         # Guide de prise en main & protocole de test
├── .gitignore                        # Exclusion node_modules, build & résultats d'audit
├── references/                       # Bases méthodologiques
│   ├── unified-matrix.md             # Matrice des 8 méta-axes unifiés & checklists
│   ├── spec-template.md              # Modèle standard de fiche de spécification UX [SPEC-XX]
│   ├── bastien-scapin.md             # Référentiel Bastien & Scapin (8 critères / 18 sous-critères)
│   └── nielsen-heuristics.md         # Référentiel Nielsen (10 heuristiques & sévérité 0-4)
├── examples/demo-app/                # Fixtures de test avec défauts intentionnels
│   ├── BadCheckoutForm.tsx           # Composant React à auditer statiquement
│   └── index.html                    # Page HTML à auditer avec la sonde Playwright
└── tools/                            # Suite d'outillage TypeScript
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts                  # CLI runner (ergo-audit)
        ├── types.ts                  # Définitions de types, 8 axes et score SEGA
        ├── crawler/
        │   └── playwright-probe.ts   # Sonde Playwright (DOM, axe-core, captures, console)
        ├── visual/
        │   └── annotator.ts          # Moteur d'annotation d'écran & marqueurs visuels in-situ
        ├── ai/                       # Module d'analyse ergonomique qualitative humaine par IA
        │   ├── prompts.ts            # Méta-prompts ergonomiques Bastien & Scapin × Nielsen
        │   ├── providers/            # Connecteurs multimodaux (Gemini, OpenAI, Anthropic)
        │   └── ai-analyzer.ts        # Orchestrateur d'analyse vision-langage & dégradation gracieuse
        ├── code/
        │   └── static-analyzer.ts    # Scanner statique de composants (JSX/TSX/HTML)
        └── reporter/
            └── markdown-builder.ts   # Moteur de génération des rapports et fiches UX
```

---

## 🧪 Comment tester ? (Guide pas-à-pas)

### 1. Prérequis

Assurez-vous d'avoir [Node.js](https://nodejs.org/) (v18+) installé.

Placez-vous dans le dossier des outils et installez les dépendances :
```bash
cd tools
npm install
npx playwright install chromium
npm run build
```

---

### Test 1 : Audit statique de code source (Rapide)

Ce test analyse les fichiers sources frontend (React, Vue, HTML) sans lancer de navigateur.  
Un composant de démonstration comportant des défauts ergonomiques intentionnels est fourni dans `examples/demo-app/BadCheckoutForm.tsx`.

Exécutez depuis le dossier `tools/` :
```bash
npm run audit:code -- --path ../examples/demo-app
```

**Ce que vous allez observer :**
1. Détection des anti-patterns :
   - Bouton désactivé sans explicitation (Axe 1 & 8).
   - Élément cliquable `<div onClick>` sans gestion du clavier (Axe 4 & 8).
   - Action de suppression sans confirmation préalable (Axe 3).
2. Un rapport complet est généré dans `.audit-results/CODE_AUDIT_REPORT.md` avec le score **SEGA** calculé et les fiches de spécifications correctives.

---

### Test 2 : Audit live Playwright (DOM, WCAG, Mobile)

Ce test lance un navigateur Chromium headless pour inspecter une interface en conditions réelles (contrastes WCAG, navigation mobile 375px, accessibilité interactive, erreurs console).

#### Option A : Tester sur la page de démo locale
Dans un terminal, démarrez un serveur web local rapide (par exemple avec `npx serve`) :
```bash
npx serve ../examples/demo-app -p 3000
```
Puis dans un autre terminal (dans `tools/`) :
```bash
npm run audit -- --url http://localhost:3000
```

#### Option B : Tester sur un site ou une application externe
```bash
npm run audit -- --url https://example.com
```

#### Option C : Activer le module de vérification WCAG approfondi
Activez l'analyse de conformité WCAG via l'option `-w` ou `--wcag` (défaut : `2.1AA`, ou spécifiez `2.2AA`, `2.0AA`, `AAA`) :
```bash
# Vérification WCAG 2.1 AA standard
npm run audit -- --url http://localhost:3000 --wcag

# Vérification WCAG 2.2 AA
npm run audit -- --url http://localhost:3000 --wcag 2.2AA
```

#### Option D : Activer l'analyse ergonomique qualitative humaine par IA (--ai)
Activez l'analyse multimodale vision-langage pour évaluer ce que les scripts ne peuvent pas mesurer (charge cognitive, tonalité, clarté du flux, affordance) :
```bash
# Analyse IA avec Google Gemini (défaut) via GEMINI_API_KEY
npm run audit -- --url http://localhost:3000 --ai

# Analyse IA avec OpenAI (gpt-4o) via OPENAI_API_KEY
npm run audit -- --url http://localhost:3000 --ai --ai-provider openai

# Analyse IA avec Anthropic (claude-3-5-sonnet) via ANTHROPIC_API_KEY
npm run audit -- --url http://localhost:3000 --ai --ai-provider anthropic

# Personnaliser le modèle utilisé
npm run audit -- --url http://localhost:3000 --ai --ai-provider gemini --ai-model gemini-2.5-flash
```

> **Configuration des clés d'API :** Renseignez vos clés dans un fichier `.env` à la racine de `tools/` ou dans votre environnement : `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`. En cas de clé absente ou d'erreur réseau, le système applique une **dégradation gracieuse** : l'audit se poursuit sans bloquer avec les résultats scriptés.

**Ce que vous allez observer :**
- Captures d'écran automatiques dans `.audit-results/screenshots/` (Desktop 1440px et Mobile 375px).
- **Marqueurs visuels in-situ & Cartographie :** La sonde génère une capture annotée globale (`screenshot-desktop-annotated.png`) avec des cadres et pilules de repérage numérotées, ainsi que des extraits ciblés (`marker-SPEC-XX.png`) pour chaque anomalie.
- **Analyse IA Qualitative & Psychologie Cognitive :** Section dédiée dans le rapport Markdown avec évaluation de la charge mentale, de la micro-copie, de l'affordance et de l'harmonie visuelle, ainsi que le verdict global de l'ergonome IA.
- **Double lecture du score SEGA :** Affichage conjoint du *Score SEGA Global* (Technique + IA) et du *Score SEGA Technique* (règles scriptées).
- Audit axe-core et module WCAG (conformité par principe : Perceptible, Utilisable, Compréhensible, Robuste).
- Taux de conformité WCAG calculé (ex: 80% conforme).
- Détection des débordements horizontaux sur mobile.
- Génération du rapport `.audit-results/AUDIT_REPORT.md` (intégrant la cartographie visuelle, l'analyse cognitive IA et les aperçus annotés par fiche) et `.audit-results/AI_ANALYSIS.json`.

---

### Test 3 : Tester le Skill Antigravity dans le chat

Le skill `ergonomic-review` peut être sollicité directement par conversation avec l'agent.

**Exemples de requêtes à soumettre :**
1. **Audit de code source :**
   > *"Peux-tu faire un audit ergonomique du composant `examples/demo-app/BadCheckoutForm.tsx` en utilisant la grille Bastien & Scapin et Nielsen, et me donner les fiches de spécifications cibles ?"*

2. **Audit d'une URL :**
   > *"Réalise un audit ergonomique complet de l'URL `http://localhost:3000` et sors-moi la liste des Quick-Wins."*

3. **Demande de spécification ciblée :**
   > *"Notre formulaire de paiement a un taux d'abandon élevé sur mobile car les erreurs s'affichent uniquement après validation. Rédige la fiche de spécification UX [SPEC] avec le code React corrigé selon l'Axe 5 (Gestion des erreurs)."*

---

## 📊 Comprendre les résultats d'audit

Chaque audit produit :
1. **Le score SEGA (0 à 100) :**
   - 🟢 `85 - 100` : Excellent niveau d'utilisabilité.
   - 🟡 `70 - 84` : Bon niveau avec frictions localisées.
   - 🟠 `50 - 69` : Frictions ergonomiques notables.
   - 🔴 `< 50` : Risque élevé de rejet ou abandon utilisateur.
2. **La matrice Sévérité / Effort :**
   - **Sévérité (0 à 4) :** Cosmétique (1), Mineur (2), Majeur (3), Catastrophe (4).
   - **Quick-Wins :** Fort impact (sévérité 2 ou 3) pour un effort de correction faible (< 0.5 jour).
3. **Des fiches `[SPEC-XX]` prescriptives :**
   - Règle enfreinte (Bastien & Scapin + Nielsen).
   - Comportement attendu et gestion des états.
   - Micro-copie optimisée.
   - Diff de code (`-` ancien code / `+` code corrigé).

---

## 📚 Référentiels & Documentation

- [SPECIFICATIONS.md](SPECIFICATIONS.md) : Cahier des charges exhaustif.
- [references/unified-matrix.md](references/unified-matrix.md) : Grille détaillée des 8 méta-axes unifiés.
- [references/spec-template.md](references/spec-template.md) : Gabarit d'une fiche de spécification type.
- [references/bastien-scapin.md](references/bastien-scapin.md) : Les 8 critères et 18 sous-critères INRIA.
- [references/nielsen-heuristics.md](references/nielsen-heuristics.md) : Les 10 heuristiques d'utilisabilité NN/g.
