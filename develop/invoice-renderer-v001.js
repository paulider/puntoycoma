(() => {
  'use strict';
  if (window.PYCInvoiceRenderer) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const money = value => `${Number(value || 0).toFixed(2)} €`;

  function issuerData(settings = {}) {
    return {
      name: settings.name || settings.legalName || settings.fiscalName || 'Julia María Rico López',
      tax: settings.tax || settings.nif || settings.vatNumber || '74011732D',
      address: settings.address || settings.fiscalAddress || 'c/ Camí Can Dori 32, 08811 Canyelles, Barcelona',
      email: settings.email || settings.billingEmail || 'info@pyc.legal',
      iban: settings.iban || settings.bankAccount || 'ES73 1465 0120 37 1773656323'
    };
  }

  function render(invoice, context = {}, clientId = '') {
    const engine = window.PYCInvoiceEngine;
    if (!engine) throw new Error('PYCInvoiceEngine is required');

    const issuer = issuerData(context.settings || {});
    const matter = context.matter || {};
    const client = clientId ? (context.clients || []).find(item => item.id === clientId) : null;
    const allocation = (invoice.allocations || []).find(item => item.clientId === clientId);
    const ratio = allocation && invoice.total ? allocation.amount / invoice.total : 1;
    const base = engine.round(Number(invoice.base || 0) * ratio);
    const vat = engine.round(Number(invoice.vat || 0) * ratio);
    const total = engine.round(Number(invoice.total || 0) * ratio);

    const rows = (invoice.lines || []).map(line => {
      const calculated = engine.calculateLine(line);
      return `<tr><td>${esc(line.concept)}</td><td>${esc(line.description || '')}</td><td class="n">${calculated.qty.toFixed(2)}</td><td class="n">${money(calculated.price * ratio)}</td><td class="n">${money(calculated.base * ratio)}</td></tr>`;
    }).join('');

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(invoice.number || 'Factura')}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#eee;font-family:Arial,sans-serif;color:#282125}.bar{position:sticky;top:0;background:#6b1730;color:#fff;padding:12px;text-align:center}.bar button{font:600 16px -apple-system,sans-serif;padding:11px 16px;border:0;border-radius:10px;margin:0 4px}.page{width:210mm;min-height:297mm;margin:12px auto;background:#fff;padding:18mm 17mm}.head{display:flex;justify-content:space-between}.brand{font:600 21px Georgia,serif;letter-spacing:.12em;color:#6b1730}.title{text-align:right}.title h1{font:500 24px Georgia,serif;letter-spacing:.14em;margin:0}.rule{border-top:1px solid #ddd;margin:12mm 0 9mm}.parties{display:grid;grid-template-columns:1fr 1fr;gap:18mm;font-size:9px;line-height:1.55;margin-bottom:10mm}.parties small{display:block;color:#8c777f;text-transform:uppercase;letter-spacing:.15em;margin-bottom:5px}table{width:100%;border-collapse:collapse;font-size:9px}th,td{padding:9px;border-bottom:1px solid #e8e1dd;text-align:left}th{background:#f6f2ee;text-transform:uppercase;font-size:7px}.n{text-align:right}.totals{width:42%;margin:10mm 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:7px 10px}.grand{background:#f2ece7;color:#6b1730;font:700 17px Georgia,serif}@media print{body{background:#fff}.bar{display:none}.page{margin:0}}</style></head><body><div class="bar"><button onclick="print()">Guardar / imprimir PDF</button><button onclick="close()">Tancar</button></div><article class="page"><div class="head"><div><div class="brand">PUNTO Y COMA</div><div>LEGAL OFFICE</div></div><div class="title"><h1>FACTURA</h1><strong>${esc(invoice.number || '')}${client ? ` · ${esc(client.name || '')}` : ''}</strong></div></div><div class="rule"></div><div class="parties"><div><small>Emissor</small><strong>${esc(issuer.name)}</strong><br>NIF: ${esc(issuer.tax)}<br>${esc(issuer.address)}<br>${esc(issuer.email)}<br>IBAN: ${esc(issuer.iban)}</div><div><small>Client</small><strong>${esc(client?.name || 'Factura general')}</strong><br>${esc(client?.tax || client?.nif || '')}<br>${esc(client?.address || '')}<br>${esc(client?.email || '')}<br><b>Expedient:</b> ${esc(matter.name || matter.code || '')}${allocation ? `<br><b>Repartiment:</b> ${allocation.mode === 'percent' ? `${allocation.value}%` : money(allocation.amount)}` : ''}</div></div><table><thead><tr><th>Concepte</th><th>Descripció</th><th class="n">Quant.</th><th class="n">Preu</th><th class="n">Import</th></tr></thead><tbody>${rows}</tbody></table><section class="totals"><div><span>Base</span><strong>${money(base)}</strong></div><div><span>IVA</span><strong>${money(vat)}</strong></div><div class="grand"><span>Total</span><strong>${money(total)}</strong></div></section></article></body></html>`;
  }

  function open(invoice, context, clientId = '') {
    const popup = window.open('', '_blank');
    if (!popup) return false;
    popup.document.open();
    popup.document.write(render(invoice, context, clientId));
    popup.document.close();
    return true;
  }

  window.PYCInvoiceRenderer = { issuerData, render, open };
})();