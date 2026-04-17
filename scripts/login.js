(() => {
    const supabase = window.supabaseClient;
    const loginForm = document.querySelector(".login-form");
    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#senha");
    const loginMessage = document.querySelector("#login-message");
    const submitButton = loginForm?.querySelector(".submit-button");

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

    function showPasswordResetFeedbackFromUrl() {
        const url = new URL(window.location.href);
        const resetStatus = url.searchParams.get("reset");

        if (resetStatus === "success") {
            setFormMessage(loginMessage, "Senha atualizada com sucesso. Faca login com a nova senha.", "success");
            url.searchParams.delete("reset");
            window.history.replaceState({}, document.title, url.toString());
        }
    }

    function getSelectedAccessType() {
        return document.querySelector('input[name="access_type"]:checked')?.value ?? "colaborador";
    }

    function normalizeRole(role) {
        const normalized = String(role || "").trim().toLowerCase();
        return normalized === "setor_interno" ? "setor-interno" : normalized || "colaborador";
    }

    function getDestinationForRole(role) {
        return normalizeRole(role) === "setor-interno" ? "setor-interno.html" : "colaborador-chat.html";
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

    document.querySelectorAll(".toggle-password").forEach(setupPasswordToggle);
    showPasswordResetFeedbackFromUrl();

    async function redirectIfSessionExists() {
        if (!supabase) {
            return;
        }

        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
            return;
        }

        const role = normalizeRole(data.session.user?.user_metadata?.role ?? "colaborador");
        window.location.href = getDestinationForRole(role);
    }

    redirectIfSessionExists();

    if (loginForm && emailInput && passwordInput && supabase) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const selectedAccessType = normalizeRole(getSelectedAccessType());

            submitButton.disabled = true;
            submitButton.textContent = "Entrando...";
            setFormMessage(loginMessage, "Validando seu acesso...");

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                submitButton.disabled = false;
                submitButton.textContent = "Entrar";
                setFormMessage(loginMessage, "Email ou senha invalidos.", "error");
                return;
            }

            const userRole = normalizeRole(data.user?.user_metadata?.role ?? "colaborador");

            if (selectedAccessType !== userRole) {
                await supabase.auth.signOut();
                submitButton.disabled = false;
                submitButton.textContent = "Entrar";
                setFormMessage(
                    loginMessage,
                    "Este usuario nao corresponde ao perfil selecionado.",
                    "error"
                );
                return;
            }

            setFormMessage(loginMessage, "Login realizado com sucesso. Redirecionando...", "success");
            window.location.href = getDestinationForRole(userRole);
        });
    }
})();
