/**
 * @fileoverview Internationalization (i18n) types and schemas for Personal Library.
 * Supports SAP multilingual standard locales: English, Deutsch, Français, Español, Română.
 */

export type SupportedLanguage = 'en' | 'de' | 'fr' | 'es' | 'ro';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English (US)', nativeName: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' }
];

export interface TranslationDictionary {
  common: {
    appName: string;
    appSubtitle: string;
    loading: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    upload: string;
    download: string;
    search: string;
    reset: string;
    go: string;
    back: string;
    retry: string;
    close: string;
    copy: string;
    copied: string;
    error: string;
    success: string;
    warning: string;
    confirm: string;
    actions: string;
    status: string;
    version: string;
    rows: string;
    page: string;
    of: string;
    total: string;
    theme: string;
    language: string;
  };
  shellBar: {
    title: string;
    subtitle: string;
    systemStatus: string;
    backendOnline: string;
    modelReady: string;
    offlineMode: string;
    connecting: string;
    docs: string;
    backend: string;
    openapi: string;
    themeMorning: string;
    themeEvening: string;
    switchTheme: string;
    horizonTheme: string;
    authMethod: string;
    realm: string;
    activeRoles: string;
    signOut: string;
    docsSuiteTitle: string;
    viewOpenApi: string;
    vectorStoreDocs: string;
    gatewayStatus: string;
    ollamaStatus: string;
    qdrantStatus: string;
  };
  listReport: {
    filterArea: string;
    activeFilters: string;
    hideFilters: string;
    showFilters: string;
    fileName: string;
    fileNamePlaceholder: string;
    documentTitle: string;
    titlePlaceholder: string;
    author: string;
    authorPlaceholder: string;
    edition: string;
    editionPlaceholder: string;
    format: string;
    allFormats: string;
    contentKeywords: string;
    contentPlaceholder: string;
    catalogTitle: string;
    uploadButton: string;
    refreshButton: string;
    colFileName: string;
    colTitleDetails: string;
    colAuthor: string;
    colFormat: string;
    colUploadDate: string;
    colSummaries: string;
    colActions: string;
    noDocsFound: string;
    noDocsSubtitle: string;
    uploadPrompt: string;
    rowsPerPage: string;
    inspectTooltip: string;
    deleteTooltip: string;
    newVersionTooltip: string;
    errorTitle: string;
    errorRetry: string;
    errorOffline: string;
    errorSettings: string;
  };
  objectPage: {
    backToLibrary: string;
    uploadNewVersion: string;
    downloadFile: string;
    exportBibtex: string;
    deleteDocument: string;
    tabOverview: string;
    tabSummaries: string;
    tabChat: string;
    bibtexTitle: string;
    bibtexRaw: string;
    copyBibtex: string;
    abstract: string;
    keywords: string;
    detailsMetadata: string;
    guid: string;
    fileSize: string;
    format: string;
    uploadedOn: string;
    lastModified: string;
    doi: string;
    citationKey: string;
    entryType: string;
    publisher: string;
    year: string;
    journalBooktitle: string;
    pages: string;
    summariesHeader: string;
    summariesSubtitle: string;
    llamaTitle: string;
    llamaSubtitle: string;
    mistralTitle: string;
    mistralSubtitle: string;
    recomputeSummary: string;
    computingSummary: string;
    duration: string;
    chatHeader: string;
    chatSubtitle: string;
    chatPlaceholder: string;
    chatSend: string;
    chatAssistantWelcome: string;
    citationsHeader: string;
    relevanceScore: string;
    chunkIndex: string;
  };
  upload: {
    title: string;
    subtitle: string;
    dragDrop: string;
    orBrowse: string;
    supportedFormats: string;
    extractingAi: string;
    autoExtractSuccess: string;
    tabMetadata: string;
    tabBibtex: string;
    fieldTitle: string;
    fieldAuthor: string;
    fieldYear: string;
    fieldType: string;
    fieldAbstract: string;
    fieldKeywords: string;
    uploadingButton: string;
    submitButton: string;
  };
  version: {
    title: string;
    subtitle: string;
    warningText: string;
    selectMode: string;
    modeReplaceFile: string;
    modeEditMetadata: string;
    currentVersion: string;
    saveVersionButton: string;
  };
  delete: {
    title: string;
    warning: string;
    message: string;
    confirmButton: string;
  };
  backendSettings: {
    title: string;
    subtitle: string;
    activeAdapter: string;
    selectPreset: string;
    presetGateway: string;
    presetSpringBoot: string;
    presetMock: string;
    presetCustom: string;
    baseUrl: string;
    authToken: string;
    testConnection: string;
    saveApply: string;
  };
  footer: {
    libraryTitle: string;
    sapHorizon: string;
    backendLabel: string;
    architecture: string;
    springAi: string;
    qdrant: string;
    trademarkDisclaimer: string;
  };
}
