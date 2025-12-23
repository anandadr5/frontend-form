const API_PROXY_URL = "https://pengawasan-tambahspk.onrender.com/api/form";
const GAS_LOGIN_VERIFY_URL = "https://pengawasan-tambahspk.onrender.com/api/form?form=login_perpanjanganspk&action=verifyToken";
const LOGIN_PAGE_URL = "https://frontend-form-virid.vercel.app/login-perpanjanganspk.html";
let currentUser = null;

let ulokData = [];
let originalEndDateISO = '';
let newEndDateISO = '';

// Element References
const ulokSelect = document.getElementById('nomor_ulok');
const pertambahanHariInput = document.getElementById('pertambahan_hari');
const tglSpkAkhirInput = document.getElementById('tanggal_spk_akhir');
const tglSpkAkhirBaruInput = document.getElementById('tanggal_spk_akhir_baru');
const logoutBtn = document.getElementById('logoutBtn');
const alasanContainer = document.getElementById('alasan-container');
const tambahAlasanBtn = document.getElementById('tambah-alasan-btn');
const alasanHiddenInput = document.getElementById('alasan_spk_hidden');
const lampiranPdfInput = document.getElementById('lampiran_pdf');
const form = document.getElementById('pertambahan-spk-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const successModal = document.getElementById('success-modal');
const modalMessage = document.getElementById('modal-message');
const buatLaporanBaruBtn = document.getElementById('buat-laporan-baru-btn');

// --- Logout Handler ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        if (confirm('Apakah Anda yakin ingin keluar?')) {
            sessionStorage.removeItem('authToken');
            window.location.href = LOGIN_PAGE_URL;
        }
    });
}

// --- Helper: Format Tanggal ---
function formatDisplayDate(dateObj) {
    if (!dateObj) return "";
    return dateObj.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// --- Helper: Hitung Tanggal Akhir Baru ---
function calculateNewDate() {
    if (!originalEndDateISO) return;

    const daysToAdd = parseInt(pertambahanHariInput.value, 10);
    if (isNaN(daysToAdd) || daysToAdd <= 0) {
        tglSpkAkhirBaruInput.value = "";
        newEndDateISO = "";
        return;
    }

    const startDate = new Date(originalEndDateISO);
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + daysToAdd);

    newEndDateISO = newDate.toISOString().split('T')[0];
    tglSpkAkhirBaruInput.value = formatDisplayDate(newDate);
}

// --- Helper: Dynamic Alasan Fields ---
function addAlasanField(value = "") {
    const div = document.createElement("div");
    div.className = "alasan-item";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Masukkan alasan...";
    input.value = value;
    input.required = true;

    // Update hidden input saat mengetik
    input.addEventListener("input", updateHiddenAlasan);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-alasan-btn";
    removeBtn.innerHTML = "&times;"; // Simbol X
    removeBtn.onclick = function() {
        div.remove();
        updateHiddenAlasan();
    };

    div.appendChild(input);
    div.appendChild(removeBtn);
    alasanContainer.appendChild(div);

    updateHiddenAlasan();
}

function updateHiddenAlasan() {
    const inputs = alasanContainer.querySelectorAll("input");
    const values = Array.from(inputs).map(input => input.value.trim()).filter(val => val !== "");
    alasanHiddenInput.value = values.join(" | ");
}

tambahAlasanBtn.addEventListener("click", () => addAlasanField());
pertambahanHariInput.addEventListener('input', calculateNewDate);

// --- Initialization ---
(async function() {
    checkSessionTime();
    setInterval(checkSessionTime, 60000); // Cek setiap menit

    const token = sessionStorage.getItem("authToken");
    if (!token) {
        alert("Anda belum login. Harap login terlebih dahulu.");
        window.location.href = LOGIN_PAGE_URL;
        return;
    }

    // Verifikasi Token
    try {
        const verifyResp = await fetch(GAS_LOGIN_VERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ token: token })
        });
        const verifyResult = await verifyResp.json();

        if (verifyResult.status !== "success") {
            sessionStorage.removeItem("authToken");
            alert("Sesi tidak valid, harap login kembali.");
            window.location.href = LOGIN_PAGE_URL;
            return;
        }

        currentUser = verifyResult.user; // Simpan data user (pic_name, cabang)

    } catch (error) {
        console.error("Auth check failed:", error);
        alert("Gagal memverifikasi sesi. Harap login kembali.");
        window.location.href = LOGIN_PAGE_URL;
        return;
    }

    // Load Data Ulok
    try {
        const response = await fetch(`${API_PROXY_URL}?action=getUlokData&cabang=${encodeURIComponent(currentUser.cabang)}`);
        const result = await response.json();

        if (result.status === 'success') {
            ulokData = result.data;

            // Reset dropdown
            ulokSelect.innerHTML = '<option value="" disabled selected>-- Pilih Nomor Ulok --</option>';

            ulokData.forEach(item => {
                const option = document.createElement('option');
                option.value = item.nomor_ulok;
                option.textContent = `${item.nomor_ulok} - ${item.nama_toko}`;
                ulokSelect.appendChild(option);
            });
        } else {
            ulokSelect.innerHTML = '<option value="" disabled>Gagal memuat data</option>';
            alert("Gagal memuat data Ulok: " + result.message);
        }
    } catch (error) {
        console.error("Error fetching Ulok data:", error);
        ulokSelect.innerHTML = '<option value="" disabled>Error memuat data</option>';
    }
})();

// --- Event Listener: Pilih Ulok ---
ulokSelect.addEventListener('change', function() {
    const selectedUlok = this.value;
    const data = ulokData.find(item => item.nomor_ulok === selectedUlok);

    if (data) {
        // Parse tanggal dari format DD/MM/YYYY atau YYYY-MM-DD
        let dateObj = new Date(data.tanggal_spk_akhir);
        if (isNaN(dateObj.getTime())) {
            // Coba parsing manual jika format DD/MM/YYYY
            const parts = data.tanggal_spk_akhir.split('/');
            if (parts.length === 3) {
                dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }

        if (!isNaN(dateObj.getTime())) {
            originalEndDateISO = dateObj.toISOString().split('T')[0];
            tglSpkAkhirInput.value = formatDisplayDate(dateObj);
            calculateNewDate(); // Recalculate jika user sudah input hari sebelumnya
        } else {
            originalEndDateISO = '';
            tglSpkAkhirInput.value = "Format Tanggal Invalid";
        }
    } else {
        tglSpkAkhirInput.value = "";
        originalEndDateISO = '';
    }
});

// --- Event Listener: Submit Form ---
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Validasi dasar
    if (!ulokSelect.value) { alert("Silakan pilih Nomor Ulok."); return; }
    if (!pertambahanHariInput.value) { alert("Silakan isi jumlah hari."); return; }
    if (!alasanHiddenInput.value) { alert("Silakan isi setidaknya satu alasan."); return; }

    // Validasi File PDF
    const file = lampiranPdfInput.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
        alert("Ukuran file terlalu besar! Maksimal 5MB.");
        return;
    }

    // UI Loading State
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'flex';

    // Persiapkan Data
    const formData = new FormData(); // Gunakan FormData untuk file upload
    formData.append('nomor_ulok', ulokSelect.value);
    
    // Ambil data nama_toko dari object ulokData
    const selectedData = ulokData.find(u => u.nomor_ulok === ulokSelect.value);
    formData.append('nama_toko', selectedData ? selectedData.nama_toko : '');
    
    formData.append('pic_name', currentUser.pic_name);
    formData.append('cabang', currentUser.cabang);
    formData.append('pertambahan_hari', pertambahanHariInput.value);
    formData.append('tanggal_spk_akhir_lama', originalEndDateISO); // Kirim format YYYY-MM-DD
    formData.append('tanggal_spk_akhir_baru', newEndDateISO);      // Kirim format YYYY-MM-DD
    formData.append('alasan_spk', alasanHiddenInput.value);

    // Baca file sebagai Base64
    let fileBase64 = null;
    let fileName = null;
    let fileMime = null;

    if (file) {
        try {
            const fileData = await readFileAsBase64(file);
            fileBase64 = fileData.base64;
            fileName = file.name;
            fileMime = file.type;
        } catch (err) {
            alert("Gagal membaca file: " + err.message);
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            return;
        }
    }

    // Buat payload JSON (karena Google Apps Script DoPost lebih mudah handle JSON string di body)
    const payload = {
        nomor_ulok: ulokSelect.value,
        nama_toko: selectedData ? selectedData.nama_toko : '',
        pic_name: currentUser.pic_name,
        cabang: currentUser.cabang,
        pertambahan_hari: pertambahanHariInput.value,
        tanggal_spk_akhir_lama: originalEndDateISO,
        tanggal_spk_akhir_baru: newEndDateISO,
        alasan_spk: alasanHiddenInput.value,
        file_base64: fileBase64,
        file_name: fileName,
        file_mime: fileMime
    };

    try {
        // Kirim ke backend (Action: submitPerpanjangan)
        // Catatan: Pastikan backend Anda menangani parameter 'action=submitPerpanjangan'
        const response = await fetch(`${API_PROXY_URL}?action=submitPerpanjangan`, {
            method: 'POST',
            // headers: { "Content-Type": "application/json" }, // Terkadang text/plain lebih aman untuk CORS di GAS
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            modalMessage.textContent = result.message || "Permintaan berhasil dikirim.";
            successModal.classList.add('show');
        } else {
            throw new Error(result.message || "Terjadi kesalahan di server.");
        }

    } catch (error) {
        alert("Gagal mengirim data: " + error.message);
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
});

// --- Helper: Read File as Base64 ---
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            // result format: "data:application/pdf;base64,....."
            const base64 = result.split(',')[1];
            resolve({ base64: base64 });
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- Event Listener: Modal Button ---
buatLaporanBaruBtn.addEventListener('click', function() {
    successModal.classList.remove('show');
    form.reset();
    
    // Reset elemen custom yang tidak ter-reset otomatis
    ulokSelect.value = "";
    alasanContainer.innerHTML = "";
    alasanHiddenInput.value = "";
    tglSpkAkhirInput.value = "";
    tglSpkAkhirBaruInput.value = "";
    originalEndDateISO = "";
    newEndDateISO = "";
    
    // Tambahkan 1 field alasan kosong lagi
    addAlasanField();
});

// --- Initialize First Alasan Field ---
addAlasanField();

// --- Session Timeout Check ---
function checkSessionTime() {
    try {
        const startHour = 6;
        const endHour = 18;

        const now = new Date();
        const options = { timeZone: "Asia/Jakarta", hour: '2-digit', hour12: false };
        const currentHour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));

        if (currentHour < startHour || currentHour >= endHour) {
            const token = sessionStorage.getItem("authToken");
            if (token) {
                sessionStorage.removeItem("authToken");
                alert("Sesi Anda telah berakhir karena di luar jam operasional (06:00 - 18:00 WIB).");
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    } catch (err) {
        console.error("Gagal menjalankan pengecekan jam sesi:", err);
    }
}