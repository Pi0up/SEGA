import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { runPlaywrightProbe } from './crawler/playwright-probe';
import { runStaticCodeAnalysis } from './code/static-analyzer';
import { calculateSegaScore, buildMarkdownReport } from './reporter/markdown-builder';
import { AuditReportData, Finding } from './types';

const program = new Command();

program
  .name('ergo-audit')
  .description('Audit ergonomique expert basé sur Bastien & Scapin et Nielsen')
  .version('1.0.0');

program
  .command('audit')
  .description('Audit une URL en direct avec Playwright et axe-core')
  .requiredOption('-u, --url <url>', 'URL de la page ou application à auditer')
  .option('-o, --output <dir>', 'Répertoire de sortie des rapports', '.audit-results')
  .action(async (options) => {
    console.log(`[Ergo-Review] Démarrage de l'audit Playwright sur : ${options.url}`);
    const outputDir = path.resolve(process.cwd(), options.output);
    
    try {
      const probeResult = await runPlaywrightProbe({
        url: options.url,
        outputDir
      });

      const metrics = calculateSegaScore(probeResult.findings);
      const reportData: AuditReportData = {
        target: options.url,
        date: new Date().toISOString().split('T')[0],
        segaScore: metrics.score,
        findings: probeResult.findings,
        screenshots: probeResult.screenshots,
        metrics: {
          totalFindings: probeResult.findings.length,
          ...metrics
        }
      };

      const markdown = buildMarkdownReport(reportData);
      const reportPath = path.join(outputDir, 'AUDIT_REPORT.md');
      fs.writeFileSync(reportPath, markdown, 'utf-8');

      console.log(`[Ergo-Review] ✅ Audit terminé !`);
      console.log(`[Ergo-Review] Score SEGA : ${metrics.score}/100`);
      console.log(`[Ergo-Review] Problèmes détectés : ${probeResult.findings.length} (dont ${metrics.quickWins} Quick-Wins)`);
      console.log(`[Ergo-Review] Rapport généré : ${reportPath}`);
    } catch (err) {
      console.error(`[Ergo-Review] ❌ Erreur lors de l'audit :`, err);
      process.exit(1);
    }
  });

program
  .command('code')
  .description('Audit statique du code source frontend (JSX/TSX/HTML/Vue)')
  .requiredOption('-p, --path <path>', 'Chemin du dossier ou fichier à inspecter')
  .option('-o, --output <dir>', 'Répertoire de sortie', '.audit-results')
  .action(async (options) => {
    console.log(`[Ergo-Review] Démarrage de l'analyse statique sur : ${options.path}`);
    const outputDir = path.resolve(process.cwd(), options.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      const findings = runStaticCodeAnalysis(path.resolve(process.cwd(), options.path));
      const metrics = calculateSegaScore(findings);

      const reportData: AuditReportData = {
        target: options.path,
        date: new Date().toISOString().split('T')[0],
        segaScore: metrics.score,
        findings,
        metrics: {
          totalFindings: findings.length,
          ...metrics
        }
      };

      const markdown = buildMarkdownReport(reportData);
      const reportPath = path.join(outputDir, 'CODE_AUDIT_REPORT.md');
      fs.writeFileSync(reportPath, markdown, 'utf-8');

      console.log(`[Ergo-Review] ✅ Analyse terminée !`);
      console.log(`[Ergo-Review] Score SEGA : ${metrics.score}/100`);
      console.log(`[Ergo-Review] Problèmes détectés : ${findings.length}`);
      console.log(`[Ergo-Review] Rapport généré : ${reportPath}`);
    } catch (err) {
      console.error(`[Ergo-Review] ❌ Erreur lors de l'analyse :`, err);
      process.exit(1);
    }
  });

program.parse(process.argv);
