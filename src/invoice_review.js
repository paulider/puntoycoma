function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function resolveRecipients(state, caseId, input) {
  const currentCase = (state.cases || []).find(item => item.id === caseId);
  if (!currentCase) throw new Error('L’expedient no existeix.');

  const participants = (currentCase.participants || []).map(participant => participant.clientId);
  if (input.mode === 'single') {
    if (!participants.includes(input.clientId)) throw new Error('El destinatari no participa en l’expedient.');
    return [{clientId: input.clientId, share: 100}];
  }

  if (input.mode === 'third_party') {
    const name = String(input.thirdParty?.name || '').trim();
    if (!name) throw new Error('Cal indicar el tercer destinatari.');
    return [{clientId: '', thirdParty: {...input.thirdParty, name}, share: 100}];
  }

  if (input.mode !== 'multiple') throw new Error('Mode de destinatari no vàlid.');
  const allocations = input.allocations || [];
  if (!allocations.length) throw new Error('Cal definir el repartiment entre destinataris.');
  const totalShare = roundMoney(allocations.reduce((sum, item) => sum + Number(item.share || 0), 0));
  if (totalShare !== 100) throw new Error('Els percentatges han de sumar 100%.');
  allocations.forEach(item => {
    if (!participants.includes(item.clientId)) throw new Error('Hi ha un destinatari que no participa en l’expedient.');
  });
  return allocations.map(item => ({clientId: item.clientId, share: Number(item.share)}));
}

export function buildInvoiceReview(state, draft, recipientInput) {
  if (!draft?.caseId) throw new Error('La factura no està vinculada a cap expedient.');
  if (!Array.isArray(draft.lines) || !draft.lines.length) throw new Error('La factura no té línies.');
  const recipients = resolveRecipients(state, draft.caseId, recipientInput);
  const total = roundMoney(draft.total);
  const provisionBalance = roundMoney((state.provisions || [])
    .filter(item => item.caseId === draft.caseId)
    .reduce((sum, item) => sum + Number(item.availableAmount || 0), 0));
  const provisionToApply = roundMoney(Math.min(total, Number(draft.provisionToApply ?? provisionBalance)));
  const amountDue = roundMoney(total - provisionToApply);

  const generated = recipients.map((recipient, index) => {
    const isLast = index === recipients.length - 1;
    const previous = recipients.slice(0, index).reduce((sum, item) => sum + roundMoney(total * item.share / 100), 0);
    const gross = isLast ? roundMoney(total - previous) : roundMoney(total * recipient.share / 100);
    const applied = roundMoney(Math.min(gross, provisionToApply * recipient.share / 100));
    return {
      ...recipient,
      gross,
      provisionApplied: applied,
      amountDue: roundMoney(gross - applied)
    };
  });

  return {
    caseId: draft.caseId,
    lines: draft.lines,
    base: roundMoney(draft.base),
    vat: roundMoney(draft.vat),
    irpf: roundMoney(draft.irpf),
    total,
    recipients,
    generated,
    provisionBalance,
    provisionToApply,
    amountDue,
    canEmit: generated.every(item => item.amountDue >= 0)
  };
}

export function validateEmission(review) {
  if (!review?.canEmit) throw new Error('La revisió de factura no és vàlida.');
  if (roundMoney(review.generated.reduce((sum, item) => sum + item.gross, 0)) !== roundMoney(review.total)) {
    throw new Error('La suma de les factures generades no coincideix amb el total.');
  }
  if (roundMoney(review.generated.reduce((sum, item) => sum + item.amountDue, 0)) !== roundMoney(review.amountDue)) {
    throw new Error('La suma pendent no coincideix amb el resum.');
  }
  return true;
}
