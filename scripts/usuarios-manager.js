/**
 * USUARIOS MANAGER
 * Gerencia operacoes com usuarios do Supabase
 * Reutilizavel em qualquer pagina do app
 */

(() => {
    const supabase = window.supabaseClient;
    const RECURSIVE_POLICY_ERROR_CODE = "42P17";
    const SETOR_INTERNO_ROLES = new Set(["setor-interno", "setor_interno"]);
    let usuariosReadBlocked = false;
    let usuariosReadBlockLogged = false;
    const usuariosByEmailCache = new Map();
    const usuariosByIdCache = new Map();

    // =====================================================
    // HELPERS
    // =====================================================

    function normalizeRoleValue(role) {
        const normalized = String(role || "").trim().toLowerCase();
        return SETOR_INTERNO_ROLES.has(normalized) ? "setor-interno" : "colaborador";
    }

    function isRecursivePolicyError(error) {
        const code = String(error?.code || "").trim();
        const message = String(error?.message || "").toLowerCase();
        return code === RECURSIVE_POLICY_ERROR_CODE || message.includes("infinite recursion detected in policy");
    }

    function blockUsuariosReads(error) {
        usuariosReadBlocked = true;

        if (!usuariosReadBlockLogged) {
            usuariosReadBlockLogged = true;
            console.warn(
                "Leitura da tabela usuarios bloqueada por uma policy recursiva no Supabase. As consultas foram pausadas ate a policy ser corrigida.",
                error
            );
        }
    }

    async function getSessionUserFallback() {
        if (!supabase?.auth?.getSession) {
            return null;
        }

        try {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data?.session?.user) {
                return null;
            }

            const user = data.session.user;
            const metadata = user.user_metadata || {};

            return {
                id: user.id,
                user_id: user.id,
                email: user.email || "",
                full_name: metadata.full_name || "",
                cargo: metadata.cargo || "",
                departamento: metadata.departamento || "",
                role: normalizeRoleValue(metadata.role),
                ativo: true,
                criado_em: user.created_at || null,
            };
        } catch (error) {
            return null;
        }
    }

    async function getFallbackUserByEmail(email) {
        const sessionUser = await getSessionUserFallback();
        if (!sessionUser) {
            return null;
        }

        return String(sessionUser.email || "").toLowerCase() === String(email || "").toLowerCase()
            ? sessionUser
            : null;
    }

    async function getFallbackUserById(userId) {
        const sessionUser = await getSessionUserFallback();
        if (!sessionUser) {
            return null;
        }

        return String(sessionUser.id || "") === String(userId || "")
            || String(sessionUser.user_id || "") === String(userId || "")
            ? sessionUser
            : null;
    }

    function sanitizeActiveUser(data) {
        if (!data || data.ativo !== true) {
            return null;
        }

        return data;
    }

    // =====================================================
    // FUNCOES PUBLICAS
    // =====================================================

    /**
     * Busca todos os usuarios ativos
     * @returns {Promise<Array>} Lista de usuarios
     */
    async function buscarTodosUsuarios() {
        if (!supabase) {
            console.error("Supabase nao esta disponivel");
            return [];
        }

        if (usuariosReadBlocked) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from("usuarios")
                .select("*")
                .eq("ativo", true)
                .order("full_name", { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            if (isRecursivePolicyError(error)) {
                blockUsuariosReads(error);
                return [];
            }

            console.error("Erro ao buscar usuarios:", error);
            return [];
        }
    }

    /**
     * Busca apenas colaboradores
     * @returns {Promise<Array>} Lista de colaboradores
     */
    async function buscarColaboradores() {
        if (!supabase) {
            console.error("Supabase nao esta disponivel");
            return [];
        }

        if (usuariosReadBlocked) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from("usuarios")
                .select("*")
                .eq("ativo", true)
                .eq("role", "colaborador")
                .order("full_name", { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            if (isRecursivePolicyError(error)) {
                blockUsuariosReads(error);
                return [];
            }

            console.error("Erro ao buscar colaboradores:", error);
            return [];
        }
    }

    /**
     * Busca usuarios por departamento
     * @param {string} departamento - Nome do departamento
     * @returns {Promise<Array>} Lista de usuarios
     */
    async function buscarPorDepartamento(departamento) {
        if (!supabase || !departamento) {
            console.error("Parametros invalidos");
            return [];
        }

        if (usuariosReadBlocked) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from("usuarios")
                .select("*")
                .eq("ativo", true)
                .eq("departamento", departamento)
                .order("full_name", { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            if (isRecursivePolicyError(error)) {
                blockUsuariosReads(error);
                return [];
            }

            console.error(`Erro ao buscar usuarios de ${departamento}:`, error);
            return [];
        }
    }

    /**
     * Busca colaboradores de um departamento especifico
     * @param {string} departamento - Nome do departamento
     * @returns {Promise<Array>} Lista de colaboradores
     */
    async function buscarColaboradoresPorDepto(departamento) {
        if (!supabase || !departamento) {
            console.error("Parametros invalidos");
            return [];
        }

        if (usuariosReadBlocked) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from("usuarios")
                .select("*")
                .eq("ativo", true)
                .eq("role", "colaborador")
                .eq("departamento", departamento)
                .order("full_name", { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            if (isRecursivePolicyError(error)) {
                blockUsuariosReads(error);
                return [];
            }

            console.error(`Erro ao buscar colaboradores de ${departamento}:`, error);
            return [];
        }
    }

    /**
     * Busca todos os departamentos unicos
     * @returns {Promise<Array>} Lista de departamentos
     */
    async function buscarDepartamentos() {
        if (!supabase) {
            console.error("Supabase nao esta disponivel");
            return [];
        }

        try {
            const { data, error } = await supabase
                .from("departamentos")
                .select("*")
                .eq("ativo", true)
                .order("nome", { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Erro ao buscar departamentos:", error);
            return [];
        }
    }

    /**
     * Busca um usuario especifico por email
     * @param {string} email - Email do usuario
     * @returns {Promise<Object|null>} Dados do usuario ou null
     */
    async function buscarPorEmail(email) {
        if (!supabase || !email) {
            console.error("Parametros invalidos");
            return null;
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        if (usuariosByEmailCache.has(normalizedEmail)) {
            return usuariosByEmailCache.get(normalizedEmail);
        }

        const fallbackUser = await getFallbackUserByEmail(normalizedEmail);
        if (usuariosReadBlocked) {
            usuariosByEmailCache.set(normalizedEmail, fallbackUser);
            return fallbackUser;
        }

        try {
            const { data, error } = await supabase
                .from("usuarios")
                .select("*")
                .eq("email", normalizedEmail)
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            const usuario = sanitizeActiveUser(data);
            usuariosByEmailCache.set(normalizedEmail, usuario);
            return usuario;
        } catch (error) {
            if (isRecursivePolicyError(error)) {
                blockUsuariosReads(error);
                usuariosByEmailCache.set(normalizedEmail, fallbackUser);
                return fallbackUser;
            }

            console.error(`Erro ao buscar usuario ${email}:`, error);
            return fallbackUser;
        }
    }

    /**
     * Busca um usuario especifico por ID
     * @param {string} userId - ID do usuario
     * @returns {Promise<Object|null>} Dados do usuario ou null
     */
    async function buscarPorId(userId) {
        if (!supabase || !userId) {
            console.error("Parametros invalidos");
            return null;
        }

        const normalizedId = String(userId).trim();
        if (usuariosByIdCache.has(normalizedId)) {
            return usuariosByIdCache.get(normalizedId);
        }

        const fallbackUser = await getFallbackUserById(normalizedId);
        if (usuariosReadBlocked) {
            usuariosByIdCache.set(normalizedId, fallbackUser);
            return fallbackUser;
        }

        try {
            const { data, error } = await supabase
                .from("usuarios")
                .select("*")
                .or(`id.eq.${normalizedId},user_id.eq.${normalizedId}`)
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            const usuario = sanitizeActiveUser(data);
            usuariosByIdCache.set(normalizedId, usuario);
            return usuario;
        } catch (error) {
            if (isRecursivePolicyError(error)) {
                blockUsuariosReads(error);
                usuariosByIdCache.set(normalizedId, fallbackUser);
                return fallbackUser;
            }

            console.error(`Erro ao buscar usuario ${userId}:`, error);
            return fallbackUser;
        }
    }

    /**
     * Atualiza dados de um usuario
     * @param {string} userId - ID do usuario
     * @param {Object} updates - Dados a atualizar
     * @returns {Promise<boolean>} true se sucesso
     */
    async function atualizarUsuario(userId, updates) {
        if (!supabase || !userId || !updates) {
            console.error("Parametros invalidos");
            return false;
        }

        try {
            const { error } = await supabase
                .from("usuarios")
                .update(updates)
                .eq("id", userId);

            if (error) throw error;
            console.log("Usuario atualizado com sucesso");
            return true;
        } catch (error) {
            console.error("Erro ao atualizar usuario:", error);
            return false;
        }
    }

    /**
     * Desativa um usuario (soft delete)
     * @param {string} userId - ID do usuario
     * @returns {Promise<boolean>} true se sucesso
     */
    async function desativarUsuario(userId) {
        return atualizarUsuario(userId, { ativo: false });
    }

    /**
     * Formata dados de um usuario para exibicao
     * @param {Object} usuario - Dados do usuario
     * @returns {Object} Usuario formatado
     */
    function formatarUsuario(usuario) {
        if (!usuario) return null;

        return {
            id: usuario.id || usuario.user_id,
            nome: usuario.full_name || "Sem nome",
            email: usuario.email || "",
            cargo: usuario.cargo || "Sem cargo",
            departamento: usuario.departamento || "Sem departamento",
            role: normalizeRoleValue(usuario.role) === "setor-interno" ? "Setor Interno" : "Colaborador",
            ativo: usuario.ativo === true ? "Ativo" : "Inativo",
            criadoEm: new Date(usuario.criado_em || usuario.created_at || Date.now()).toLocaleDateString("pt-BR"),
        };
    }

    /**
     * Exporta funcoes globalmente
     */
    window.usuariosManager = {
        buscarTodosUsuarios,
        buscarColaboradores,
        buscarPorDepartamento,
        buscarColaboradoresPorDepto,
        buscarDepartamentos,
        buscarPorEmail,
        buscarPorId,
        atualizarUsuario,
        desativarUsuario,
        formatarUsuario,
    };

    console.log("Usuarios Manager carregado");
})();
