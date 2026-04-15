const togglePasswordButton = document.querySelector(".toggle-password");
const togglePasswordIcon = document.querySelector(".toggle-password-icon");
const togglePasswordText = document.querySelector(".toggle-password .sr-only");

if (passwordInput && togglePasswordButton && togglePasswordIcon && togglePasswordText) {
    togglePasswordButton.addEventListener("click", () => {
        const isPasswordHidden = passwordInput.type === "password";

        passwordInput.type = isPasswordHidden ? "text" : "password";
        togglePasswordButton.setAttribute("aria-pressed", String(isPasswordHidden));
        togglePasswordButton.setAttribute(
            "aria-label",
            isPasswordHidden ? "Ocultar senha" : "Mostrar senha"
        );
        togglePasswordText.textContent = isPasswordHidden ? "Ocultar senha" : "Mostrar senha";
        togglePasswordIcon.src = isPasswordHidden
            ? "assets/icons/icon-eye-open.svg"
            : "assets/icons/icon-eye-closed.svg";
    });
}

//AREA LOGIN SUPABASE
const loginForm = document.querySelector(".login-form") //Formulario de login
const emailInput = document.querySelector("#email") //email
const passwordInput = document.querySelector("#senha") //senha
const supabase = window.supabaseClient //Também pegue o client:

if (loginForm && emailInput && passwordInput && supabase) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault()

        const email = emailInput.value.trim()
        const password = passwordInput.value

        const { data, error } = await supabase.auth.signInWithPassword ({
            email, password
        })

        if(error) {
            console.error(error.message)
            alert("Email ou senha invalidos!")
            return
        }

        console.log("Login realizado com sucesso", data)
    })
}