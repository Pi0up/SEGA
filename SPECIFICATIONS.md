# Spécifications Techniques et Fonctionnelles
# Skill & Outils d'Audit Ergonomique Expert (Bastien & Scapin × Nielsen)

## 1. Contexte & Définition du Besoin

Le présent projet a pour objectif de fournir un environnement complet d'évaluation ergonomique d'interfaces utilisateur (IHM) au sein d'Antigravity :
1. **Un Skill Antigravity (`SKILL.md`)** incarnant un Ergonome IHM & Lead UX Researcher Senior.
2. **Une boîte à outils d'automatisation (Playwright & Analyse Statique)** pour inspecter les pages web en direct (DOM, rendu, console, a11y) et le code source frontend (JSX/TSX, HTML/CSS).
3. **Un moteur d'analyse fondé sur une grille unifiée** fusionnant sans doublon les 8 critères / 18 sous-critères de **Bastien & Scapin (INRIA)** et les 10 heuristiques de **Jakob Nielsen (NN/g)**.
4. **Un générateur de spécifications UX prescriptives** fournissant des fiches d'action directement exploitables par les développeurs et designers.

---

## 2. Référentiels et Grille Heuristique Unifiée

Pour pallier les chevauchements tout en conservant la granularité technique de Bastien & Scapin et la lisibilité produit de Nielsen, la grille s'articule autour de **8 Méta-Axes** :

### Axe 1 : Guidage & Visibilité de l'état du système
- **Sources :** Bastien & Scapin [1.1 Incitation, 1.2 Groupement/Distinction, 1.3 Feedback immédiat, 1.4 Lisibilité] + Nielsen [#1 Visibilité de l'état du système, #8 Design épuré]
- **Points de contrôle clés :**
  - Retours visuels immédiats lors des actions (clic, soumission, navigation).
  - Présence d'indicateurs d'état (spinners, barres de progression, squelettes de chargement).
  - Clarté de la hiérarchie visuelle, contrastes typographiques conformes WCAG AA.
  - Groupement logique des éléments proches (lois de la Gestalt).

### Axe 2 : Charge de travail & Concision
- **Sources :** Bastien & Scapin [2.1 Brièveté (Concision, Actions minimales), 2.2 Densité informationnelle] + Nielsen [#8 Design esthétique et minimaliste, #7 Efficience]
- **Points de contrôle clés :**
  - Minimisation du nombre d'étapes et de clics pour accomplir un objectif utilisateur.
  - Absence de surcharge informationnelle ou visuelle inutile.
  - Pré-remplissage pertinent et valeurs par défaut sensées.

### Axe 3 : Contrôle utilisateur & Liberté
- **Sources :** Bastien & Scapin [3.1 Actions explicites, 3.2 Contrôle utilisateur] + Nielsen [#3 Contrôle et liberté de l'utilisateur]
- **Points de contrôle clés :**
  - Possibilité d'annuler ou de rétablir une action (Undo/Redo).
  - Issue de secours évidente pour quitter un état modal, un tiroir ou une vue plein écran (touche Échap, croix de fermeture explicite).
  - Aucune action irréversible ou critique sans confirmation explicite et avertissement clair.

### Axe 4 : Adaptabilité & Flexibilité
- **Sources :** Bastien & Scapin [4.1 Flexibilité, 4.2 Prise en compte de l'expérience de l'utilisateur] + Nielsen [#7 Flexibilité et efficience d'usage]
- **Points de contrôle clés :**
  - Prise en charge des raccourcis clavier pour les utilisateurs avancés.
  - Personnalisation ou adaptation des vues (filtres, tri, affichage compact/étendu).
  - Robustesse et adaptation responsive fluide (desktop, tablette, mobile).

### Axe 5 : Gestion des erreurs & Résilience
- **Sources :** Bastien & Scapin [5.1 Protection contre les erreurs, 5.2 Qualité des messages d'erreur, 5.3 Correction des erreurs] + Nielsen [#5 Prévention des erreurs, #9 Aide à la détection et correction]
- **Points de contrôle clés :**
  - Validation en ligne (inline validation) avant soumission pour prévenir les blocages.
  - Messages d'erreur explicites, humains, précis et indiquant l'action corrective.
  - Conservation des données déjà saisies en cas d'erreur de formulaire.

### Axe 6 : Homogénéité & Standards
- **Sources :** Bastien & Scapin [6.0 Homogénéité et Cohérence] + Nielsen [#4 Cohérence et standards]
- **Points de contrôle clés :**
  - Uniformité des composants, boutons, typographies, icônes et micro-copies.
  - Respect des conventions UI standards du web et des plateformes hôtes.

### Axe 7 : Signifiance des codes & Monde réel
- **Sources :** Bastien & Scapin [7.0 Signifiance des codes et dénominations] + Nielsen [#2 Correspondance avec le monde réel]
- **Points de contrôle clés :**
  - Vocabulaire métier compréhensible par l'utilisateur final (pas de jargon technique / SQL / interne).
  - Codes visuels et métaphores explicites (icônes compréhensibles sans ambiguïté).
  - Formats de données adaptés à la locale (dates, monnaies, téléphones).

### Axe 8 : Reconnaissance & Affordance
- **Sources :** Bastien & Scapin [8.0 Compatibilité] + Nielsen [#6 Reconnaissance plutôt que rappel, #10 Aide et documentation]
- **Points de contrôle clés :**
  - Affordance immédiate des éléments interactifs (styles distincts pour boutons, liens, états au survol).
  - Présentation claire des informations nécessaires sans obliger l'utilisateur à mémoriser des données d'un écran à l'autre.
  - Info-bulles et aides contextuelles disponibles sans quitter le parcours principal.

---

## 3. Système de Notation, Sévérité & Priorisation

Chaque observation est évaluée sur :
- **Sévérité Nielsen (0 à 4) :**
  - `0` : Pas de problème constaté
  - `1` : Cosmétique
  - `2` : Mineur
  - `3` : Majeur
  - `4` : Catastrophe d'utilisabilité / Bloquant
- **Effort d'implémentation :**
  - `Faible` : < 1/2 journée
  - `Moyen` : 1 à 3 jours
  - `Élevé` : > 3 jours
- **Typologie d'action :**
  - `Quick-Win` (Sévérité 2-3 + Effort Faible)
  - `Chantier Prioritaire` (Sévérité 3-4 + Effort Moyen/Élevé)
  - `Amélioration Continue` (Sévérité 1-2 + Effort Moyen/Élevé)

---

## 4. Outils Techniques Prévus

1. **`tools/src/crawler/playwright-probe.ts`** :
   - Sonde Playwright headless multi-device (Desktop 1440px, Tablette 768px, Mobile 375px).
   - Audit d'accessibilité et de contraste avec `@axe-core/playwright`.
   - Inspection de l'arbre DOM, détection des balises sémantiques, attributs ARIA, inputs sans labels.
   - Surveillance des logs console (`console.error`, avertissements de performance).
2. **`tools/src/code/static-analyzer.ts`** :
   - Analyseur statique pour les fichiers sources (`.tsx`, `.jsx`, `.html`, `.vue`).
   - Détection des anti-patterns ergonomiques (boutons disabled sans aria-disabled, modales sans gestion Échap, formulaires sans messages d'aide).
3. **`tools/src/reporter/markdown-builder.ts`** :
   - Générateur de rapport structuré Markdown et fiches de spécification UX prêtes pour l'équipe technique.

---

## 5. Livrables et Fiche de Spécification UX Type

Chaque fiche de spécification comprend :
- Identifiant unique `[SPEC-XX]` et Axe heuristique
- Localisation précise (URL, composant, sélecteur)
- Heuristiques enfreintes (Bastien & Scapin + Nielsen)
- Sévérité (0-4) et Effort
- Constat ergonomique détaillé
- Spécification UX cible (Comportement attendu, Micro-copie, Proposition de code diff)
