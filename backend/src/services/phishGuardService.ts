/**
 * PhishGuard Security Service
 * Heuristic & signature-based threat analysis engine for incoming network telemetry,
 * URLs, suspicious domains, and command injection patterns.
 */

export interface ThreatAnalysisResult {
  isThreat: boolean;
  threatLevel: 'SAFE' | 'LOW' | 'SUSPICIOUS' | 'CRITICAL';
  score: number; // 0 to 100
  reasons: string[];
  analyzedAt: string;
}

export class PhishGuardService {
  private static readonly SUSPICIOUS_KEYWORDS = [
    'login-verify',
    'security-update',
    'bank-confirm',
    'account-recovery',
    'password-reset-alert',
    'free-crypto',
    'wallet-connect-auth',
    'irs-tax-refund',
  ];

  private static readonly SUSPICIOUS_TLDS = [
    '.xyz',
    '.top',
    '.work',
    '.click',
    '.loan',
    '.gq',
    '.cf',
    '.tk',
  ];

  private static readonly INJECTION_PATTERNS = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL comment / quote markers
    /(<script.*?>.*?<\/script>)/i,      // XSS script tags
    /(javascript:)/i,                   // XSS URI scheme
    /(eval\(|exec\(|system\(|passthru\()/i, // Command injection
    /(\.\.\/|\.\.\\)/,                  // Path traversal
  ];

  /**
   * Evaluates a URL or domain string for phishing and spoofing indicators.
   */
  public static analyzeUrl(targetUrl: string): ThreatAnalysisResult {
    let score = 0;
    const reasons: string[] = [];

    if (!targetUrl || typeof targetUrl !== 'string') {
      return {
        isThreat: false,
        threatLevel: 'SAFE',
        score: 0,
        reasons: ['No input provided'],
        analyzedAt: new Date().toISOString(),
      };
    }

    const lowerUrl = targetUrl.toLowerCase();

    // 1. IP address in hostname (often used by malicious actors)
    const ipHostRegex = /(?:https?:\/\/)?(\d{1,3}\.){3}\d{1,3}(?::\d+)?(\/.*)?$/;
    if (ipHostRegex.test(lowerUrl)) {
      score += 45;
      reasons.push('URL utilizes a raw IP address instead of a domain name');
    }

    // 2. Suspicious TLD check
    for (const tld of this.SUSPICIOUS_TLDS) {
      if (lowerUrl.includes(tld)) {
        score += 25;
        reasons.push(`Domain uses high-abuse top-level domain: ${tld}`);
        break;
      }
    }

    // 3. Phishing heuristic keywords
    for (const kw of this.SUSPICIOUS_KEYWORDS) {
      if (lowerUrl.includes(kw)) {
        score += 35;
        reasons.push(`URL contains deceptive social engineering keyword: "${kw}"`);
      }
    }

    // 4. Excessive subdomain nesting (e.g. secure.bank.com.fake-server.xyz)
    try {
      const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`);
      const parts = parsed.hostname.split('.');
      if (parts.length > 4) {
        score += 20;
        reasons.push(`High subdomain depth (${parts.length} levels) detected`);
      }
    } catch {
      score += 15;
      reasons.push('Malformed URL structure');
    }

    // Determine final threat level
    let threatLevel: ThreatAnalysisResult['threatLevel'] = 'SAFE';
    if (score >= 70) threatLevel = 'CRITICAL';
    else if (score >= 40) threatLevel = 'SUSPICIOUS';
    else if (score >= 20) threatLevel = 'LOW';

    return {
      isThreat: score >= 40,
      threatLevel,
      score: Math.min(score, 100),
      reasons,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Scans a textual payload or sensor alert log for injection and exploit signatures.
   */
  public static scanPayload(payloadText: string): ThreatAnalysisResult {
    let score = 0;
    const reasons: string[] = [];

    if (!payloadText || typeof payloadText !== 'string') {
      return {
        isThreat: false,
        threatLevel: 'SAFE',
        score: 0,
        reasons: ['Clean input'],
        analyzedAt: new Date().toISOString(),
      };
    }

    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(payloadText)) {
        score += 40;
        reasons.push(`Detected malicious pattern signature: ${pattern.toString()}`);
      }
    }

    let threatLevel: ThreatAnalysisResult['threatLevel'] = 'SAFE';
    if (score >= 70) threatLevel = 'CRITICAL';
    else if (score >= 40) threatLevel = 'SUSPICIOUS';
    else if (score >= 20) threatLevel = 'LOW';

    return {
      isThreat: score >= 40,
      threatLevel,
      score: Math.min(score, 100),
      reasons,
      analyzedAt: new Date().toISOString(),
    };
  }
}
