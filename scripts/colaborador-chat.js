(() => {
    const supabase = window.supabaseClient;
    const DEMAND_TABLE = "solicitacoes";

    const tabButtons = document.querySelectorAll("[data-view-target]");
    const viewPanels = document.querySelectorAll("[data-view-panel]");
    const chatComposerWrap = document.querySelector(".chat-composer-wrap");

    const userNameElement = document.querySelector("#user-name");
    const userAvatarElement = document.querySelector("#user-avatar");
    const logoutButton = document.querySelector("#logout-button");

    const chatThread = document.querySelector("#chat-thread");
    const chatForm = document.querySelector("#chat-form");
    const chatInput = document.querySelector("#chat-input");
    const sendButton = document.querySelector("#send-button");
    const chatFeedback = document.querySelector("#chat-feedback");
    const suggestionButtons = document.querySelectorAll(".suggestion-chip");

    const demandasList = document.querySelector("#demandas-list");
    const demandasEmpty = document.querySelector("#demandas-empty");
    const demandasFeedback = document.querySelector("#demandas-feedback");
    const newDemandaButton = document.querySelector("#new-demanda-button");

    let currentUser = null;
    let refreshIntervalId = null;
    let realtimeChannel = null;

    function setFeedback(element, message, type = "") {
        if (!element) {
            return;
        }

        element.textContent = message;
        element.classList.remove("is-error", "is-success");

        if (type) {
            element.classList.add(`is-${type}`);
        }
    }

    function normalizeName(user) {
        const metadataName = user?.user_metadata?.full_name;
        if (metadataName && metadataName.trim()) {
            return metadataName.trim();
        }

        const email = user?.email ?? "";
        if (!email.includes("@")) {
            return "Colaborador";
        }

        return email.split("@")[0];
    }

    function getInitials(name) {
        return name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "SA";
    }

    function formatDateTime(value) {
        if (!value) {
            return "Agora";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "Agora";
        }

        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }

    function normalizeStatus(row) {
        const rawStatus = (row?.status ?? "").toString().trim();
        const rawTipo = (row?.tipo ?? "").toString().trim();

        if (rawStatus) {
            return rawStatus;
        }

        if (!rawTipo || rawTipo.toLowerCase() === "ia analisando") {
            return "IA analisando";
        }

        return "Classificada";
    }

    function toStatusSlug(status) {
        const normalized = status.toLowerCase();

        if (normalized.includes("resolvida")) {
            return "resolvida";
        }

        if (normalized.includes("atendimento")) {
            return "em-atendimento";
        }

        if (normalized.includes("classific")) {
            return "classificada";
        }

        return "ia-analisando";
    }

    function createElement(tag, className, text = "") {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (text) {
            element.textContent = text;
        }
        return element;
    }

    function appendChatMessage(role, message, meta = "") {
        if (!chatThread) {
            return;
        }

        const bubble = createElement("article", `chat-bubble ${role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`);
        const text = createElement("p", "", message);
        bubble.appendChild(text);

        if (meta) {
            const metaText = createElement("p", "chat-bubble-meta", meta);
            bubble.appendChild(metaText);
        }

        chatThread.appendChild(bubble);
        bubble.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    function renderDemandas(rows) {
        if (!demandasList || !demandasEmpty) {
            return;
        }

        demandasList.innerHTML = "";

        if (!rows.length) {
            demandasEmpty.hidden = false;
            return;
        }

        demandasEmpty.hidden = true;

        rows.forEach((row) => {
            const statusText = normalizeStatus(row);
            const statusSlug = toStatusSlug(statusText);
            const createdAt = formatDateTime(row.created_at);

            const card = createElement("article", "demanda-card");
            const head = createElement("header", "demanda-card-head");
            const date = createElement("span", "demanda-date", createdAt);
            const status = createElement("span", "demanda-status", statusText);
            status.dataset.status = statusSlug;

            head.append(date, status);
            card.appendChild(head);

            const body = createElement("p", "demanda-text", row.mensagem ?? "Demanda sem descricao.");
            card.appendChild(body);

            const metaParts = [];
            if (row.tipo) {
                metaParts.push(`Tipo: ${row.tipo}`);
            }
            if (row.urgencia) {
                metaParts.push(`Urgencia: ${row.urgencia}`);
            }
            if (row.setor_destino) {
                metaParts.push(`Setor: ${row.setor_destino}`);
            }

            if (metaParts.length) {
                const meta = createElement("p", "demanda-meta", metaParts.join(" | "));
                card.appendChild(meta);
            }

            demandasList.appendChild(card);
        });
    }

    function setActiveView(viewName) {
        tabButtons.forEach((button) => {
            const isTarget = button.dataset.viewTarget === viewName;
            button.classList.toggle("is-active", isTarget);
        });

        viewPanels.forEach((panel) => {
            const isTarget = panel.dataset.viewPanel === viewName;
            panel.classList.toggle("is-active", isTarget);
        });

        if (chatComposerWrap) {
            chatComposerWrap.classList.toggle("is-hidden", viewName !== "chat");
        }
    }

    function updateSendButtonState() {
        if (!sendButton || !chatInput) {
            return;
        }

        sendButton.disabled = !chatInput.value.trim();
    }

    function isRecoverableSchemaError(error) {
        const message = (error?.message ?? "").toLowerCase();
        return (
            message.includes("column") ||
            message.includes("schema cache") ||
            message.includes("does not exist") ||
            message.includes("could not find")
        );
    }

    async function insertDemand(message) {
        if (!supabase || !currentUser) {
            throw new Error("Cliente Supabase indisponivel.");
        }

        const nowIso = new Date().toISOString();
        const payloadVariants = [
            {
                mensagem: message,
                status: "IA analisando",
                user_id: currentUser.id,
                user_email: currentUser.email ?? "",
                tipo: "",
                deficiencia: "",
                localizacao: "",
                urgencia: "",
                telefone: "",
                created_at: nowIso,
            },
            {
                mensagem: message,
                user_id: currentUser.id,
                tipo: "",
                deficiencia: "",
                localizacao: "",
                urgencia: "",
                telefone: "",
                created_at: nowIso,
            },
            {
                mensagem: message,
                user_email: currentUser.email ?? "",
                tipo: "",
                deficiencia: "",
                localizacao: "",
                urgencia: "",
                telefone: "",
                created_at: nowIso,
            },
            {
                mensagem: message,
                telefone: currentUser.id,
                tipo: "",
                deficiencia: "",
                localizacao: "",
                urgencia: "",
                created_at: nowIso,
            },
            {
                mensagem: message,
                tipo: "",
                deficiencia: "",
                localizacao: "",
                urgencia: "",
                telefone: "",
            },
            {
                mensagem: message,
            },
        ];

        let lastError = null;

        for (const payload of payloadVariants) {
            const { error } = await supabase.from(DEMAND_TABLE).insert(payload);

            if (!error) {
                return;
            }

            lastError = error;

            const messageText = (error.message ?? "").toLowerCase();
            if (messageText.includes("permission denied") || messageText.includes("row-level security")) {
                break;
            }
        }

        throw lastError ?? new Error("Nao foi possivel registrar sua demanda.");
    }

    async function fetchDemandas() {
        if (!supabase || !currentUser) {
            return [];
        }

        const strategies = [
            () =>
                supabase
                    .from(DEMAND_TABLE)
                    .select("id,mensagem,created_at,status,setor_destino,tipo,urgencia,user_id,user_email")
                    .eq("user_id", currentUser.id)
                    .order("created_at", { ascending: false })
                    .limit(80),
            () =>
                supabase
                    .from(DEMAND_TABLE)
                    .select("id,mensagem,created_at,status,setor_destino,tipo,urgencia,user_email")
                    .eq("user_email", currentUser.email ?? "")
                    .order("created_at", { ascending: false })
                    .limit(80),
            () =>
                supabase
                    .from(DEMAND_TABLE)
                    .select("id,mensagem,created_at,status,setor_destino,tipo,urgencia,telefone")
                    .eq("telefone", currentUser.id)
                    .order("created_at", { ascending: false })
                    .limit(80),
            () =>
                supabase
                    .from(DEMAND_TABLE)
                    .select("id,mensagem,created_at,status,setor_destino,tipo,urgencia")
                    .order("created_at", { ascending: false })
                    .limit(80),
            () =>
                supabase
                    .from(DEMAND_TABLE)
                    .select("id,mensagem,created_at,tipo,urgencia")
                    .order("created_at", { ascending: false })
                    .limit(80),
        ];

        let lastError = null;

        for (const runQuery of strategies) {
            const { data, error } = await runQuery();

            if (!error) {
                return data ?? [];
            }

            lastError = error;
            if (!isRecoverableSchemaError(error)) {
                break;
            }
        }

        throw lastError ?? new Error("Falha ao carregar demandas.");
    }

    async function loadDemandas({ silent = false } = {}) {
        try {
            const data = await fetchDemandas();
            renderDemandas(data);

            if (!silent) {
                setFeedback(demandasFeedback, "Demandas atualizadas.", "success");
            }
        } catch (error) {
            const errorMessage = error?.message ?? "Nao foi possivel carregar suas demandas.";
            setFeedback(demandasFeedback, errorMessage, "error");
        }
    }

    function startAutoRefresh() {
        if (refreshIntervalId) {
            window.clearInterval(refreshIntervalId);
        }

        refreshIntervalId = window.setInterval(() => {
            loadDemandas({ silent: true });
        }, 15000);
    }

    function stopAutoRefresh() {
        if (refreshIntervalId) {
            window.clearInterval(refreshIntervalId);
            refreshIntervalId = null;
        }
    }

    function setupRealtime() {
        if (!supabase || !currentUser) {
            return;
        }

        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }

        realtimeChannel = supabase
            .channel(`solicitacoes-feed-${currentUser.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: DEMAND_TABLE,
                },
                () => {
                    loadDemandas({ silent: true });
                }
            )
            .subscribe();
    }

    function teardownRealtime() {
        if (supabase && realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }
        stopAutoRefresh();
    }

    async function ensureSession() {
        if (!supabase) {
            setFeedback(chatFeedback, "Supabase nao carregou corretamente.", "error");
            return false;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
            window.location.href = "index.html";
            return false;
        }

        currentUser = data.session.user;
        const role = currentUser?.user_metadata?.role ?? "colaborador";
        if (role !== "colaborador") {
            window.location.href = "setor-interno.html";
            return false;
        }

        const displayName = normalizeName(currentUser);
        userNameElement.textContent = displayName;
        userAvatarElement.textContent = getInitials(displayName);

        return true;
    }

    function bindEvents() {
        tabButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const target = button.dataset.viewTarget;
                setActiveView(target);
                if (target === "demandas") {
                    loadDemandas({ silent: true });
                }
            });
        });

        if (newDemandaButton) {
            newDemandaButton.addEventListener("click", () => {
                setActiveView("chat");
                chatInput?.focus();
            });
        }

        suggestionButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const suggestion = button.dataset.suggestion ?? "";
                chatInput.value = suggestion;
                updateSendButtonState();
                chatInput.focus();
            });
        });

        if (chatInput) {
            chatInput.addEventListener("input", updateSendButtonState);
        }

        if (chatForm) {
            chatForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const message = chatInput.value.trim();
                if (!message) {
                    return;
                }

                sendButton.disabled = true;
                chatInput.disabled = true;
                appendChatMessage("user", message, "Enviado agora");
                setFeedback(chatFeedback, "Registrando sua demanda...");

                try {
                    await insertDemand(message);
                    chatInput.value = "";
                    setFeedback(
                        chatFeedback,
                        "Demanda enviada com sucesso. Status inicial: IA analisando.",
                        "success"
                    );

                    appendChatMessage(
                        "assistant",
                        "Sua demanda foi recebida. Vou classificar e encaminhar automaticamente.",
                        "Status inicial: IA analisando"
                    );

                    await loadDemandas({ silent: true });
                } catch (error) {
                    const messageText = error?.message ?? "Falha ao enviar demanda.";
                    setFeedback(chatFeedback, messageText, "error");

                    appendChatMessage(
                        "assistant",
                        "Nao consegui registrar agora. Verifique as permissoes da tabela solicitacoes e tente novamente."
                    );
                } finally {
                    chatInput.disabled = false;
                    updateSendButtonState();
                    chatInput.focus();
                }
            });
        }

        if (logoutButton) {
            logoutButton.addEventListener("click", async () => {
                if (!supabase) {
                    window.location.href = "index.html";
                    return;
                }

                await supabase.auth.signOut();
                window.location.href = "index.html";
            });
        }
    }

    async function bootstrap() {
        const hasSession = await ensureSession();
        if (!hasSession) {
            return;
        }

        bindEvents();
        setActiveView("chat");
        updateSendButtonState();

        await loadDemandas({ silent: true });
        startAutoRefresh();
        setupRealtime();
    }

    window.addEventListener("beforeunload", teardownRealtime);
    bootstrap();
})();
