let workbook;

// sentence audio player
let currentAudio = null;
let currentBtn = null;

// intro audio
let introAudio = null;
let introPath = null;

// recording
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let recordingIndex = null;

window.addEventListener("load", init);

function init() {
  document.getElementById("toggleSidebar").addEventListener("click", () => {
    const sb = document.getElementById("sidebar");
    if (window.innerWidth < 992) sb.classList.toggle("visible");
    else sb.classList.toggle("collapsed");
  });

  loadExcel();
}

/* ---------------- Load Excel ---------------- */
async function loadExcel() {
  const buf = await (await fetch("Conversations.xlsx")).arrayBuffer();
  workbook = XLSX.read(buf, { type: "array" });

  const list = document.getElementById("sheetList");
  list.innerHTML = "";

  workbook.SheetNames.forEach((name, i) => {
    const div = document.createElement("div");
    div.className = "sheet-item";
    div.innerHTML = `<span>${name}</span><ion-icon name="chevron-forward-outline"></ion-icon>`;
    div.onclick = () => selectSheet(name, i + 1, div);
    list.appendChild(div);
  });

  selectSheet(workbook.SheetNames[0], 1, list.firstChild);
}

/* ---------------- Select Sheet ---------------- */
function selectSheet(name, folderIndex, el) {
  document
    .querySelectorAll(".sheet-item")
    .forEach((e) => e.classList.remove("active"));
  el.classList.add("active");

  document.getElementById("sheetTitle").textContent = name;
  loadSheet(name, folderIndex);
  setupIntroButton(folderIndex, name);

  if (window.innerWidth < 992)
    document.getElementById("sidebar").classList.remove("visible");
}

/* ---------------- Load rows as cards ---------------- */
function loadSheet(name, folderIndex) {
  const ws = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  let html = "";
  let idx = 1;

  for (let i = 1; i < rows.length; i += 2) {
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

/* ---------------- SENTENCE AUDIO (Toggle) ---------------- */
function togglePlay(folder, name, row, sen, btn) {
  // اگر همان دکمه است => Stop
  if (currentAudio && currentBtn === btn) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    btn.innerHTML = `<ion-icon name="volume-high"></ion-icon>`;
    currentAudio = null;
    currentBtn = null;
    return;
  }

  // هر صوت دیگری را متوقف کن
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    if (currentBtn) {
      currentBtn.innerHTML = `<ion-icon name="volume-high"></ion-icon>`;
    }
  }

  // اگر Intro در حال پخش است، متوقفش کن
  if (introAudio && !introAudio.paused) {
    introAudio.pause();
    introAudio.currentTime = 0;
    resetIntroButton();
  }

  const src = `Files/Audio/${folder}-${name}/${row}-${sen}.mp3`;
  currentAudio = new Audio(src);
  currentBtn = btn;

  btn.innerHTML = `<ion-icon name="stop"></ion-icon>`;

  currentAudio.onended = () => {
    btn.innerHTML = `<ion-icon name="volume-high"></ion-icon>`;
    currentAudio = null;
    currentBtn = null;
  };

  currentAudio.play();
}

/* ---------------- TOGGLE TEXT ---------------- */
function toggleText(i) {
  const el = document.getElementById(`dialog_${i}`);
  el.style.display = el.style.display === "block" ? "none" : "block";
}

/* ---------------- INTRO BUTTON SETUP ---------------- */
async function setupIntroButton(folderIndex, sheetName) {
  const convNum = String(folderIndex).padStart(3, "0"); // 003, 004, ...
  const folderName = encodeURIComponent(sheetName);
  const path = `Files/Audio/${folderIndex}-${folderName}/${convNum}.mp3`;

  const introContainer = document.getElementById("introContainer");
  const introBtn = document.getElementById("introButton");

  introPath = null;
  introAudio = null;
  resetIntroButton();
  introContainer.style.display = "none";

  try {
    const res = await fetch(path, { method: "HEAD" });
    if (res.ok) {
      introPath = path;
      introContainer.style.display = "flex";
      // متن اولیه
      introBtn.innerHTML = `<ion-icon name="play"></ion-icon><span>پخش مقدمه گفتگو</span>`;
    }
  } catch (e) {
    // فایل مقدمه وجود ندارد
    introContainer.style.display = "none";
  }
}

/* ---------------- INTRO PLAY/STOP ---------------- */
function toggleIntro() {
  const introBtn = document.getElementById("introButton");
  if (!introPath) return;

  // اگر در حال پخش است => Stop
  if (introAudio && !introAudio.paused) {
    introAudio.pause();
    introAudio.currentTime = 0;
    resetIntroButton();
    return;
  }

  // هر صوت جمله‌ای در حال پخش است، متوقف شود
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    if (currentBtn) {
      currentBtn.innerHTML = `<ion-icon name="volume-high"></ion-icon>`;
    }
    currentAudio = null;
    currentBtn = null;
  }

  introAudio = new Audio(introPath);
  introBtn.innerHTML = `<ion-icon name="stop"></ion-icon><span>توقف مقدمه</span>`;

  introAudio.onended = () => {
    resetIntroButton();
  };

  introAudio.play();
}

function resetIntroButton() {
  const introBtn = document.getElementById("introButton");
  if (introBtn) {
    introBtn.innerHTML = `<ion-icon name="play"></ion-icon><span>پخش مقدمه گفتگو</span>`;
  }
}

/* ---------------- RECORDING (RED DOT) ---------------- */
async function startRec(index) {
  // اگر در حال ضبط همین کارت هستیم => Stop
  if (
    mediaRecorder &&
    mediaRecorder.state === "recording" &&
    recordingIndex === index
  ) {
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

      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
      mediaRecorder = null;
      recordingIndex = null;
    };

    mediaRecorder.start();

    const dot = document.getElementById(`rec_${index}`);
    if (dot) dot.style.display = "inline-block";
  } catch (err) {
    console.error("Mic access error:", err);
    alert(
      "دسترسی به میکروفن ممکن نیست. لطفاً از http/https (نه file://) استفاده کنید و اجازه میکروفن را بدهید."
    );
  }
}

/* Optional separate stop function (در صورت نیاز) */
function stopRec() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
}

/* ---------------- PLAY RECORDED ---------------- */
function playRecorded(index) {
  const audioEl = document.getElementById(`myAudio_${index}`);
  if (!audioEl || !audioEl.src) {
    alert("هنوز صدایی ضبط نشده است.");
    return;
  }
  audioEl.currentTime = 0;
  audioEl.play();
}
