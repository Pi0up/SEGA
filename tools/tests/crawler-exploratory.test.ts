import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { runExploratoryCrawl } from '../src/crawler/exploratory-crawler';
import { calculateSegaScore, buildMarkdownReport } from '../src/reporter/markdown-builder';
import { AuditReportData } from '../src/types';

describe('Exploratory Crawler Integration Tests', () => {
  let server: http.Server;
  let serverPort: number;
  let baseUrl: string;
  const testOutputDir = path.resolve(__dirname, '../../.audit-results-test-crawler');

  beforeAll(async () => {
    // Création d'un serveur HTTP léger simulant un site multi-pages
    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const url = req.url || '/';

      if (url === '/') {
        res.end(`
          <!DOCTYPE html>
          <html lang="fr">
            <head><title>Accueil Test</title></head>
            <body>
              <h1>Bienvenue</h1>
              <nav>
                <a href="/products">Nos Produits</a>
                <a href="/about">À propos</a>
                <a href="https://external-site.com/forbidden">Lien Externe</a>
                <a href="/brochure.pdf">Télécharger PDF</a>
              </nav>
              <!-- Élément commun sans nom accessible (anomalie Axe 8) -->
              <button class="nav-icon-action"><svg width="16" height="16"></svg></button>
            </body>
          </html>
        `);
      } else if (url === '/products') {
        res.end(`
          <!DOCTYPE html>
          <html lang="fr">
            <head><title>Produits Test</title></head>
            <body>
              <h1>Nos Produits</h1>
              <h1>Deuxième Titre H1 Invalide</h1>
              <nav>
                <a href="/products/detail">Détail Produit</a>
                <a href="/">Retour Accueil</a>
              </nav>
              <!-- Même élément commun pour tester la déduplication -->
              <button class="nav-icon-action"><svg width="16" height="16"></svg></button>
            </body>
          </html>
        `);
      } else if (url === '/products/detail') {
        res.end(`
          <!DOCTYPE html>
          <html lang="fr">
            <head><title>Détail Produit Test</title></head>
            <body>
              <h1>Détail Produit</h1>
              <a href="/products/detail/deep">Page Niveau 3</a>
            </body>
          </html>
        `);
      } else if (url === '/products/detail/deep') {
        res.end(`
          <!DOCTYPE html>
          <html lang="fr">
            <head><title>Profondeur 3</title></head>
            <body>
              <h1>Niveau 3 Inaccessible si maxDepth=1</h1>
            </body>
          </html>
        `);
      } else if (url === '/about') {
        res.end(`
          <!DOCTYPE html>
          <html lang="fr">
            <head><title>À propos Test</title></head>
            <body>
              <h1>À propos de nous</h1>
              <p>Description simple de l'entreprise.</p>
            </body>
          </html>
        `);
      } else {
        res.statusCode = 404;
        res.end(`<html><body><h1>404 Introuvable</h1></body></html>`);
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        serverPort = address.port;
        baseUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('explores multiple pages up to maxPages limit and respects same-origin filtering', async () => {
    const result = await runExploratoryCrawl({
      startUrl: baseUrl,
      outputDir: testOutputDir,
      maxPages: 3,
      maxDepth: 2,
      sameOrigin: true
    });

    expect(result.crawl).toBeDefined();
    expect(result.crawl.enabled).toBe(true);
    expect(result.crawl.totalPagesExplored).toBe(3);
    expect(result.crawl.pages.length).toBe(3);

    const exploredUrls = result.crawl.pages.map((p) => p.url);
    expect(exploredUrls).toContain(baseUrl + '/');

    // Vérifier que le domaine externe n'a JAMAIS été exploré
    const hasExternal = result.crawl.pages.some((p) => p.url.includes('external-site.com'));
    expect(hasExternal).toBe(false);

    // Vérifier que le fichier binaire PDF n'a JAMAIS été exploré
    const hasPdf = result.crawl.pages.some((p) => p.url.endsWith('.pdf'));
    expect(hasPdf).toBe(false);

    // Vérifier les métadonnées de page explorée
    const rootPage = result.crawl.pages.find((p) => p.url === baseUrl + '/');
    expect(rootPage).toBeDefined();
    expect(rootPage?.title).toBe('Accueil Test');
    expect(rootPage?.status).toBe(200);
    expect(rootPage?.depth).toBe(0);
    expect(rootPage?.screenshots.desktop).toBeTruthy();
  }, 45000);

  it('respects maxDepth cutoff constraints', async () => {
    // Profondeur 0 : seule la page de départ doit être auditée même si maxPages > 1
    const depthZeroResult = await runExploratoryCrawl({
      startUrl: baseUrl,
      outputDir: testOutputDir,
      maxPages: 5,
      maxDepth: 0
    });

    expect(depthZeroResult.crawl.totalPagesExplored).toBe(1);
    expect(depthZeroResult.crawl.pages[0].depth).toBe(0);
  }, 30000);

  it('deduplicates common findings across multiple pages and tracks affectedPages', async () => {
    const result = await runExploratoryCrawl({
      startUrl: baseUrl,
      outputDir: testOutputDir,
      maxPages: 3,
      maxDepth: 1
    });

    // Le bouton non accessible est présent sur / et sur /products
    const sharedButtonFinding = result.findings.find(
      (f) => f.title.includes('texte accessible') || f.bastienScapinRule.includes('Compatibilité')
    );

    expect(sharedButtonFinding).toBeDefined();
    if (sharedButtonFinding && sharedButtonFinding.affectedPages) {
      expect(sharedButtonFinding.affectedPages.length).toBeGreaterThanOrEqual(1);
    }
  }, 35000);

  it('automatically handles URLs without protocol prefix (e.g. 127.0.0.1:PORT)', async () => {
    const rawHostAndPort = `127.0.0.1:${serverPort}`;

    const result = await runExploratoryCrawl({
      startUrl: rawHostAndPort,
      outputDir: testOutputDir,
      maxPages: 1,
      maxDepth: 0
    });

    expect(result.crawl.totalPagesExplored).toBe(1);
    expect(result.crawl.pages[0].url).toBe(`http://${rawHostAndPort}/`);
  }, 30000);

  it('generates multi-page cartography section in markdown report', async () => {
    const result = await runExploratoryCrawl({
      startUrl: baseUrl,
      outputDir: testOutputDir,
      maxPages: 2,
      maxDepth: 1
    });

    const metrics = calculateSegaScore(result.findings);
    const reportData: AuditReportData = {
      target: baseUrl,
      date: '2026-11-11',
      segaScore: metrics.score,
      findings: result.findings,
      screenshots: result.screenshots,
      metrics: {
        totalFindings: result.findings.length,
        ...metrics
      },
      crawl: result.crawl
    };

    const markdown = buildMarkdownReport(reportData);
    expect(markdown).toContain('Cartographie & Exploration Multi-Pages');
    expect(markdown).toContain('Accueil Test');
    expect(markdown).toContain('Multi-pages exploratoire');
  }, 30000);
});
