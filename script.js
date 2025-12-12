let workbook;
let currentAudio = null;
let currentBtn = null;

/* --------- Load Excel --------- */
window.onload = async () => {
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
};

function selectSheet(name, folderIndex, el) {
  document
    .querySelectorAll(".sheet-item")
    .forEach((e) => e.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("sheetTitle").textContent = name;
  loadSheet(name, folderIndex);
  if (window.innerWidth < 992)
    document.getElementById("sidebar").classList.remove("visible");
}

/* --------- Load rows into cards --------- */
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

/* --------- Audio play toggle --------- */
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

/* --------- Toggle text (EN/FA) --------- */
function toggleText(i) {
  const el = document.getElementById(`dialog_${i}`);
  el.style.display = el.style.display === "block" ? "none" : "block";
}

/* --------- Recording System --------- */
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let recordingIndex = null;

async function startRec(index) {
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

      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());

      mediaRecorder = null;
      recordingIndex = null;
    };

    mediaRecorder.start();
    const dot = document.getElementById(`rec_${index}`);
    if (dot) dot.style.display = "inline-block";
  } catch (err) {
    console.error("Mic access error:", err);
    alert(
      "دسترسی میکروفون امکان‌پذیر نیست. لطفا مرورگر شما اجازه دهد یا سایت را از طریق http/https باز کنید."
    );
  }
}

/* Play recorded audio */
function playRecorded(index) {
  const audioEl = document.getElementById(`myAudio_${index}`);
  if (!audioEl || !audioEl.src) {
    alert("صدایی ضبط نشده است.");
    return;
  }
  audioEl.currentTime = 0;
  audioEl.play();
}

/* Sidebar toggle */
document.getElementById("toggleSidebar").onclick = () => {
  const sb = document.getElementById("sidebar");
  if (window.innerWidth < 992) sb.classList.toggle("visible");
  else sb.classList.toggle("collapsed");
};
