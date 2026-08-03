(() => {
  'use strict';
  if (window.PYCInvoiceEngine) return;

  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const parseNumber = value => {
    const parsed = Number(String(value ?? '').trim().replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function calculateLine(line = {}) {
    const quantity = parseNumber(line.qty ?? 1);
    const unitPrice = parseNumber(line.price);
    const discountRate = parseNumber(line.discount);
    const vatRate = parseNumber(line.vat ?? 21);
    const gross = round(quantity * unitPrice);
    const base = round(gross * (1 - discountRate / 100));
    const vat = round(base * vatRate / 100);
    return {
      ...line,
      qty: quantity,
      price: unitPrice,
      discount: discountRate,
      vatRate,
      gross,
      base,
      vat,
      total: round(base + vat)
    };
  }

  function calculateInvoice(lines = []) {
    const calculatedLines = lines.map(calculateLine);
    return {
      lines: calculatedLines,
      base: round(calculatedLines.reduce((sum, line) => sum + line.base, 0)),
      vat: round(calculatedLines.reduce((sum, line) => sum + line.vat, 0)),
      total: round(calculatedLines.reduce((sum, line) => sum + line.total, 0))
    };
  }

  function calculateAllocations(total, allocations = []) {
    const normalizedTotal = round(total);
    const rows = allocations.map(allocation => {
      const value = parseNumber(allocation.value);
      const amount = allocation.enabled === false
        ? 0
        : allocation.mode === 'amount'
          ? round(value)
          : round(normalizedTotal * value / 100);
      return { ...allocation, value, amount };
    });
    const assigned = round(rows.reduce((sum, row) => sum + row.amount, 0));
    const delta = round(normalizedTotal - assigned);
    return {
      rows,
      assigned,
      delta,
      valid: rows.some(row => row.enabled !== false) && Math.abs(delta) <= 0.01
    };
  }

  function equalSplit(allocations = []) {
    const enabled = allocations.filter(item => item.enabled !== false);
    if (!enabled.length) return allocations;
    const each = round(100 / enabled.length);
    let assigned = 0;
    return allocations.map(item => {
      if (item.enabled === false) return item;
      const isLast = item.clientId === enabled[enabled.length - 1].clientId;
      const value = isLast ? round(100 - assigned) : each;
      assigned = round(assigned + value);
      return { ...item, mode: 'percent', value };
    });
  }

  function validateInvoice(invoice = {}) {
    const errors = [];
    if (!invoice.caseId) errors.push('missing_case');
    if (!Array.isArray(invoice.lines) || !invoice.lines.length) errors.push('missing_lines');
    const totals = calculateInvoice(invoice.lines || []);
    if (totals.lines.some(line => !String(line.concept || '').trim())) errors.push('missing_concept');
    if (totals.lines.some(line => line.qty <= 0)) errors.push('invalid_quantity');
    if (totals.lines.some(line => line.price < 0)) errors.push('invalid_price');
    const allocation = calculateAllocations(totals.total, invoice.allocations || []);
    if (!allocation.valid) errors.push('invalid_allocation');
    return { valid: !errors.length, errors, totals, allocation };
  }

  window.PYCInvoiceEngine = {
    parseNumber,
    round,
    calculateLine,
    calculateInvoice,
    calculateAllocations,
    equalSplit,
    validateInvoice
  };
})();