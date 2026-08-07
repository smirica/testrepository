const STORAGE_KEY = 'reading-gator:draft';
const HISTORY_KEY = 'reading-gator:history';

const elements = {};
let selectedFile = null;
let selectedText = '';

function $(id) {
  return document.getElementById(id);
}

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getTemplateValues() {
  return {
    documentTitle: elements.documentTitle.value.trim(),
    customerName: elements.customerName.value.trim(),
    referenceNumber: elements.referenceNumber.value.trim(),
    issueDate: elements.issueDate.value.trim(),
    totalAmount: elements.totalAmount.value.trim(),
    summary: elements.summary.value.trim(),
    notes: elements.notes.value.trim(),
  };
}

function applyTemplate(template) {
  elements.documentTitle.value = template?.documentTitle ?? '';
  elements.customerName.value = template?.customerName ?? '';
  elements.referenceNumber.value = template?.referenceNumber ?? '';
  elements.issueDate.value = template?.issueDate ?? '';
  elements.totalAmount.value = template?.totalAmount ?? '';
  elements.summary.value = template?.summary ?? '';
  elements.notes.value = template?.notes ?? '';
}

function renderHighlights(lines) {
  const list = elements.highlights;
  list.innerHTML = '';

  if (!lines || !lines.length) {
    list.innerHTML = '<li>No extraction preview yet.</li>';
    return;
  }

  lines.forEach((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    list.appendChild(item);
  });
}

function renderDiagnostics(payload) {
  const diagnostics = payload?.diagnostics ?? {};
  elements.diagnostics.innerHTML = [
    payload?.kind ? `Document kind: ${payload.kind}` : 'Document kind: not detected yet.',
    diagnostics.lineCount ? `Lines analyzed: ${diagnostics.lineCount}` : 'Lines analyzed: 0',
    diagnostics.characterCount ? `Characters analyzed: ${diagnostics.characterCount}` : 'Characters analyzed: 0',
    diagnostics.analyzedAt ? `Analyzed at: ${new Date(diagnostics.analyzedAt).toLocaleString()}` : 'Analyzed at: not yet',
  ].map((line) => `<div>${line}</div>`).join('');
}

function renderMemorySummary() {
  const history = readStorage(HISTORY_KEY, []);
  if (!history.length) {
    elements.memorySummary.textContent = 'No saved drafts yet. Edits will stay in this browser once you save.';
    return;
  }

  const latest = history[0];
  elements.memorySummary.innerHTML = `
    <strong>${latest.template?.documentTitle || latest.fileName || 'Draft'}</strong><br />
    Saved from ${latest.fileName || 'unknown file'} at ${new Date(latest.savedAt).toLocaleString()}.
  `;
}

function saveDraft() {
  const draft = {
    fileName: selectedFile?.name ?? '',
    template: getTemplateValues(),
    updatedAt: new Date().toISOString(),
  };

  writeStorage(STORAGE_KEY, draft);

  const history = readStorage(HISTORY_KEY, []);
  history.unshift({
    fileName: draft.fileName,
    template: draft.template,
    savedAt: draft.updatedAt,
  });
  writeStorage(HISTORY_KEY, history.slice(0, 5));
  renderMemorySummary();
}

function downloadJson() {
  const payload = {
    fileName: selectedFile?.name ?? '',
    template: getTemplateValues(),
    sourceTextPreview: selectedText.slice(0, 1000),
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(payload.template.documentTitle || 'reading-gator-template').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openPrintView() {
  const template = getTemplateValues();
  const previewWindow = window.open('', '_blank', 'width=1100,height=900');

  if (!previewWindow) {
    window.alert('Pop-up blocked. Please allow pop-ups to export the print view.');
    return;
  }

  previewWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${template.documentTitle || 'Reading Gator Template'}</title>
        <style>
          body { font-family: Georgia, serif; margin: 40px; color: #132126; }
          h1 { margin-bottom: 6px; }
          .muted { color: #5f6d73; }
          .block { margin: 18px 0; padding: 16px; border: 1px solid #ddd; border-radius: 12px; }
          dt { font-weight: 700; margin-top: 10px; }
          dd { margin: 4px 0 0; }
          @media print { body { margin: 20mm; } }
        </style>
      </head>
      <body>
        <h1>${template.documentTitle || 'Reading Gator Template'}</h1>
        <p class="muted">Use your browser’s print dialog to save this view as a PDF.</p>
        <div class="block">
          <dl>
            <dt>Customer</dt><dd>${template.customerName || '—'}</dd>
            <dt>Reference</dt><dd>${template.referenceNumber || '—'}</dd>
            <dt>Issue date</dt><dd>${template.issueDate || '—'}</dd>
            <dt>Total amount</dt><dd>${template.totalAmount || '—'}</dd>
            <dt>Summary</dt><dd>${template.summary || '—'}</dd>
            <dt>Notes</dt><dd>${template.notes || '—'}</dd>
          </dl>
        </div>
      </body>
    </html>
  `);
  previewWindow.document.close();
  previewWindow.focus();
  previewWindow.print();
}

async function analyzeDocument() {
  if (!selectedFile) {
    window.alert('Choose a text-based file first.');
    return;
  }

  elements.analysisStatus.textContent = 'Extracting…';
  const allowedTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv', ''];
  if (!allowedTypes.includes(selectedFile.type) && !/\.(txt|md|markdown|csv|json|log)$/i.test(selectedFile.name)) {
    elements.analysisStatus.textContent = 'Unsupported file type for this slice';
    window.alert('This first slice currently reads text-based files only. Please use .txt, .md, .csv, or .json for now.');
    return;
  }

  selectedText = await selectedFile.text();
  const response = await fetch('/api/analyze-document', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: selectedFile.name,
      content: selectedText,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }

  applyTemplate(payload.template);
  renderHighlights(payload.highlights);
  renderDiagnostics(payload);
  elements.analysisStatus.textContent = 'Template extracted';
  saveDraft();
}

function resetDraft() {
  selectedFile = null;
  selectedText = '';
  elements.documentInput.value = '';
  elements.selectedFileName.textContent = 'None yet';
  elements.analysisStatus.textContent = 'Waiting for upload';
  applyTemplate({});
  renderHighlights([]);
  elements.diagnostics.innerHTML = '';
}

function bindAutosave() {
  Object.values(elements)
    .filter((element) => element && ['INPUT', 'TEXTAREA'].includes(element.tagName))
    .forEach((element) => {
      element.addEventListener('input', () => saveDraft());
    });
}

function hydrateDraft() {
  const savedDraft = readStorage(STORAGE_KEY, null);
  if (savedDraft?.template) {
    applyTemplate(savedDraft.template);
    renderMemorySummary();
  }
}

async function initialize() {
  elements.documentInput = $( 'documentInput' );
  elements.selectedFileName = $( 'selectedFileName' );
  elements.analysisStatus = $( 'analysisStatus' );
  elements.analyzeButton = $( 'analyzeButton' );
  elements.resetButton = $( 'resetButton' );
  elements.documentTitle = $( 'documentTitle' );
  elements.customerName = $( 'customerName' );
  elements.referenceNumber = $( 'referenceNumber' );
  elements.issueDate = $( 'issueDate' );
  elements.totalAmount = $( 'totalAmount' );
  elements.summary = $( 'summary' );
  elements.notes = $( 'notes' );
  elements.highlights = $( 'highlights' );
  elements.memorySummary = $( 'memorySummary' );
  elements.diagnostics = $( 'diagnostics' );
  elements.saveButton = $( 'saveButton' );
  elements.exportJsonButton = $( 'exportJsonButton' );
  elements.exportPdfButton = $( 'exportPdfButton' );

  bindAutosave();
  hydrateDraft();
  renderMemorySummary();

  elements.documentInput.addEventListener('change', () => {
    selectedFile = elements.documentInput.files?.[0] ?? null;
    elements.selectedFileName.textContent = selectedFile ? selectedFile.name : 'None yet';
    elements.analysisStatus.textContent = selectedFile ? 'Ready to extract' : 'Waiting for upload';
    elements.analyzeButton.disabled = !selectedFile;
  });

  elements.analyzeButton.addEventListener('click', () => {
    analyzeDocument().catch((error) => {
      console.error(error);
      elements.analysisStatus.textContent = 'Extraction failed';
      window.alert(error.message || 'Unable to extract template.');
    });
  });

  elements.resetButton.addEventListener('click', resetDraft);
  elements.saveButton.addEventListener('click', saveDraft);
  elements.exportJsonButton.addEventListener('click', downloadJson);
  elements.exportPdfButton.addEventListener('click', openPrintView);
}

window.addEventListener('DOMContentLoaded', initialize);
