(() => {
  'use strict';
  if (window.PYCInvoiceStore) return;

  const STATE_KEY = 'pyc_office_v2';
  const DRAFT_KEY = 'pyc_invoice_advanced_i18n_draft_v1';

  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || 'null') || {
        settings: {}, clients: [], cases: [], documents: []
      };
    } catch