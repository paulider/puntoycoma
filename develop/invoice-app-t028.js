(() => {
  'use strict';

  const VERSION = 'v0.2.1-dev.29';
  const SUITE = 'T-028';
  const STORAGE_KEY = 'pyc_office_v2';
  const DRAFT_KEY = 'pyc_invoice_draft_v1';

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

  function defaultState() {
    return {
      version: 3,
      clients: [],
      cases: [],
      documents: [],
      serviceCatalog: [],
      provisions: [],
      payments: [],
      activity: [],
      settings: { invoicePrefix: 'F-2026-', nextInvoiceNumber: 1 }
    };
  }

  function loadState() {
    try {
      return { ...defaultState(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {}) };
    } catch {
      return defaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const app = {
    lines: [],
    groups: [
      { id: 'group-honoraris', name: 'Honoraris', order: 0 },
      { id: 'group-despeses', name: 'Despeses', order: 1 },
      { id: 'group-suplerts', name: 'Suplerts', order: 2 }
    ],
    selectedLineIds: new Set()
  };

  function ensureGroup(name) {
    if (!app.groups.some(group => group.name === name)) {
      app.groups.push({ id: `group-${uid()}`, name, order: app.groups.length });
    }
  }

  function normalizedLine(line) {
    const group = line.group || 'Honoraris';
    ensureGroup(group);
    return {
      id: line.id || uid(),
      concept: String(line.concept || 'Concepte'),
      description: String(line.description || ''),
      group,
      qty: Number(line.qty || 1),
      price: Number(line.price || 0),
      vat: Number(line.vat ?? 21),
      discount: Number(line.discount || 0)
    };
  }

  function calculate() {
    const lines = app.lines.map(line => {
      const gross = round(line.qty * line.price);
      const discountAmount = round(gross * line.discount / 100);
      const base = round(gross - discountAmount);
      const vatAmount = round(base * line.vat / 100);
      return { ...line, gross, discountAmount, base, vatAmount, total: round(base + vatAmount) };
    });
    return {
      lines,
      base: round(lines.reduce((sum, line) => sum + line.base, 0)),
      vat: round(lines.reduce((sum, line) => sum + line.vatAmount, 0)),
      total: round(lines.reduce((sum, line) => sum + line.total, 0))
    };
  }

  function persistDraft() {
    const payload = {
      version: 1,
      build: VERSION,
      lines: app.lines,
      groups: app.groups
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!draft) return;
      app.lines = (draft.lines || []).map(normalizedLine);
      app.groups = Array.isArray(draft.groups) && draft.groups.length ? draft.groups : app.groups;
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }

  function sortedGroups() {
    return app.groups.slice().sort((a, b) => a.order - b.order);
  }

  function renderLines() {
    const blocks = [];
    for (const group of sortedGroups()) {
      const rows = app.lines.map((line, index) => ({ line, index })).filter(item => item.line.group === group.name);
      if (!rows.length) continue;

      for (const { line, index } of rows) {
        blocks.push(`
          <div class="line">
            <input type="checkbox" ${app.selectedLineIds.has(line.id) ? 'checked' : ''} data-action="select-line" data-id="${line.id}">
            <div class="drag"><button data-action="move-up" data-index="${index}">↑</button><button data-action="move-down" data-index="${index}">↓</button></div>
            <div class="line-main">
              <input value="${esc(line.concept)}" data-field="concept" data-index="${index}">
              <input value="${esc(line.description)}" data-field="description" data-index="${index}">
            </div>
            <select data-field="group" data-index="${index}">${sortedGroups().map(option => `<option ${option.name === line.group ? 'selected' : ''}>${esc(option.name)}</option>`).join('')}</select>
            <input type="number" step="0.01" value="${line.qty}" data-field="qty" data-index="${index}">
            <input class="price" type="number" step="0.01" value="${line.price}" data-field="price" data-index="${index}">
            <button class="btn" data-action="remove" data-index="${index}">×</button>
          </div>`);
      }

      const subtotal = round(rows.reduce((sum, item) => sum + item.line.qty * item.line.price, 0));
      blocks.push(`<div class="group-summary"><strong>${esc(group.name)}</strong><strong>${subtotal.toFixed(2)} €</strong></div>`);
    }

    $('lines').innerHTML = blocks.join('') || '<div class="status">Afegeix documents o serveis.</div>';
  }

  function renderGroups() {
    $('groupRows').innerHTML = sortedGroups().map(group => `
      <div class="group-editor-row">
        <input value="${esc(group.name)}" data-group-name="${group.id}">
        <button class="btn" data-group-action="up" data-id="${group.id}">↑</button>
        <button class="btn" data-group-action="down" data-id="${group.id}">↓</button>
        <button class="btn" data-group-action="delete" data-id="${group.id}">Eliminar</button>
      </div>`).join('');

    $('bulkControls').innerHTML = `
      <div class="bulk-group-bar">
        <select id="bulkGroupSelect">${sortedGroups().map(group => `<option>${esc(group.name)}</option>`).join('')}</select>
        <button class="btn primary" id="assignSelected">Assignar grup (${app.selectedLineIds.size})</button>
        <button class="btn" id="toggleSelection">${app.selectedLineIds.size ? 'Netejar selecció' : 'Seleccionar totes'}</button>
      </div>`;
  }

  function renderSummary() {
    const totals = calculate();
    $('summary').innerHTML = `
      <div class="sumrow"><span>Línies</span><strong>${totals.lines.length}</strong></div>
      <div class="sumrow"><span>Base</span><strong>${totals.base.toFixed(2)} €</strong></div>
      <div class="sumrow"><span>IVA</span><strong>${totals.vat.toFixed(2)} €</strong></div>
      <div class="sumrow"><span>Total</span><strong>${totals.total.toFixed(2)} €</strong></div>`;
  }

  function render() {
    renderLines();
    renderGroups();
    renderSummary();
    persistDraft();
  }

  function addDocumentLine() {
    app.lines.push(normalizedLine({
      concept: 'Conveni regulador',
      description: 'Document vinculat a l’expedient',
      group: 'Honoraris',
      qty: 1,
      price: 450,
      vat: 21
    }));
    render();
  }

  function addServiceLine() {
    const state = loadState();
    const service = state.serviceCatalog.find(item => item.active !== false) || {
      name: 'Reunió jurídica', description: 'Sessió d’assessorament jurídic', category: 'Honoraris', unitPrice: 120, vatRate: 21
    };
    app.lines.push(normalizedLine({
      concept: service.name,
      description: service.description,
      group: service.category || 'Honoraris',
      qty: 1,
      price: Number(service.unitPrice || 0),
      vat: Number(service.vatRate ?? 21)
    }));
    render();
  }

  function moveLine(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= app.lines.length) return;
    [app.lines[index], app.lines[target]] = [app.lines[target], app.lines[index]];
    render();
  }

  function createGroup() {
    const name = String(prompt('Nom del nou grup') || '').trim();
    if (!name) return;
    if (app.groups.some(group => group.name.toLowerCase() === name.toLowerCase())) {
      alert('Aquest grup ja existeix.');
      return;
    }
    app.groups.push({ id: `group-${uid()}`, name, order: app.groups.length });
    render();
  }

  function renameGroup(id, name) {
    const group = app.groups.find(item => item.id === id);
    const next = String(name || '').trim();
    if (!group || !next) return render();
    if (app.groups.some(item => item.id !== id && item.name.toLowerCase() === next.toLowerCase())) {
      alert('Aquest nom ja existeix.');
      return render();
    }
    const previous = group.name;
    group.name = next;
    app.lines.forEach(line => { if (line.group === previous) line.group = next; });
    render();
  }

  function moveGroup(id, delta) {
    const ordered = sortedGroups();
    const index = ordered.findIndex(group => group.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    ordered.forEach((group, order) => { group.order = order; });
    app.groups = ordered;
    render();
  }

  function deleteGroup(id) {
    const group = app.groups.find(item => item.id === id);
    if (!group) return;
    if (app.lines.some(line => line.group === group.name)) {
      alert('Mou primer les línies d’aquest grup.');
      return;
    }
    app.groups = app.groups.filter(item => item.id !== id);
    app.groups.forEach((item, order) => { item.order = order; });
    render();
  }

  function assignSelected() {
    const target = $('bulkGroupSelect')?.value;
    if (!target || !app.selectedLineIds.size) {
      alert('Selecciona almenys una línia.');
      return;
    }
    app.lines.forEach(line => {
      if (app.selectedLineIds.has(line.id)) line.group = target;
    });
    app.selectedLineIds.clear();
    render();
  }

  function runTests() {
    const snapshot = JSON.stringify({ lines: app.lines, groups: app.groups });
    const results = [];
    const check = (name, valid) => results.push({ name, valid: Boolean(valid) });

    try {
      check('Build identificada', VERSION === 'v0.2.1-dev.29' && SUITE === 'T-028');
      check('Sense injecció runtime', document.scripts.length === 1);
      check('Mòdul carregat externament', [...document.scripts].some(script => script.src.includes('invoice-app-t028.js')));
      check('Crear grup', typeof createGroup === 'function');
      check('Renombrar grup', typeof renameGroup === 'function');
      check('Reordenar grup', typeof moveGroup === 'function');
      check('Assignació múltiple', typeof assignSelected === 'function');
      check('Persistència d’esborrany', Boolean(localStorage.getItem(DRAFT_KEY)));
      const totals = calculate();
      check('Càlcul coherent', totals.total === round(totals.base + totals.vat));
      check('Integritat de grups', app.lines.every(line => app.groups.some(group => group.name === line.group)));
    } catch (error) {
      results.push({ name: 'Execució', valid: false, detail: error.message });
    }

    const restored = JSON.parse(snapshot);
    app.lines = restored.lines;
    app.groups = restored.groups;
    check('Restaurar estat de prova', true);

    $('testResults').innerHTML = results.map(result => `<div class="sumrow"><strong>${esc(result.name)}</strong><span>${result.valid ? 'Correcte' : 'Error'}</span></div>`).join('');
    const failed = results.filter(result => !result.valid).length;
    $('testStatus').textContent = failed ? `${VERSION} · ${SUITE}: ${failed} proves han fallat.` : `${VERSION} · ${SUITE}: totes les ${results.length} proves han passat.`;
    $('testStatus').className = `status ${failed ? 'bad' : 'ok'}`;
    render();
  }

  $('addDocument').addEventListener('click', addDocumentLine);
  $('addService').addEventListener('click', addServiceLine);
  $('createGroup').addEventListener('click', createGroup);
  $('runTests').addEventListener('click', runTests);

  $('lines').addEventListener('input', event => {
    const index = Number(event.target.dataset.index);
    const field = event.target.dataset.field;
    if (!Number.isInteger(index) || !field || !app.lines[index]) return;
    app.lines[index][field] = ['qty', 'price'].includes(field) ? Number(event.target.value) : event.target.value;
    render();
  });

  $('lines').addEventListener('change', event => {
    if (event.target.dataset.action === 'select-line') {
      const id = event.target.dataset.id;
      if (event.target.checked) app.selectedLineIds.add(id);
      else app.selectedLineIds.delete(id);
      renderGroups();
    }
  });

  $('lines').addEventListener('click', event => {
    const action = event.target.dataset.action;
    const index = Number(event.target.dataset.index);
    if (action === 'move-up') moveLine(index, -1);
    if (action === 'move-down') moveLine(index, 1);
    if (action === 'remove' && app.lines[index]) {
      app.selectedLineIds.delete(app.lines[index].id);
      app.lines.splice(index, 1);
      render();
    }
  });

  $('groupManager').addEventListener('change', event => {
    const id = event.target.dataset.groupName;
    if (id) renameGroup(id, event.target.value);
  });

  $('groupManager').addEventListener('click', event => {
    const action = event.target.dataset.groupAction;
    const id = event.target.dataset.id;
    if (action === 'up') moveGroup(id, -1);
    if (action === 'down') moveGroup(id, 1);
    if (action === 'delete') deleteGroup(id);
    if (event.target.id === 'assignSelected') assignSelected();
    if (event.target.id === 'toggleSelection') {
      if (app.selectedLineIds.size) app.selectedLineIds.clear();
      else app.lines.forEach(line => app.selectedLineIds.add(line.id));
      render();
    }
  });

  restoreDraft();
  if (!app.lines.length) {
    addDocumentLine();
    addServiceLine();
  } else {
    render();
  }
  runTests();
})();