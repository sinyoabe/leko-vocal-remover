# 🎤 LEKO Vocal Remover (YouTube Karaoke Extension)

Ekstensi Microsoft Edge / Google Chrome untuk memisahkan vokal dan musik instrumen secara *real-time* pada video YouTube dengan kualitas jernih, sinkronisasi presisi, serta mempertahankan instrumen bass dan drum secara utuh.

## ✨ Fitur Utama
- **Pemisahan AI Kualitas Tinggi:** Menggunakan model `htdemucs` (`--two-stems vocals`) untuk menghasilkan instrumen musik penuh tanpa kehilangan suara bass & drum.
- **Sinkronisasi Presisi:** Audio instrumen dan vokal otomatis mengikuti posisi waktu (*timeline*), *play*, dan *pause* video YouTube.
- **Kontrol Karaoke Langsung:** Tombol *toggle* untuk mematikan/menyalakan suara vokal penyanyi asli (`Vokal: ON/OFF`) serta *slider* volume musik.

---

## 🛠️ Prasyarat Sistem (Wajib Diinstal di Komputer)

1. **Python (Versi 3.10 - 3.14):** Unduh di [python.org](https://www.python.org/downloads/) *(Centang **"Add Python to PATH"** saat instalasi)*.
2. **FFmpeg:** Wajib untuk konversi audio. Instal via Command Prompt (CMD):
   ```cmd
   winget install Gyan.FFmpeg
