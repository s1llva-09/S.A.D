(() => {
    const supabase = window.supabaseClient;
    const recoveryTitle = document.querySelector("#recovery-title");
    const recoveryCopy = document.querySelector("#recovery-copy");
    const requestForm = document.querySelector("#recovery-request-form");
    const requestEmailInput = document.querySelector("#recovery-email");
    const requestMessage = document.querySelector("#recovery-request-message");
    const requestButton = document.querySelector("#recovery-request-button");
    const updateForm = document.querySelector("#recovery-update-form");
    const passwordInput = document.querySelector("#recovery-password");
    const confirmPasswordInput = document.querySelector("#recovery-confirm-password");
    const updateMessage = document.querySelector("#recovery-update-message");
    const updateButton = document.querySelector("#recovery-update-button");

    let isRecoveryMode = false;

    function setFormMessage(element, message, type = "") {
        if (!element) {
            return;
        }

        element.textContent = message;
        element.classList.remove("is-error", "is-success");

        if (type) {
            element.classList.add(`is-${type}`);
        }
    }

    function setupPasswordToggle(button) {
        const inputSelector = button.dataset.target;
        const targetInput = document.querySelector(inputSelector);
        const icon = button.querySelector(".toggle-password-icon");
        const srText = button.querySelector(".sr-only");

        if (!targetInput || !icon || !srText) {
            return;
        }

        const openIcon = button.dataset.openIcon;
        const closedIcon = button.dataset.closedIcon;

        button.addEventListener("click", () => {
            const isHidden = targetInput.type === "password";

            targetInput.type = isHidden ? "text" : "password";
            button.setAttribute("aria-pressed", String(isHidden));
            button.setAttribute("aria-label", isHidden ? "Ocultar senha" : "Mostrar senha");
            srText.textContent = isHidden ? "Ocultar senha" : "Mostrar senha";
            icon.src = isHidden ? openIcon : closedIcon;
        });
    }

    function setRecoveryMode(active) {
        isRecoveryMode = active;
        requestForm.hidden = active;
        updateForm.hidden = !active;

        if (active) {
            recoveryTitle.textContent = "Defina sua nova senha";
            recoveryCopy.textContent = "Escolha uma senha forte para concluir a recuperacao do acesso.";
            setFormMessage(
                updateMessage,
                "Link validado. Digite sua nova senha para finalizar a recuperacao."
            );
            return;
        }

        recoveryTitle.textContent = "Esqueci minha senha";
        recoveryCopy.textContent = "Informe o email da sua conta para receber o link de recuperacao.";
    }

    function getRecoveryRedirectUrl() {
        const targetUrl = new URL("redefinir-senha.html", window.location.href);
        return /^https?:$/.test(targetUrl.protocol) ? targetUrl.toString() : null;
    }

    function getUrl() {
        return new URL(window.location.href);
    }

    function hasRecoveryHash() {
        const hash = window.location.hash.replace(/^#/, "");
        const params = new URLSearchParams(hash);
        const type = params.get("type");
        return type === "recovery" || params.has("access_token");
    }

    function cleanupRecoveryUrl() {
        const url = getUrl();
        let changed = false;

        ["code", "type", "error", "error_code", "error_description"].forEach((key) => {
            if (url.searchParams.has(key)) {
                url.searchParams.delete(key);
                changed = true;
            }
        });

        if (url.hash) {
            url.hash = "";
            changed = true;
        }

        if (changed) {
            window.history.replaceState({}, document.title, url.toString());
        }
    }

    function showUrlErrorIfPresent() {
        const url = getUrl();
        const errorDescription = url.searchParams.get("error_description");

        if (!errorDescription || isRecoveryMode) {
            return;
        }

        setFormMessage(requestMessage, decodeURIComponent(errorDescription), "error");
        cleanupRecoveryUrl();
    }

    async function activateRecoveryModeFromUrl() {
        if (!supabase) {
            return false;
        }

        const url = getUrl();
        const authCode = url.searchParams.get("code");
        const requestedType = url.searchParams.get("type");

        if (authCode) {
            const { error } = await supabase.auth.exchangeCodeForSession(authCode);

            if (error) {
                setRecoveryMode(true);
                setFormMessage(updateMessage, error.message, "error");
                return false;
            }

            setRecoveryMode(true);
            cleanupRecoveryUrl();
            return true;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
            return false;
        }

        if (data.session && (requestedType === "recovery" || hasRecoveryHash())) {
            setRecoveryMode(true);
            cleanupRecoveryUrl();
            return true;
        }

        return false;
    }

    async function sendRecoveryEmail(event) {
        event.preventDefault();

        if (!supabase) {
            setFormMessage(requestMessage, "Supabase nao carregou corretamente.", "error");
            return;
        }

        const email = requestEmailInput.value.trim();
        if (!email) {
            setFormMessage(requestMessage, "Informe um email valido.", "error");
            return;
        }

        const redirectTo = getRecoveryRedirectUrl();
        requestButton.disabled = true;
        requestButton.querySelector("span").textContent = "Enviando...";
        setFormMessage(requestMessage, "Preparando o email de recuperacao...");

        try {
            const options = redirectTo ? { redirectTo } : {};
            const { error } = await supabase.auth.resetPasswordForEmail(email, options);

            if (error) {
                throw error;
            }

            const fallbackNote = redirectTo
                ? ""
                : " Configure no Supabase a URL desta pagina em Auth > URL Configuration para o retorno funcionar.";

            setFormMessage(
                requestMessage,
                `Se o email existir para colaborador ou setor corporativo, o link de recuperacao foi enviado.${fallbackNote}`,
                "success"
            );
        } catch (error) {
            setFormMessage(
                requestMessage,
                error?.message || "Nao foi possivel enviar o email de recuperacao.",
                "error"
            );
        } finally {
            requestButton.disabled = false;
            requestButton.querySelector("span").textContent = "Enviar link de recuperacao";
        }
    }

    async function updatePassword(event) {
        event.preventDefault();

        if (!supabase) {
            setFormMessage(updateMessage, "Supabase nao carregou corretamente.", "error");
            return;
        }

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password.length < 6) {
            setFormMessage(updateMessage, "A nova senha precisa ter pelo menos 6 caracteres.", "error");
            return;
        }

        if (password !== confirmPassword) {
            setFormMessage(updateMessage, "As senhas nao coincidem.", "error");
            return;
        }

        updateButton.disabled = true;
        updateButton.querySelector("span").textContent = "Salvando...";
        setFormMessage(updateMessage, "Atualizando sua senha...");

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                throw error;
            }

            setFormMessage(updateMessage, "Senha atualizada com sucesso. Redirecionando para o login...", "success");
            await supabase.auth.signOut();

            window.setTimeout(() => {
                window.location.href = "index.html?reset=success";
            }, 1200);
        } catch (error) {
            setFormMessage(
                updateMessage,
                error?.message || "Nao foi possivel atualizar a senha.",
                "error"
            );
        } finally {
            updateButton.disabled = false;
            updateButton.querySelector("span").textContent = "Salvar nova senha";
        }
    }

    async function bootstrap() {
        document.querySelectorAll(".toggle-password").forEach(setupPasswordToggle);

        requestForm?.addEventListener("submit", sendRecoveryEmail);
        updateForm?.addEventListener("submit", updatePassword);

        if (!supabase) {
            setFormMessage(requestMessage, "Supabase nao carregou corretamente.", "error");
            return;
        }

        await activateRecoveryModeFromUrl();
        showUrlErrorIfPresent();

        supabase.auth.onAuthStateChange((eventName) => {
            if (eventName === "PASSWORD_RECOVERY") {
                setRecoveryMode(true);
                cleanupRecoveryUrl();
            }
        });
    }

    bootstrap();
})();
