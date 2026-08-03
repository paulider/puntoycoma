(() => {
  'use strict';
  if (window.PYCInvoiceRenderer) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = value => `${Number(value || 0).toFixed(2).replace('.', ',')} €`;
  const dateText = value => {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES');
  };

  function issuerData(settings = {}) {
    return {
      name: settings.name || settings.legalName || settings.fiscalName || 'Julia María Rico López',
      tax: settings.tax || settings.nif || settings.vatNumber || '74011732D',
      address: settings.address || settings.fiscalAddress || 'c/ Camí Can Dori 32, 08811 Canyelles, Barcelona',
      email: settings.email || settings.billingEmail || 'julia@pyc.legal',
      phone: settings.phone || settings.billingPhone || '649 766 012',
      website: settings.website || 'www.puntoycoma.legal',
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
    const paymentMethod = invoice.paymentMethod || context.settings?.paymentMethod || 'Transferencia bancaria';
    const invoiceNumber = invoice.number || '001';

    const rows = (invoice.lines || []).map(line => {
      const calculated = engine.calculateLine(line);
      return `<tr><td><strong>${esc(line.concept || '')}</strong></td><td>${esc(line.description || '')}</td><td class="num">${calculated.qty.toFixed(2).replace('.00','')}</td><td class="num">${money(calculated.price * ratio)}</td><td class="num">${money(calculated.base * ratio)}</td></tr>`;
    }).join('');

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(invoiceNumber)}</title><style>
      @page{size:A4;margin:0}
      *{box-sizing:border-box}
      :root{--gold:#bfa16b;--ink:#191719;--line:#ddd7cf;--soft:#f4f0ea}
      body{margin:0;background:#eceae7;color:var(--ink);font-family:Arial,Helvetica,sans-serif}
      .toolbar{position:sticky;top:0;z-index:5;background:#6b1730;padding:12px;text-align:center}
      .toolbar button{font:600 15px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:10px 14px;border:0;border-radius:9px;margin:0 4px}
      .page{width:210mm;min-height:297mm;margin:12px auto;background:#fff;padding:19mm 16mm 14mm;display:flex;flex-direction:column}
      .top{display:grid;grid-template-columns:1fr 1fr;gap:20mm;align-items:start}
      .brand{font-family:Georgia,"Times New Roman",serif;font-size:22px;letter-spacing:.13em;line-height:1.1}
      .brand-sub{margin-top:7px;color:var(--gold);font-size:10px;letter-spacing:.36em;text-transform:uppercase}
      .mark{display:inline-block;color:var(--gold);margin-left:8px;font-size:28px;vertical-align:middle}
      .invoice-head{text-align:right}
      .invoice-title{font-size:24px;letter-spacing:.28em;text-transform:uppercase}
      .invoice-no{margin-top:10px;color:var(--gold);letter-spacing:.18em}
      .meta{margin-top:14px;margin-left:auto;width:75%;display:grid;grid-template-columns:1fr auto;gap:8px 14px;font-size:9px;text-align:left}
      .meta strong{text-align:right;font-weight:500}
      .rule{border-top:1px solid var(--line);margin:16mm 0 11mm}
      .parties{display:grid;grid-template-columns:1fr 1fr;gap:28mm;margin-bottom:14mm}
      .eyebrow{color:var(--gold);font-size:8px;letter-spacing:.24em;text-transform:uppercase;margin-bottom:7px}
      .party{font-size:9px;line-height:1.65}
      .party strong{font-size:11px}
      table{width:100%;border-collapse:collapse;font-size:8.5px}
      thead th{background:var(--soft);padding:9px 8px;text-transform:uppercase;letter-spacing:.16em;font-size:7px;text-align:left}
      tbody td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}
      .num{text-align:right}
      .totals{width:46%;margin:11mm 0 0 auto;font-size:9px}
      .totals div{display:flex;justify-content:space-between;padding:7px 10px}
      .totals .grand{margin-top:3px;background:var(--soft);font-size:16px;font-weight:700}
      .note{margin-top:11mm;border-left:2px solid var(--gold);padding-left:10px;font-size:8.5px;line-height:1.55}
      .note b{display:block;font-size:7px;letter-spacing:.18em;text-transform:uppercase;margin-bottom:5px}
      .footer{margin-top:auto;background:var(--soft);padding:10mm 8mm;display:grid;grid-template-columns:auto 1fr auto;gap:10mm;align-items:center}
      .footer-mark{color:var(--gold);font:28px Georgia,serif}
      .footer-copy{font-size:8.5px;line-height:1.6}
      .footer-copy b{display:block;letter-spacing:.16em;font-size:7px}
      .footer-sign{text-align:right}
      .footer-sign strong{display:block;font-size:12px}
      .footer-sign span{font-size:9px}
      .website{text-align:center;color:var(--gold);letter-spacing:.26em;font-size:8px;margin-top:8mm;text-transform:uppercase}
      @media print{body{background:#fff}.toolbar{display:none}.page{margin:0}}
    </style></head><body>
      <div class="toolbar"><button onclick="print()">Guardar / imprimir PDF</button><button onclick="close()">Cerrar</button></div>
      <article class="page">
        <section class="top">
          <div><div class="brand">PUNTO Y COMA <span class="mark">;</span></div><div class="brand-sub">Legal</div></div>
          <div class="invoice-head"><div class="invoice-title">Factura</div><div class="invoice-no">N.º ${esc(invoiceNumber)}</div><div class="meta"><span>Fecha de emisión:</span><strong>${esc(dateText(invoice.updatedAt || invoice.createdAt))}</strong><span>Forma de pago:</span><strong>${esc(paymentMethod)}</strong></div></div>
        </section>
        <div class="rule"></div>
        <section class="parties">
          <div class="party"><div class="eyebrow">De</div><strong>${esc(issuer.name)}</strong><br>NIF: ${esc(issuer.tax)}<br>${esc(issuer.address)}<br>Tel. ${esc(issuer.phone)}<br>${esc(issuer.email)}<br>${esc(issuer.website)}<br>IBAN: ${esc(issuer.iban)}</div>
          <div class="party"><div class="eyebrow">Para</div><strong>${esc(client?.name || 'Cliente')}</strong><br>${client?.tax || client?.nif ? `NIF: ${esc(client.tax || client.nif)}<br>` : ''}${client?.address ? `${esc(client.address)}<br>` : ''}${client?.email ? `${esc(client.email)}<br>` : ''}${matter.name || matter.code ? `Expediente: ${esc(matter.name || matter.code)}<br>` : ''}${allocation ? `Reparto: ${allocation.mode === 'percent' ? `${esc(allocation.value)} %` : money(allocation.amount)}` : ''}</div>
        </section>
        <table><thead><tr><th>Concepto</th><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio unit.</th><th class="num">Importe</th></tr></thead><tbody>${rows}</tbody></table>
        <section class="totals"><div><span>Base imponible</span><strong>${money(base)}</strong></div><div><span>IVA</span><strong>${money(vat)}</strong></div><div class="grand"><span>Total</span><strong>${money(total)}</strong></div></section>
        <div class="note"><b>Nota</b>Gracias por confiar en nuestros servicios. Quedamos a su disposición para cualquier consulta.</div>
        <footer class="footer"><div class="footer-mark">;</div><div class="footer-copy"><b>PUNTO Y COMA LEGAL</b>${esc(issuer.email)}<br>${esc(issuer.phone)}</div><div class="footer-sign"><strong>${esc(issuer.name)}</strong><span>Abogada</span></div></footer>
        <div class="website">${esc(issuer.website)}</div>
      </article>
    </body></html>`;
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