# Modèle de Fiche de Spécification UX/UI Prescriptive

Chaque problème identifié lors de l'audit ergonomique fait l'objet d'une fiche normalisée selon le modèle ci-dessous :

---

```markdown
### [SPEC-{{ID}}] [Axe {{NUM}} : {{NOM_AXE}}] {{TITRE_DU_PROBLEME}}

| Métrique | Valeur |
| :--- | :--- |
| **Localisation** | `{{ROUTE_OU_FICHIER}}` (Sélecteur: `{{CSS_SELECTOR}}`) |
| **Heuristique Bastien & Scapin** | {{CRITERE_BS_NUM}} {{CRITERE_BS_NOM}} |
| **Heuristique Nielsen** | #{{NIELSEN_NUM}} {{NIELSEN_NOM}} |
| **Sévérité (0 à 4)** | **{{SEVERITE_NUM}} - {{SEVERITE_LIBELLE}}** |
| **Effort de correction** | {{EFFORT}} ({{DUREE_ESTIMEE}}) |
| **Typologie** | **{{QUICK_WIN_OU_CHANTIER}}** |

#### 1. Constat Ergonomique & Impact Utilisateur
- **Observation :** {{DESCRIPTION_PRECISE_DU_DEFAUT}}
- **Capture / Preuve :** `{{CHEMIN_CAPTURE_OU_LIGNE_CODE}}`
- **Impact sur l'expérience :** {{POURQUOI_CELA_GENE_L_UTILISATEUR_COGNITIF_OU_ACTION}}

---

#### 2. Spécification UX/UI Cible (Comportement Attendu)
1. **Comportement d'interaction :**
   - {{ETAPE_1_TRIGGER_ET_RETOUR}}
   - {{ETAPE_2_GESTION_DES_ETATS_HOVER_FOCUS_ACTIVE_ERROR}}
   - {{ETAPE_3_ACCESSIBILITE_CLAVIER_ET_LECTEUR_ECRAN}}

2. **Micro-Copie Prescrite :**
   - **Avant :** `"{{TEXTE_ACTUEL}}"`
   - **Après (Recommandé) :** `"{{TEXTE_CIBLE_OPTIMISE}}"`
   - **Règle éditoriale :** {{EXPLICATION_DU_CHOIX_LEXICAL}}

3. **Spécification Technique & Code Diff :**
```diff
- {{CODE_ACTUEL_DEFECTUEUX}}
+ {{CODE_CIBLE_CORRIGE_AVEC_ARIA_ET_BONNES_PRATIQUES}}
```

4. **Critères d'Acceptation (Definition of Done) :**
- [ ] Le composant répond aux états visuels définis (défaut, hover, focus-visible, disabled/aria-disabled).
- [ ] La navigation au clavier (Tab / Échap / Entrée) est 100% fonctionnelle sans focus-trap.
- [ ] Le score de contraste respecte WCAG AA (≥ 4.5:1).
```
