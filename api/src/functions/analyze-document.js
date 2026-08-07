const { app } = require('@azure/functions');

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function collectLines(content) {
  return String(content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeWhitespace(match[1] ?? match[0]);
    }
  }

  return '';
}

function extractDate(text) {
  return firstMatch(text, [
    /\b(?:date|issued|created|document date|order date)[:\s-]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/i,
    /\b(\d{4}-\d{2}-\d{2})\b/,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
  ]);
}

function extractAmount(text) {
  return firstMatch(text, [
    /\b(?:grand total|total due|total|amount due|invoice total)[:\s$]+([$€£]?\s?[\d,]+(?:\.\d{2})?)\b/i,
    /([$€£]\s?[\d,]+(?:\.\d{2})?)/,
  ]);
}

function extractReference(text) {
  return firstMatch(text, [
    /\b(?:quote|quotation|order|po|purchase order|reference|ref)[:#\s-]+([A-Z0-9][A-Z0-9\-/_.]*)\b/i,
    /\b(?:quote|quotation|order|po)\s*(?:no\.?|number|#)\s*[:#\s-]*([A-Z0-9][A-Z0-9\-/_.]*)\b/i,
  ]);
}

function detectCustomer(lines, text) {
  const patterns = [
    /\b(?:customer|client|buyer|bill to|sold to)[:\s-]+(.+)$/i,
    /\b(?:customer name)[:\s-]+(.+)$/i,
  ];

  const direct = firstMatch(text, patterns);
  if (direct) {
    return direct;
  }

  for (const line of lines) {
    if (/\b(?:customer|client|buyer|bill to|sold to)\b/i.test(line)) {
      const parts = line.split(/[:\-]/);
      const candidate = normalizeWhitespace(parts.slice(1).join(':'));
      if (candidate) {
        return candidate;
      }
    }
  }

  return lines.find((line) => /^[A-Z][A-Za-z0-9&.,'\- ]{2,}$/.test(line)) ?? '';
}

function detectTitle(lines, text, fileName) {
  const fileLabel = normalizeWhitespace(fileName).replace(/\.[^.]+$/, '');
  if (fileLabel) {
    return fileLabel;
  }

  const firstLine = lines.find(Boolean);
  if (firstLine) {
    return firstLine;
  }

  return firstMatch(text, [/\b(title|document|template)[:\s-]+(.+)$/i]);
}

function detectKind(fileName, text) {
  const combined = `${fileName}\n${text}`.toLowerCase();
  if (combined.includes('purchase order') || combined.includes('po number') || combined.includes('po no')) {
    return 'purchase-order';
  }

  if (combined.includes('quotation') || combined.includes('quote')) {
    return 'quotation';
  }

  if (combined.includes('acknowledg')) {
    return 'acknowledgment';
  }

  return 'document';
}

function buildHighlights(lines) {
  return lines.slice(0, 8);
}

app.http('analyze-document', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const fileName = normalizeWhitespace(body?.fileName || 'document.txt');
      const content = String(body?.content ?? '');

      if (!content.trim()) {
        return {
          status: 400,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'No readable text was provided for analysis.' }),
        };
      }

      const lines = collectLines(content);
      const text = lines.join('\n');
      const kind = detectKind(fileName, text);
      const template = {
        documentTitle: detectTitle(lines, text, fileName),
        customerName: detectCustomer(lines, text),
        referenceNumber: extractReference(text),
        issueDate: extractDate(text),
        totalAmount: extractAmount(text),
        summary: lines.slice(0, 3).join(' '),
        notes: 'Heuristic first-pass extraction. Review and edit any field before saving.',
      };

      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          fileName,
          kind,
          template,
          highlights: buildHighlights(lines),
          diagnostics: {
            lineCount: lines.length,
            characterCount: content.length,
            analyzedAt: new Date().toISOString(),
          },
        }),
      };
    } catch (error) {
      context.log('analyze-document failed', error);
      return {
        status: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: error.message || 'Unable to analyze document.' }),
      };
    }
  },
});