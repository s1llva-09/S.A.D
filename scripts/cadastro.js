(() => {
    const supabase = window.supabaseClient;
    const signupForm = document.querySelector(".signup-form");
    const nameInput = document.querySelector("#nome");
    const emailInput = document.querySelector("#signup-email");
    const cargoInput = document.querySelector("#cargo");
    const departmentInput = document.querySelector("#departamento");
    const passwordInput = document.querySelector("#signup-password");
    const confirmPasswordInput = document.querySelector("#signup-confirm-password");
    const signupMessage = document.querySelector("#signup-message");
    const submitButton = signupForm?.querySelector(".submit-button");

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

    document.querySelectorAll(".toggle-password").forEach(setupPasswordToggle);

    function getSelectedAccessType() {
        return document.querySelector('input[name="access_type"]:checked')?.value ?? "colaborador";
    }

    if (
        signupForm &&
        nameInput &&
        emailInput &&
        cargoInput &&
        departmentInput &&
        passwordInput &&
        confirmPasswordInput &&
        supabase
    ) {
        signupForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const fullName = nameInput.value.trim();
            const email = emailInput.value.trim();
            const cargo = cargoInput.value.trim();
            const department = departmentInput.value.trim();
            const selectedRole = getSelectedAccessType();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!cargo || !department) {
                setFormMessage(signupMessage, "Preencha cargo e departamento para continuar.", "error");
                return;
            }

            if (password.length < 6) {
                setFormMessage(signupMessage, "A senha precisa ter pelo menos 6 caracteres.", "error");
                return;
            }

            if (password !== confirmPassword) {
                setFormMessage(signupMessage, "As senhas nao coincidem.", "error");
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = "Criando conta...";
            setFormMessage(signupMessage, "Registrando seu acesso...");

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: selectedRole,
                        cargo,
                        departamento: department,
                    },
                },
            });

            if (error) {
                submitButton.disabled = false;
                submitButton.textContent = "Criar conta";
                setFormMessage(signupMessage, error.message, "error");
                return;
            }

            signupForm.reset();
            submitButton.disabled = false;
            submitButton.textContent = "Criar conta";

            if (data.session) {
                setFormMessage(signupMessage, "Cadastro realizado com sucesso. Redirecionando...", "success");
                window.location.href = "colaborador-chat.html";
                return;
            }

            setFormMessage(
                signupMessage,
                "Cadastro criado. Confira seu email para confirmar a conta antes de entrar.",
                "success"
            );
        });
    }
})();
