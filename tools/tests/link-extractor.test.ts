import { describe, it, expect } from 'vitest';
import { normalizeUrl, isValidCrawlTarget } from '../src/crawler/link-extractor';

describe('Link Extractor & URL Normalization', () => {
  it('normalizes URLs by removing hashes and tracking parameters', () => {
    const raw = 'https://example.com/products/?utm_source=newsletter&utm_medium=email#section';
    const normalized = normalizeUrl(raw);
    expect(normalized).toBe('https://example.com/products');
  });

  it('handles relative URLs correctly with base URL', () => {
    const relative = '/contact';
    const normalized = normalizeUrl(relative, 'https://example.com/home');
    expect(normalized).toBe('https://example.com/contact');
  });

  it('rejects unsupported protocols (javascript:, mailto:, tel:)', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('mailto:contact@example.com')).toBeNull();
    expect(normalizeUrl('tel:+33123456789')).toBeNull();
  });

  it('enforces same-origin policy when required', () => {
    const startOrigin = 'https://example.com';
    expect(isValidCrawlTarget('https://example.com/about', startOrigin, { sameOrigin: true })).toBe(true);
    expect(isValidCrawlTarget('https://other.com/about', startOrigin, { sameOrigin: true })).toBe(false);
    expect(isValidCrawlTarget('https://other.com/about', startOrigin, { sameOrigin: false })).toBe(true);
  });

  it('filters out binary and media extensions', () => {
    const origin = 'https://example.com';
    expect(isValidCrawlTarget('https://example.com/brochure.pdf', origin)).toBe(false);
    expect(isValidCrawlTarget('https://example.com/archive.zip', origin)).toBe(false);
    expect(isValidCrawlTarget('https://example.com/logo.png', origin)).toBe(false);
    expect(isValidCrawlTarget('https://example.com/video.mp4', origin)).toBe(false);
    expect(isValidCrawlTarget('https://example.com/page.html', origin)).toBe(true);
  });

  it('respects disallowed patterns regex', () => {
    const origin = 'https://example.com';
    expect(
      isValidCrawlTarget('https://example.com/admin/settings', origin, {
        disallowedPatterns: ['/admin/.*']
      })
    ).toBe(false);
  });
});
