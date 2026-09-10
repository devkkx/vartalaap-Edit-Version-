let selectedUser = localStorage.getItem("selectedUser") || null;
let activeDocId = null;
let activeDocName = null;
let recentTextMessages = [];

// ================= LOGIN =================
let username = localStorage.getItem("username");
if (username) username = username.trim();

if (!username) {
  window.location.href = "login.html";
}

// ================= COLOR =================
let userColor = localStorage.getItem("chatColor") || "";

// ================= SOCKET =================
const wsProtocol = location.protocol === "https:" ? "wss://" : "ws://";
let socket = new WebSocket(wsProtocol + location.host + "/chat");

socket.onopen = () => {
  console.log("WebSocket connected");
  socket.send("JOIN:" + username);
};

socket.onerror = (e) => console.error("WebSocket error", e);
socket.onclose = () => console.warn("WebSocket closed");

// ================= RECEIVE =================
socket.onmessage = (e) => {
  // ✅ USERS LIST (CLICKABLE)
  if (e.data.startsWith("USERS:")) {
    let users = e.data.replace("USERS:", "").split(",");
    let usersDiv = document.getElementById("users");

    usersDiv.innerHTML = "<b>Online Users</b><br>";

    users.forEach((u) => {
      if (u === username) return;

      let el = document.createElement("div");
      el.innerText = u;
      el.classList.add("user-item");

      el.style.cursor = "pointer";
      el.style.padding = "5px";
      el.style.borderRadius = "6px";

      if (u === selectedUser) {
        el.style.background = "#d1f0ff";
      }

      el.onclick = () => {
        selectedUser = u;
        localStorage.setItem("selectedUser", u);

        document.querySelectorAll(".user-item").forEach((x) => {
          x.style.background = "transparent";
        });

        el.style.background = "#d1f0ff";
        loadMessages();
      };

      usersDiv.appendChild(el);
    });

    return;
  }

  // ✅ SYSTEM MESSAGE
  if (e.data.startsWith("SYSTEM|")) {
    let div = document.createElement("div");
    div.classList.add("message", "left");
    div.innerText = e.data.split("|")[1];

    document.getElementById("messages").appendChild(div);
    div.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // ✅ NORMAL / AI / PERSONAL MESSAGE
  let parts = e.data.split("|");

  if (parts.length === 4) {
    let mode = parts[0];
    let sender = parts[1];
    let receiver = parts[2];
    let text = parts[3];

    if (mode === "PERSONAL") {
      if (!(sender === username || receiver === username)) return;
    }

    if (sender === username) return;

    checkConflictDetection(text, sender);
    renderMessageItem({ sender, content: text, mode, receiver, type: 'text' }, false);
    return;
  }

  if (parts.length === 3) {
    let mode = parts[0];
    let sender = parts[1];
    let text = parts[2];

    if (sender === username) return;

    checkConflictDetection(text, sender);
    renderMessageItem({ sender, content: text, mode, type: 'text' }, false);
  }
};

// ================= CONFLICT DETECTION MODULE =================
function checkConflictDetection(text, sender) {
  let lowerNew = text.toLowerCase();
  for (let oldText of recentTextMessages) {
    let lowerOld = oldText.toLowerCase();
    if ((lowerOld.includes("pm") || lowerOld.includes("am") || lowerOld.includes("clock")) &&
        (lowerNew.includes("pm") || lowerNew.includes("am") || lowerNew.includes("clock"))) {
      if (lowerOld !== lowerNew) {
        showAlertBanner(`⚠️ Possible conflicting information detected!\nPrevious: "${oldText}" vs New: "${text}"`);
        break;
      }
    }
  }
  recentTextMessages.push(text);
  if (recentTextMessages.length > 20) recentTextMessages.shift();
}

function showAlertBanner(msg) {
  let banner = document.getElementById("alertBanner");
  if (banner) {
    banner.innerText = msg;
    banner.style.display = "block";
    setTimeout(() => { banner.style.display = "none"; }, 8000);
  }
}

// ================= SEND =================
function sendMessage() {
  if (socket.readyState !== WebSocket.OPEN) {
    alert("Not connected to server");
    return;
  }

  let input = document.getElementById("message");
  let msg = input.value.trim();
  let mode = document.getElementById("mode").value;
  let colorSelect = document.getElementById("color");
  let selectedColor = colorSelect ? colorSelect.value : "";

  if (!msg) return;

  // MODULE 1: CONTEXT MISALIGNMENT CHECK
  let lowerMsg = msg.toLowerCase();
  if (mode === "WORK" && (lowerMsg.includes("party") || lowerMsg.includes("pub") || lowerMsg.includes("hangout"))) {
    if (!confirm("⚠️ Context Warning: This message sounds casual for Work mode. Send anyway?")) {
      return;
    }
  }

  if (mode === "PERSONAL" && !selectedUser) {
    alert("Select an online user for personal chat");
    return;
  }

  if (selectedColor) {
    userColor = selectedColor;
    localStorage.setItem("chatColor", selectedColor);
  }

  let payload;
  if (mode === "PERSONAL") {
    payload = mode + "|" + username + "|" + selectedUser + "|" + msg;
  } else {
    payload = mode + "|" + username + "|" + msg;
  }

  socket.send(payload);

  renderMessageItem({ sender: username, content: msg, mode, receiver: selectedUser, type: 'text' }, true);
  input.value = "";
}

// ================= FILTER =================
function filterMode() {
  loadMessages();
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("username");
  localStorage.removeItem("chatColor");
  localStorage.removeItem("selectedUser");
  window.location.href = "login.html";
}

// ================= UNIFIED MESSAGE & FILE LOADER =================
async function loadMessages() {
  const currentUser = localStorage.getItem("username");
  const activeUser = selectedUser;
  const currentMode = document.getElementById("mode")?.value || "WORK";
  const currentFilter = document.getElementById("filter")?.value || "ALL";

  try {
    const [msgRes, fileRes] = await Promise.all([
      fetch("/messages").then(res => res.json()).catch(() => []),
      fetch("/files").then(res => res.json()).catch(() => [])
    ]);

    let combined = [];

    msgRes.forEach(m => {
      combined.push({
        type: 'text',
        id: m.id,
        sender: m.sender,
        receiver: m.receiver,
        content: m.content,
        mode: m.mode,
        timestamp: m.timestamp
      });
      if (m.content) recentTextMessages.push(m.content);
    });

    fileRes.forEach(f => {
      combined.push({
        type: 'file',
        id: f.id,
        sender: f.sender,
        receiver: f.receiver,
        fileName: f.fileName,
        fileType: f.fileType,
        filePath: f.filePath,
        mode: f.mode,
        timestamp: f.uploadTime
      });
    });

    let container = document.getElementById("messages");
    container.innerHTML = "";

    combined.forEach(item => {
      if (currentFilter !== "ALL" && item.mode !== currentFilter) return;

      if (currentMode === "PERSONAL") {
        if (item.mode !== "PERSONAL") return;
        if (!activeUser) return;
        if (!((item.sender === currentUser && item.receiver === activeUser) ||
              (item.sender === activeUser && item.receiver === currentUser))) return;
      } else {
        if (item.mode === "PERSONAL") return;
        if (item.mode !== currentMode) return;
      }

      if (item.type === 'text') {
        renderMessageItem(item, item.sender === currentUser);
      } else if (item.type === 'file') {
        showFileMessage(item, item.sender === currentUser);
      }
    });

    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error("Error loading chat items:", err);
  }
}

function renderMessageItem(msg, mine) {
  let div = document.createElement("div");
  div.classList.add("message", mine ? "right" : "left");
  div.setAttribute("data-mode", msg.mode);

  let textContent = msg.sender + ": " + msg.content + " (" + msg.mode + ")";
  if (msg.mode === "PERSONAL") {
    textContent = (mine ? "To " + msg.receiver : msg.sender) + ": " + msg.content + " (private)";
  }

  div.innerHTML = `<div>${textContent}</div>`;

  let actionsDiv = document.createElement("div");
  actionsDiv.style.marginTop = "4px";
  actionsDiv.style.fontSize = "10px";

  let taskBtn = document.createElement("button");
  taskBtn.className = "doc-btn";
  taskBtn.innerText = "📌 Task";
  taskBtn.onclick = () => quickCreateTask(msg.content, msg.mode);

  let decBtn = document.createElement("button");
  decBtn.className = "doc-btn";
  decBtn.innerText = "🧠 Decision";
  decBtn.onclick = () => quickRecordDecision(msg.content, msg.sender, msg.mode);

  actionsDiv.appendChild(taskBtn);
  actionsDiv.appendChild(decBtn);
  div.appendChild(actionsDiv);

  if (msg.mode === "AI") {
    div.style.background = "#ede7f6";
  } else if (mine && userColor) {
    div.style.background = userColor;
  }

  let container = document.getElementById("messages");
  container.appendChild(div);
  div.scrollIntoView({ behavior: "smooth" });
}

// ================= TASK MANAGEMENT MODULE =================
function toggleTaskDrawer() {
  let drawer = document.getElementById("taskDrawer");
  if (drawer.style.display === "block") {
    drawer.style.display = "none";
  } else {
    drawer.style.display = "block";
    loadTasksList();
  }
}

async function loadTasksList() {
  try {
    let mode = document.getElementById("mode").value;
    let res = await fetch("/tasks?mode=" + mode);
    let tasks = await res.json();
    let container = document.getElementById("taskList");
    container.innerHTML = "";

    if (tasks.length === 0) {
      container.innerHTML = "<p style='font-size:12px; color:#666;'>No active tasks found.</p>";
      return;
    }

    tasks.forEach(t => {
      let div = document.createElement("div");
      div.className = "task-item" + (t.status === "COMPLETED" ? " completed" : "");
      div.innerHTML = `
        <div>
          <input type="checkbox" ${t.status === "COMPLETED" ? "checked" : ""} onchange="toggleTaskStatus(${t.id}, this.checked)" />
          <strong>${t.title}</strong> ${t.assignedTo ? "(Assigned: " + t.assignedTo + ")" : ""} ${t.deadline ? "[" + t.deadline + "]" : ""}
        </div>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

async function toggleTaskStatus(taskId, completed) {
  try {
    await fetch(`/tasks/${taskId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: completed ? "COMPLETED" : "PENDING" })
    });
    loadTasksList();
  } catch (err) {
    console.error(err);
  }
}

async function quickCreateTask(text, mode) {
  let title = prompt("Task Description:", text);
  if (!title) return;
  let assignedTo = prompt("Assign To (username):", "Rahul");
  let deadline = prompt("Deadline (e.g. Friday):", "Friday");

  await fetch("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title,
      assignedTo: assignedTo,
      assignedBy: username,
      deadline: deadline,
      mode: mode,
      status: "PENDING"
    })
  });

  alert("📌 Task created successfully!");
}

async function createTaskManual(e) {
  e.preventDefault();
  let title = document.getElementById("taskTitle").value;
  let assignee = document.getElementById("taskAssignee").value;
  let deadline = document.getElementById("taskDeadline").value;
  let mode = document.getElementById("mode").value;

  await fetch("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title,
      assignedTo: assignee,
      assignedBy: username,
      deadline: deadline,
      mode: mode,
      status: "PENDING"
    })
  });

  document.getElementById("taskTitle").value = "";
  document.getElementById("taskAssignee").value = "";
  document.getElementById("taskDeadline").value = "";
  loadTasksList();
}

// ================= REMINDER SECTION & NOTIFICATION MODULE =================
function toggleReminderDrawer() {
  let drawer = document.getElementById("reminderDrawer");
  if (drawer.style.display === "block") {
    drawer.style.display = "none";
  } else {
    drawer.style.display = "block";
    loadRemindersList();
  }
}

async function loadRemindersList() {
  try {
    let res = await fetch("/reminders");
    let reminders = await res.json();
    let container = document.getElementById("reminderList");
    container.innerHTML = "";

    if (reminders.length === 0) {
      container.innerHTML = "<p style='font-size:12px; color:#666;'>No active reminders scheduled.</p>";
      return;
    }

    reminders.forEach(r => {
      let div = document.createElement("div");
      div.className = "task-item";
      div.innerHTML = `
        <div>
          ⏰ <strong>${r.title}</strong> [${r.reminderTime}] ${r.assignedTo ? "(" + r.assignedTo + ")" : ""}
        </div>
        <button class="doc-btn" onclick="dismissReminder(${r.id})">Dismiss</button>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

async function createReminderManual(e) {
  e.preventDefault();
  let title = document.getElementById("remTitle").value;
  let time = document.getElementById("remTime").value;
  let assignee = document.getElementById("remAssignee").value;
  let mode = document.getElementById("mode").value;

  await fetch("/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title,
      reminderTime: time,
      assignedTo: assignee || username,
      mode: mode,
      status: "ACTIVE"
    })
  });

  document.getElementById("remTitle").value = "";
  document.getElementById("remTime").value = "";
  document.getElementById("remAssignee").value = "";
  loadRemindersList();
  alert("🔔 Reminder scheduled successfully!");
}

async function dismissReminder(id) {
  try {
    await fetch(`/reminders/${id}/dismiss`, { method: "POST" });
    loadRemindersList();
  } catch (err) {
    console.error(err);
  }
}

// Background Reminder Check Scanner
async function checkReminderScanner() {
  try {
    let res = await fetch("/reminders");
    let reminders = await res.json();
    if (reminders.length > 0) {
      let r = reminders[0];
      showAlertBanner(`🔔 Reminder Alert: "${r.title}" scheduled for ${r.reminderTime}`);
    }
  } catch (err) {}
}

setInterval(checkReminderScanner, 20000);

// ================= DECISION MEMORY MODULE =================
function toggleDecisionModal() {
  let modal = document.getElementById("decisionModal");
  if (modal.style.display === "block") {
    modal.style.display = "none";
  } else {
    modal.style.display = "block";
    loadDecisionsList();
  }
}

async function loadDecisionsList() {
  try {
    let res = await fetch("/decisions");
    let decisions = await res.json();
    let container = document.getElementById("decisionList");
    container.innerHTML = "<b>Stored Project Decisions:</b><br>";

    decisions.forEach(d => {
      let div = document.createElement("div");
      div.style.fontSize = "12px";
      div.style.margin = "4px 0";
      div.style.padding = "4px";
      div.style.background = "#f9f9f9";
      div.style.borderRadius = "4px";
      div.innerHTML = `📌 <b>${d.topic || 'Decision'}</b>: ${d.decisionText} <i>(By: ${d.decidedBy || 'Team'})</i>`;
      container.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

async function quickRecordDecision(text, sender, mode) {
  let topic = prompt("Decision Topic:", "Architecture / Tech Stack");
  if (!topic) return;

  await fetch("/decisions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: topic,
      decisionText: text,
      decidedBy: sender,
      mode: mode
    })
  });

  alert("🧠 Decision recorded in project memory!");
}

async function askDecisionMemory() {
  let q = document.getElementById("decisionQuery").value;
  if (!q) return;

  let area = document.getElementById("decisionAnswer");
  area.innerText = "Querying decision memory AI...";

  try {
    let res = await fetch("/decisions/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q })
    });
    let data = await res.json();
    if (data.success) {
      area.innerHTML = `<b>AI Decision Recall:</b><br>${data.answer}`;
    } else {
      area.innerText = "Error: " + data.error;
    }
  } catch (err) {
    area.innerText = "Failed to query decision memory.";
  }
}

// ================= INTELLIGENT DOCUMENT MODULE =================
function showFileMessage(file, mine) {
  let div = document.createElement("div");
  div.classList.add("message", mine ? "right" : "left");

  let html = "";

  if (file.fileType && file.fileType.startsWith("image")) {
    html += `<img src="${file.filePath}" class="chat-image" style="max-width:200px; border-radius:8px; display:block; margin-bottom:5px;">`;
  }

  html += `
    <div class="file-box">
        <div>📄 <b>${file.fileName}</b></div>
        <div style="margin-top:4px;">
            <a href="${file.filePath}" target="_blank" download style="color:#0066cc; font-weight:bold; font-size:12px; margin-right:8px;">Download</a>
            <button class="doc-btn" onclick="summarizeDoc(${file.id})">📄 Summarize</button>
            <button class="doc-btn" onclick="openDocQA(${file.id}, '${file.fileName}')">❓ Ask AI Doc</button>
        </div>
    </div>
  `;

  div.innerHTML = html;
  document.getElementById("messages").appendChild(div);
  div.scrollIntoView({ behavior: "smooth" });
}

async function summarizeDoc(fileId) {
  alert("Analyzing document & generating AI summary...");
  try {
    let res = await fetch(`/files/${fileId}/summarize`, { method: "POST" });
    let data = await res.json();
    if (data.success) {
      alert(`📄 AI Summary for ${data.fileName}:\n\n${data.summary}`);
    } else {
      alert("Summarization failed: " + data.error);
    }
  } catch (err) {
    alert("Error summarizing file.");
  }
}

function openDocQA(fileId, fileName) {
  activeDocId = fileId;
  activeDocName = fileName;
  document.getElementById("docModalTitle").innerText = "📄 Q&A: " + fileName;
  document.getElementById("docResultArea").innerText = "Ask any question about this document below!";
  document.getElementById("docModal").style.display = "block";
}

function closeDocModal() {
  document.getElementById("docModal").style.display = "none";
}

async function submitDocQuestion() {
  let q = document.getElementById("docQuestion").value;
  if (!q || !activeDocId) return;

  let area = document.getElementById("docResultArea");
  area.innerText = "Asking AI about document...";

  try {
    let res = await fetch(`/files/${activeDocId}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q })
    });
    let data = await res.json();
    if (data.success) {
      area.innerHTML = `<b>Q: ${q}</b><br><br><b>AI Answer:</b> ${data.answer}`;
    } else {
      area.innerText = "Error: " + data.error;
    }
  } catch (err) {
    area.innerText = "Failed to query document.";
  }
}

// ================= ENTER SEND =================
document.getElementById("message").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// ================= EMOJI PICKER =================
const emojiBtn = document.getElementById("emojiBtn");
const emojiBox = document.getElementById("emojiBox");
const input = document.getElementById("message");

const emojis = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😍", "😘", "😗", "😙", "😚", "😋", "😛",
  "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😒",
  "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩",
  "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "<ctrl42>",
  "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫",
  "🤥", "😶", "😐", "😑", "😬", "🙄", "😴", "🤤", "😪", "😵",
  "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "👍", "👎",
  "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤝", "🙏", "💪",
  "👀", "👂", "👃", "🧠", "🫀", "❤️", "🧡", "💛", "💚", "💙",
  "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗",
  "💖", "💘", "💝", "🔥", "✨", "🌟", "💫", "⭐", "🎉", "🎊",
  "🎈", "🎁", "🎂", "🍕", "🍔", "🍟", "🍩", "🍺", "☕", "🍎",
  "🍓", "⚽", "🏀", "🏏", "🎮", "🚗", "✈️", "🌍", "🌈", "⛅",
  "☀️", "🌙"
];

if (emojiBtn && emojiBox) {
  emojiBtn.onclick = () => {
    emojiBox.style.display = emojiBox.style.display === "block" ? "none" : "block";
  };

  emojis.forEach((e) => {
    let span = document.createElement("span");
    span.innerText = e;
    span.onclick = () => {
      input.value += e;
      input.focus();
    };
    emojiBox.appendChild(span);
  });

  document.addEventListener("click", (e) => {
    if (!emojiBox.contains(e.target) && e.target !== emojiBtn) {
      emojiBox.style.display = "none";
    }
  });
}

// ================= FILE UPLOAD =================
const fileBtn = document.getElementById("fileBtn");
const fileInput = document.getElementById("fileInput");

if (fileBtn && fileInput) {
  fileBtn.onclick = () => fileInput.click();

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;

    let formData = new FormData();
    formData.append("file", file);
    formData.append("sender", username);
    formData.append("receiver", selectedUser || "");
    formData.append("mode", document.getElementById("mode").value);

    try {
      let response = await fetch("/upload", {
        method: "POST",
        body: formData,
      });

      let text = await response.text();
      let data = JSON.parse(text);

      if (!data.success) {
        alert("File upload failed: " + (data.error || "Unknown error"));
        return;
      }

      showFileMessage(data, true);
      fileInput.value = "";
    } catch (err) {
      console.error(err);
      alert("File upload failed");
    }
  };
}

document.getElementById("mode").addEventListener("change", loadMessages);

const filterEl = document.getElementById("filter");
if (filterEl) {
  filterEl.addEventListener("change", loadMessages);
}

window.onload = function () {
  loadMessages();
};

// ================= HEADER DROPDOWN MENU =================
function toggleHeaderMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("headerDropdown");
  if (menu) {
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  }
}

function triggerDropdownAction(action) {
  const menu = document.getElementById("headerDropdown");
  if (menu) menu.style.display = "none";

  if (action === "tasks") {
    toggleTaskDrawer();
  } else if (action === "reminders") {
    toggleReminderDrawer();
  } else if (action === "decision") {
    toggleDecisionModal();
  }
}

document.addEventListener("click", function (e) {
  const menu = document.getElementById("headerDropdown");
  const btn = document.querySelector(".header-menu-btn");
  if (menu && menu.style.display === "block") {
    if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
      menu.style.display = "none";
    }
  }
});

