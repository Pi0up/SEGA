import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { runPlaywrightProbe } from './crawler/playwright-probe';
import { runStaticCodeAnalysis } from './code/static-analyzer';
import { calculateSegaScore, buildMarkdownReport } from './reporter/markdown-builder';
import { AuditReportData, Finding, AiProvider } from './types';

// Chargement automatique des variables d'environnement (.env)
dotenv.config();

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
  .option('-w, --wcag [standard]', 'Activer le module de vérification WCAG (ex: 2.1AA, 2.2AA, 2.0AA, AAA)', false)
  .option('-a, --ai', 'Activer l analyse ergonomique qualitative par IA (regard humain)', false)
  .option('--ai-provider <provider>', 'Fournisseur d IA pour l analyse (gemini, openai, anthropic)', 'gemini')
  .option('--ai-model <model>', 'Modèle d IA spécifique à utiliser')
  .action(async (options) => {
    const isWcagEnabled = options.wcag !== false && options.wcag !== undefined;
    const wcagStandard = typeof options.wcag === 'string' ? options.wcag : '2.1AA';
    const isAiEnabled = Boolean(options.ai);
    const aiProvider = (options.aiProvider as AiProvider) || 'gemini';

    console.log(`[Ergo-Review] Démarrage de l'audit Playwright sur : ${options.url}`);
    if (isWcagEnabled) {
      console.log(`[Ergo-Review] ♿ Module WCAG activé avec le standard : ${wcagStandard}`);
    }
    if (isAiEnabled) {
      console.log(`[Ergo-Review] 🧠 Analyse qualitative IA activée (Provider: ${aiProvider.toUpperCase()})`);
    }
    const outputDir = path.resolve(process.cwd(), options.output);
    
    try {
      const probeResult = await runPlaywrightProbe({
        url: options.url,
        outputDir,
        wcag: isWcagEnabled
          ? {
              enabled: true,
              standard: wcagStandard
            }
          : undefined,
        ai: isAiEnabled
          ? {
              enabled: true,
              provider: aiProvider,
              model: options.aiModel
            }
          : undefined
      });

      const metrics = calculateSegaScore(probeResult.findings);
      const reportData: AuditReportData = {
        target: options.url,
        date: new Date().toISOString().split('T')[0],
        segaScore: metrics.score,
        segaScoreTechnical: metrics.technicalScore,
        segaScoreGlobal: metrics.globalScore,
        findings: probeResult.findings,
        screenshots: probeResult.screenshots,
        metrics: {
          totalFindings: probeResult.findings.length,
          ...metrics
        },
        wcag: probeResult.wcag,
        aiAnalysis: probeResult.aiAnalysis
      };

      const markdown = buildMarkdownReport(reportData);
      const reportPath = path.join(outputDir, 'AUDIT_REPORT.md');
      fs.writeFileSync(reportPath, markdown, 'utf-8');

      if (probeResult.wcag) {
        const wcagJsonPath = path.join(outputDir, 'WCAG_REPORT.json');
        fs.writeFileSync(wcagJsonPath, JSON.stringify(probeResult.wcag, null, 2), 'utf-8');
      }

      if (probeResult.aiAnalysis) {
        const aiJsonPath = path.join(outputDir, 'AI_ANALYSIS.json');
        fs.writeFileSync(aiJsonPath, JSON.stringify(probeResult.aiAnalysis, null, 2), 'utf-8');
      }

      console.log(`[Ergo-Review] ✅ Audit terminé !`);
      if (probeResult.aiAnalysis) {
        console.log(`[Ergo-Review] Score SEGA Global : ${metrics.globalScore}/100 | Score Technique : ${metrics.technicalScore}/100`);
        console.log(`[Ergo-Review] 🧠 Constats qualitatifs IA : ${probeResult.aiAnalysis.findings.length} (${probeResult.aiAnalysis.provider.toUpperCase()} / ${probeResult.aiAnalysis.model})`);
      } else {
        console.log(`[Ergo-Review] Score SEGA : ${metrics.score}/100`);
      }
      if (probeResult.wcag) {
        console.log(
          `[Ergo-Review] ♿ Taux de conformité ${probeResult.wcag.standard} : ${probeResult.wcag.complianceRate}% (${probeResult.wcag.violationsCount} violation(s))`
        );
      }
      if (probeResult.screenshots.desktopAnnotated) {
        console.log(
          `[Ergo-Review] 📸 Marqueurs visuels : ${probeResult.screenshots.annotatedSnippets?.length || 0} snippet(s) et cartographie générés dans ${outputDir}/screenshots`
        );
      }
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
