(() => {
  'use strict';

  const UI_LANGUAGE_KEY = 'pyc_language_v1';
  const DOCUMENT_LANGUAGE_KEY = 'pyc_document_language_v1';
  const SUPPORTED_LANGUAGES = ['ca','es','en','fr','de','ru','pt'];
  const LANGUAGE_LABELS = {
    ca:'Català', es:'Castellano', en:'English', fr:'Français', de:'Deutsch', ru:'Русский', pt:'Português'
  };

  const documentCopy = {
    invoice: {
      ca: {title:'FACTURA',issueDate:'Data d’emissió',paymentMethod:'Forma de pagament',from:'DE',to:'PER A',concept:'CONCEPTE',description:'DESCRIPCIÓ',qty:'QTY.',unitPrice:'PREU UNIT.',amount:'IMPORT',taxBase:'Base imposable',vat:'IVA',total:'TOTAL',noteTitle:'NOTA',defaultNote:'Gràcies per confiar en els nostres serveis. Restem a la seva disposició per a qualsevol consulta.'},
      es: {title:'FACTURA',issueDate:'Fecha de emisión',paymentMethod:'Forma de pago',from:'DE',to:'PARA',concept:'CONCEPTO',description:'DESCRIPCIÓN',qty:'CANT.',unitPrice:'PRECIO UNIT.',amount:'IMPORTE',taxBase:'Base imponible',vat:'IVA',total:'TOTAL',noteTitle:'NOTA',defaultNote:'Gracias por confiar en nuestros servicios. Quedamos a su disposición para cualquier consulta.'},
      en: {title:'INVOICE',issueDate:'Issue date',paymentMethod:'Payment method',from:'FROM',to:'TO',concept:'ITEM',description:'DESCRIPTION',qty:'QTY.',unitPrice:'UNIT PRICE',amount:'AMOUNT',taxBase:'Taxable amount',vat:'VAT',total:'TOTAL',noteTitle:'NOTE',defaultNote:'Thank you for trusting our services. Please contact us if you need any further assistance.'},
      fr: {title:'FACTURE',issueDate:'Date d’émission',paymentMethod:'Mode de paiement',from:'DE',to:'À',concept:'CONCEPT',description:'DESCRIPTION',qty:'QTÉ.',unitPrice:'PRIX UNIT.',amount:'MONTANT',taxBase:'Base imposable',vat:'TVA',total:'TOTAL',noteTitle:'NOTE',defaultNote:'Merci de votre confiance. Nous restons à votre disposition pour toute question.'},
      de: {title:'RECHNUNG',issueDate:'Ausstellungsdatum',paymentMethod:'Zahlungsart',from:'VON',to:'AN',concept:'POSITION',description:'BESCHREIBUNG',qty:'MENGE',unitPrice:'EINZELPREIS',amount:'BETRAG',taxBase:'Nettobetrag',vat:'MWST.',total:'GESAMT',noteTitle:'HINWEIS',defaultNote:'Vielen Dank für Ihr Vertrauen. Für Rückfragen stehen wir Ihnen gerne zur Verfügung.'},
      ru: {title:'СЧЁТ',issueDate:'Дата выставления',paymentMethod:'Способ оплаты',from:'ОТ',to:'ДЛЯ',concept:'ПОЗИЦИЯ',description:'ОПИСАНИЕ',qty:'КОЛ-ВО',unitPrice:'ЦЕНА ЗА ЕД.',amount:'СУММА',taxBase:'Налоговая база',vat:'НДС',total:'ИТОГО',noteTitle:'ПРИМЕЧАНИЕ',defaultNote:'Благодарим за доверие. Мы готовы ответить на любые дополнительные вопросы.'},
      pt: {title:'FATURA',issueDate:'Data de emissão',paymentMethod:'Forma de pagamento',from:'DE',to:'PARA',concept:'CONCEITO',description:'DESCRIÇÃO',qty:'QTD.',unitPrice:'PREÇO UNIT.',amount:'VALOR',taxBase:'Base tributável',vat:'IVA',total:'TOTAL',noteTitle:'NOTA',defaultNote:'Agradecemos a sua confiança. Permanecemos à disposição para qualquer esclarecimento.'}
    },
    provision: {
      ca: {title:'PROVISIÓ DE FONS',amount:'Import',date:'Data',case:'Expedient',client:'Client',status:'Estat'},
      es: {title:'PROVISIÓN DE FONDOS',amount:'Importe',date:'Fecha',case:'Expediente',client:'Cliente',status:'Estado'},
      en: {title:'RETAINER REQUEST',amount:'Amount',date:'Date',case:'Matter',client:'Client',status:'Status'},
      fr: {title:'PROVISION SUR HONORAIRES',amount:'Montant',date:'Date',case:'Dossier',client:'Client',status:'Statut'},
      de: {title:'VORSCHUSSANFORDERUNG',amount:'Betrag',date:'Datum',case:'Akte',client:'Mandant',status:'Status'},
      ru: {title:'ЗАПРОС НА АВАНС',amount:'Сумма',date:'Дата',case:'Дело',client:'Клиент',status:'Статус'},
      pt: {title:'PROVISÃO DE FUNDOS',amount:'Valor',date:'Data',case:'Processo',client:'Cliente',status:'Estado'}
    }
  };

  function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.includes(language) ? language : 'ca';
  }

  function getUiLanguage() {
    return normalizeLanguage(localStorage.getItem(UI_LANGUAGE_KEY) || 'ca');
  }

  function getDefaultDocumentLanguage() {
    return normalizeLanguage(localStorage.getItem(DOCUMENT_LANGUAGE_KEY) || getUiLanguage());
  }

  function setDefaultDocumentLanguage(language) {
    localStorage.setItem(DOCUMENT_LANGUAGE_KEY, normalizeLanguage(language));
  }

  function ensureDocumentLanguage(documentRecord, fallbackLanguage) {
    if (!documentRecord || typeof documentRecord !== 'object') return documentRecord;
    documentRecord.language = normalizeLanguage(documentRecord.language || fallbackLanguage || getDefaultDocumentLanguage());
    documentRecord.copyOverrides = documentRecord.copyOverrides || {};
    return documentRecord;
  }

  function setDocumentLanguage(documentRecord, language) {
    ensureDocumentLanguage(documentRecord);
    documentRecord.language = normalizeLanguage(language);
    return documentRecord;
  }

  function setCopyOverride(documentRecord, key, value) {
    ensureDocumentLanguage(documentRecord);
    if (value === null || value === undefined || value === '') delete documentRecord.copyOverrides[key];
    else documentRecord.copyOverrides[key] = String(value);
    return documentRecord;
  }

  function getDocumentText(type, language, key, documentRecord) {
    const record = documentRecord ? ensureDocumentLanguage(documentRecord, language) : null;
    const resolvedLanguage = normalizeLanguage(record?.language || language || getDefaultDocumentLanguage());
    if (record?.copyOverrides && Object.prototype.hasOwnProperty.call(record.copyOverrides, key)) {
      return record.copyOverrides[key];
    }
    return documentCopy[type]?.[resolvedLanguage]?.[key] || documentCopy[type]?.ca?.[key] || key;
  }

  function cloneDocumentInLanguage(documentRecord, language, options = {}) {
    const cloned = structuredClone ? structuredClone(documentRecord) : JSON.parse(JSON.stringify(documentRecord));
    ensureDocumentLanguage(cloned, language);
    cloned.id = options.preserveId ? cloned.id : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    cloned.sourceDocumentId = documentRecord.id || null;
    cloned.language = normalizeLanguage(language);
    cloned.copyOverrides = options.keepOverrides ? {...(documentRecord.copyOverrides || {})} : {};
    cloned.generatedAt = new Date().toISOString();
    return cloned;
  }

  function buildLanguageSelector(value, options = {}) {
    const select = document.createElement('select');
    select.className = options.className || 'document-language-selector';
    select.setAttribute('aria-label', options.ariaLabel || 'Idioma del document');
    SUPPORTED_LANGUAGES.forEach(language => {
      const option = document.createElement('option');
      option.value = language;
      option.textContent = LANGUAGE_LABELS[language];
      option.selected = language === normalizeLanguage(value || getDefaultDocumentLanguage());
      select.appendChild(option);
    });
    return select;
  }

  window.PYCDocumentLanguage = {
    SUPPORTED_LANGUAGES,
    LANGUAGE_LABELS,
    getUiLanguage,
    getDefaultDocumentLanguage,
    setDefaultDocumentLanguage,
    ensureDocumentLanguage,
    setDocumentLanguage,
    setCopyOverride,
    getDocumentText,
    cloneDocumentInLanguage,
    buildLanguageSelector
  };
})();