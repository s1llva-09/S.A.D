(() => {
    const supabase = window.supabaseClient;
    const DEMAND_TABLE = "solicitacoes";
    const OVERRIDE_STORAGE_KEY = "sad-setor-overrides";
    const READ_STORAGE_KEY = "sad-setor-read-notifications";
    const PANEL_TITLES = {
        dashboard: "Dashboard",
        demandas: "Demandas",
        relatorios: "Relatorios",
    };
    const STATUS_FILTERS = ["todas", "pendente", "em andamento", "resolvida"];
    const CATEGORY_PALETTE = ["#4f7cff", "#f45d96", "#8b5cf6", "#20b67a", "#f59e0b", "#0ea5e9"];

    const sidebar = document.querySelector("#setor-sidebar");
    const navButtons = document.querySelectorAll("[data-panel-target]");
    const panels = document.querySelectorAll("[data-panel]");
    const pageTitle = document.querySelector("#page-title");
    const pageSubtitle = document.querySelector("#page-subtitle");
    const sidebarToggle = document.querySelector("#sidebar-toggle");
    const dashboardWelcomeTitle = document.querySelector("#dashboard-welcome-title");
    const dashboardWelcomeCopy = document.querySelector("#dashboard-welcome-copy");
    const dashboardMetrics = document.querySelector("#dashboard-metrics");
    const demandasMetrics = document.querySelector("#demandas-metrics");
    const activityChart = document.querySelector("#activity-chart");
    const categoryDonut = document.querySelector("#category-donut");
    const categoryList = document.querySelector("#category-list");
    const recentDemandas = document.querySelector("#recent-demandas");
    const urgencyDistribution = document.querySelector("#urgency-distribution");
    const resolutionRate = document.querySelector("#resolution-rate");
    const collaboratorStat = document.querySelector("#collaborator-stat");
    const reportsMetrics = document.querySelector("#reports-metrics");
    const reportsCategoryBars = document.querySelector("#reports-category-bars");
    const reportsUrgencyDonut = document.querySelector("#reports-urgency-donut");
    const reportsUrgencyLegend = document.querySelector("#reports-urgency-legend");
    const reportsWeeklyChart = document.querySelector("#reports-weekly-chart");
    const reportsBreakdown = document.querySelector("#reports-breakdown");
    const reportsSyncBadge = document.querySelector("#reports-sync-badge");
    const reportsRefreshButton = document.querySelector("#reports-refresh-button");
    const statusTabs = document.querySelector("#status-tabs");
    const demandSearch = document.querySelector("#demand-search");
    const categoryFilter = document.querySelector("#category-filter");
    const sortFilter = document.querySelector("#sort-filter");
    const demandasCount = document.querySelector("#demandas-count");
    const demandasList = document.querySelector("#sector-demandas-list");
    const demandasEmpty = document.querySelector("#sector-demandas-empty");
    const dashboardNavCount = document.querySelector("#dashboard-nav-count");
    const demandasNavCount = document.querySelector("#demandas-nav-count");
    const relatoriosNavCount = document.querySelector("#relatorios-nav-count");
    const dashboardCta = document.querySelector("#dashboard-cta");
    const jumpButtons = document.querySelectorAll("[data-jump-panel]");
    const notificationButton = document.querySelector("#notification-button");
    const notificationPanel = document.querySelector("#notification-panel");
    const notificationCount = document.querySelector("#notification-count");
    const notificationHeadline = document.querySelector("#notification-headline");
    const notificationList = document.querySelector("#notification-list");
    const notificationViewDemandas = document.querySelector("#notification-view-demandas");
    const markReadButton = document.querySelector("#mark-read-button");
    const topbarUserName = document.querySelector("#topbar-user-name");
    const topbarUserAvatar = document.querySelector("#topbar-user-avatar");
    const sidebarUserName = document.querySelector("#sidebar-user-name");
    const sidebarUserEmail = document.querySelector("#sidebar-user-email");
    const sidebarUserAvatar = document.querySelector("#sidebar-user-avatar");
    const sidebarLogoutButton = document.querySelector("#sidebar-logout-button");
    const detailModal = document.querySelector("#detail-modal");
    const detailModalTitle = document.querySelector("#detail-modal-title");
    const detailModalSubtitle = document.querySelector("#detail-modal-subtitle");
    const modalAvatar = document.querySelector("#modal-avatar");
    const modalStatusPill = document.querySelector("#modal-status-pill");
    const modalMeta = document.querySelector("#modal-meta");
    const modalDescription = document.querySelector("#modal-description");
    const modalAiContent = document.querySelector("#modal-ai-content");
    const modalStartButton = document.querySelector("#modal-start-button");
    const modalResolveButton = document.querySelector("#modal-resolve-button");
    const modalCloseButton = document.querySelector("#modal-close-button");
    const modalResponseForm = document.querySelector("#modal-response-form");
    const modalResponseInput = document.querySelector("#modal-response-input");
    const toastContainer = document.querySelector("#toast-container");

    const state = {
        currentUser: null,
        currentPanel: "dashboard",
        currentStatusFilter: "todas",
        currentCategory: "all",
        currentSort: "recent",
        currentSearch: "",
        demands: [],
        selectedDemandId: null,
        refreshIntervalId: null,
        realtimeChannel: null,
        overrides: loadJson(OVERRIDE_STORAGE_KEY, {}),
        readNotifications: loadJson(READ_STORAGE_KEY, []),
    };

    function loadJson(key, fallback) {
        try {
            const raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function persistJson(key, value) {
        window.localStorage.setItem(key, JSON.stringify(value));
    }

    function titleCase(value) {
        return value
            .split(/[\s._-]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
    }

    function getInitials(value) {
        return value
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "SI";
    }

    function formatRelativeTime(value) {
        if (!value) {
            return "agora";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "agora";
        }

        const diffMs = Date.now() - date.getTime();
        const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
        if (diffMinutes < 60) {
            return `ha ${diffMinutes} min`;
        }

        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
            return `ha ${diffHours} h`;
        }

        const diffDays = Math.floor(diffHours / 24);
        return `ha ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
    }

    function formatLongDate() {
        return new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
        }).format(new Date());
    }

    function formatDateTime(value) {
        if (!value) {
            return "Sem data";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "Sem data";
        }

        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }

    function toDate(value) {
        if (!value) {
            return null;
        }

        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function toLocalDateKey(value) {
        const parsed = toDate(value);
        if (!parsed) {
            return null;
        }

        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function slugify(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function getDemandText(row) {
        return (
            row?.mensagem ??
            row?.message ??
            row?.descricao ??
            row?.demanda ??
            row?.texto ??
            row?.content ??
            row?.body ??
            ""
        );
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function inferCategory(row) {
        const message = `${getDemandText(row)} ${row.deficiencia || ""} ${row.localizacao || ""}`.toLowerCase();

        if (row.categoria) {
            return titleCase(row.categoria);
        }
        if (row.setor) {
            return titleCase(row.setor);
        }
        if (row.setor_destino) {
            return titleCase(row.setor_destino);
        }
        if (row.tipo_solicitacao) {
            return titleCase(row.tipo_solicitacao);
        }
        if (row.tipo) {
            return titleCase(row.tipo);
        }
        if (message.includes("acess") || message.includes("deficien") || message.includes("cadeir")) {
            return "Acessibilidade";
        }
        if (message.includes("contrato") || message.includes("jurid")) {
            return "Juridico";
        }
        if (message.includes("ar-condicionado") || message.includes("sala") || message.includes("facilities")) {
            return "Facilities";
        }
        if (message.includes("ferias") || message.includes("rh") || message.includes("beneficio")) {
            return "RH";
        }
        if (message.includes("sistema") || message.includes("login") || message.includes("ponto")) {
            return "TI";
        }
        return "Triagem";
    }

    function inferUrgency(row) {
        const explicit = slugify(row.urgencia || row.prioridade_texto || row.nivel_urgencia);
        const message = slugify(getDemandText(row));

        if (explicit.includes("alta") || explicit.includes("urgente")) {
            return "Alta";
        }
        if (explicit.includes("media")) {
            return "Media";
        }
        if (explicit.includes("baixa")) {
            return "Baixa";
        }
        if (message.includes("urgente") || message.includes("hoje") || message.includes("bloque") || message.includes("impedido")) {
            return "Alta";
        }
        if (message.includes("duvida") || message.includes("analise")) {
            return "Media";
        }
        return "Baixa";
    }

    function inferStatus(row, override) {
        const raw = slugify(
            override?.status ||
            row.status ||
            row.situacao ||
            row.etapa ||
            row.status_atendimento
        );

        if (raw.includes("resol") || raw.includes("conclu")) {
            return "Resolvida";
        }
        if (raw.includes("andamento") || raw.includes("atendimento") || raw.includes("aceita")) {
            return "Em andamento";
        }
        if (raw.includes("classific")) {
            return "Classificada";
        }
        if (raw.includes("nova") || raw.includes("novo") || raw.includes("pend")) {
            return "Pendente";
        }
        return "Pendente";
    }

    function getResolvedAt(row, status) {
        return (
            row?.resolved_at ||
            row?.resolvida_em ||
            row?.closed_at ||
            row?.finished_at ||
            (status === "Resolvida" ? row?.updated_at : null) ||
            null
        );
    }

    function deriveProtocol(row, index) {
        const direct = row.protocolo || row.ticket_id || row.numero || row.codigo;
        if (direct) {
            return `#${String(direct)}`;
        }

        const idText = String(row.id || "").replace(/-/g, "");
        if (idText.length >= 6) {
            return `#${idText.slice(0, 6).toUpperCase()}`;
        }

        return `#${String(index + 1).padStart(4, "0")}`;
    }

    function deriveRequesterName(row) {
        if (row.colaborador_nome) {
            return titleCase(row.colaborador_nome);
        }
        if (row.nome) {
            return titleCase(row.nome);
        }
        if (row.user_email) {
            return titleCase(row.user_email.split("@")[0]);
        }
        if (row.email) {
            return titleCase(row.email.split("@")[0]);
        }
        return "Colaborador";
    }

    function getOverride(id) {
        return state.overrides[String(id)] || {};
    }

    function setOverride(id, patch) {
        const key = String(id);
        state.overrides[key] = {
            ...(state.overrides[key] || {}),
            ...patch,
        };
        persistJson(OVERRIDE_STORAGE_KEY, state.overrides);
    }

    function normalizeDemand(row, index) {
        const override = getOverride(row.id || index);
        const requesterName = deriveRequesterName(row);
        const category = inferCategory(row);
        const urgency = inferUrgency(row);
        const status = inferStatus(row, override);
        const aiSummary = row.resumo_ia || row.analise_ia || row.ai_summary || row.resumo;
        const aiSuggestion =
            override.response ||
            row.sugestao_ia ||
            row.sugestao ||
            row.resposta_ia ||
            row.observacao_ia ||
            "";
        const aiConfidence = Number(row.confianca || row.ai_confidence || 0);
        const priorityScore = Number(row.prioridade || row.priority_score || 0);

        return {
            id: row.id || `local-${index}`,
            protocol: deriveProtocol(row, index),
            requesterName,
            requesterEmail: row.user_email || row.email || "",
            initials: getInitials(requesterName),
            message: getDemandText(row) || "Demanda sem descricao.",
            description: getDemandText(row) || "Demanda sem descricao.",
            createdAt: row.created_at || null,
            updatedAt: row.updated_at || null,
            resolvedAt: getResolvedAt(row, status),
            relativeTime: formatRelativeTime(row.created_at),
            category,
            urgency,
            status,
            location: row.localizacao || "",
            disability: row.deficiencia || "",
            phone: row.telefone || "",
            aiSummary,
            aiSuggestion,
            aiConfidence,
            priorityScore,
            tags: buildTags(row, category, urgency),
        };
    }

    function buildTags(row, category, urgency) {
        const candidates = [
            row.tag_1,
            row.tag_2,
            row.tag_3,
            row.tag_4,
            category,
            urgency,
            ...getDemandText(row)
                .split(/\s+/)
                .filter((part) => part.length > 5)
                .slice(0, 3),
        ];

        return [...new Set(candidates.filter(Boolean).map((item) => slugify(item)).filter(Boolean))]
            .slice(0, 5)
            .map((item) => titleCase(item));
    }

    function getStatusKind(status) {
        const normalized = slugify(status);
        if (normalized.includes("resol")) {
            return "status-resolvida";
        }
        if (normalized.includes("andamento")) {
            return "status-em-andamento";
        }
        return "status-pendente";
    }

    function getUrgencyKind(urgency) {
        const normalized = slugify(urgency);
        if (normalized.includes("alta")) {
            return "urgencia-alta";
        }
        if (normalized.includes("media")) {
            return "urgencia-media";
        }
        return "urgencia-baixa";
    }

    function showToast(message, type = "") {
        const toast = document.createElement("article");
        toast.className = `toast${type ? ` is-${type}` : ""}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        window.setTimeout(() => {
            toast.remove();
        }, 4200);
    }

    function setPanel(panelName) {
        state.currentPanel = panelName;
        navButtons.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.panelTarget === panelName);
        });
        panels.forEach((panel) => {
            panel.classList.toggle("is-active", panel.dataset.panel === panelName);
        });
        pageTitle.textContent = PANEL_TITLES[panelName] || "Dashboard";
        if (window.innerWidth <= 920) {
            sidebar.classList.remove("is-open");
        }
    }

    function createMetricCard(title, value, note) {
        return `
            <article class="metric-card">
                <small>${title}</small>
                <strong class="metric-value">${value}</strong>
                <span class="metric-note">${note}</span>
            </article>
        `;
    }

    function computeStats(demands) {
        const pending = demands.filter((item) => item.status === "Pendente" || item.status === "Classificada").length;
        const inProgress = demands.filter((item) => item.status === "Em andamento").length;
        const resolved = demands.filter((item) => item.status === "Resolvida").length;
        const urgent = demands.filter((item) => item.urgency === "Alta").length;
        const collaborators = new Set(demands.map((item) => item.requesterEmail || item.requesterName)).size;

        return {
            total: demands.length,
            pending,
            inProgress,
            resolved,
            urgent,
            collaborators,
            resolutionRate: demands.length ? Math.round((resolved / demands.length) * 100) : 0,
        };
    }

    function computeCategoryCounts(demands) {
        const map = new Map();
        demands.forEach((item) => {
            map.set(item.category, (map.get(item.category) || 0) + 1);
        });

        return [...map.entries()]
            .map(([label, total], index) => ({
                label,
                total,
                color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
            }))
            .sort((left, right) => right.total - left.total);
    }

    function computeUrgencyCounts(demands) {
        return {
            Alta: demands.filter((item) => item.urgency === "Alta").length,
            Media: demands.filter((item) => item.urgency === "Media").length,
            Baixa: demands.filter((item) => item.urgency === "Baixa").length,
        };
    }

    function computeWeeklySeries(demands) {
        const days = [];
        for (let offset = 6; offset >= 0; offset -= 1) {
            const baseDate = new Date();
            baseDate.setHours(0, 0, 0, 0);
            baseDate.setDate(baseDate.getDate() - offset);
            days.push({
                key: toLocalDateKey(baseDate),
                label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(baseDate),
                total: 0,
                resolved: 0,
            });
        }

        const dayMap = new Map(days.map((item) => [item.key, item]));
        demands.forEach((item) => {
            const createdKey = toLocalDateKey(item.createdAt);
            if (createdKey && dayMap.has(createdKey)) {
                dayMap.get(createdKey).total += 1;
            }

            const resolvedKey = toLocalDateKey(item.resolvedAt);
            if (resolvedKey && dayMap.has(resolvedKey)) {
                dayMap.get(resolvedKey).resolved += 1;
            }
        });

        return days;
    }

    function buildStatusPayloads(nextStatus) {
        const nowIso = new Date().toISOString();

        if (nextStatus === "Resolvida") {
            return [
                { status: nextStatus, updated_at: nowIso, resolved_at: nowIso },
                { situacao: nextStatus, updated_at: nowIso, resolved_at: nowIso },
                { etapa: nextStatus, updated_at: nowIso, resolved_at: nowIso },
                { status_atendimento: nextStatus, updated_at: nowIso, resolved_at: nowIso },
                { status: nextStatus, resolved_at: nowIso },
                { situacao: nextStatus, resolved_at: nowIso },
                { etapa: nextStatus, resolved_at: nowIso },
                { status_atendimento: nextStatus, resolved_at: nowIso },
                { status: nextStatus, updated_at: nowIso },
                { situacao: nextStatus, updated_at: nowIso },
                { etapa: nextStatus, updated_at: nowIso },
                { status_atendimento: nextStatus, updated_at: nowIso },
                { status: nextStatus },
                { situacao: nextStatus },
                { etapa: nextStatus },
                { status_atendimento: nextStatus },
            ];
        }

        return [
            { status: nextStatus, updated_at: nowIso },
            { situacao: nextStatus, updated_at: nowIso },
            { etapa: nextStatus, updated_at: nowIso },
            { status_atendimento: nextStatus, updated_at: nowIso },
            { status: nextStatus },
            { situacao: nextStatus },
            { etapa: nextStatus },
            { status_atendimento: nextStatus },
        ];
    }

    function buildLinePath(values, width, height, padding) {
        const maxValue = Math.max(...values, 1);
        return values
            .map((value, index) => {
                const x = padding + ((width - padding * 2) / Math.max(values.length - 1, 1)) * index;
                const y = height - padding - ((height - padding * 2) * value) / maxValue;
                return `${index === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");
    }

    function buildAreaPath(values, width, height, padding) {
        const maxValue = Math.max(...values, 1);
        const points = values.map((value, index) => {
            const x = padding + ((width - padding * 2) / Math.max(values.length - 1, 1)) * index;
            const y = height - padding - ((height - padding * 2) * value) / maxValue;
            return `${x} ${y}`;
        });
        const startX = padding;
        const endX = width - padding;
        return `M ${startX} ${height - padding} L ${points.join(" L ")} L ${endX} ${height - padding} Z`;
    }

    function renderActivityChart(demands) {
        const series = computeWeeklySeries(demands);
        const totalValues = series.map((item) => item.total);
        const resolvedValues = series.map((item) => item.resolved);
        const width = 720;
        const height = 240;
        const padding = 24;
        const totalPath = buildLinePath(totalValues, width, height, padding);
        const resolvedPath = buildLinePath(resolvedValues, width, height, padding);
        const areaPath = buildAreaPath(totalValues, width, height, padding);

        activityChart.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico semanal de demandas">
                <path d="${areaPath}" fill="rgba(111, 190, 149, 0.14)"></path>
                <path d="${totalPath}" fill="none" stroke="#5b6cff" stroke-width="4" stroke-linecap="round"></path>
                <path d="${resolvedPath}" fill="none" stroke="#20b67a" stroke-width="4" stroke-linecap="round"></path>
            </svg>
            <div class="chart-label-row">${series.map((item) => `<span>${item.label}</span>`).join("")}</div>
        `;
    }

    function renderCategorySection(demands) {
        const categories = computeCategoryCounts(demands);

        if (!categories.length) {
            categoryDonut.innerHTML = "<span>0</span>";
            categoryDonut.style.background = "conic-gradient(#dfe8e4 0deg, #dfe8e4 360deg)";
            categoryList.innerHTML = "<p>Nenhuma categoria encontrada ainda.</p>";
            return;
        }

        const total = categories.reduce((sum, item) => sum + item.total, 0);
        let currentAngle = 0;
        const segments = categories.map((item) => {
            const angle = (item.total / total) * 360;
            const segment = `${item.color} ${currentAngle}deg ${currentAngle + angle}deg`;
            currentAngle += angle;
            return segment;
        });

        categoryDonut.style.background = `conic-gradient(${segments.join(", ")})`;
        categoryDonut.innerHTML = `<span>${total}</span>`;
        categoryList.innerHTML = categories
            .map((item) => {
                const percent = Math.round((item.total / total) * 100);
                        return `
                        <div class="category-row">
                            <strong><span class="dot" style="background:${item.color}"></span>${escapeHtml(item.label)}</strong>
                            <span>${item.total} (${percent}%)</span>
                        </div>
                    `;
            })
            .join("");
    }

    function renderUrgencyDistribution(demands) {
        const counts = computeUrgencyCounts(demands);
        const max = Math.max(counts.Alta, counts.Media, counts.Baixa, 1);
        urgencyDistribution.innerHTML = [
            { label: "Alta", color: "#ff5247", value: counts.Alta },
            { label: "Media", color: "#f59e0b", value: counts.Media },
            { label: "Baixa", color: "#22c55e", value: counts.Baixa },
        ]
            .map((item) => `
                <div class="urgency-bar">
                    <strong>${item.label}: ${item.value}</strong>
                    <div class="urgency-bar-track">
                        <div class="urgency-bar-fill" style="width:${(item.value / max) * 100}%; background:${item.color}"></div>
                    </div>
                </div>
            `)
            .join("");
    }

    function renderResolutionRate(stats) {
        resolutionRate.innerHTML = `
            <strong class="metric-value">${stats.resolutionRate}%</strong>
            <div class="resolution-track">
                <div class="resolution-fill" style="width:${stats.resolutionRate}%; background:linear-gradient(90deg,#20b67a,#6fbe95)"></div>
            </div>
            <span>${stats.resolved} resolvida(s) de ${stats.total} total</span>
        `;
    }

    function renderCollaborators(stats) {
        collaboratorStat.innerHTML = `
            <strong class="metric-value">${stats.collaborators}</strong>
            <span>${stats.collaborators === 1 ? "colaborador com demandas" : "colaboradores com demandas"}</span>
        `;
    }

    function renderMetricBlocks(stats) {
        const markup = [
            createMetricCard("Total de Demandas", stats.total, `${stats.pending} aguardando`),
            createMetricCard("Pendentes", stats.pending, `${stats.urgent} urgente(s)`),
            createMetricCard("Em andamento", stats.inProgress, "Demandas em tratamento"),
            createMetricCard("Resolvidas", stats.resolved, `${stats.resolutionRate}% de resolucao`),
        ].join("");

        dashboardMetrics.innerHTML = markup;
        demandasMetrics.innerHTML = markup;
        dashboardNavCount.textContent = String(stats.total);
        demandasNavCount.textContent = String(stats.pending);
        relatoriosNavCount.textContent = String(stats.resolved);
        dashboardNavCount.hidden = true;
        relatoriosNavCount.hidden = true;
        demandasNavCount.hidden = stats.pending === 0;
    }

    function renderRecentDemands(demands) {
        if (!demands.length) {
            recentDemandas.innerHTML = "<p>Nenhuma demanda recebida ainda.</p>";
            return;
        }

        recentDemandas.innerHTML = demands.slice(0, 5).map((item) => `
            <article class="recent-item">
                <div class="recent-item-main">
                    <span class="avatar-chip">${item.initials}</span>
                    <div class="recent-item-text">
                        <strong>${escapeHtml(item.message)}</strong>
                        <span>${escapeHtml(item.requesterName)} . ${escapeHtml(item.protocol)} . ${escapeHtml(item.relativeTime)}</span>
                    </div>
                </div>
                <button type="button" class="inline-link-button" data-open-demand="${item.id}">Detalhes</button>
            </article>
        `).join("");
    }

    function renderReports(demands, stats) {
        if (
            !reportsMetrics ||
            !reportsCategoryBars ||
            !reportsUrgencyDonut ||
            !reportsUrgencyLegend ||
            !reportsWeeklyChart ||
            !reportsBreakdown
        ) {
            return;
        }

        const categories = computeCategoryCounts(demands);
        const urgencyCounts = computeUrgencyCounts(demands);
        const weeklySeries = computeWeeklySeries(demands);
        const totalValues = weeklySeries.map((item) => item.total);
        const resolvedValues = weeklySeries.map((item) => item.resolved);
        const topCategory = categories[0];
        const totalUrgency = urgencyCounts.Alta + urgencyCounts.Media + urgencyCounts.Baixa;
        const aiReady = demands.filter((item) => item.aiSummary || item.aiSuggestion).length;

        reportsMetrics.innerHTML = [
            {
                tone: "success",
                icon: "◎",
                value: `${stats.resolutionRate}%`,
                title: "Taxa de resolucao",
                note: `${stats.resolved} de ${stats.total} resolvidas`,
            },
            {
                tone: "danger",
                icon: "↗",
                value: String(stats.urgent),
                title: "Demandas urgentes",
                note: "prioridade alta",
            },
            {
                tone: "info",
                icon: "◔",
                value: String(stats.inProgress),
                title: "Em andamento",
                note: "sendo atendidas",
            },
            {
                tone: "accent",
                icon: "◌",
                value: topCategory ? escapeHtml(topCategory.label) : "-",
                title: "Top categoria",
                note: topCategory ? `${topCategory.total} demanda(s)` : "sem dados ainda",
            },
        ].map((item) => `
            <article class="dashboard-card reports-metric-card reports-metric-card-${item.tone}">
                <span class="reports-metric-icon">${item.icon}</span>
                <strong class="reports-metric-value">${item.value}</strong>
                <span class="reports-metric-title">${item.title}</span>
                <small class="reports-metric-note">${item.note}</small>
            </article>
        `).join("");

        if (!categories.length) {
            reportsCategoryBars.innerHTML = "<p>Nenhuma categoria encontrada ainda.</p>";
        } else {
            const maxCategory = Math.max(...categories.map((item) => item.total), 1);
            reportsCategoryBars.innerHTML = `
                <div class="reports-category-chart">
                    ${categories.map((item) => `
                        <div class="reports-category-column">
                            <span class="reports-category-column-bar" style="height:${(item.total / maxCategory) * 180}px; background:${item.color}"></span>
                            <strong>${item.total}</strong>
                            <span>${escapeHtml(item.label)}</span>
                        </div>
                    `).join("")}
                </div>
            `;
        }

        if (!totalUrgency) {
            reportsUrgencyDonut.style.background = "conic-gradient(#dfe8e4 0deg, #dfe8e4 360deg)";
            reportsUrgencyDonut.innerHTML = "<span>0</span>";
            reportsUrgencyLegend.innerHTML = "<p>Nenhuma urgencia registrada.</p>";
        } else {
            const urgencySegments = [
                { label: "Alta", value: urgencyCounts.Alta, color: "#f44343" },
                { label: "Media", value: urgencyCounts.Media, color: "#f59e0b" },
                { label: "Baixa", value: urgencyCounts.Baixa, color: "#22c55e" },
            ];

            let currentAngle = 0;
            reportsUrgencyDonut.style.background = `conic-gradient(${urgencySegments
                .map((item) => {
                    const angle = totalUrgency ? (item.value / totalUrgency) * 360 : 0;
                    const segment = `${item.color} ${currentAngle}deg ${currentAngle + angle}deg`;
                    currentAngle += angle;
                    return segment;
                })
                .join(", ")})`;
            reportsUrgencyDonut.innerHTML = `<span>${totalUrgency}</span>`;
            reportsUrgencyLegend.innerHTML = urgencySegments.map((item) => `
                <div class="reports-urgency-item">
                    <strong><span class="dot" style="background:${item.color}"></span>${item.label}</strong>
                    <span>${item.value}</span>
                </div>
            `).join("");
        }

        const width = 1120;
        const height = 260;
        const padding = 28;
        const totalPath = buildLinePath(totalValues, width, height, padding);
        const resolvedPath = buildLinePath(resolvedValues, width, height, padding);

        reportsWeeklyChart.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Tendencia semanal das demandas">
                ${weeklySeries.map((_, index) => {
                    const x = padding + ((width - padding * 2) / Math.max(weeklySeries.length - 1, 1)) * index;
                    return `<line x1="${x}" y1="${padding}" x2="${x}" y2="${height - padding}" stroke="#eef2ff" stroke-width="1"></line>`;
                }).join("")}
                <path d="${totalPath}" fill="none" stroke="#5b63ff" stroke-width="3.4" stroke-linecap="round"></path>
                <path d="${resolvedPath}" fill="none" stroke="#22c55e" stroke-width="3.4" stroke-linecap="round"></path>
                ${totalValues.map((value, index) => {
                    const x = padding + ((width - padding * 2) / Math.max(totalValues.length - 1, 1)) * index;
                    const y = height - padding - ((height - padding * 2) * value) / Math.max(...totalValues, ...resolvedValues, 1);
                    return `<circle cx="${x}" cy="${y}" r="5" fill="#5b63ff"></circle>`;
                }).join("")}
                ${resolvedValues.map((value, index) => {
                    const x = padding + ((width - padding * 2) / Math.max(resolvedValues.length - 1, 1)) * index;
                    const y = height - padding - ((height - padding * 2) * value) / Math.max(...totalValues, ...resolvedValues, 1);
                    return `<circle cx="${x}" cy="${y}" r="5" fill="#22c55e"></circle>`;
                }).join("")}
            </svg>
            <div class="chart-label-row">${weeklySeries.map((item) => `<span>${item.label}</span>`).join("")}</div>
            <div class="reports-weekly-legend">
                <span><i style="background:#5b63ff"></i>Total recebidas</span>
                <span><i style="background:#22c55e"></i>Resolvidas</span>
            </div>
        `;

        reportsBreakdown.innerHTML = categories.length
            ? categories.map((item) => {
                const percent = stats.total ? Math.round((item.total / stats.total) * 100) : 0;
                return `
                    <div class="reports-breakdown-row">
                        <strong>${escapeHtml(item.label)}</strong>
                        <div class="reports-breakdown-track">
                            <span class="reports-breakdown-fill" style="width:${percent}%; background:${item.color}"></span>
                        </div>
                        <span>${item.total}</span>
                        <span>${percent}%</span>
                    </div>
                `;
            }).join("")
            : "<p>Nenhum detalhamento disponivel.</p>";

        if (reportsSyncBadge) {
            reportsSyncBadge.textContent = aiReady ? "Atualizado agora" : "Atualizado agora";
        }
    }

    function renderStatusTabs(demands) {
        const counts = {
            todas: demands.length,
            pendente: demands.filter((item) => item.status === "Pendente" || item.status === "Classificada").length,
            "em andamento": demands.filter((item) => item.status === "Em andamento").length,
            resolvida: demands.filter((item) => item.status === "Resolvida").length,
        };

        statusTabs.innerHTML = STATUS_FILTERS.map((filterName) => `
            <button
                type="button"
                class="status-tab${state.currentStatusFilter === filterName ? " is-active" : ""}"
                data-status-filter="${filterName}"
            >
                ${titleCase(filterName)} <small>${counts[filterName]}</small>
            </button>
        `).join("");
    }

    function populateCategoryFilter(demands) {
        const categories = computeCategoryCounts(demands);
        const previousValue = state.currentCategory;
        categoryFilter.innerHTML = `<option value="all">Todas as categorias</option>${categories
            .map((item) => `<option value="${escapeHtml(item.label)}">${escapeHtml(item.label)}</option>`)
            .join("")}`;
        categoryFilter.value = categories.some((item) => item.label === previousValue) ? previousValue : "all";
        state.currentCategory = categoryFilter.value;
    }

    function getFilteredDemands() {
        const search = slugify(state.currentSearch);

        return [...state.demands]
            .filter((item) => {
                if (state.currentStatusFilter === "pendente") {
                    return item.status === "Pendente" || item.status === "Classificada";
                }
                if (state.currentStatusFilter === "em andamento") {
                    return item.status === "Em andamento";
                }
                if (state.currentStatusFilter === "resolvida") {
                    return item.status === "Resolvida";
                }
                return true;
            })
            .filter((item) => state.currentCategory === "all" || item.category === state.currentCategory)
            .filter((item) => {
                if (!search) {
                    return true;
                }

                return slugify([
                    item.message,
                    item.requesterName,
                    item.protocol,
                    item.category,
                    item.requesterEmail,
                ].join(" ")).includes(search);
            })
            .sort((left, right) => {
                if (state.currentSort === "oldest") {
                    return new Date(left.createdAt || 0) - new Date(right.createdAt || 0);
                }
                if (state.currentSort === "urgent") {
                    const priority = { Alta: 3, Media: 2, Baixa: 1 };
                    return priority[right.urgency] - priority[left.urgency];
                }
                return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
            });
    }

    function buildTag(kind, label) {
        return `<span class="tag-pill" data-kind="${escapeHtml(kind)}">${escapeHtml(label)}</span>`;
    }

    function renderDemandCards() {
        const filtered = getFilteredDemands();
        demandasCount.textContent = `${filtered.length} demanda(s) encontrada(s)`;
        demandasEmpty.hidden = filtered.length !== 0;
        demandasList.innerHTML = "";

        if (!filtered.length) {
            return;
        }

        demandasList.innerHTML = filtered.map((item) => {
            const canStart = item.status !== "Em andamento" && item.status !== "Resolvida";
            const canResolve = item.status !== "Resolvida";

            return `
                <article class="sector-card">
                    <div class="sector-card-head">
                        <div class="sector-card-main">
                            <span class="avatar-chip">${item.initials}</span>
                            <div class="sector-card-copy">
                                <strong>${escapeHtml(item.requesterName)}</strong>
                                <span>${escapeHtml(item.relativeTime)} . ${escapeHtml(item.protocol)}</span>
                            </div>
                        </div>
                        <div class="sector-card-tags">
                            ${buildTag("categoria", item.category)}
                            ${buildTag(getUrgencyKind(item.urgency), item.urgency)}
                            ${buildTag(getStatusKind(item.status), item.status)}
                        </div>
                    </div>

                    <p class="sector-card-message">${escapeHtml(item.message)}</p>

                    <div class="sector-card-tags">
                        ${item.aiSuggestion ? buildTag("categoria", "Sugestao da IA") : ""}
                        ${item.location ? buildTag("categoria", item.location) : ""}
                        ${item.disability ? buildTag("categoria", item.disability) : ""}
                    </div>

                    <div class="sector-card-footer">
                        <div class="sector-card-actions">
                            ${canStart ? `<button type="button" class="chip-button" data-action="start" data-id="${item.id}">Aceitar</button>` : ""}
                            ${canResolve ? `<button type="button" class="chip-button" data-action="resolve" data-id="${item.id}">Resolver</button>` : ""}
                        </div>
                        <div class="sector-card-actions">
                            <button type="button" class="chip-button" data-action="reply" data-id="${item.id}">Responder</button>
                            <button type="button" class="chip-button" data-action="details" data-id="${item.id}">Detalhes</button>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderNotifications() {
        const unread = state.demands
            .filter((item) => item.status !== "Resolvida")
            .filter((item) => !state.readNotifications.includes(String(item.id)))
            .slice(0, 5);

        notificationCount.textContent = String(unread.length);
        notificationHeadline.textContent = `${unread.length} nova(s)`;

        if (!unread.length) {
            notificationList.innerHTML = "<div class=\"notification-item\"><strong>Sem novas notificacoes</strong><p>As proximas demandas do banco aparecem aqui.</p></div>";
            return;
        }

        notificationList.innerHTML = unread.map((item) => `
            <article class="notification-item">
                <strong>Nova demanda - ${escapeHtml(item.category)}</strong>
                <p>${escapeHtml(item.message)}</p>
                <span>${escapeHtml(item.urgency)} . ${escapeHtml(item.relativeTime)}</span>
            </article>
        `).join("");
    }

    function findDemandById(id) {
        return state.demands.find((item) => String(item.id) === String(id)) || null;
    }

    function buildAiFallback(demand) {
        const hints = [
            demand.category ? `<p><strong>Categoria preliminar</strong><br>${escapeHtml(demand.category)}</p>` : "",
            demand.urgency ? `<p><strong>Urgencia identificada</strong><br>${escapeHtml(demand.urgency)}</p>` : "",
            demand.location ? `<p><strong>Localizacao</strong><br>${escapeHtml(demand.location)}</p>` : "",
        ].filter(Boolean).join("");

        return `
            <p>A analise automatica ainda nao foi retornada pelo fluxo de IA.</p>
            ${hints || "<p>Assim que o n8n concluir a classificacao, o resumo e a sugestao aparecem aqui.</p>"}
        `;
    }

    function renderModal(demand) {
        if (!demand) {
            return;
        }

        detailModalTitle.textContent = `${demand.protocol} - ${demand.category}`;
        detailModalSubtitle.textContent = `${demand.requesterName} . ${formatDateTime(demand.createdAt)}`;
        modalAvatar.textContent = demand.initials;
        modalStatusPill.textContent = demand.status;
        modalDescription.textContent = demand.description;
        modalMeta.innerHTML = [
            buildTag(getUrgencyKind(demand.urgency), `Urgencia ${demand.urgency}`),
            buildTag("categoria", demand.category),
            demand.aiConfidence ? buildTag("categoria", `Confianca ${demand.aiConfidence}%`) : "",
            demand.priorityScore ? buildTag("categoria", `Prioridade ${demand.priorityScore}/100`) : "",
        ].join("");

        modalAiContent.innerHTML = demand.aiSummary || demand.aiSuggestion
            ? `
                ${demand.aiSummary ? `<p><strong>Resumo</strong><br>${escapeHtml(demand.aiSummary)}</p>` : ""}
                ${demand.aiSuggestion ? `<p><strong>Sugestao</strong><br>${escapeHtml(demand.aiSuggestion)}</p>` : ""}
                ${demand.tags.length ? `<p><strong>Tags</strong><br>${escapeHtml(demand.tags.join(", "))}</p>` : ""}
            `
            : buildAiFallback(demand);

        modalStartButton.hidden = demand.status === "Em andamento" || demand.status === "Resolvida";
        modalResolveButton.hidden = demand.status === "Resolvida";
        modalResponseInput.value = getOverride(demand.id).response || "";
        detailModal.hidden = false;
    }

    function openModal(id, focusReply = false) {
        const demand = findDemandById(id);
        state.selectedDemandId = demand?.id || null;
        renderModal(demand);
        if (focusReply) {
            window.setTimeout(() => modalResponseInput.focus(), 10);
        }
    }

    function closeModal() {
        detailModal.hidden = true;
        state.selectedDemandId = null;
    }

    async function fetchDemands() {
        if (!supabase) {
            throw new Error("Supabase nao carregou corretamente.");
        }

        const { data, error } = await supabase
            .from(DEMAND_TABLE)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(300);

        if (error) {
            throw error;
        }

        return (data || []).map(normalizeDemand);
    }

    async function updateDemandStatus(id, nextStatus) {
        const payloads = buildStatusPayloads(nextStatus);

        let lastError = null;

        for (const payload of payloads) {
            const { error } = await supabase.from(DEMAND_TABLE).update(payload).eq("id", id);
            if (!error) {
                return { persisted: true };
            }
            lastError = error;
            if (!String(error.message || "").toLowerCase().includes("column")) {
                break;
            }
        }

        setOverride(id, { status: nextStatus });
        return { persisted: false, error: lastError };
    }

    async function saveDemandResponse(id, responseText) {
        const nowIso = new Date().toISOString();
        const payloads = [
            { resposta_setor: responseText, updated_at: nowIso },
            { resposta: responseText, updated_at: nowIso },
            { mensagem_retorno: responseText, updated_at: nowIso },
            { observacao_interna: responseText, updated_at: nowIso },
            { resposta_setor: responseText },
            { resposta: responseText },
            { mensagem_retorno: responseText },
            { observacao_interna: responseText },
        ];

        let lastError = null;

        for (const payload of payloads) {
            const { error } = await supabase.from(DEMAND_TABLE).update(payload).eq("id", id);
            if (!error) {
                setOverride(id, { response: responseText });
                return { persisted: true };
            }
            lastError = error;
            if (!String(error.message || "").toLowerCase().includes("column")) {
                break;
            }
        }

        setOverride(id, { response: responseText });
        return { persisted: false, error: lastError };
    }

    function renderAll() {
        const stats = computeStats(state.demands);
        renderMetricBlocks(stats);
        renderActivityChart(state.demands);
        renderCategorySection(state.demands);
        renderRecentDemands(state.demands);
        renderUrgencyDistribution(state.demands);
        renderResolutionRate(stats);
        renderCollaborators(stats);
        renderReports(state.demands, stats);
        renderStatusTabs(state.demands);
        populateCategoryFilter(state.demands);
        renderDemandCards();
        renderNotifications();
    }

    async function loadDemands() {
        const demands = await fetchDemands();
        state.demands = demands;
        renderAll();
    }

    async function ensureSession() {
        if (!supabase) {
            showToast("Supabase nao foi carregado na pagina do setor.", "error");
            return false;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
            window.location.href = "index.html";
            return false;
        }

        state.currentUser = data.session.user;
        const role = state.currentUser?.user_metadata?.role ?? "colaborador";
        if (role !== "setor-interno") {
            window.location.href = "colaborador-chat.html";
            return false;
        }

        const displayName = state.currentUser.user_metadata?.full_name
            ? titleCase(state.currentUser.user_metadata.full_name)
            : titleCase((state.currentUser.email || "setor interno").split("@")[0]);

        topbarUserName.textContent = displayName;
        topbarUserAvatar.textContent = getInitials(displayName);
        sidebarUserName.textContent = displayName;
        sidebarUserEmail.textContent = state.currentUser.email || "sem email";
        sidebarUserAvatar.textContent = getInitials(displayName);
        dashboardWelcomeTitle.textContent = `Bem-vindo, ${displayName.split(" ")[0]}`;
        dashboardWelcomeCopy.textContent = "As demandas do banco entram aqui automaticamente para triagem e acompanhamento.";
        pageSubtitle.textContent = formatLongDate();
        return true;
    }

    function bindEvents() {
        navButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setPanel(button.dataset.panelTarget);
            });
        });

        jumpButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setPanel(button.dataset.jumpPanel);
            });
        });

        dashboardCta.addEventListener("click", () => {
            setPanel("demandas");
        });

        if (reportsRefreshButton) {
            reportsRefreshButton.addEventListener("click", async () => {
                await loadDemands();
                showToast("Relatorios atualizados.", "success");
            });
        }

        sidebarToggle.addEventListener("click", () => {
            sidebar.classList.toggle("is-open");
        });

        demandSearch.addEventListener("input", (event) => {
            state.currentSearch = event.target.value;
            renderDemandCards();
        });

        categoryFilter.addEventListener("change", (event) => {
            state.currentCategory = event.target.value;
            renderDemandCards();
        });

        sortFilter.addEventListener("change", (event) => {
            state.currentSort = event.target.value;
            renderDemandCards();
        });

        statusTabs.addEventListener("click", (event) => {
            const button = event.target.closest("[data-status-filter]");
            if (!button) {
                return;
            }
            state.currentStatusFilter = button.dataset.statusFilter;
            renderStatusTabs(state.demands);
            renderDemandCards();
        });

        demandasList.addEventListener("click", async (event) => {
            const actionButton = event.target.closest("[data-action]");
            if (!actionButton) {
                return;
            }

            const { action, id } = actionButton.dataset;

            if (action === "details") {
                openModal(id);
                return;
            }
            if (action === "reply") {
                openModal(id, true);
                return;
            }

            if (action === "start" || action === "resolve") {
                const nextStatus = action === "start" ? "Em andamento" : "Resolvida";
                const result = await updateDemandStatus(id, nextStatus);
                await loadDemands();
                showToast(
                    result.persisted
                        ? `Status atualizado para ${nextStatus}.`
                        : `Status salvo localmente como ${nextStatus} enquanto o schema do banco nao tem coluna de status.`,
                    result.persisted ? "success" : "error"
                );
            }
        });

        recentDemandas.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-demand]");
            if (!button) {
                return;
            }
            openModal(button.dataset.openDemand);
        });

        notificationButton.addEventListener("click", () => {
            notificationPanel.hidden = !notificationPanel.hidden;
        });

        notificationViewDemandas.addEventListener("click", () => {
            notificationPanel.hidden = true;
            setPanel("demandas");
        });

        markReadButton.addEventListener("click", () => {
            state.readNotifications = state.demands
                .filter((item) => item.status !== "Resolvida")
                .map((item) => String(item.id));
            persistJson(READ_STORAGE_KEY, state.readNotifications);
            renderNotifications();
        });

        sidebarLogoutButton.addEventListener("click", async () => {
            await supabase.auth.signOut();
            window.location.href = "index.html";
        });

        modalCloseButton.addEventListener("click", closeModal);
        detailModal.addEventListener("click", (event) => {
            if (event.target === detailModal) {
                closeModal();
            }
        });

        modalStartButton.addEventListener("click", async () => {
            if (!state.selectedDemandId) {
                return;
            }
            const result = await updateDemandStatus(state.selectedDemandId, "Em andamento");
            await loadDemands();
            openModal(state.selectedDemandId);
            showToast(
                result.persisted
                    ? "Demanda colocada em andamento."
                    : "Status salvo localmente porque a coluna ainda nao existe no banco.",
                result.persisted ? "success" : "error"
            );
        });

        modalResolveButton.addEventListener("click", async () => {
            if (!state.selectedDemandId) {
                return;
            }
            const result = await updateDemandStatus(state.selectedDemandId, "Resolvida");
            await loadDemands();
            openModal(state.selectedDemandId);
            showToast(
                result.persisted
                    ? "Demanda marcada como concluida."
                    : "Conclusao salva localmente porque a coluna ainda nao existe no banco.",
                result.persisted ? "success" : "error"
            );
        });

        modalResponseForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!state.selectedDemandId) {
                return;
            }

            const responseText = modalResponseInput.value.trim();
            if (!responseText) {
                return;
            }

            const result = await saveDemandResponse(state.selectedDemandId, responseText);
            await loadDemands();
            openModal(state.selectedDemandId, true);
            showToast(
                result.persisted
                    ? "Resposta enviada para o registro."
                    : "Resposta salva localmente enquanto o banco nao possui coluna de retorno.",
                result.persisted ? "success" : "error"
            );
        });

        document.addEventListener("click", (event) => {
            const clickedInsideNotifications = event.target.closest(".notification-wrap");
            if (!clickedInsideNotifications) {
                notificationPanel.hidden = true;
            }
        });
    }

    function startRealtime() {
        if (!supabase) {
            return;
        }

        state.realtimeChannel = supabase
            .channel("setor-demandas-feed")
            .on("postgres_changes", { event: "*", schema: "public", table: DEMAND_TABLE }, async () => {
                await loadDemands();
            })
            .subscribe();
    }

    function startPolling() {
        state.refreshIntervalId = window.setInterval(async () => {
            await loadDemands();
        }, 20000);
    }

    function teardown() {
        if (state.refreshIntervalId) {
            window.clearInterval(state.refreshIntervalId);
        }
        if (supabase && state.realtimeChannel) {
            supabase.removeChannel(state.realtimeChannel);
        }
    }

    async function bootstrap() {
        const hasSession = await ensureSession();
        if (!hasSession) {
            return;
        }

        bindEvents();
        setPanel("dashboard");

        try {
            await loadDemands();
        } catch (error) {
            showToast(`Falha ao carregar demandas do banco: ${error.message}`, "error");
        }

        startRealtime();
        startPolling();
    }

    window.addEventListener("beforeunload", teardown);
    bootstrap();
})();
