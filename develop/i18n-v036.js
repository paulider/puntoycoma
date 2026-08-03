(() => {
  'use strict';

  const STORAGE_KEY = 'pyc_language';
  const DEFAULT_LANGUAGE = 'es';
  const SUPPORTED_LANGUAGES = ['ca', 'es', 'en', 'fr', 'de', 'ru', 'pt'];

  const messages = {
    ca: {
      appSubtitle: 'CANDIDATA DE VERSIÓ UNIFICADA',
      uiValidation: 'Validació UI',
      languageLabel: 'Idioma',
      home: 'Inici', clients: 'Clients', cases: 'Expedients', billing: 'Facturació', quality: 'Qualitat',
      loadDemo: 'Carregar demo', invoices: 'Factures', provisions: 'Provisions',
      newClient: 'Nou client', newCase: 'Nou expedient', newInvoice: 'Nova factura', newProvision: 'Nova provisió',
      search: 'Cerca', noClients: 'No hi ha clients.', noCases: 'No hi ha expedients.', noInvoices: 'No hi ha factures.', noProvisions: 'No hi ha provisions.',
      audit: 'Auditoria', runAll: 'Executar totes', suiteReady: 'Suite carregada. Prem “Executar totes”.',
      noTaxId: 'Sense NIF', noCode: 'Sense codi', noNumber: 'Sense número', draft: 'esborrany', pending: 'pendent',
      createClientFirst: 'Crea primer un client.', createCaseFirst: 'Crea primer un expedient.'
    },
    es: {
      appSubtitle: 'CANDIDATA DE VERSIÓN UNIFICADA',
      uiValidation: 'Validación UI',
      languageLabel: 'Idioma',
      home: 'Inicio', clients: 'Clientes', cases: 'Expedientes', billing: 'Facturación', quality: 'Calidad',
      loadDemo: 'Cargar demo', invoices: 'Facturas', provisions: 'Provisiones',
      newClient: 'Nuevo cliente', newCase: 'Nuevo expediente', newInvoice: 'Nueva factura', newProvision: 'Nueva provisión',
      search: 'Buscar', noClients: 'No hay clientes.', noCases: 'No hay expedientes.', noInvoices: 'No hay facturas.', noProvisions: 'No hay provisiones.',
      audit: 'Auditoría', runAll: 'Ejecutar todas', suiteReady: 'Suite cargada. Pulsa “Ejecutar todas”.',
      noTaxId: 'Sin NIF', noCode: 'Sin código', noNumber: 'Sin número', draft: 'borrador', pending: 'pendiente',
      createClientFirst: 'Crea primero un cliente.', createCaseFirst: 'Crea primero un expediente.'
    },
    en: {
      appSubtitle: 'UNIFIED RELEASE CANDIDATE',
      uiValidation: 'UI Validation',
      languageLabel: 'Language',
      home: 'Home', clients: 'Clients', cases: 'Cases', billing: 'Billing', quality: 'Quality',
      loadDemo: 'Load demo', invoices: 'Invoices', provisions: 'Retainers',
      newClient: 'New client', newCase: 'New case', newInvoice: 'New invoice', newProvision: 'New retainer',
      search: 'Search', noClients: 'No clients.', noCases: 'No cases.', noInvoices: 'No invoices.', noProvisions: 'No retainers.',
      audit: 'Audit', runAll: 'Run all', suiteReady: 'Suite loaded. Press “Run all”.',
      noTaxId: 'No tax ID', noCode: 'No code', noNumber: 'No number', draft: 'draft', pending: 'pending',
      createClientFirst: 'Create a client first.', createCaseFirst: 'Create a case first.'
    },
    fr: {
      appSubtitle: 'VERSION CANDIDATE UNIFIÉE',
      uiValidation: 'Validation UI',
      languageLabel: 'Langue',
      home: 'Accueil', clients: 'Clients', cases: 'Dossiers', billing: 'Facturation', quality: 'Qualité',
      loadDemo: 'Charger la démo', invoices: 'Factures', provisions: 'Provisions',
      newClient: 'Nouveau client', newCase: 'Nouveau dossier', newInvoice: 'Nouvelle facture', newProvision: 'Nouvelle provision',
      search: 'Rechercher', noClients: 'Aucun client.', noCases: 'Aucun dossier.', noInvoices: 'Aucune facture.', noProvisions: 'Aucune provision.',
      audit: 'Audit', runAll: 'Tout exécuter', suiteReady: 'Suite chargée. Appuyez sur « Tout exécuter ».',
      noTaxId: 'Sans identifiant fiscal', noCode: 'Sans code', noNumber: 'Sans numéro', draft: 'brouillon', pending: 'en attente',
      createClientFirst: 'Créez d’abord un client.', createCaseFirst: 'Créez d’abord un dossier.'
    },
    de: {
      appSubtitle: 'EINHEITLICHER RELEASE-KANDIDAT',
      uiValidation: 'UI-Prüfung',
      languageLabel: 'Sprache',
      home: 'Start', clients: 'Mandanten', cases: 'Akten', billing: 'Abrechnung', quality: 'Qualität',
      loadDemo: 'Demo laden', invoices: 'Rechnungen', provisions: 'Vorschüsse',
      newClient: 'Neuer Mandant', newCase: 'Neue Akte', newInvoice: 'Neue Rechnung', newProvision: 'Neuer Vorschuss',
      search: 'Suchen', noClients: 'Keine Mandanten.', noCases: 'Keine Akten.', noInvoices: 'Keine Rechnungen.', noProvisions: 'Keine Vorschüsse.',
      audit: 'Prüfung', runAll: 'Alle ausführen', suiteReady: 'Tests geladen. „Alle ausführen“ drücken.',
      noTaxId: 'Keine Steuer-ID', noCode: 'Kein Code', noNumber: 'Keine Nummer', draft: 'Entwurf', pending: 'ausstehend',
      createClientFirst: 'Erstellen Sie zuerst einen Mandanten.', createCaseFirst: 'Erstellen Sie zuerst eine Akte.'
    },
    ru: {
      appSubtitle: 'ЕДИНАЯ ВЕРСИЯ-КАНДИДАТ',
      uiValidation: 'Проверка интерфейса',
      languageLabel: 'Язык',
      home: 'Главная', clients: 'Клиенты', cases: 'Дела', billing: 'Счета', quality: 'Качество',
      loadDemo: 'Загрузить демо', invoices: 'Счета', provisions: 'Авансы',
      newClient: 'Новый клиент', newCase: 'Новое дело', newInvoice: 'Новый счет', newProvision: 'Новый аванс',
      search: 'Поиск', noClients: 'Клиентов нет.', noCases: 'Дел нет.', noInvoices: 'Счетов нет.', noProvisions: 'Авансов нет.',
      audit: 'Аудит', runAll: 'Запустить все', suiteReady: 'Тесты загружены. Нажмите «Запустить все».',
      noTaxId: 'Без налогового номера', noCode: 'Без кода', noNumber: 'Без номера', draft: 'черновик', pending: 'ожидает',
      createClientFirst: 'Сначала создайте клиента.', createCaseFirst: 'Сначала создайте дело.'
    },
    pt: {
      appSubtitle: 'CANDIDATA DE VERSÃO UNIFICADA',
      uiValidation: 'Validação UI',
      languageLabel: 'Idioma',
      home: 'Início', clients: 'Clientes', cases: 'Processos', billing: 'Faturação', quality: 'Qualidade',
      loadDemo: 'Carregar demo', invoices: 'Faturas', provisions: 'Provisões',
      newClient: 'Novo cliente', newCase: 'Novo processo', newInvoice: 'Nova fatura', newProvision: 'Nova provisão',
      search: 'Pesquisar', noClients: 'Sem clientes.', noCases: 'Sem processos.', noInvoices: 'Sem faturas.', noProvisions: 'Sem provisões.',
      audit: 'Auditoria', runAll: 'Executar tudo', suiteReady: 'Suite carregada. Prima “Executar tudo”.',
      noTaxId: 'Sem NIF', noCode: 'Sem código', noNumber: 'Sem número', draft: 'rascunho', pending: 'pendente',
      createClientFirst: 'Crie primeiro um cliente.', createCaseFirst: 'Crie primeiro um processo.'
    }
  };

  function getLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
    const browser = (navigator.language || DEFAULT_LANGUAGE).slice(0, 2).toLowerCase();
    return SUPPORTED_LANGUAGES.includes(browser) ? browser : DEFAULT_LANGUAGE;
  }

  function t(key) {
    const language = getLanguage();
    return messages[language]?.[key] ?? messages[DEFAULT_LANGUAGE]?.[key] ?? key;
  }

  function applyTranslations() {
    const language = getLanguage();
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n);
    });
    const selector = document.getElementById('languageSelector');
    if (selector) selector.value = language;
    window.PYC?.render?.();
  }

  function setLanguage(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) return;
    localStorage.setItem(STORAGE_KEY, language);
    applyTranslations();
  }

  window.PYCI18N = { messages, getLanguage, setLanguage, applyTranslations, t, supportedLanguages: SUPPORTED_LANGUAGES };
})();