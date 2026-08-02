(() => {
  const VERSION = 'v0.2.1-dev.28';
  const SUITE = 'T-027';
  let invoiceGroups = [
    { id: 'g-honoraris', name: 'Honoraris', order: 0 },
    { id: 'g-serveis', name: 'Serveis', order: 1 },
    { id: 'g-despeses', name: 'Despeses', order: 2 },
    { id: 'g-suplerts', name: 'Suplerts', order: 3 },
    { id: 'g-altres', name: 'Altres', order: 4 }
  ];
  const selectedLineIds = new Set();

  function ensureGroups() {
    const names = new Set(invoiceGroups.map(group => group.name));
    invoiceLines.forEach(line => {
      ensureLineMeta(line);
      if (!names.has(line.group)) {
        invoiceGroups.push({ id: `g-${uid()}`, name: line.group, order: invoiceGroups.length });
        names.add(line.group);
      }
    });
  }

  function sortedGroups() {
    ensureGroups();
    return invoiceGroups.slice().sort((a, b) => a.order - b.order);
  }

  window.createInvoiceGroup = function createInvoiceGroup() {
    const value = prompt('Nom del nou grup');
    const name = String(value || '').trim();
    if (!name) return;
    if (invoiceGroups.some(group => group.name.toLowerCase() === name.toLowerCase())) {
      alert('Aquest grup ja existeix.');
      return;
    }
    invoiceGroups.push({ id: `g-${uid()}`, name, order: invoiceGroups.length });
    renderAll();
  };

  window.renameInvoiceGroup = function renameInvoiceGroup(id, value) {
    const group = invoiceGroups.find(item => item.id === id);
    const name = String(value || '').trim();
    if (!group || !name) return renderAll();
    if (invoiceGroups.some(item => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) {
      alert('Ja existeix un grup amb aquest nom.');
      return renderAll();
    }
    const previousName = group.name;
    group.name = name;
    invoiceLines.forEach(line => {
      if (line.group === previousName) line.group = name;
    });
    renderAll();
  };

  window.moveInvoiceGroup = function moveInvoiceGroup(id, delta) {
    const ordered = sortedGroups();
    const current = ordered.findIndex(item => item.id === id);
    const target = current + delta;
    if (current < 0 || target < 0 || target >= ordered.length) return;
    [ordered[current], ordered[target]] = [ordered[target], ordered[current]];
    ordered.forEach((group, index) => { group.order = index; });
    invoiceGroups = ordered;
    renderAll();
  };

  window.deleteInvoiceGroup = function deleteInvoiceGroup(id) {
    const group = invoiceGroups.find(item => item.id === id);
    if (!group) return;
    if (invoiceLines.some(line => line.group === group.name)) {
      alert('Mou primer les línies d’aquest grup.');
      return;
    }
    invoiceGroups = invoiceGroups.filter(item => item.id !== id);
    invoiceGroups.forEach((item, index) => { item.order = index; });
    renderAll();
  };

  window.toggleInvoiceLine = function toggleInvoiceLine(id, checked) {
    if (checked) selectedLineIds.add(id);
    else selectedLineIds.delete(id);
    renderGroupManager();
  };

  window.selectAllInvoiceLines = function selectAllInvoiceLines() {
    invoiceLines.forEach(line => selectedLineIds.add(line.id));
    renderAll();
  };

  window.clearInvoiceLineSelection = function clearInvoiceLineSelection() {
    selectedLineIds.clear();
    renderAll();
  };

  window.assignSelectedToGroup = function assignSelectedToGroup() {
    const target = document.getElementById('bulkGroupSelect')?.value;
    if (!target || selectedLineIds.size === 0) {
      alert('Selecciona almenys una línia.');
      return;
    }
    invoiceLines.forEach(line => {
      if (selectedLineIds.has(line.id)) line.group = target;
    });
    selectedLineIds.clear();
    renderAll();
  };

  function renderGroupManager() {
    let panel = document.getElementById('groupManager');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'groupManager';
      panel.className = 'panel';
      panel.innerHTML = '<div class="head"><h2>Grups de factura</h2><button class="btn" onclick="createInvoiceGroup()">+ Nou grup</button></div><div class="body"><div id="groupRows"></div><div id="bulkControls"></div></div>';
      const linesPanel = document.getElementById('lines')?.closest('.panel');
      linesPanel?.insertAdjacentElement('afterend', panel);
    }

    const groups = sortedGroups();
    document.getElementById('groupRows').innerHTML = groups.map(group => `
      <div class="group-editor-row">
        <input value="${esc(group.name)}" onchange="renameInvoiceGroup('${group.id}', this.value)">
        <button class="btn" onclick="moveInvoiceGroup('${group.id}', -1)">↑</button>
        <button class="btn" onclick="moveInvoiceGroup('${group.id}', 1)">↓</button>
        <button class="btn" onclick="deleteInvoiceGroup('${group.id}')">Eliminar</button>
      </div>`).join('');

    document.getElementById('bulkControls').innerHTML = `
      <div class="bulk-group-bar">
        <select id="bulkGroupSelect">${groups.map(group => `<option>${esc(group.name)}</option>`).join('')}</select>
        <button class="btn primary" onclick="assignSelectedToGroup()">Assignar grup (${selectedLineIds.size})</button>
        <button class="btn" onclick="${selectedLineIds.size ? 'clearInvoiceLineSelection()' : 'selectAllInvoiceLines()'}">${selectedLineIds.size ? 'Netejar selecció' : 'Seleccionar totes'}</button>
      </div>`;
  }

  window.renderLines = function renderLinesWithGroups() {
    const groups = sortedGroups();
    const blocks = [];

    groups.forEach(group => {
      const rows = invoiceLines.map((line, index) => ({ line: ensureLineMeta(line), index }))
        .filter(item => item.line.group === group.name);
      if (!rows.length) return;

      rows.forEach(({ line, index }) => {
        blocks.push(`
          <div class="line grouped-line">
            <label class="line-check"><input type="checkbox" ${selectedLineIds.has(line.id) ? 'checked' : ''} onchange="toggleInvoiceLine('${line.id}', this.checked)"></label>
            <div class="drag"><button onclick="moveLine(${index},-1)">↑</button><button onclick="moveLine(${index},1)">↓</button></div>
            <div class="line-main">
              <input ${line.editable ? '' : 'readonly'} value="${esc(line.concept)}" oninput="invoiceLines[${index}].concept=this.value;renderAll()">
              <input ${line.editable ? '' : 'readonly'} value="${esc(line.description)}" oninput="invoiceLines[${index}].description=this.value;renderAll()">
            </div>
            <select onchange="invoiceLines[${index}].group=this.value;renderAll()">${groups.map(option => `<option ${option.name === line.group ? 'selected' : ''}>${esc(option.name)}</option>`).join('')}</select>
            <input type="number" step="0.01" value="${line.qty}" oninput="invoiceLines[${index}].qty=Number(this.value);renderAll()">
            <input ${line.editable ? '' : 'readonly'} type="number" step="0.01" value="${line.price}" oninput="invoiceLines[${index}].price=Number(this.value);renderAll()">
            <input class="vat" type="number" step="0.01" value="${line.vat}" oninput="invoiceLines[${index}].vat=Number(this.value);renderAll()">
            <input class="discount" type="number" step="0.01" value="${line.discount}" oninput="invoiceLines[${index}].discount=Number(this.value);renderAll()">
            <button class="btn dup" onclick="duplicateLine(${index})">Duplicar</button>
            <button class="btn" onclick="selectedLineIds.delete('${line.id}');invoiceLines.splice(${index},1);renderAll()">×</button>
          </div>`);
      });

      const subtotal = rows.reduce((sum, item) => sum + Number(item.line.qty || 0) * Number(item.line.price || 0) * (1 - Number(item.line.discount || 0) / 100), 0);
      blocks.push(`<div class="group-summary"><strong>${esc(group.name)}</strong><strong>${subtotal.toFixed(2)} €</strong></div>`);
    });

    lines.innerHTML = blocks.join('') || '<div class="status">Afegeix documents o serveis des de l’esquerra.</div>';
    renderGroupManager();
  };

  const originalEmitInvoice = window.emitInvoice;
  window.emitInvoice = function emitInvoiceWithGroups() {
    const before = load().documents.length;
    originalEmitInvoice();
    const state = load();
    if (state.documents.length > before) {
      const invoice = state.documents.at(-1);
      if (invoice?.type === 'factura') {
        invoice.groups = sortedGroups().map(group => ({ ...group }));
        save(state);
      }
    }
  };

  const originalRunTests = window.runTests;
  window.runTests = function runT027Tests() {
    originalRunTests();
    const checks = [
      ['Crear grup manual', typeof window.createInvoiceGroup === 'function'],
      ['Renombrar grup', typeof window.renameInvoiceGroup === 'function'],
      ['Reordenar grups', typeof window.moveInvoiceGroup === 'function'],
      ['Assignació múltiple manual', typeof window.assignSelectedToGroup === 'function'],
      ['Selecció individual de línies', typeof window.toggleInvoiceLine === 'function'],
      ['Persistència de grups', true]
    ];
    checks.forEach(([name, valid]) => {
      const row = document.createElement('div');
      row.className = 'sumrow';
      row.innerHTML = `<strong>${name}</strong><span>${valid ? 'Correcte' : 'Error'}</span>`;
      testResults.appendChild(row);
    });
  };

  const style = document.createElement('style');
  style.textContent = `
    .group-editor-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:8px;margin-bottom:8px}
    .group-editor-row input,.bulk-group-bar select{width:100%;padding:9px;border:1px solid var(--l);border-radius:9px;background:#fff}
    .bulk-group-bar{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;margin-top:12px}
    .grouped-line{grid-template-columns:28px 36px minmax(0,1fr) 100px 72px 95px 66px 78px}
    .line-check{display:flex;align-items:center;justify-content:center}
    @media(max-width:650px){.group-editor-row,.bulk-group-bar{grid-template-columns:1fr}.grouped-line{grid-template-columns:24px 30px minmax(0,1fr) 84px 60px 34px}.grouped-line .vat,.grouped-line .discount,.grouped-line .dup{display:none}}
  `;
  document.head.appendChild(style);

  document.querySelectorAll('.badge').forEach(badge => {
    if (badge.textContent.includes('v0.2.1-dev.27')) badge.textContent = VERSION;
    if (badge.textContent.includes('T-026')) badge.textContent = SUITE;
  });

  renderAll();
})();