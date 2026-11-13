let instAudio = new Audio();
let vocalAudio = new Audio();
let isKaraokeMode = false;
let syncTimer = null;

function showToast(message, isError = false) {
  let toast = document.getElementById("ytd-vocal-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "ytd-vocal-toast";
    toast.style.cssText = "position: fixed; bottom: 20px; left: 20px; z-index: 9999; padding: 10px 16px; border-radius: 8px; color: #fff; font-size: 13px; font-family: Roboto, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5); transition: opacity 0.3s;";
    document.body.appendChild(toast);
  }
  toast.style.background = isError ? "#cc0000" : "#0f9d58";
  toast.innerText = message;
  toast.style.opacity = "1";
  setTimeout(() => { toast.style.opacity = "0"; }, 4000);
}

function startKaraokeEngine() {
  const ytVideo = document.querySelector("video");
  if (!ytVideo) return;

  instAudio.pause();
  vocalAudio.pause();

  const uniqueToken = Date.now();
  instAudio.src = `http://127.0.0.1:5050/download/no_vocals.wav?t=${uniqueToken}`;
  vocalAudio.src = `http://127.0.0.1:5050/download/vocals.wav?t=${uniqueToken}`;

  instAudio.preload = "auto";
  vocalAudio.preload = "auto";

  instAudio.load();
  vocalAudio.load();

  instAudio.volume = 1.0;
  vocalAudio.volume = 0.0;

  if (syncTimer) clearInterval(syncTimer);

  syncTimer = setInterval(() => {
    if (!isKaraokeMode || !ytVideo) return;

    ytVideo.muted = true; // Video asli YouTube di-mute total

    if (ytVideo.paused) {
      if (!instAudio.paused) instAudio.pause();
      if (!vocalAudio.paused) vocalAudio.pause();
    } else {
      if (instAudio.paused) instAudio.play().catch(() => {});
      if (vocalAudio.paused) vocalAudio.play().catch(() => {});
    }

    // Toleransi koreksi posisi time sync (0.15 detik) untuk mencegah stutter/terputus-putus
    if (Math.abs(instAudio.currentTime - ytVideo.currentTime) > 0.15) {
      instAudio.currentTime = ytVideo.currentTime;
      vocalAudio.currentTime = ytVideo.currentTime;
    }
  }, 150);
}

function createKaraokeControlPanel() {
  const existingPanel = document.getElementById("leko-karaoke-panel");
  if (existingPanel) existingPanel.remove();

  const panel = document.createElement("div");
  panel.id = "leko-karaoke-panel";
  panel.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05));
    padding: 6px 14px;
    border-radius: 18px;
    margin-left: 12px;
    font-family: Roboto, sans-serif;
    font-size: 13px;
    color: var(--yt-spec-text-primary, #0f0f0f);
  `;

  panel.innerHTML = `
    <button id="toggle-vocal-btn" style="background: #cc0000; color: white; border: none; padding: 6px 12px; border-radius: 12px; cursor: pointer; font-weight: 500;">
      🎤 Vokal: OFF
    </button>
    <div style="display: flex; align-items: center; gap: 6px;">
      <span>🎵 Musik</span>
      <input type="range" id="volume-slider" min="0" max="100" value="100" style="width: 70px; cursor: pointer;">
    </div>
  `;

  const toggleBtn = panel.querySelector("#toggle-vocal-btn");
  toggleBtn.onclick = () => {
    if (vocalAudio.volume > 0) {
      vocalAudio.volume = 0;
      toggleBtn.innerText = "🎤 Vokal: OFF";
      toggleBtn.style.background = "#cc0000";
    } else {
      vocalAudio.volume = 1;
      toggleBtn.innerText = "🎤 Vokal: ON";
      toggleBtn.style.background = "#0f9d58";
    }
  };

  const slider = panel.querySelector("#volume-slider");
  slider.oninput = (e) => {
    instAudio.volume = e.target.value / 100;
  };

  return panel;
}

function injectVocalButton() {
  if (document.getElementById("ytd-vocal-btn") || document.getElementById("leko-karaoke-panel")) return;

  const targetContainer = document.querySelector("#owner") || document.querySelector("#top-row #actions #actions-inner");
  if (!targetContainer) return;

  const logoUrl = chrome.runtime.getURL("logo.png");

  const btn = document.createElement("button");
  btn.id = "ytd-vocal-btn";
  btn.style.cssText = `
    display: inline-flex; 
    align-items: center; 
    gap: 8px; 
    background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05)); 
    color: var(--yt-spec-text-primary, #0f0f0f); 
    border: none; 
    padding: 0 16px; 
    height: 36px; 
    border-radius: 18px; 
    font-size: 14px; 
    font-weight: 500; 
    cursor: pointer; 
    margin-left: 12px; 
    transition: background 0.2s; 
    font-family: Roboto, sans-serif;
  `;
  
  btn.innerHTML = `<img src="${logoUrl}" style="height: 20px; width: auto; object-fit: contain;"><span>LEKO Vocal Remover</span>`;
  
  btn.onclick = async () => {
    btn.disabled = true;
    btn.style.opacity = "0.6";
    btn.innerHTML = `<img src="${logoUrl}" style="height: 20px; width: auto; object-fit: contain;"><span>Memproses...</span>`;
    showToast("LEKO sedang memisahkan vokal...");

    try {
      const response = await fetch("http://127.0.0.1:5050/process-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: window.location.href })
      });
      const data = await response.json();
      if (data.status === "success") {
        showToast("Menyiapkan Mode Karaoke...");
        
        isKaraokeMode = true;
        startKaraokeEngine();

        showToast("Modus Karaoke LEKO Aktif!");

        const panel = createKaraokeControlPanel();
        if (panel) targetContainer.appendChild(panel);

        btn.remove();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      showToast("Gagal memproses audio! Pastikan server aktif.", true);
      btn.innerHTML = `<img src="${logoUrl}" style="height: 20px; width: auto; object-fit: contain;"><span>LEKO Vocal Remover</span>`;
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  };

  targetContainer.appendChild(btn);
}

setInterval(injectVocalButton, 1500);