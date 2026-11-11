# Matrice Heuristique Unifiée : Bastien & Scapin × Nielsen

Cette matrice constitue la base méthodologique de référence du skill **SEGA**. Elle élimine les redondances entre les deux écoles d'ergonomie et classe chaque problème dans un **méta-axe unique**.

---

## Vue d'ensemble des 8 Méta-Axes

```
1. Guidage & Visibilité de l'état
2. Charge de travail & Concision
3. Contrôle utilisateur & Liberté
4. Adaptabilité & Flexibilité
5. Gestion des erreurs & Résilience
6. Homogénéité & Standards
7. Signifiance des codes & Monde réel
8. Reconnaissance & Affordance
```

---

## 1. Guidage & Visibilité de l'état
> *Accompagner l'utilisateur, l'orienter et lui faire connaître l'état du système en temps réel.*

- **Bastien & Scapin :**
  - **1.1 Incitation :** Conseils, indications, libellés explicites qui guident l'utilisateur sur ce qu'il peut faire.
  - **1.2 Groupement / Distinction :**
    - *1.2.1 Groupement par localisation :* Proximité spatiale des éléments liés.
    - *1.2.2 Groupement par format :* Styles visuels similaires pour des entités de même nature.
  - **1.3 Feedback immédiat :** Confirmation instantanée de la prise en compte des actions (< 250ms).
  - **1.4 Lisibilité :** Contraste typographique, taille de police, espacement des caractères et lignes.
- **Nielsen :**
  - **#1 Visibilité de l'état du système :** L'utilisateur sait toujours où il en est grâce à un retour approprié dans un délai raisonnable.
  - **#8 Design esthétique et minimaliste :** Hiérarchie visuelle claire sans bruit superflu.
- **Checklist d'audit :**
  - [ ] Les actions longues (> 1s) affichent-elles un indicateur de chargement ou une barre de progression ?
  - [ ] L'emplacement de l'utilisateur dans l'arborescence est-il clair (fil d'Ariane, onglet actif mis en évidence) ?
  - [ ] Le survol (hover) et la sélection (focus) des boutons et liens sont-ils perceptibles ?
  - [ ] Le ratio de contraste texte/arrière-plan est-il au moins de 4.5:1 pour le texte normal et 3:1 pour les grands titres (WCAG AA) ?
  - [ ] Les blocs d'information apparentés sont-ils visuellement regroupés (cartes, encadrés) ?

---

## 2. Charge de travail & Concision
> *Réduire l'effort perceptif, mental et moteur nécessaire à l'accomplissement d'une tâche.*

- **Bastien & Scapin :**
  - **2.1 Brièveté :**
    - *2.1.1 Concision :* Réduction du nombre d'entrées et de saisies requises.
    - *2.1.2 Actions minimales :* Moindre nombre d'étapes / de clics pour une tâche.
  - **2.2 Densité informationnelle :** Éviter l'encombrement et la surcharge d'informations sur un même écran.
- **Nielsen :**
  - **#8 Design esthétique et minimaliste :** Ne pas noyer les éléments essentiels sous des informations secondaires.
  - **#7 Efficience d'usage :** Fluidité des parcours fréquents.
- **Checklist d'audit :**
  - [ ] Le nombre de clics pour accomplir l'action principale est-il optimisé ?
  - [ ] Les formulaires évitent-ils les champs facultatifs non essentiels ?
  - [ ] Y a-t-il des présaisies ou des valeurs par défaut pertinentes (ex. pays par défaut, date du jour) ?
  - [ ] Les listes longues utilisent-elles une pagination ou un virtual scroll avec options de filtrage direct ?
  - [ ] Les écrans évitent-ils la surcharge visuelle (whitespace suffisant, séparation claire) ?

---

## 3. Contrôle utilisateur & Liberté
> *Garantir que l'utilisateur est maître de ses actions, sans enfermement ni action imposée.*

- **Bastien & Scapin :**
  - **3.1 Actions explicites :** Le système n'exécute des opérations que sur demande délibérée de l'utilisateur.
  - **3.2 Contrôle utilisateur :** L'utilisateur peut interrompre, reprendre ou annuler une opération à tout moment.
- **Nielsen :**
  - **#3 Contrôle utilisateur et liberté :** Présence d'issues de secours claires (Annuler, Rétablir, Fermer).
- **Checklist d'audit :**
  - [ ] Existe-t-il un bouton "Annuler" ou une action `Undo` lors des opérations critiques ?
  - [ ] Les fenêtres modales et panneaux latéraux peuvent-ils être fermés via la touche `Échap` et un clic à l'extérieur ?
  - [ ] Les actions destructives (suppression de compte, purge de données) nécessitent-elles une confirmation explicite ?
  - [ ] L'interface s'abstient-elle de déclencher des vidéos ou audios en lecture automatique non sollicitée ?

---

## 4. Adaptabilité & Flexibilité
> *Permettre à des utilisateurs de niveaux d'expertise différents de travailler confortablement.*

- **Bastien & Scapin :**
  - **4.1 Flexibilité :** Plusieurs moyens offerts pour accomplir une même tâche.
  - **4.2 Prise en compte de l'expérience :** L'interface s'ajuste au niveau du novice comme de l'expert.
- **Nielsen :**
  - **#7 Flexibilité et efficience d'usage :** Accélérateurs pour les experts (raccourcis clavier, gestes).
- **Checklist d'audit :**
  - [ ] Des raccourcis clavier sont-ils disponibles pour les tâches répétitives (ex. `Ctrl+S`, `Ctrl+K`) ?
  - [ ] L'interface est-elle pleinement navigable au clavier (séquence logique de `Tab` sans focus trap) ?
  - [ ] L'affichage s'adapte-t-il parfaitement aux écrans mobiles, tablettes et grands moniteurs ?
  - [ ] Les préférences utilisateur (thème sombre, ordre des colonnes, filtres favoris) sont-elles conservées ?

---

## 5. Gestion des erreurs & Résilience
> *Prévenir les erreurs, les signaler intelligemment et faciliter leur correction sans stress.*

- **Bastien & Scapin :**
  - **5.1 Protection contre les erreurs :** Détection préventive, contrôles de format en direct, désactivation préventive.
  - **5.2 Qualité des messages d'erreur :** Messages précis, polis, expliquant la cause et la solution.
  - **5.3 Correction des erreurs :** Facilité offerte à l'utilisateur pour rectifier sans perdre son travail.
- **Nielsen :**
  - **#5 Prévention des erreurs :** Éliminer les conditions propices aux erreurs ou avertir l'utilisateur avant validation.
  - **#9 Aider à reconnaître, diagnostiquer et corriger les erreurs :** Messages en langage clair sans code d'erreur abscons.
- **Checklist d'audit :**
  - [ ] Les formulaires effectuent-ils une validation inline (en temps réel ou `onBlur`) avant la soumission ?
  - [ ] Les messages d'erreur indiquent-ils précisément le format attendu (ex. "Exemple : nom@domaine.fr") ?
  - [ ] En cas d'échec de soumission, les champs valides déjà remplis sont-ils conservés ?
  - [ ] Le premier champ en erreur reçoit-il automatiquement le focus visuel ?
  - [ ] Les boutons d'action sensible demandent-ils confirmation avec explicitation des conséquences ?

---

## 6. Homogénéité & Standards
> *Maintenir la cohérence interne et respecter les conventions de l'écosystème numérique.*

- **Bastien & Scapin :**
  - **6.0 Homogénéité et Cohérence :** Uniformité des choix graphiques, des termes, des raccourcis et des comportements au sein de l'application.
- **Nielsen :**
  - **#4 Cohérence et standards :** L'utilisateur ne doit pas se demander si des mots ou des situations différentes signifient la même chose.
- **Checklist d'audit :**
  - [ ] La palette de couleurs et la typographie respectent-elles une échelle de tokens unifiée ?
  - [ ] Les boutons primaires, secondaires et tertiaires ont-ils une apparence et une position stables d'un écran à l'autre ?
  - [ ] Les conventions web standard sont-elles respectées (logo cliquable renvoyant à l'accueil, panier en haut à droite) ?
  - [ ] Les mêmes termes désignent-ils toujours les mêmes concepts (ex. ne pas alterner "Supprimer", "Effacer" et "Détruire") ?

---

## 7. Signifiance des codes & Monde réel
> *Employer le langage de l'utilisateur et des métaphores naturelles issues de son univers de référence.*

- **Bastien & Scapin :**
  - **7.0 Signifiance des codes et dénominations :** Adéquation entre le code (icône, terme, abréviation) et sa signification pour l'utilisateur.
- **Nielsen :**
  - **#2 Correspondance entre le système et le monde réel :** Utiliser des concepts et expressions familiers à l'utilisateur plutôt que des termes internes orientés système.
- **Checklist d'audit :**
  - [ ] Le vocabulaire employé est-il exempt de jargon technique (ex. pas d'erreur 500 ou "null pointer exception" affichée) ?
  - [ ] Les icônes utilisées sont-elles universellement comprises ou accompagnées d'un texte explicite ?
  - [ ] Les formats de dates, nombres et devises sont-ils localisés selon la langue de l'utilisateur ?
  - [ ] Les métaphores visuelles correspondent-elles à des objets familiers ?

---

## 8. Reconnaissance & Affordance
> *Rendre les actions évidentes pour soulager la mémoire de travail de l'utilisateur.*

- **Bastien & Scapin :**
  - **8.0 Compatibilité :** Accord entre les caractéristiques de l'utilisateur (mémoire, compétences) et les exigences de la tâche.
- **Nielsen :**
  - **#6 Reconnaissance plutôt que rappel :** Rendre les options, objets et actions visibles.
  - **#10 Aide et documentation :** Facilité d'accès à des explications concrètes en cas de besoin.
- **Checklist d'audit :**
  - [ ] Les éléments cliquables ont-ils une affordance évidente (forme de bouton, soulignement des liens, curseur `pointer`) ?
  - [ ] Les champs de recherche proposent-ils un historique ou de l'autocomplétion pour éviter de retaper ?
  - [ ] Des info-bulles (tooltips) expliquent-elles les options ou icônes complexes ?
  - [ ] L'utilisateur doit-il mémoriser des données d'un écran à l'autre sans récapitulatif ?
