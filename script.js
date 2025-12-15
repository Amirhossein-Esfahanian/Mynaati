let workbook;
let currentAudio = null;
let currentBtn = null;
let currentSheetName = "";

/* =========================
   Apple-style Toast
========================= */
let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  const body = document.getElementById("toastBody");
  if (!toast || !body) return;

  body.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

/* =========================
   Load Excel
========================= */
window.onload = async () => {
  const buf = await (await fetch("Conversations.xlsx")).arrayBuffer();
  workbook = XLSX.read(buf, { type: "array" });

  const list = document.getElementById("sheetList");
  list.innerHTML = "";

  workbook.SheetNames.forEach((name, i) => {
    const div = document.createElement("div");
    div.className = "sheet-item";
    div.innerHTML = `<ion-icon name="chevron-back-outline"></ion-icon><span>${name}</span>`;
    div.onclick = () => selectSheet(name, i + 1, div);
    list.appendChild(div);
  });

  selectSheet(workbook.SheetNames[0], 1, list.firstChild);

  // restore vocab
  const saved = localStorage.getItem("myVocab");
  if (saved) document.getElementById("vocabList").value = saved;
};

function selectSheet(name, folderIndex, el) {
  document
    .querySelectorAll(".sheet-item")
    .forEach((e) => e.classList.remove("active"));
  el.classList.add("active");
  const intro = document.getElementById("introContainer");
  intro.style.display = "flex";

  intro.querySelector("button").onclick = () =>
    playIntro(folderIndex, encodeURIComponent(name));
  currentSheetName = name;
  document.getElementById("sheetTitle").textContent = name;
  loadSheet(name, folderIndex);

  if (window.innerWidth < 992)
    document.getElementById("sidebar").classList.remove("visible");
}

/* =========================
   Load Dialog Cards
========================= */
function loadSheet(name, folderIndex) {
  const ws = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  let html = "";
  let idx = 1;

  for (let i = 1; i < rows.length - 2; i += 2) {
    const speaker = rows[i]?.[0] || "";
    const en = rows[i]?.[1] || "";
    const fa = rows[i + 1]?.[1] || "";

    const folderName = encodeURIComponent(name);
    const rowNum = String(folderIndex).padStart(3, "0");
    const senNum = String(idx).padStart(2, "0");

    html += `
    <div class="dialog-card">
      <div class="dialog-header">
        <div style="display:flex;align-items:center;gap:6px;">
          <span><b>#${idx}</b> | ${speaker}</span>
          <span id="rec_${idx}" class="rec-dot"></span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn-circle btn-speaker"
            onclick="togglePlay(${folderIndex}, '${folderName}', '${rowNum}', '${senNum}', this)">
            <ion-icon name="volume-high"></ion-icon>
          </button>
          <button class="btn-circle btn-chat"
            onclick="toggleText(${idx})">
            <ion-icon name="chatbubble-ellipses-outline"></ion-icon>
          </button>
          <button class="btn-circle btn-info"
            title="افزودن لغت انتخاب‌شده"
            onclick="addSelectedWord(${idx})">
            <ion-icon name="add-outline"></ion-icon>
          </button>
          <button class="btn-circle btn-mic"
            onclick="startRec(${idx})">
            <ion-icon name="mic"></ion-icon>
          </button>
          <button class="btn-circle btn-play"
            onclick="playRecorded(${idx})">
            <ion-icon name="play"></ion-icon>
          </button>
        </div>
      </div>
      <div class="dialog-body" id="dialog_${idx}">
        <div class="lang-box en"><b>EN:</b> ${en}</div>
        <div class="lang-box fa"><b>FA:</b> ${fa}</div>
        <audio id="myAudio_${idx}" controls style="display:none;margin-top:8px"></audio>
      </div>
    </div>
    `;
    idx++;
  }

  document.getElementById("tableContainer").innerHTML = html;
}

/* =========================
   Audio Play
========================= */
function togglePlay(folder, name, row, sen, btn) {
  if (currentAudio && currentBtn === btn) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    btn.innerHTML = `<ion-icon name="volume-high"></ion-icon>`;
    currentAudio = null;
    currentBtn = null;
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    if (currentBtn)
      currentBtn.innerHTML = `<ion-icon name="volume-high"></ion-icon>`;
  }

  const srcDash = `Files/Audio/${folder}-${name}/${row}-${sen}.mp3`;
  const srcUnderscore = `Files/Audio/${folder}-${name}/${row}_${sen}.mp3`;

  currentAudio = new Audio(srcDash);
  currentBtn = btn;

  btn.innerHTML = `<ion-icon name="stop"></ion-icon>`;

  // اگر با - لود نشد، با _ امتحان کن
  currentAudio.onerror = () => {
    currentAudio = new Audio(srcUnderscore);
    console.log("-error");
    currentAudio.onended = () => {
      btn.innerHTML = `<ion-icon name="volume-high"></ion-icon>`;
      currentAudio = null;
      currentBtn = null;
    };

    currentAudio.play();
  };

  currentAudio.onended = () => {
    btn.innerHTML = `<ion-icon name="volume-high"></ion-icon>`;
    currentAudio = null;
    currentBtn = null;
  };

  currentAudio.play();
}

let introAudio = null;
let introPlaying = false;

function updateIntroButton(isPlaying) {
  const btn = document.getElementById("introButton");
  if (!btn) return;

  btn.classList.toggle("playing", isPlaying);
  btn.querySelector("ion-icon").name = isPlaying ? "stop" : "play";
}

function playIntro(folderIndex, folderName) {
  const introNum = String(folderIndex).padStart(3, "0");
  const src = `Files/Audio/${folderIndex}-${folderName}/${introNum}.mp3`;

  // اگر در حال پخش است → stop
  if (introAudio && introPlaying) {
    introAudio.pause();
    introAudio.currentTime = 0;
    introPlaying = false;
    updateIntroButton(false);
    return;
  }

  introAudio = new Audio(src);
  introPlaying = true;
  updateIntroButton(true);

  introAudio.onended = () => {
    introPlaying = false;
    updateIntroButton(false);
  };

  introAudio.onerror = () => {
    showToast("فایل مقدمه گفتگو پیدا نشد");
    introPlaying = false;
    updateIntroButton(false);
  };

  introAudio.play();
}

/* =========================
   Toggle EN / FA
========================= */
function toggleText(i) {
  const el = document.getElementById(`dialog_${i}`);
  el.style.display = el.style.display === "block" ? "none" : "block";
}

/* =========================
   Vocabulary System
========================= */
function addSelectedWord(sentenceIndex) {
  const selection = window.getSelection().toString().trim();
  if (!selection) {
    showToast("اول یک کلمه یا عبارت را انتخاب کن");
    return;
  }

  const ta = document.getElementById("vocabList");
  const line = `[${currentSheetName} | جمله ${sentenceIndex}] ${selection}\n`;
  ta.value += line;

  localStorage.setItem("myVocab", ta.value);
  showToast("لغت اضافه شد 📒");
}

function toggleVocabPanel() {
  const panel = document.getElementById("vocabPanel");
  panel.style.display = panel.style.display === "block" ? "none" : "block";
}

function copyVocab() {
  const ta = document.getElementById("vocabList");
  if (!ta.value.trim()) {
    showToast("لیست لغات خالی است");
    return;
  }
  navigator.clipboard.writeText(ta.value);
  showToast("لغات کپی شد ✅");
}

function clearVocab() {
  if (!document.getElementById("vocabList").value.trim()) return;
  if (confirm("همه لغات پاک شوند؟")) {
    document.getElementById("vocabList").value = "";
    localStorage.removeItem("myVocab");
    showToast("لغات پاک شدند 🗑");
  }
}

/* 🔴 Close vocab panel when clicking outside */
document.addEventListener("click", (e) => {
  const panel = document.getElementById("vocabPanel");
  const btn = document.getElementById("toggleVocab");

  if (!panel || panel.style.display !== "block") return;

  if (!panel.contains(e.target) && !btn.contains(e.target)) {
    panel.style.display = "none";
  }
});

/* =========================
   Recording System
========================= */
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let recordingIndex = null;

async function startRec(index) {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    recordingIndex = index;

    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);

      const audioEl = document.getElementById(`myAudio_${recordingIndex}`);
      if (audioEl) {
        audioEl.src = url;
        audioEl.style.display = "block";
      }

      const dot = document.getElementById(`rec_${recordingIndex}`);
      if (dot) dot.style.display = "none";

      mediaStream.getTracks().forEach((t) => t.stop());
      mediaRecorder = null;
      recordingIndex = null;
    };

    mediaRecorder.start();
    document.getElementById(`rec_${index}`).style.display = "inline-block";
  } catch {
    showToast("دسترسی میکروفون امکان‌پذیر نیست");
  }
}

function playRecorded(index) {
  const audioEl = document.getElementById(`myAudio_${index}`);
  if (!audioEl || !audioEl.src) {
    showToast("صدایی ضبط نشده است");
    return;
  }
  audioEl.currentTime = 0;
  audioEl.play();
}

/* =========================
   Sidebar Toggle
========================= */
document.getElementById("toggleSidebar").onclick = () => {
  const sb = document.getElementById("sidebar");
  if (window.innerWidth < 992) sb.classList.toggle("visible");
  else sb.classList.toggle("collapsed");
};

/* =========================
   Dark Mode Toggle (FIX)
========================= */
const darkBtn = document.getElementById("darkToggle");

// restore previous mode
if (localStorage.getItem("darkMode") === "on") {
  document.body.classList.add("dark");
}

darkBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  // save preference
  if (document.body.classList.contains("dark")) {
    localStorage.setItem("darkMode", "on");
    showToast("دارک مود فعال شد 🌙");
  } else {
    localStorage.setItem("darkMode", "off");
    showToast("لایت مود فعال شد ☀️");
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id !== "sheetSearch") return;

  const q = e.target.value.toLowerCase();
  document.querySelectorAll(".sheet-item").forEach((item) => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(q) ? "flex" : "none";
  });
});
