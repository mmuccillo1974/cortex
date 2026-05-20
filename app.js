const STORAGE_KEY = "cortex.registros.v1";

const state = {
  base: [],
  custom: [],
  registros: [],
  filtered: [],
  view: "dashboard",
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
  elements.clearSearch = document.querySelector("#clear-search");
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
  elements.closeDetail = document.querySelector("#close-detail");
  elements.newEntry = document.querySelector("#new-entry-button");
  elements.saveEntry = document.querySelector("#save-entry");
  elements.export = document.querySelector("#export-button");
  elements.voice = document.querySelector("#voice-button");
  elements.entryType = document.querySelector("#entry-type");
  elements.entryTitle = document.querySelector("#entry-title");
  elements.entryArea = document.querySelector("#entry-area");
  elements.entryStatus = document.querySelector("#entry-status");
  elements.entryDeadline = document.querySelector("#entry-deadline");
  elements.entrySei = document.querySelector("#entry-sei");
  elements.entryFile = document.querySelector("#entry-file");
  elements.entryDescription = document.querySelector("#entry-description");
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  elements.search.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  elements.clearSearch.addEventListener("click", () => {
    elements.search.value = "";
    state.filters.search = "";
    applyFilters();
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

  document.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-detail-key]");
    if (detailButton) openDetail(detailButton.dataset.detailKey);
  });
}

async function loadData() {
  if (Array.isArray(window.CORTEX_PROJETOS)) {
    state.base = window.CORTEX_PROJETOS.map((item) => normalizeRecord(item, "planilha"));
  } else {
    const response = await fetch("data/projetos.json");
    const data = await response.json();
    state.base = data.map((item) => normalizeRecord(item, "planilha"));
  }

  state.custom = loadCustomRecords();
  rebuildRecords();
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
    ].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesCategory && matchesArea && matchesStatus && matchesSearch;
  });

  renderDashboard();
  renderProjects();
  renderOperationalModules();
  window.lucide?.createIcons();
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
    kpi("database", total, "Registros de gestao"),
    kpi("activity", emAndamento, "Demandas em andamento"),
    kpi("file-search", licitacoes, "Itens de licitacao"),
    kpi("calendar-alert", semPrazo, "Itens sem prazo"),
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
            <strong>${escapeHtml(item.projeto || "Sem titulo")}</strong>
            <span>${escapeHtml(item.descricao || "Sem descricao cadastrada")}</span>
          </div>
        </td>
        <td>${badge(item.categoria || "Sem categoria")}</td>
        <td>${escapeHtml(item.area || "Nao definida")}</td>
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

function renderOperationalModules() {
  renderLicitacoes();
  renderContratos();
  renderPessoas();
  renderDocumentos();
}

function renderLicitacoes() {
  const records = licitacaoRecords();
  renderRecordModule("licitacoes", {
    title: "Licitacoes",
    subtitle: "Itens classificados como licitacao, com fase administrativa separada para evolucao futura.",
    metrics: [
      ["Total", records.length],
      ["Com SEI", records.filter((item) => item.sei).length],
      ["Em fase ETP/TR", records.filter((item) => ["etp", "tr"].includes(norm(item.status))).length],
      ["Sem prazo", records.filter((item) => !item.prazo).length],
    ],
    records,
    empty: "Nenhuma licitacao encontrada.",
  });
}

function renderContratos() {
  const records = contratoRecords();
  renderRecordModule("contratos", {
    title: "Contratos",
    subtitle: "Registros com contrato informado ou criados diretamente como contrato.",
    metrics: [
      ["Total", records.length],
      ["Com SEI", records.filter((item) => item.sei).length],
      ["Com prazo", records.filter((item) => item.prazo).length],
      ["Sem area", records.filter((item) => !item.area).length],
    ],
    records,
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
    status: "Area",
    sei: "",
    prazo: "",
    tipo: "area",
  }));
  const records = [...pessoas, ...areaRecords];

  renderRecordModule("pessoas", {
    title: "Pessoas e areas",
    subtitle: "Cadastro inicial de equipes, usando as areas encontradas na planilha como ponto de partida.",
    metrics: [
      ["Areas", areas.length],
      ["Pessoas locais", pessoas.length],
      ["Maior carga", areas[0]?.[1] || 0],
      ["Sem area", projectLikeRecords().filter((item) => !item.area).length],
    ],
    records,
    empty: "Nenhuma area ou pessoa encontrada.",
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
      descricao: `Referencia documental: ${[item.sei && `SEI ${item.sei}`, item.contrato && `Contrato ${item.contrato}`].filter(Boolean).join(" | ")}`,
      status: item.contrato ? "Contrato vinculado" : "SEI vinculado",
      tipo: "documento",
    })),
  ];

  renderRecordModule("documentos", {
    title: "Documentos",
    subtitle: "Nesta fase, o modulo lista referencias documentais e rascunhos locais de upload.",
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
        <strong>${escapeHtml(item.projeto || "Sem titulo")}</strong>
        <span>${escapeHtml(item.descricao || item.comentarios || "Sem descricao")}</span>
      </div>
      <div class="record-meta">
        <strong>${escapeHtml(item.area || "Nao definida")}</strong>
        <span>Area</span>
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
  elements.entryType.value = moduleToType(type);
  elements.entryTitle.value = "";
  elements.entryArea.value = "";
  elements.entryStatus.value = "";
  elements.entryDeadline.value = "";
  elements.entrySei.value = "";
  elements.entryFile.value = "";
  elements.entryDescription.value = "";
  elements.dialog.showModal();
}

function saveEntry(event) {
  event.preventDefault();
  const title = elements.entryTitle.value.trim();
  if (!title) {
    alert("Informe um titulo para salvar o registro.");
    return;
  }

  const tipo = elements.entryType.value;
  const file = elements.entryFile.files?.[0] || null;
  const record = normalizeRecord({
    id: createId(),
    tipo,
    ordem: "",
    projeto: title,
    categoria: defaultCategory(tipo),
    valorAno: null,
    sei: elements.entrySei.value.trim() || null,
    contrato: tipo === "contrato" ? title : null,
    descricao: elements.entryDescription.value.trim() || null,
    area: elements.entryArea.value.trim() || null,
    status: elements.entryStatus.value.trim() || "Rascunho",
    comentarios: "Criado no prototipo local",
    prazo: elements.entryDeadline.value || null,
    arquivo: file ? { nome: file.name, tamanho: file.size, tipo: file.type || "desconhecido" } : null,
    criadoEm: new Date().toISOString(),
  }, "local");

  state.custom.push(record);
  persistCustomRecords();
  rebuildRecords();
  hydrateFilters();
  applyFilters();
  elements.dialog.close();
}

function openDetail(key) {
  const record = state.registros.find((item) => item.key === key) || findVirtualRecord(key);
  if (!record) return;

  elements.detailKind.textContent = typeLabel(record.tipo);
  elements.detailTitle.textContent = record.projeto || "Registro";
  elements.detailContent.innerHTML = [
    detailItem("Categoria", record.categoria || typeLabel(record.tipo)),
    detailItem("Area", record.area || "Nao definida"),
    detailItem("Status/Fase", record.status || "Sem status"),
    detailItem("Prazo", formatDate(record.prazo)),
    detailItem("Processo SEI", record.sei || "-"),
    detailItem("Contrato", record.contrato || "-"),
    detailItem("Arquivo", record.arquivo ? `${record.arquivo.nome} (${formatBytes(record.arquivo.tamanho)})` : "-"),
    detailItem("Descricao", record.descricao || "Sem descricao cadastrada", true),
    detailItem("Comentarios", record.comentarios || "Sem comentarios", true),
  ].join("");
  elements.detailDialog.showModal();
}

function findVirtualRecord(key) {
  if (key.startsWith("docref-")) {
    const originalKey = key.replace("docref-", "");
    return state.registros.find((item) => item.key === originalKey);
  }
  if (key.startsWith("area-")) {
    const areaIndex = Number(key.replace("area-", ""));
    const [area, quantidade] = countsBy(projectLikeRecords(), "area")[areaIndex] || [];
    return area ? { key, tipo: "area", projeto: area, area, status: "Area", descricao: `${quantidade} demandas vinculadas` } : null;
  }
  return null;
}

function exportData() {
  const payload = {
    exportadoEm: new Date().toISOString(),
    registrosLocais: state.custom,
    totalPlanilha: state.base.length,
    totalRegistros: state.registros.length,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cortex-registros-locais.json";
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
    alert("Entrada por voz ainda depende de suporte do navegador. Podemos integrar isso em uma proxima etapa.");
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

function moduleToType(module) {
  const map = {
    licitacoes: "licitacao",
    contratos: "contrato",
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
    contrato: "Contrato",
    pessoa: "Pessoa",
    documento: "Documento",
  };
  return map[tipo] || "Demanda";
}

function typeLabel(tipo) {
  const map = {
    projeto: "Projeto/demanda",
    licitacao: "Licitacao",
    contrato: "Contrato",
    pessoa: "Pessoa",
    documento: "Documento",
    area: "Area",
  };
  return map[tipo] || "Registro";
}

function countsBy(records, key) {
  const map = new Map();
  records.forEach((item) => {
    const value = item[key] || "Nao definido";
    map.set(value, (map.get(value) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
}

function renderBars(target, counts) {
  const max = Math.max(...counts.map(([, value]) => value), 1);
  target.innerHTML = counts
    .slice(0, 10)
    .map(([label, value]) => `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(label || "Nao definido")}</div>
        <div class="bar-track"><div class="bar-fill" style="width: ${(value / max) * 100}%"></div></div>
        <div class="bar-value">${value}</div>
      </div>
    `)
    .join("");
}

function renderStatusList(counts) {
  elements.statusList.innerHTML = counts
    .slice(0, 8)
    .map(([label, value]) => `
      <div class="status-row">
        ${escapeHtml(label || "Sem status")}
        <span>${value}</span>
      </div>
    `)
    .join("");
}

function renderAlerts({ semPrazo, comSei, comContrato, total }) {
  const semSei = total - comSei;
  const semContrato = total - comContrato;
  elements.alertList.innerHTML = [
    alertRow("Sem prazo definido", semPrazo, true),
    alertRow("Sem processo SEI", semSei, true),
    alertRow("Com contrato vinculado", comContrato, false),
    alertRow("Sem contrato vinculado", semContrato, false),
  ].join("");
}

function kpi(icon, value, label) {
  return `
    <article class="kpi-card">
      <span data-lucide="${icon}"></span>
      <strong>${value}</strong>
      <p>${label}</p>
    </article>
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

function alertRow(label, value, critical) {
  return `
    <div class="alert-row ${critical ? "critical" : ""}">
      ${escapeHtml(label)}
      <span>${value}</span>
    </div>
  `;
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
