import * as fs from 'fs';
import * as path from 'path';
import { Finding } from '../types';

export function runStaticCodeAnalysis(targetPath: string): Finding[] {
  const findings: Finding[] = [];
  let counter = 1;
  const nextId = () => `SPEC-CODE-${String(counter++).padStart(2, '0')}`;

  const filesToScan: string[] = [];

  function collectFiles(dirOrFile: string) {
    if (!fs.existsSync(dirOrFile)) return;
    const stat = fs.statSync(dirOrFile);
    if (stat.isFile()) {
      if (/\.(jsx|tsx|html|vue|svelte)$/i.test(dirOrFile)) {
        filesToScan.push(dirOrFile);
      }
    } else if (stat.isDirectory()) {
      const entries = fs.readdirSync(dirOrFile);
      for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
        collectFiles(path.join(dirOrFile, entry));
      }
    }
  }

  collectFiles(targetPath);

  for (const filePath of filesToScan) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);

    // Rule 1: <button disabled> without explanation (Axe 1 & 8)
    const disabledRegex = /<button[^>]*\sdisabled(\s|=>|>)/g;
    if (disabledRegex.test(content) && !content.includes('aria-disabled') && !content.includes('tooltip')) {
      findings.push({
        id: nextId(),
        axis: 'axis-1',
        bastienScapinRule: '1.1 Incitation',
        nielsenRule: '#1 Visibilité de l état du système',
        title: "Bouton désactivé (disabled) sans explicitation de la raison d'inactivité",
        location: `${relativePath}`,
        severity: 2,
        effort: 'Faible',
        isQuickWin: true,
        observation: "Un bouton utilise l'attribut HTML 'disabled' sans infobulle ni aria-disabled, laissant l'utilisateur dans l'incompréhension de l'action manquante.",
        expectedBehavior: "Préférer `aria-disabled='true'` avec un texte explicatif ou une tooltip indiquant le prérequis à remplir.",
        codeSnippetBefore: `<button disabled={!isValid}>Valider</button>`,
        codeSnippetAfter: `<button aria-disabled={!isValid} title={!isValid ? "Veuillez renseigner tous les champs obligatoires" : undefined}>Valider</button>`
      });
    }

    // Rule 2: Clickable div/span without onKeyDown (Axe 4 & 8)
    const fakeButtonRegex = /<(div|span)[^>]*onClick=[^>]*>/g;
    if (fakeButtonRegex.test(content) && !content.includes('onKeyDown') && !content.includes('onKeyUp')) {
      findings.push({
        id: nextId(),
        axis: 'axis-8',
        bastienScapinRule: '8.0 Compatibilité',
        nielsenRule: '#7 Flexibilité et efficience d usage',
        title: 'Événement onClick sur balise non sémantique sans gestion du clavier',
        location: `${relativePath}`,
        severity: 3,
        effort: 'Faible',
        isQuickWin: true,
        observation: "Un gestionnaire onClick est placé sur un <div> ou <span> sans gestionnaire clavier (Entrée/Espace), excluant les utilisateurs au clavier.",
        expectedBehavior: "Utiliser un véritable élément <button> ou compléter avec onKeyDown={(e) => e.key === 'Enter' && handleClick()}.",
        codeSnippetBefore: `<div className="action-card" onClick={openModal}>Détails</div>`,
        codeSnippetAfter: `<button type="button" className="action-card" onClick={openModal}>Détails</button>`
      });
    }

    // Rule 3: Destructive button without confirmation (Axe 3 & 5)
    const deleteRegex = /<(button|a)[^>]*(supprimer|delete|trash|destroy)[^>]*onClick=[^>]*>/i;
    if (deleteRegex.test(content) && !content.includes('confirm') && !content.includes('modal') && !content.includes('dialog')) {
      findings.push({
        id: nextId(),
        axis: 'axis-3',
        bastienScapinRule: '3.1 Actions explicites',
        nielsenRule: '#3 Contrôle utilisateur et liberté',
        title: 'Action destructive exécutée sans étape de confirmation explicite',
        location: `${relativePath}`,
        severity: 3,
        effort: 'Moyen',
        isQuickWin: false,
        observation: "Une action de suppression est déclenchée directement au clic sans modale d'avertissement ou confirmation de sécurité.",
        expectedBehavior: "Ouvrir un dialogue modal de confirmation indiquant clairement l'impact irréversible avant validation.",
        codeSnippetBefore: `<button onClick={() => deleteItem(item.id)}>Supprimer</button>`,
        codeSnippetAfter: `<button onClick={() => setConfirmModalOpen(true)}>Supprimer</button>\n{/* Modal avec rappel de l'élément ciblé et bouton annuler */}`
      });
    }
  }

  return findings;
}
