const STORAGE_KEY = "cortex.registros.v1";

const state = {
  base: [],
  custom: [],
  registros: [],
  filtered: [],
  view: "dashboard",
  cloud: {
    available: false,
    needsSeed: false,
    error: null,
    loading: true,
  },
  editingKey: null,
  detailKey: null,
  filters: {
    search: "",
    categoria: "Todas",
    area: "Todas",
    status: "Todos",
  },
};

const moduleTitles = {
  dashboard: "Dashboard executivo",
  projetos: "Projetos e demandas",
  licitacoes: "Licita\u00e7\u00f5es",
  tarefas: "Tarefas e prazos",
  contratos: "Contratos",
  pessoas: "Pessoas e equipes",
  documentos: "Documentos",
};

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  bindEvents();
  await loadData();
  hydrateFilters();
  applyFilters();
  window.lucide?.createIcons();
});

function cacheElements() {
  elements.title = document.querySelector("#page-title");
  elements.search = document.querySelector("#global-search");
  elements.searchButton = document.querySelector("#search-button");
  elements.clearSearch = document.querySelector("#clear-search");
  elements.cloudStatus = document.querySelector("#cloud-status");
  elements.cloudTitle = document.querySelector("#cloud-title");
  elements.cloudMessage = document.querySelector("#cloud-message");
  elements.cloudActions = document.querySelector("#cloud-actions");
  elements.baseUpload = document.querySelector("#base-upload");
  elements.kpiGrid = document.querySelector("#kpi-grid");
  elements.areaBars = document.querySelector("#area-bars");
  elements.statusList = document.querySelector("#status-list");
  elements.alertList = document.querySelector("#alert-list");
  elements.projectTable = document.querySelector("#project-table");
  elements.projectCount = document.querySelector("#project-count");
  elements.category = document.querySelector("#filter-category");
  elements.area = document.querySelector("#filter-area");
  elements.status = document.querySelector("#filter-status");
  elements.resetFilters = document.querySelector("#reset-filters");
  elements.dialog = document.querySelector("#entry-dialog");
  elements.detailDialog = document.querySelector("#detail-dialog");
  elements.detailKind = document.querySelector("#detail-kind");
  elements.detailTitle = document.querySelector("#detail-title");
  elements.detailContent = document.querySelector("#detail-content");
  elements.detailActions = document.querySelector("#detail-actions");
  elements.closeDetail = document.querySelector("#close-detail");
  elements.newEntry = document.querySelector("#new-entry-button");
  elements.saveEntry = document.querySelector("#save-entry");
  elements.export = document.querySelector("#export-button");
  elements.voice = document.querySelector("#voice-button");
  elements.entryType = document.querySelector("#entry-type");
  elements.entryDialogTitle = document.querySelector("#entry-dialog-title");
  elements.entryTitle = document.querySelector("#entry-title");
  elements.entryCategory = document.querySelector("#entry-category");
  elements.entryArea = document.querySelector("#entry-area");
  elements.entryStatus = document.querySelector("#entry-status");
  elements.entryDeadline = document.querySelector("#entry-deadline");
  elements.entrySei = document.querySelector("#entry-sei");
  elements.entryContract = document.querySelector("#entry-contract");
  elements.entryValue = document.querySelector("#entry-value");
  elements.entryFile = document.querySelector("#entry-file");
  elements.entryDescription = document.querySelector("#entry-description");
  elements.entryComments = document.querySelector("#entry-comments");
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  elements.search.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  elements.search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runGlobalSearch();
    }
  });

  elements.searchButton.addEventListener("click", runGlobalSearch);

  elements.clearSearch.addEventListener("click", () => {
    elements.search.value = "";
    state.filters.search = "";
    applyFilters();
    if (state.view === "projetos") switchView("dashboard");
  });

  [["categoria", elements.category], ["area", elements.area], ["status", elements.status]].forEach(([key, select]) => {
    select.addEventListener("change", (event) => {
      state.filters[key] = event.target.value;
      applyFilters();
    });
  });

  elements.resetFilters.addEventListener("click", () => {
    state.filters.categoria = "Todas";
    state.filters.area = "Todas";
    state.filters.status = "Todos";
    elements.category.value = "Todas";
    elements.area.value = "Todas";
    elements.status.value = "Todos";
    applyFilters();
  });

  elements.newEntry.addEventListener("click", () => openEntryDialog(state.view));
  elements.saveEntry.addEventListener("click", saveEntry);
  elements.export.addEventListener("click", exportData);
  elements.voice.addEventListener("click", handleVoiceInput);
  elements.closeDetail.addEventListener("click", () => elements.detailDialog.close());
  elements.baseUpload.addEventListener("change", importSpreadsheet);

  document.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-detail-key]");
    if (detailButton) openDetail(detailButton.dataset.detailKey);

    const dashboardLink = event.target.closest("[data-dashboard-filter]");
    if (dashboardLink) applyDashboardShortcut(dashboardLink.dataset.dashboardFilter);

    const cloudAction = event.target.closest("[data-cloud-action]");
    if (cloudAction?.dataset.cloudAction === "seed") seedCloudData();
    if (cloudAction?.dataset.cloudAction === "refresh") refreshCloudData();
    if (cloudAction?.dataset.cloudAction === "reload-base") reloadPublishedBase();
    if (cloudAction?.dataset.cloudAction === "upload-base") elements.baseUpload.click();

    const recordAction = event.target.closest("[data-record-action]");
    if (recordAction?.dataset.recordAction === "edit") editRecord(recordAction.dataset.recordKey);
    if (recordAction?.dataset.recordAction === "delete") deleteRecord(recordAction.dataset.recordKey);
  });
}

async function loadData() {
  let localBase;
  if (Array.isArray(window.CORTEX_PROJETOS)) {
    localBase = window.CORTEX_PROJETOS.map((item) => normalizeRecord(item, "planilha"));
  } else {
    const response = await fetch("data/projetos.json");
    const data = await response.json();
    localBase = data.map((item) => normalizeRecord(item, "planilha"));
  }

  state.base = localBase;
  state.custom = loadCustomRecords();
  await connectCloudData();
  rebuildRecords();
  renderCloudStatus();
}

function normalizeRecord(item, source) {
  const type = item.tipo || inferType(item);
  const id = item.id || createId();
  return {
    ...item,
    id,
    tipo: type,
    source,
    key: `${source}-${id}`,
  };
}

function inferType(item) {
  if (norm(item.categoria) === "licitacoes") return "licitacao";
  if (item.contrato) return "contrato";
  return "projeto";
}

function rebuildRecords() {
  state.registros = [...state.base, ...state.custom];
}

function loadCustomRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return data.map((item) => normalizeRecord(item, "local"));
  } catch {
    return [];
  }
}

function persistCustomRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.custom, null, 2));
}

async function connectCloudData() {
  if (!hasCloudConfig()) {
    state.cloud = { available: false, needsSeed: false, error: "Configura\u00e7\u00e3o n\u00e3o informada.", loading: false };
    return;
  }

  try {
    const records = await cloudRequest("/registros?select=*&order=created_at.asc");
    state.cloud = { available: true, needsSeed: records.length === 0, error: null, loading: false };
    if (records.length) {
      state.base = records.map(fromDatabaseRecord);
      state.custom = [];
    }
  } catch (error) {
    state.cloud = { available: false, needsSeed: false, error: error.message, loading: false };
  }
}

function hasCloudConfig() {
  return Boolean(window.CORTEX_SUPABASE?.url && window.CORTEX_SUPABASE?.publishableKey);
}

async function cloudRequest(path, options = {}) {
  const config = window.CORTEX_SUPABASE;
  const response = await fetch(`${config.url}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(response.status === 404 ? "Tabela ainda n\u00e3o criada." : `Falha de conex\u00e3o (${response.status}): ${body}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function fromDatabaseRecord(item) {
  return normalizeRecord({
    id: item.id,
    tipo: item.tipo,
    ordem: item.ordem,
    projeto: item.projeto,
    categoria: item.categoria,
    valorAno: item.valor_ano,
    sei: item.sei,
    contrato: item.contrato,
    descricao: item.descricao,
    area: item.area,
    status: item.status,
    comentarios: item.comentarios,
    prazo: item.prazo,
    arquivo: item.arquivo,
    detalhes: item.detalhes || {},
    criadoEm: item.created_at,
    externalId: item.external_id,
    origem: item.origem,
  }, "nuvem");
}

function toDatabaseRecord(item) {
  const prazo = dateOnlyOrNull(item.prazo);
  return {
    external_id: item.externalId || item.key || `${item.source || "web"}-${item.id}`,
    tipo: item.tipo || inferType(item),
    ordem: item.ordem || null,
    projeto: item.projeto,
    categoria: item.categoria || null,
    valor_ano: item.valorAno || null,
    sei: item.sei || null,
    contrato: item.contrato || null,
    descricao: item.descricao || null,
    area: item.area || null,
    status: item.status || null,
    comentarios: importComments(item, prazo),
    prazo,
    arquivo: item.arquivo || null,
    detalhes: item.detalhes || {},
    origem: item.origem || item.source || "web",
  };
}

function dateOnlyOrNull(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : null;
}

function importComments(item, prazo) {
  const original = String(item.prazo || "").trim();
  if (!original || prazo) return item.comentarios || null;

  const note = `Prazo informado na origem: ${original}`;
  return item.comentarios ? `${item.comentarios} | ${note}` : note;
}

function hydrateFilters() {
  fillSelect(elements.category, "Todas", unique("categoria"));
  fillSelect(elements.area, "Todas", unique("area"));
  fillSelect(elements.status, "Todos", unique("status"));
}

function fillSelect(select, first, values) {
  select.innerHTML = [first, ...values]
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
}

function unique(key) {
  return [...new Set(projectLikeRecords().map((item) => item[key]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function applyFilters() {
  const search = state.filters.search;

  state.filtered = projectLikeRecords().filter((item) => {
    const matchesCategory = state.filters.categoria === "Todas" || item.categoria === state.filters.categoria;
    const matchesArea = state.filters.area === "Todas" || item.area === state.filters.area;
    const matchesStatus = state.filters.status === "Todos" || item.status === state.filters.status;
    const haystack = [
      item.projeto,
      item.categoria,
      item.area,
      item.status,
      item.sei,
      item.contrato,
      item.descricao,
      item.comentarios,
      ...Object.values(item.detalhes || {}),
    ].join(" ").toLowerCase();
    const matchesSearch = matchesSpecialSearch(item, search) || (!isSpecialSearch(search) && (!search || haystack.includes(search)));
    return matchesCategory && matchesArea && matchesStatus && matchesSearch;
  });

  renderDashboard();
  renderProjects();
  renderOperationalModules();
  window.lucide?.createIcons();
}

function runGlobalSearch() {
  state.filters.search = elements.search.value.trim().toLowerCase();
  applyFilters();
  switchView("projetos");
  if (state.filters.search) elements.title.textContent = "Resultados da pesquisa";
}

function renderCloudStatus() {
  const status = elements.cloudStatus;
  status.classList.remove("ready", "pending", "error");

  if (state.cloud.available && !state.cloud.needsSeed) {
    status.classList.add("ready");
    elements.cloudTitle.textContent = "Base compartilhada ativa";
    elements.cloudMessage.textContent = `${state.base.length} registros dispon\u00edveis na nuvem para acesso em qualquer local.`;
    elements.cloudActions.innerHTML = `
      <button class="primary-button" type="button" data-cloud-action="upload-base"><span data-lucide="file-up"></span>Importar CSV/planilha</button>
      <button class="ghost-button" type="button" data-cloud-action="reload-base"><span data-lucide="rotate-ccw"></span>Restaurar publicada</button>
      <button class="ghost-button" type="button" data-cloud-action="refresh"><span data-lucide="refresh-cw"></span>Atualizar</button>
    `;
    return;
  }

  if (state.cloud.available && state.cloud.needsSeed) {
    status.classList.add("pending");
    elements.cloudTitle.textContent = "Banco conectado, sem dados";
    elements.cloudMessage.textContent = "Envie a base inicial para disponibilizar os registros na nuvem.";
    elements.cloudActions.innerHTML = `<button class="primary-button" type="button" data-cloud-action="seed"><span data-lucide="cloud-upload"></span>Enviar base inicial</button>`;
    return;
  }

  status.classList.add("error");
  elements.cloudTitle.textContent = "Base local em uso";
  elements.cloudMessage.textContent = `${state.cloud.error || "Nuvem ainda n\u00e3o configurada."} Execute o script SQL no Supabase.`;
  elements.cloudActions.innerHTML = `
    <button class="primary-button" type="button" data-cloud-action="upload-base"><span data-lucide="file-up"></span>Importar CSV local</button>
    <button class="ghost-button" type="button" data-cloud-action="refresh"><span data-lucide="refresh-cw"></span>Tentar novamente</button>
  `;
}

async function refreshCloudData() {
  elements.cloudTitle.textContent = "Atualizando base compartilhada";
  elements.cloudMessage.textContent = "Consultando registros no Supabase.";
  await connectCloudData();
  rebuildRecords();
  hydrateFilters();
  applyFilters();
  renderCloudStatus();
  window.lucide?.createIcons();
}

async function seedCloudData() {
  const records = [...state.base, ...state.custom].map(toDatabaseRecord);
  elements.cloudTitle.textContent = "Enviando base inicial";
  elements.cloudMessage.textContent = "Aguarde enquanto os registros s\u00e3o gravados na nuvem.";
  elements.cloudActions.innerHTML = "";

  try {
    await cloudRequest("/registros?on_conflict=external_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(records),
    });
    localStorage.removeItem(STORAGE_KEY);
    await refreshCloudData();
  } catch (error) {
    state.cloud.error = error.message;
    renderCloudStatus();
    alert(`N\u00e3o foi poss\u00edvel importar a base: ${error.message}`);
  }
}

async function reloadPublishedBase() {
  const source = initialDataset();
  if (!source.length) {
    alert("A base publicada n\u00e3o foi encontrada.");
    return;
  }

  const approved = confirm(
    "Recarregar a base substituir\u00e1 no banco os registros originalmente importados da planilha. Registros criados pelo site ser\u00e3o preservados. Deseja continuar?"
  );
  if (!approved) return;

  await replaceCloudBaseline(source, "Recarregando base publicada");
}

function initialDataset() {
  return Array.isArray(window.CORTEX_PROJETOS)
    ? window.CORTEX_PROJETOS.map((item) => normalizeRecord(item, "planilha"))
    : [];
}

const IMPORT_SHEETS = {
  projetos: {
    tipo: "projeto",
    required: ["Projeto"],
    title: ["Projeto", "Nome do Projeto", "Titulo", "Título"],
    id: ["ID", "ID Projeto", "Ordem"],
    description: ["Descrição do Projeto", "Descricao do Projeto", "Descrição", "Descricao"],
    category: ["Categoria"],
    value: ["Valor Anual Estimado", "Valor ano", "Valor Anual", "Valor Estimado"],
    sei: ["Processo SEI", "SEI"],
    contract: ["Contrato/Instrumento", "Contrato", "Instrumento"],
    area: ["Segmento STI Responsável", "Segmento STI Responsavel", "Área", "Area", "Área Responsável"],
    status: ["Fase / Status Atual", "Status", "Fase", "Status Atual"],
    comments: ["Observações", "Observacoes", "Comentários", "Comentarios"],
    deadline: ["Prazo Previsto", "Prazo", "Data de Conclusão Prevista", "Data de Conclusao Prevista"],
  },
  contratos: {
    tipo: "contrato",
    required: ["Número do Contrato", "Contrato", "Contrato/Instrumento", "Objeto do Contrato"],
    title: ["Número do Contrato", "Numero do Contrato", "Contrato", "Contrato/Instrumento", "Objeto do Contrato"],
    id: ["ID Contrato", "ID", "Número do Contrato", "Numero do Contrato"],
    description: ["Objeto do Contrato", "Objeto", "Descrição", "Descricao"],
    category: ["Tipo de Instrumento", "Categoria"],
    value: ["Valor Anual", "Valor Anual Estimado", "Valor Total Contratado", "Valor Contratado"],
    sei: ["Processo SEI", "SEI"],
    contract: ["Número do Contrato", "Numero do Contrato", "Contrato", "Contrato/Instrumento"],
    area: ["Segmento STI Responsável", "Segmento STI Responsavel", "Área Demandante", "Área Responsável", "Area"],
    status: ["Status do Contrato", "Status", "Situação", "Situacao"],
    comments: ["Observações Contratuais", "Observações", "Observacoes", "Comentários", "Comentarios"],
    deadline: ["Data de Vencimento", "Vencimento", "Fim da Vigência", "Fim da Vigencia", "Prazo"],
  },
  tarefas: {
    tipo: "tarefa",
    required: ["Título da Tarefa", "Titulo da Tarefa", "Tarefa"],
    title: ["Título da Tarefa", "Titulo da Tarefa", "Tarefa"],
    id: ["ID Tarefa", "ID"],
    description: ["Descrição da Tarefa", "Descricao da Tarefa", "Descrição", "Descricao"],
    category: ["Tipo de Entrega", "Categoria"],
    sei: ["Processo SEI", "SEI"],
    contract: ["Contrato", "Contrato/Instrumento"],
    area: ["Área Responsável", "Area Responsavel", "Segmento STI Responsável", "Segmento STI Responsavel", "Área", "Area"],
    status: ["Status da Tarefa", "Status"],
    comments: ["Observações", "Observacoes", "Comentários", "Comentarios", "Bloqueador"],
    deadline: ["Prazo Previsto", "Prazo", "Data Limite"],
  },
  licitacoes: {
    tipo: "licitacao",
    required: ["Objeto", "Objeto da Contratação", "Objeto da Contratacao", "Projeto"],
    title: ["Objeto da Contratação", "Objeto da Contratacao", "Objeto", "Projeto"],
    id: ["ID Licitação", "ID Licitacao", "ID"],
    description: ["Objeto da Contratação", "Objeto da Contratacao", "Descrição", "Descricao"],
    category: ["Categoria", "Tipo de Aquisição", "Tipo de Aquisicao"],
    value: ["Valor Estimado", "Valor Anual Estimado", "Valor Anual"],
    sei: ["Processo SEI", "SEI"],
    contract: ["Contrato Atual Vinculado", "Contrato"],
    area: ["Segmento STI Responsável", "Segmento STI Responsavel", "Área Demandante", "Area Demandante"],
    status: ["Fase da Licitação", "Fase da Licitacao", "Fase / Status Atual", "Status"],
    comments: ["Pendência Atual", "Pendencia Atual", "Observações", "Observacoes"],
    deadline: ["Data Limite para Contratar", "Prazo Previsto", "Prazo"],
  },
  pessoas: {
    tipo: "pessoa",
    required: ["Nome Completo", "Nome"],
    title: ["Nome Completo", "Nome", "Nome Usual"],
    id: ["ID Pessoa", "ID", "E-mail", "Email"],
    description: ["Cargo / Função", "Cargo / Funcao", "Papel na STI", "Função", "Funcao"],
    category: ["Vínculo", "Vinculo", "Categoria"],
    area: ["Segmento STI", "Área", "Area"],
    status: ["Status"],
    comments: ["Observações Gerais", "Observações", "Observacoes"],
    deadline: ["Data de Revisão", "Data de Revisao"],
  },
  skills: {
    tipo: "pessoa",
    categoria: "Skill",
    required: ["ID Pessoa", "Nome", "Skill"],
    title: ["Skill"],
    id: ["ID Skill", "ID"],
    description: ["Evidência", "Evidencia", "Observações", "Observacoes"],
    category: ["Tipo de Skill"],
    area: ["Segmento STI", "Área", "Area"],
    status: ["Nível", "Nivel"],
    comments: ["Observações", "Observacoes", "Evidência", "Evidencia"],
    deadline: ["Data da Avaliação", "Data da Avaliacao"],
  },
  avaliacoes: {
    tipo: "pessoa",
    categoria: "Avaliação",
    required: ["ID Pessoa", "Nome", "Período Avaliado", "Periodo Avaliado"],
    title: ["Período Avaliado", "Periodo Avaliado", "Nome"],
    id: ["ID Avaliação", "ID Avaliacao", "ID"],
    description: ["Pontos Fortes", "Plano de Ação", "Plano de Acao"],
    category: ["Classificação Geral", "Classificacao Geral"],
    status: ["Classificação Geral", "Classificacao Geral", "Status"],
    comments: ["Pontos de Desenvolvimento", "Plano de Ação", "Plano de Acao", "Observações", "Observacoes"],
    deadline: ["Data de Revisão", "Data de Revisao", "Data da Avaliação", "Data da Avaliacao"],
  },
  alocacoes: {
    tipo: "pessoa",
    categoria: "Alocação",
    required: ["ID Pessoa", "Nome", "ID Projeto", "Projeto"],
    title: ["Projeto", "ID Projeto"],
    id: ["ID Alocação", "ID Alocacao", "ID"],
    description: ["Papel no Projeto", "Observações", "Observacoes"],
    category: ["Papel no Projeto"],
    status: ["Status da Alocação", "Status da Alocacao", "Status"],
    comments: ["Observações", "Observacoes"],
    deadline: ["Data de Fim", "Data de Fim Prevista"],
  },
  ausencias: {
    tipo: "pessoa",
    categoria: "Ausência",
    required: ["ID Pessoa", "Nome", "Tipo de Ausência", "Tipo de Ausencia"],
    title: ["Tipo de Ausência", "Tipo de Ausencia", "Nome"],
    id: ["ID Ausência", "ID Ausencia", "ID"],
    description: ["Observações", "Observacoes"],
    category: ["Tipo de Ausência", "Tipo de Ausencia"],
    status: ["Status"],
    comments: ["Observações", "Observacoes"],
    deadline: ["Data de Fim"],
  },
  remuneracao: {
    tipo: "pessoa",
    categoria: "Remuneração",
    required: ["ID Pessoa", "Nome", "Competência", "Competencia"],
    title: ["Competência", "Competencia", "Nome"],
    id: ["ID Remuneração", "ID Remuneracao", "ID"],
    description: ["Fonte da Informação", "Fonte da Informacao", "Observações Remuneratórias", "Observacoes Remuneratorias"],
    value: ["Custo Total Estimado", "Salário Base", "Salario Base"],
    category: ["Categoria"],
    status: ["Competência", "Competencia"],
    comments: ["Observações Remuneratórias", "Observacoes Remuneratorias"],
  },
};

async function importSpreadsheet(event) {
  const files = [...(event.target.files || [])];
  event.target.value = "";
  if (!files.length) return;

  try {
    const source = (await Promise.all(files.map(importFileRecords))).flat();
    if (!source.length) {
      alert("Nenhum registro foi encontrado. Para CSV, use nomes como Projetos.csv, Contratos.csv, Tarefas.csv ou Pessoas.csv.");
      return;
    }

    const summary = countsBy(source, "tipo").map(([tipo, total]) => `${typeLabel(tipo)}: ${total}`).join(" | ");
    const approved = confirm(
      `Importar ${source.length} registros (${summary})? A base anteriormente importada será substituída e cadastros manuais serão preservados.`
    );
    if (!approved) return;

    await replaceCloudBaseline(source, "Importando arquivo CORTEX");
  } catch (error) {
    alert(`Não foi possível ler o arquivo: ${error.message}`);
  }
}

async function importFileRecords(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (["xlsx", "xls"].includes(extension)) {
    if (!window.XLSX) throw new Error("O componente de leitura de planilhas não carregou. Atualize a página e tente novamente.");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    return workbook.SheetNames.flatMap((sheetName) => {
      const key = importKeyFromName(sheetName);
      if (!key) return [];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: true });
      return recordsFromRows(rows, key, sheetName);
    });
  }

  const text = await file.text();
  if (extension === "json") return recordsFromJson(text, file.name);
  if (extension === "csv") {
    const key = importKeyFromName(file.name.replace(/\.csv$/i, ""));
    if (!key) throw new Error(`Não reconheci o tipo do CSV "${file.name}". Use nomes como Projetos.csv, Contratos.csv, Tarefas.csv ou Pessoas.csv.`);
    return recordsFromRows(parseCsv(text), key, file.name);
  }

  throw new Error(`Extensão .${extension} não suportada. Envie CSV, JSON, XLSX ou XLS.`);
}

function recordsFromJson(text, fileName) {
  const payload = JSON.parse(text);
  if (Array.isArray(payload)) return payload.map((item, index) => normalizeRecord(importedRecord(item, importKeyFromName(fileName) || "projetos", index), "planilha"));
  if (Array.isArray(payload.registros)) return payload.registros.map((item) => normalizeRecord(item, "planilha"));

  return Object.entries(payload).flatMap(([name, rows]) => {
    const key = importKeyFromName(name);
    return key && Array.isArray(rows) ? recordsFromRows(rows, key, name) : [];
  });
}

function recordsFromRows(rows, key, sourceName) {
  return rows
    .filter((row) => hasRequiredData(row, IMPORT_SHEETS[key]))
    .map((row, index) => normalizeRecord(importedRecord(row, key, index, sourceName), "planilha"));
}

function importedRecord(row, key, index, sourceName = key) {
  const config = IMPORT_SHEETS[key];
  const title = textValue(cellByAnyHeader(row, config.title)) || `${humanizeImportKey(key)} ${index + 1}`;
  const idSeed = textValue(cellByAnyHeader(row, config.id)) || String(index + 1).padStart(3, "0");
  const detalhes = rowDetails(row);
  const pessoa = textValue(cellByAnyHeader(row, ["Nome Completo", "Nome", "ID Pessoa"]));
  const suffix = ["skills", "avaliacoes", "alocacoes", "ausencias", "remuneracao"].includes(key) && pessoa ? ` - ${pessoa}` : "";

  return {
    id: `${key}-${idSeed}`,
    tipo: config.tipo,
    ordem: textValue(cellByAnyHeader(row, ["Ordem", "ID", "ID Projeto", "ID Tarefa", "ID Contrato"])) || String(index + 1).padStart(2, "0"),
    projeto: `${title}${suffix}`,
    categoria: config.categoria || textValue(cellByAnyHeader(row, config.category)) || defaultCategory(config.tipo),
    valorAno: numberValue(cellByAnyHeader(row, config.value || [])),
    sei: textValue(cellByAnyHeader(row, config.sei || [])),
    contrato: textValue(cellByAnyHeader(row, config.contract || [])),
    descricao: textValue(cellByAnyHeader(row, config.description || [])),
    area: textValue(cellByAnyHeader(row, config.area || [])),
    status: textValue(cellByAnyHeader(row, config.status || [])) || "Importado",
    comentarios: textValue(cellByAnyHeader(row, config.comments || [])),
    prazo: sheetDateValue(cellByAnyHeader(row, config.deadline || [])),
    detalhes: {
      ...detalhes,
      "Origem da importação": sourceName,
      "Tipo de importação": humanizeImportKey(key),
    },
    externalId: `planilha-${key}-${norm(idSeed).replaceAll(" ", "-")}`,
    origem: "planilha",
  };
}

function hasRequiredData(row, config) {
  return config.required.some((header) => textValue(cellByHeader(row, header)));
}

function importKeyFromName(name) {
  const value = norm(name).replace(/\.(csv|json|xlsx|xls)$/i, "");
  const aliases = {
    projeto: "projetos",
    projetos: "projetos",
    demandas: "projetos",
    contrato: "contratos",
    contratos: "contratos",
    tarefa: "tarefas",
    tarefas: "tarefas",
    entregas: "tarefas",
    pessoa: "pessoas",
    pessoas: "pessoas",
    equipe: "pessoas",
    equipes: "pessoas",
    time: "pessoas",
    skills: "skills",
    skill: "skills",
    competencias: "skills",
    avaliacoes: "avaliacoes",
    avaliacao: "avaliacoes",
    alocacoes: "alocacoes",
    alocacao: "alocacoes",
    ausencias: "ausencias",
    ausencia: "ausencias",
    remuneracao: "remuneracao",
    remuneracoes: "remuneracao",
    salarios: "remuneracao",
    licitacoes: "licitacoes",
    licitacao: "licitacoes",
  };
  return aliases[value] || null;
}

function humanizeImportKey(key) {
  const map = {
    projetos: "Projetos",
    contratos: "Contratos",
    tarefas: "Tarefas",
    pessoas: "Pessoas",
    skills: "Skills",
    avaliacoes: "Avaliações",
    alocacoes: "Alocações",
    ausencias: "Ausências",
    remuneracao: "Remuneração",
    licitacoes: "Licitações",
  };
  return map[key] || key;
}

function rowDetails(row) {
  return Object.fromEntries(Object.entries(row)
    .map(([key, value]) => [String(key).trim(), value])
    .filter(([key, value]) => key && !key.startsWith("__EMPTY") && textValue(value))
    .map(([key, value]) => [key, value instanceof Date ? sheetDateValue(value) : textValue(value)]));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ";" && !quoted) {
      row.push(cell);
      cell = "";
    } else if (char === "," && !quoted && text.includes(",") && !text.includes(";")) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  const [headers = [], ...data] = rows;
  return data.map((values) => Object.fromEntries(headers.map((header, index) => [header.trim(), values[index] ?? null])));
}

function spreadsheetRecords(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
  return recordsFromRows(rows, "projetos", "Projetos");
}

function cellByHeader(row, wanted) {
  const key = Object.keys(row).find((name) => norm(name) === norm(wanted));
  return key ? row[key] : null;
}

function cellByAnyHeader(row, headers = []) {
  return headers.map((header) => cellByHeader(row, header)).find((value) => textValue(value));
}

function textValue(value) {
  return value === null || value === undefined || value === "" ? null : String(value).trim();
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value)
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function sheetDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value) && value > 20000 && value < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30 + value));
    return date.toISOString().slice(0, 10);
  }
  const text = textValue(value);
  if (!text) return null;
  const brDate = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (brDate) {
    const [, day, month, year] = brDate;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return isoDate ? isoDate[0] : text;
}

async function replaceCloudBaseline(source, title) {
  elements.cloudTitle.textContent = title;
  elements.cloudMessage.textContent = "Atualizando os registros de origem planilha.";
  elements.cloudActions.innerHTML = "";

  if (!state.cloud.available || state.cloud.needsSeed) {
    state.base = source;
    rebuildRecords();
    hydrateFilters();
    applyFilters();
    renderCloudStatus();
    elements.cloudTitle.textContent = "Base importada localmente";
    elements.cloudMessage.textContent = `${source.length} registros carregados nesta sessão. Configure o Supabase para compartilhar com outros usuários.`;
    return;
  }

  try {
    await cloudRequest("/registros?origem=eq.planilha", {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    await cloudRequest("/registros?on_conflict=external_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(source.map(toDatabaseRecord)),
    });
    await refreshCloudData();
  } catch (error) {
    state.cloud.error = error.message;
    renderCloudStatus();
    alert(`N\u00e3o foi poss\u00edvel atualizar a base: ${error.message}`);
  }
}

function renderDashboard() {
  const projetos = projectLikeRecords();
  const total = projetos.length;
  const emAndamento = projetos.filter((item) => item.status === "Em andamento").length;
  const licitacoes = licitacaoRecords().length;
  const semPrazo = projetos.filter((item) => !item.prazo).length;
  const comSei = projetos.filter((item) => item.sei).length;
  const comContrato = contratoRecords().length;

  elements.kpiGrid.innerHTML = [
    kpi("database", total, "Registros de gest\u00e3o", "all", "records"),
    kpi("activity", emAndamento, "Demandas em andamento", "status:Em andamento", "progress"),
    kpi("file-search", licitacoes, "Itens de licita\u00e7\u00e3o", "categoria:Licita\u00e7\u00f5es", "bidding"),
    kpi("calendar-alert", semPrazo, "Itens sem prazo", "missing:prazo", "deadline"),
  ].join("");

  renderBars(elements.areaBars, countsBy(projetos, "area"));
  renderStatusList(countsBy(projetos, "status"));
  renderAlerts({ semPrazo, comSei, comContrato, total });
}

function renderProjects() {
  elements.projectCount.textContent = `${state.filtered.length} de ${projectLikeRecords().length} registros exibidos`;

  if (!state.filtered.length) {
    elements.projectTable.innerHTML = `<tr><td colspan="7" class="empty-state">Nenhum registro encontrado com os filtros atuais.</td></tr>`;
    return;
  }

  elements.projectTable.innerHTML = state.filtered
    .map((item) => `
      <tr>
        <td>
          <div class="project-title">
            <strong>${escapeHtml(item.projeto || "Sem t\u00edtulo")}</strong>
            <span>${escapeHtml(item.descricao || "Sem descri\u00e7\u00e3o cadastrada")}</span>
          </div>
        </td>
        <td>${badge(item.categoria || "Sem categoria")}</td>
        <td>${escapeHtml(item.area || "N\u00e3o definida")}</td>
        <td>${badge(item.status || "Sem status", statusClass(item.status))}</td>
        <td>${escapeHtml(item.sei || "-")}</td>
        <td>${formatDate(item.prazo)}</td>
        <td>
          <button class="ghost-button" type="button" data-detail-key="${escapeHtml(item.key)}">
            <span data-lucide="panel-right-open"></span>
            Ver
          </button>
        </td>
      </tr>
    `)
    .join("");
}

function applyDashboardShortcut(filter) {
  resetProjectFilters();

  if (filter === "all") {
    state.filters.search = "";
    elements.search.value = "";
  } else if (filter.startsWith("status:")) {
    setSelectFilter("status", elements.status, filter.slice("status:".length), "Todos");
  } else if (filter.startsWith("area:")) {
    setSelectFilter("area", elements.area, filter.slice("area:".length), "Todas");
  } else if (filter.startsWith("categoria:")) {
    setSelectFilter("categoria", elements.category, filter.slice("categoria:".length), "Todas");
  } else if (filter === "missing:prazo") {
    state.filters.search = "__sem_prazo__";
    elements.search.value = "sem prazo";
  } else if (filter === "missing:sei") {
    state.filters.search = "__sem_sei__";
    elements.search.value = "sem SEI";
  } else if (filter === "missing:contrato") {
    state.filters.search = "__sem_contrato__";
    elements.search.value = "sem contrato";
  } else if (filter === "has:contrato") {
    state.filters.search = "__com_contrato__";
    elements.search.value = "com contrato";
  }

  applyFilters();
  switchView("projetos");
}

function resetProjectFilters() {
  state.filters.search = "";
  state.filters.categoria = "Todas";
  state.filters.area = "Todas";
  state.filters.status = "Todos";
  elements.search.value = "";
  elements.category.value = "Todas";
  elements.area.value = "Todas";
  elements.status.value = "Todos";
}

function setSelectFilter(key, select, value, fallback) {
  state.filters[key] = [...select.options].some((option) => option.value === value) ? value : fallback;
  select.value = state.filters[key];
}

function renderOperationalModules() {
  renderLicitacoes();
  renderTarefas();
  renderContratos();
  renderPessoas();
  renderDocumentos();
}

function renderLicitacoes() {
  const records = licitacaoRecords();
  renderRecordModule("licitacoes", {
    title: "Licita\u00e7\u00f5es",
    subtitle: "Itens classificados como licita\u00e7\u00e3o, com fase administrativa separada para evolu\u00e7\u00e3o futura.",
    metrics: [
      ["Total", records.length],
      ["Com SEI", records.filter((item) => item.sei).length],
      ["Em fase ETP/TR", records.filter((item) => ["etp", "tr"].includes(norm(item.status))).length],
      ["Sem prazo", records.filter((item) => !item.prazo).length],
    ],
    records,
    empty: "Nenhuma licita\u00e7\u00e3o encontrada.",
  });
}

function renderTarefas() {
  const records = tarefaRecords();
  renderRecordModule("tarefas", {
    title: "Tarefas e prazos",
    subtitle: "Controle de execução por responsável, prazo previsto, status, bloqueios e próxima ação.",
    metrics: [
      ["Total", records.length],
      ["Atrasadas", records.filter(isOverdue).length],
      ["Vencem em 7 dias", records.filter((item) => daysUntil(item.prazo) >= 0 && daysUntil(item.prazo) <= 7).length],
      ["Sem responsável", records.filter((item) => !detailValue(item, "Responsável Principal") && !detailValue(item, "Responsavel Principal")).length],
    ],
    records: records.sort((a, b) => (daysUntil(a.prazo) ?? 99999) - (daysUntil(b.prazo) ?? 99999)),
    empty: "Nenhuma tarefa importada. Envie Tarefas.csv ou a aba Tarefas.",
  });
}

function renderContratos() {
  const records = contratoRecords();
  renderRecordModule("contratos", {
    title: "Contratos",
    subtitle: "Controle de vigência com assinatura, início, vencimento, fornecedor, fiscal e gestor quando informados no CSV.",
    metrics: [
      ["Total", records.length],
      ["Vencidos", records.filter(isOverdue).length],
      ["Vencem em 90 dias", records.filter((item) => daysUntil(item.prazo) >= 0 && daysUntil(item.prazo) <= 90).length],
      ["Sem vencimento", records.filter((item) => !item.prazo).length],
    ],
    records: records.sort((a, b) => (daysUntil(a.prazo) ?? 99999) - (daysUntil(b.prazo) ?? 99999)),
    empty: "Nenhum contrato vinculado encontrado.",
  });
}

function renderPessoas() {
  const pessoas = state.registros.filter((item) => item.tipo === "pessoa");
  const areas = countsBy(projectLikeRecords(), "area");
  const areaRecords = areas.map(([area, quantidade], index) => ({
    key: `area-${index}`,
    projeto: area,
    descricao: `${quantidade} demandas vinculadas`,
    area,
    status: "\u00c1rea",
    sei: "",
    prazo: "",
    tipo: "area",
  }));
  const records = [...pessoas, ...areaRecords];

  renderRecordModule("pessoas", {
    title: "Pessoas e \u00e1reas",
    subtitle: "Cadastro inicial de equipes, usando as \u00e1reas encontradas na planilha como ponto de partida.",
    metrics: [
      ["\u00c1reas", areas.length],
      ["Pessoas locais", pessoas.length],
      ["Maior carga", areas[0]?.[1] || 0],
      ["Sem \u00e1rea", projectLikeRecords().filter((item) => !item.area).length],
    ],
    records,
    empty: "Nenhuma \u00e1rea ou pessoa encontrada.",
  });
}

function renderDocumentos() {
  const documentos = state.registros.filter((item) => item.tipo === "documento");
  const vinculados = projectLikeRecords().filter((item) => item.sei || item.contrato);
  const records = [
    ...documentos,
    ...vinculados.slice(0, 12).map((item) => ({
      ...item,
      key: `docref-${item.key}`,
      projeto: item.projeto,
      descricao: `Refer\u00eancia documental: ${[item.sei && `SEI ${item.sei}`, item.contrato && `Contrato ${item.contrato}`].filter(Boolean).join(" | ")}`,
      status: item.contrato ? "Contrato vinculado" : "SEI vinculado",
      tipo: "documento",
    })),
  ];

  renderRecordModule("documentos", {
    title: "Documentos",
    subtitle: "Nesta fase, o m\u00f3dulo lista refer\u00eancias documentais e rascunhos locais de upload.",
    metrics: [
      ["Rascunhos", documentos.length],
      ["Com SEI", projectLikeRecords().filter((item) => item.sei).length],
      ["Com contrato", contratoRecords().length],
      ["Sem vinculo", projectLikeRecords().filter((item) => !item.sei && !item.contrato).length],
    ],
    records,
    empty: "Nenhum documento registrado.",
  });
}

function renderRecordModule(module, config) {
  const view = document.querySelector(`#view-${module}`);
  view.innerHTML = `
    <section class="panel module-placeholder">
      <div class="panel-header">
        <div>
          <h2>${escapeHtml(config.title)}</h2>
          <p>${escapeHtml(config.subtitle)}</p>
        </div>
        <button class="primary-button" type="button" data-create-type="${moduleToType(module)}">
          <span data-lucide="plus"></span>
          Novo
        </button>
      </div>
      <div class="mini-dashboard">
        ${config.metrics.map(([label, value]) => miniKpi(label, value)).join("")}
      </div>
      <div class="record-list">
        ${config.records.length ? config.records.map(recordRow).join("") : `<div class="empty-state">${escapeHtml(config.empty)}</div>`}
      </div>
    </section>
  `;

  view.querySelector("[data-create-type]").addEventListener("click", (event) => {
    openEntryDialog(event.currentTarget.dataset.createType);
  });
}

function recordRow(item) {
  return `
    <article class="record-row">
      <div class="record-main">
        <strong>${escapeHtml(item.projeto || "Sem t\u00edtulo")}</strong>
        <span>${escapeHtml(item.descricao || item.comentarios || "Sem descri\u00e7\u00e3o")}</span>
      </div>
      <div class="record-meta">
        <strong>${escapeHtml(item.area || "N\u00e3o definida")}</strong>
        <span>\u00c1rea</span>
      </div>
      <div class="record-meta">
        <strong>${escapeHtml(item.sei || item.contrato || "-")}</strong>
        <span>Vinculo</span>
      </div>
      <div>${badge(item.status || "Sem status", statusClass(item.status))}</div>
      <button class="ghost-button" type="button" data-detail-key="${escapeHtml(item.key)}">
        <span data-lucide="panel-right-open"></span>
        Ver
      </button>
    </article>
  `;
}

function openEntryDialog(type = "projeto") {
  state.editingKey = null;
  elements.entryDialogTitle.textContent = "Novo registro";
  elements.entryType.value = moduleToType(type);
  elements.entryTitle.value = "";
  elements.entryCategory.value = "";
  elements.entryArea.value = "";
  elements.entryStatus.value = "";
  elements.entryDeadline.value = "";
  elements.entrySei.value = "";
  elements.entryContract.value = "";
  elements.entryValue.value = "";
  elements.entryFile.value = "";
  elements.entryDescription.value = "";
  elements.entryComments.value = "";
  elements.dialog.showModal();
}

async function saveEntry(event) {
  event.preventDefault();
  const title = elements.entryTitle.value.trim();
  if (!title) {
    alert("Informe um t\u00edtulo para salvar o registro.");
    return;
  }

  const tipo = elements.entryType.value;
  const file = elements.entryFile.files?.[0] || null;
  const existing = state.registros.find((item) => item.key === state.editingKey);
  const record = normalizeRecord({
    id: existing?.id || createId(),
    tipo,
    ordem: existing?.ordem || "",
    projeto: title,
    categoria: elements.entryCategory.value.trim() || defaultCategory(tipo),
    valorAno: elements.entryValue.value ? Number(elements.entryValue.value) : null,
    sei: elements.entrySei.value.trim() || null,
    contrato: elements.entryContract.value.trim() || (tipo === "contrato" ? title : null),
    descricao: elements.entryDescription.value.trim() || null,
    area: elements.entryArea.value.trim() || null,
    status: elements.entryStatus.value.trim() || "Rascunho",
    comentarios: elements.entryComments.value.trim() || (existing?.comentarios ?? (state.cloud.available && !state.cloud.needsSeed ? "Criado no CORTEX online" : "Criado no prot\u00f3tipo local")),
    prazo: elements.entryDeadline.value || null,
    arquivo: file ? { nome: file.name, tamanho: file.size, tipo: file.type || "desconhecido" } : existing?.arquivo || null,
    detalhes: existing?.detalhes || {},
    criadoEm: existing?.criadoEm || new Date().toISOString(),
    externalId: existing?.externalId,
    origem: existing?.origem,
  }, existing?.source || "local");

  if (state.cloud.available && !state.cloud.needsSeed) {
    try {
      const method = existing?.source === "nuvem" ? "PATCH" : "POST";
      const path = existing?.source === "nuvem" ? `/registros?id=eq.${encodeURIComponent(existing.id)}` : "/registros";
      const saved = await cloudRequest(path, {
        method,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(toDatabaseRecord(record)),
      });
      const savedRecord = fromDatabaseRecord(saved[0]);
      if (existing?.source === "nuvem") {
        state.base = state.base.map((item) => item.id === existing.id ? savedRecord : item);
      } else {
        state.base.push(savedRecord);
      }
    } catch (error) {
      alert(`N\u00e3o foi poss\u00edvel salvar na nuvem: ${error.message}`);
      return;
    }
  } else {
    if (existing) {
      state.custom = state.custom.map((item) => item.key === existing.key ? record : item);
    } else {
      state.custom.push(record);
    }
    persistCustomRecords();
  }

  state.editingKey = null;
  rebuildRecords();
  hydrateFilters();
  applyFilters();
  renderCloudStatus();
  elements.dialog.close();
}

function openDetail(key) {
  const record = state.registros.find((item) => item.key === key) || findVirtualRecord(key);
  if (!record) return;

  state.detailKey = record.key;
  elements.detailKind.textContent = typeLabel(record.tipo);
  elements.detailTitle.textContent = record.projeto || "Registro";
  elements.detailContent.innerHTML = [
    detailItem("Categoria", record.categoria || typeLabel(record.tipo)),
    detailItem("\u00c1rea", record.area || "N\u00e3o definida"),
    detailItem("Status/Fase", record.status || "Sem status"),
    detailItem("Prazo", formatDate(record.prazo)),
    detailItem("Processo SEI", record.sei || "-"),
    detailItem("Contrato", record.contrato || "-"),
    detailItem("Arquivo", record.arquivo ? `${record.arquivo.nome} (${formatBytes(record.arquivo.tamanho)})` : "-"),
    detailItem("Descri\u00e7\u00e3o", record.descricao || "Sem descri\u00e7\u00e3o cadastrada", true),
    detailItem("Comentarios", record.comentarios || "Sem comentarios", true),
    ...detailItemsFromDetails(record.detalhes),
  ].join("");
  elements.detailActions.innerHTML = canMutateRecord(record) ? `
    <button class="danger-button" type="button" data-record-action="delete" data-record-key="${escapeHtml(record.key)}">
      <span data-lucide="trash-2"></span>Excluir
    </button>
    <button class="primary-button" type="button" data-record-action="edit" data-record-key="${escapeHtml(record.key)}">
      <span data-lucide="pencil"></span>Editar
    </button>
  ` : "";
  elements.detailDialog.showModal();
  window.lucide?.createIcons();
}

function canMutateRecord(record) {
  return record.tipo !== "area" && !record.key.startsWith("docref-");
}

function editRecord(key) {
  const record = state.registros.find((item) => item.key === key);
  if (!record) return;

  state.editingKey = record.key;
  elements.detailDialog.close();
  elements.entryDialogTitle.textContent = "Editar registro";
  elements.entryType.value = record.tipo || "projeto";
  elements.entryTitle.value = record.projeto || "";
  elements.entryCategory.value = record.categoria || "";
  elements.entryArea.value = record.area || "";
  elements.entryStatus.value = record.status || "";
  elements.entryDeadline.value = dateOnlyOrNull(record.prazo) || "";
  elements.entrySei.value = record.sei || "";
  elements.entryContract.value = record.contrato || "";
  elements.entryValue.value = record.valorAno || "";
  elements.entryFile.value = "";
  elements.entryDescription.value = record.descricao || "";
  elements.entryComments.value = record.comentarios || "";
  elements.dialog.showModal();
}

async function deleteRecord(key) {
  const record = state.registros.find((item) => item.key === key);
  if (!record || !canMutateRecord(record)) return;
  if (!confirm(`Excluir o registro "${record.projeto}"? Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.`)) return;

  try {
    if (state.cloud.available && !state.cloud.needsSeed && record.source === "nuvem") {
      await cloudRequest(`/registros?id=eq.${encodeURIComponent(record.id)}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
      state.base = state.base.filter((item) => item.id !== record.id);
    } else {
      state.custom = state.custom.filter((item) => item.key !== record.key);
      persistCustomRecords();
    }
    elements.detailDialog.close();
    rebuildRecords();
    hydrateFilters();
    applyFilters();
    renderCloudStatus();
  } catch (error) {
    alert(`N\u00e3o foi poss\u00edvel excluir o registro: ${error.message}`);
  }
}

function findVirtualRecord(key) {
  if (key.startsWith("docref-")) {
    const originalKey = key.replace("docref-", "");
    return state.registros.find((item) => item.key === originalKey);
  }
  if (key.startsWith("area-")) {
    const areaIndex = Number(key.replace("area-", ""));
    const [area, quantidade] = countsBy(projectLikeRecords(), "area")[areaIndex] || [];
    return area ? { key, tipo: "area", projeto: area, area, status: "\u00c1rea", descricao: `${quantidade} demandas vinculadas` } : null;
  }
  return null;
}

function exportData() {
  const payload = {
    exportadoEm: new Date().toISOString(),
    origem: state.cloud.available && !state.cloud.needsSeed ? "supabase" : "local",
    registros: state.registros,
    totalRegistros: state.registros.length,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cortex-registros.json";
  link.click();
  URL.revokeObjectURL(url);
}

function switchView(view) {
  state.view = view;
  elements.title.textContent = moduleTitles[view];

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });

  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });
}

function handleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Entrada por voz ainda depende de suporte do navegador. Podemos integrar isso em uma pr\u00f3xima etapa.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    elements.search.value = text;
    state.filters.search = text.toLowerCase();
    applyFilters();
  };
}

function projectLikeRecords() {
  return state.registros.filter((item) => !["pessoa", "documento"].includes(item.tipo));
}

function licitacaoRecords() {
  return state.registros.filter((item) => item.tipo === "licitacao" || norm(item.categoria) === "licitacoes");
}

function contratoRecords() {
  return state.registros.filter((item) => item.tipo === "contrato" || Boolean(item.contrato));
}

function tarefaRecords() {
  return state.registros.filter((item) => item.tipo === "tarefa");
}

function moduleToType(module) {
  const map = {
    licitacoes: "licitacao",
    contratos: "contrato",
    tarefas: "tarefa",
    pessoas: "pessoa",
    documentos: "documento",
    projetos: "projeto",
    dashboard: "projeto",
  };
  return map[module] || module || "projeto";
}

function defaultCategory(tipo) {
  const map = {
    projeto: "Demanda",
    licitacao: "Licita\u00e7\u00f5es",
    tarefa: "Tarefa",
    contrato: "Contrato",
    pessoa: "Pessoa",
    documento: "Documento",
  };
  return map[tipo] || "Demanda";
}

function daysUntil(value) {
  const date = dateOnlyOrNull(value);
  if (!date) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const targetUtc = Date.parse(`${date}T00:00:00Z`);
  return Math.ceil((targetUtc - todayUtc) / 86400000);
}

function isOverdue(item) {
  const days = daysUntil(item.prazo);
  return days !== null && days < 0 && !["finalizado", "entregue", "concluido", "concluida", "encerrado"].includes(norm(item.status));
}

function detailValue(item, label) {
  return item.detalhes?.[label];
}

function typeLabel(tipo) {
  const map = {
    projeto: "Projeto/demanda",
    licitacao: "Licita\u00e7\u00e3o",
    contrato: "Contrato",
    pessoa: "Pessoa",
    tarefa: "Tarefa",
    documento: "Documento",
    area: "\u00c1rea",
  };
  return map[tipo] || "Registro";
}

function countsBy(records, key) {
  const map = new Map();
  records.forEach((item) => {
    const value = item[key] || "N\u00e3o definido";
    map.set(value, (map.get(value) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
}

function renderBars(target, counts) {
  const max = Math.max(...counts.map(([, value]) => value), 1);
  target.innerHTML = counts
    .slice(0, 10)
    .map(([label, value]) => `
      <button class="bar-row dashboard-action" type="button" data-dashboard-filter="area:${escapeHtml(label)}">
        <div class="bar-label">${escapeHtml(label || "N\u00e3o definido")}</div>
        <div class="bar-track"><div class="bar-fill" style="width: ${(value / max) * 100}%"></div></div>
        <div class="bar-value">${value}</div>
      </button>
    `)
    .join("");
}

function renderStatusList(counts) {
  elements.statusList.innerHTML = counts
    .slice(0, 8)
    .map(([label, value]) => `
      <button class="status-row dashboard-action" type="button" data-dashboard-filter="status:${escapeHtml(label)}">
        ${escapeHtml(label || "Sem status")}
        <span>${value}</span>
      </button>
    `)
    .join("");
}

function renderAlerts({ semPrazo, comSei, comContrato, total }) {
  const semSei = total - comSei;
  const semContrato = total - comContrato;
  elements.alertList.innerHTML = [
    alertRow("Sem prazo definido", semPrazo, true, "missing:prazo"),
    alertRow("Sem processo SEI", semSei, true, "missing:sei"),
    alertRow("Com contrato vinculado", comContrato, false, "has:contrato"),
    alertRow("Sem contrato vinculado", semContrato, false, "missing:contrato"),
  ].join("");
}

function kpi(icon, value, label, filter, tone) {
  return `
    <button class="kpi-card kpi-${escapeHtml(tone)} dashboard-action" type="button" data-dashboard-filter="${escapeHtml(filter)}">
      <span data-lucide="${icon}"></span>
      <strong>${value}</strong>
      <p>${label}</p>
    </button>
  `;
}

function miniKpi(label, value) {
  return `
    <article class="mini-kpi">
      <strong>${value}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `;
}

function alertRow(label, value, critical, filter) {
  return `
    <button class="alert-row dashboard-action ${critical ? "critical" : ""}" type="button" data-dashboard-filter="${escapeHtml(filter)}">
      ${escapeHtml(label)}
      <span>${value}</span>
    </button>
  `;
}

function detailItemsFromDetails(details = {}) {
  return Object.entries(details)
    .filter(([label, value]) => label && textValue(value))
    .slice(0, 24)
    .map(([label, value]) => detailItem(label, formatDetailValue(value), String(value).length > 80));
}

function formatDetailValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value;
}

function detailItem(label, value, full = false) {
  return `
    <div class="detail-item ${full ? "full" : ""}">
      <span>${escapeHtml(label)}</span>
      <p>${escapeHtml(value || "-")}</p>
    </div>
  `;
}

function badge(label, className = "") {
  return `<span class="badge ${className}">${escapeHtml(label)}</span>`;
}

function statusClass(status = "") {
  const key = norm(status);
  if (["finalizado", "entregue"].includes(key)) return "status-finalizado";
  if (["pausado", "gabinete"].includes(key)) return "status-risco";
  if (["etp", "tr", "pregao", "ois", "homologacao", "planejamento"].includes(key)) return "status-atencao";
  return "";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function isSpecialSearch(search) {
  return search.startsWith("__") && search.endsWith("__");
}

function matchesSpecialSearch(item, search) {
  const tests = {
    "__sem_prazo__": !item.prazo,
    "__sem_sei__": !item.sei,
    "__sem_contrato__": !item.contrato,
    "__com_contrato__": Boolean(item.contrato),
  };
  return Boolean(tests[search]);
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
