const API_BASE_URL = "https://pengawasan-tambahspk.onrender.com/api/form";
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const spinner = document.getElementById("spinner");
const btnText = document.getElementById("btnText");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const loadingOverlay = document.getElementById("loadingOverlay");
const togglePassword = document.getElementById("togglePassword");
const eyeOpen = document.getElementById("eyeOpen");
const eyeSlashed = document.getElementById("eyeSlashed");

const showError = (msg) => {
    errorMessage.textContent = msg;
    errorMessage.style.display = "block";
    successMessage.style.display = "none";
};

const showSuccess = (msg) => {
    successMessage.textContent = msg;
    successMessage.style.display = "block";
    errorMessage.style.display = "none";
};

const hideMessages = () => {
    errorMessage.style.display = "none";
    successMessage.style.display = "none";
};

const setLoading = (state) => {
    loginBtn.disabled = state;
    spinner.style.display = state ? "inline-block" : "none";
    btnText.textContent = state ? "Memproses..." : "Masuk";
    loadingOverlay.style.display = state ? "flex" : "none";
};

togglePassword.addEventListener("click", () => {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    if (type === "password") {
        eyeOpen.style.display = "none";
        eyeSlashed.style.display = "block";
    } else {
        eyeOpen.style.display = "block";
        eyeSlashed.style.display = "none";
    }
});

async function performLogin(email, password) {
    const res = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            form: "login_perpanjanganspk",
            action: "loginManager",
            email,
            password,
        }),
    });
    if (!res.ok) throw new Error("Gagal menghubungi server");
    const data = await res.json();
    if (data.status !== "success")
    throw new Error(data.message || "Login gagal");
    return data;
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const now = new Date();
        const options = { timeZone: "Asia/Jakarta", hour: '2-digit', hour12: false };
        const currentHour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));
        const startHour = 6;
        const endHour = 18; 
        if (currentHour < startHour || currentHour >= endHour) {
            showError("Login di luar jam operasional. Silakan login antara pukul 06:00 - 18:00 WIB.");
            return;
        }
    } catch (err) {
        console.error("Gagal memvalidasi jam:", err);
        showError("Gagal memvalidasi jam, silakan coba lagi.");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return showError("Harap isi semua field");
    hideMessages();
    setLoading(true);

    try {
        const result = await performLogin(email, password);
        showSuccess(result.message || "Login berhasil! Mengalihkan...");
        if (result.token) {
            sessionStorage.setItem("authToken", result.token);
            const redirectUrl = `https://frontend-form-virid.vercel.app/perpanjangan_spk.html`;
            setTimeout(() => (window.location.href = redirectUrl), 1500);
        } else {
            throw new Error("Token tidak diterima dari server.");
        }
    } catch (err) {
        showError(err.message);
        setLoading(false);
    }
});

emailInput.focus();
[emailInput, passwordInput].forEach((el) => el.addEventListener("input", hideMessages));