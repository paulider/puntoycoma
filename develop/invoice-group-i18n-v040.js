(() => {
  'use strict';

  const BUILTIN_GROUPS = {
    fees: {
      ca: 'Honoraris', es: 'Honorarios', en: 'Fees', fr: 'Honoraires', de: 'Honorare', ru: 'Гонорары', pt: 'Honorários'
    },
    expenses: {
      ca: 'Despeses', es: 'Gastos', en: 'Expenses', fr: 'Frais', de: 'Auslagen', ru: 'Расходы', pt: 'Despesas'
    },
    disbursements: {
      ca: 'Suplerts', es: 'Suplidos', en: 'Disbursements', fr: 'Débours', de: 'Fremdgelder', ru: 'Возмещаемые расходы', pt: 'Suprimentos'
    },
    discounts: {
      ca: 'Descomptes', es: 'Descuentos', en: 'Discounts', fr: 'Remises', de: 'Rabatte', ru: 'Скидки', pt: 'Descontos'
    }
  };

  const LEGACY_NAMES = {
    Honoraris: 'fees', Honorarios: 'fees', Fees: 'fees', Honoraires: 'fees', Honorare: 'fees', 'Гонорары': 'fees', 'Honorários': 'fees',
    Despeses: 'expenses', Gastos: 'expenses', Expenses: 'expenses', Frais: 'expenses', Auslagen: 'expenses', 'Расходы': 'expenses', Despesas: 'expenses',
    Suplerts: 'disbursements', Suplidos: 'disbursements', Disbursements: 'disbursements', Débours: 'disbursements', Fremdgelder: 'disbursements', 'Возмещаемые расходы': 'disbursements', Suprimentos: 'disbursements',
    Descomptes: 'discounts', Descuentos: 'discounts', Discounts: 'discounts', Remises: 'discounts', Rabatte: 'discounts', 'Скидки': 'discounts', Descontos: 'discounts'
  };

  function normalizeLanguage(language) {
    return ['ca','es','en','fr','de','ru','pt'].includes(language) ? language : 'ca';
  }

  function groupLabel(group, language) {
    const lang = normalizeLanguage(language);
    if (!group) return '';
    if (group.kind === 'builtin' && BUILTIN_GROUPS[group.key]) return BUILTIN_GROUPS[group.key][lang];
    return group.labels?.[lang] || group.labels?.ca || group.name || group.key || '';
  }

  function defaultGroups() {
    return ['fees','expenses','disbursements','discounts'].map((key, order) => ({
      id: `group-${key}`,
      key,
      kind: 'builtin',
      order
    }));
  }

  function migrateGroups(groups, lines, language) {
    const sourceGroups = Array.isArray(groups) && groups.length ? groups : defaultGroups();
    const migrated = sourceGroups.map((group, order) => {
      if (group.kind === 'builtin' && group.key) return { ...group, order: Number.isFinite(group.order) ? group.order : order };
      const detectedKey = group.key || LEGACY_NAMES[group.name];
      if (detectedKey && BUILTIN_GROUPS[detectedKey]) {
        return { id: group.id || `group-${detectedKey}`, key: detectedKey, kind: 'builtin', order: Number.isFinite(group.order) ? group.order : order };
      }
      return {
        id: group.id || `group-custom-${order}`,
        key: group.key || `custom-${order}`,
        kind: 'custom',
        order: Number.isFinite(group.order) ? group.order : order,
        labels: group.labels || { [normalizeLanguage(language)]: group.name || `Group ${order + 1}` }
      };
    });

    const nameToKey = new Map();
    migrated.forEach(group => {
      if (group.kind === 'builtin') {
        Object.values(BUILTIN_GROUPS[group.key]).forEach(label => nameToKey.set(label, group.key));
      } else {
        Object.values(group.labels || {}).forEach(label => nameToKey.set(label, group.key));
      }
      if (group.name) nameToKey.set(group.name, group.key);
    });

    const migratedLines = (lines || []).map(line => ({
      ...line,
      groupKey: line.groupKey || nameToKey.get(line.group) || LEGACY_NAMES[line.group] || 'fees'
    }));

    return { groups: migrated, lines: migratedLines };
  }

  function setCustomGroupLabel(group, language, value) {
    if (!group || group.kind !== 'custom') return group;
    group.labels = group.labels || {};
    group.labels[normalizeLanguage(language)] = String(value || '').trim();
    return group;
  }

  function translateBuiltInGroupName(name, language) {
    const key = LEGACY_NAMES[name] || name;
    return BUILTIN_GROUPS[key]?.[normalizeLanguage(language)] || name;
  }

  window.PYCInvoiceGroupI18N = {
    BUILTIN_GROUPS,
    LEGACY_NAMES,
    defaultGroups,
    groupLabel,
    migrateGroups,
    setCustomGroupLabel,
    translateBuiltInGroupName
  };
})();