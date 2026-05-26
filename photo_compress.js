(function () {
  const DEFAULT_MAX_SIZE_BYTES = 8 * 1024 * 1024;
  const DEFAULT_MAX_DIMENSION = 1280;
  const DEFAULT_QUALITY = 0.72;

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string" && reader.result) {
          resolve(reader.result);
        } else {
          reject(new Error("File tidak menghasilkan data yang valid."));
        }
      };
      reader.onerror = () => reject(new Error("Browser gagal membaca file. Pilih ulang foto lalu coba lagi."));
      reader.onabort = () => reject(new Error("Pembacaan file dibatalkan."));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Format foto tidak bisa diproses. Gunakan JPG/PNG atau ambil ulang foto."));
      img.src = dataUrl;
    });
  }

  async function compressImageFile(file, options = {}) {
    if (!file) {
      throw new Error("File foto belum dipilih.");
    }

    if (!file.type || !file.type.startsWith("image/")) {
      throw new Error("File harus berupa gambar.");
    }

    const maxSizeBytes = options.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;
    if (file.size > maxSizeBytes) {
      throw new Error("Ukuran foto terlalu besar. Kompres foto terlebih dahulu atau ambil ulang dengan resolusi lebih kecil.");
    }

    const originalDataUrl = await readFileAsDataURL(file);
    const img = await loadImage(originalDataUrl);
    const maxDimension = options.maxDimension || DEFAULT_MAX_DIMENSION;
    const quality = options.quality || DEFAULT_QUALITY;
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return originalDataUrl;
    }

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  }

  window.compressImageFile = compressImageFile;
  window.convertImageFileToBase64 = async function (file, options = {}) {
    const dataUrl = await compressImageFile(file, options);
    return dataUrl.split(",")[1] || "";
  };
})();
