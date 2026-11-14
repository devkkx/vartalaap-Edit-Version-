let selectedUser = localStorage.getItem("selectedUser") || null;
let activeDocId = null;
let activeDocName = null;
let recentTextMessages = [];

// ================= NOTIFICATION & PRESENCE STATE =================
let previousOnlineUsers = new Set();
let onlineUsersList = new Set();
let unreadCount = 0;
const originalTitle = document.title || "VartAlaap";

window.addEventListener("focus", () => {
  unreadCount = 0;
  document.title = originalTitle;
});

// Prompt for desktop browser notification permission on first user interaction
if ("Notification" in window && Notification.permission === "default") {
  document.addEventListener("click", () => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, { once: true });
}

// Synthesized notification chime (Web Audio API - no external file required)
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {
    // AudioContext may be paused until user gestures on page
  }
}

// In-app Floating Toast & Desktop Notification
function showMessageNotification(sender, content, mode, receiver) {
  if (!sender || sender === username) return;

  playNotificationSound();

  // Desktop push notification when tab is in background
  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    try {
      new Notification(`VarTalaap · ${sender} (${mode || 'Chat'})`, {
        body: content && content.length > 80 ? content.substring(0, 80) + "..." : (content || "New message"),
        icon: "./vlogo.jpeg"
      });
    } catch (e) {
      console.warn("Notification error:", e);
    }
  }

  // Flashing document title
  if (document.hidden) {
    unreadCount++;
    document.title = `(${unreadCount}) 💬 ${sender}: ${content ? content.substring(0, 20) : 'New message'}...`;
  }

  // Floating Toast Banner in top-right
  let container = document.getElementById("toastContainer");
  if (!container) return;

  let toast = document.createElement("div");
  let modeClass = "toast-" + (mode ? mode.toLowerCase() : "work");
  toast.className = `toast-card ${modeClass}`;

  let preview = content ? (content.length > 70 ? content.substring(0, 70) + "..." : content) : "New message";

  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-title">
        <span class="online-dot"></span>
        <span>${escapeHtml(sender)}</span>
        <span style="font-size:10px; opacity:0.7; background:rgba(0,0,0,0.06); padding:1px 5px; border-radius:3px;">${mode || 'CHAT'}</span>
      </div>
      <button class="toast-close" onclick="event.stopPropagation(); this.closest('.toast-card').remove();">✖</button>
    </div>
    <div class="toast-body">${escapeHtml(preview)}</div>
  `;

  toast.onclick = () => {
    if (mode === "PERSONAL") {
      selectedUser = sender;
      localStorage.setItem("selectedUser", sender);
      let modeSelect = document.getElementById("mode");
      if (modeSelect) modeSelect.value = "PERSONAL";
      document.querySelectorAll(".user-item").forEach(x => {
        if (x.getAttribute("data-username") === sender) {
          x.style.background = "#d1f0ff";
        } else {
          x.style.background = "transparent";
        }
      });
      loadMessages();
    } else {
      let modeSelect = document.getElementById("mode");
      if (modeSelect) modeSelect.value = mode;
      let filterSelect = document.getElementById("filter");
      if (filterSelect) {
        filterSelect.value = mode;
        filterMode();
      }
    }
    toast.remove();
  };

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function showOnlineToast(onlineUser) {
  let container = document.getElementById("toastContainer");
  if (!container) return;

  let toast = document.createElement("div");
  toast.className = "toast-card toast-online";
  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-title">
        <span class="online-dot"></span>
        <span>User Active</span>
      </div>
      <button class="toast-close" onclick="event.stopPropagation(); this.closest('.toast-card').remove();">✖</button>
    </div>
    <div class="toast-body">🟢 <strong>${escapeHtml(onlineUser)}</strong> is now online</div>
  `;

  toast.onclick = () => {
    selectedUser = onlineUser;
    localStorage.setItem("selectedUser", onlineUser);
    let modeSelect = document.getElementById("mode");
    if (modeSelect) modeSelect.value = "PERSONAL";
    loadMessages();
    toast.remove();
  };

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showDeliveryToast(text) {
  let container = document.getElementById("toastContainer");
  if (!container) return;

  let toast = document.createElement("div");
  toast.className = "toast-card toast-work";
  toast.style.padding = "8px 12px";
  toast.innerHTML = `<div style="font-size:12px; font-weight:600;">${escapeHtml(text)}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

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
  // ✅ USERS LIST (CLICKABLE WITH ONLINE STATUS)
  if (e.data.startsWith("USERS:")) {
    let raw = e.data.replace("USERS:", "").trim();
    let users = raw ? raw.split(",").map(u => u.trim()).filter(Boolean) : [];
    let usersDiv = document.getElementById("users");

    usersDiv.innerHTML = "<b>Online Users</b><br>";

    let currentOnlineSet = new Set(users);

    // Notify when another user comes online (skip initial load)
    if (previousOnlineUsers.size > 0) {
      users.forEach(u => {
        if (u !== username && !previousOnlineUsers.has(u)) {
          showOnlineToast(u);
        }
      });
    }
    previousOnlineUsers = currentOnlineSet;
    onlineUsersList = currentOnlineSet;

    let otherUsers = users.filter(u => u !== username);
    if (otherUsers.length === 0) {
      let empty = document.createElement("div");
      empty.style.fontSize = "11px";
      empty.style.color = "#777";
      empty.style.padding = "4px";
      empty.innerText = "No other users online";
      usersDiv.appendChild(empty);
      return;
    }

    otherUsers.forEach((u) => {
      let el = document.createElement("div");
      el.classList.add("user-item");
      el.setAttribute("data-username", u);
      el.style.cursor = "pointer";
      el.style.padding = "5px 8px";
      el.style.borderRadius = "6px";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "space-between";
      el.style.marginBottom = "3px";

      if (u === selectedUser) {
        el.style.background = "#d1f0ff";
      }

      el.innerHTML = `
        <div style="display:flex; align-items:center;">
          <span class="online-dot"></span>
          <span style="font-weight:600;">${escapeHtml(u)}</span>
        </div>
        <span style="font-size:10px; color:#2ee59d; font-weight:bold;">Online</span>
      `;

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
    let timeStr = formatTimestamp(new Date());
    div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px;"><span>${e.data.split("|")[1]}</span><span style="font-size:10px; opacity:0.65; white-space:nowrap; margin-left:6px;">${timeStr}</span></div>`;

    document.getElementById("messages").appendChild(div);
    div.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // ✅ LIVE DELETE WEBSOCKET FRAME
  if (e.data.startsWith("DELETE|")) {
    let id = e.data.split("|")[1];
    let el = document.getElementById("msg-" + id);
    if (el) el.remove();
    return;
  }

  // ✅ LIVE EDIT WEBSOCKET FRAME
  if (e.data.startsWith("EDIT|")) {
    let parts = e.data.split("|");
    let id = parts[1];
    let newContent = parts.slice(2).join("|");
    let el = document.getElementById("msg-" + id);
    if (el) {
      let contentEl = el.querySelector(".msg-content");
      if (contentEl) contentEl.innerText = newContent;
      let badgeEl = el.querySelector(".msg-edited-badge");
      if (badgeEl) badgeEl.style.display = "inline";
    }
    return;
  }

  // ✅ NORMAL / AI / PERSONAL MESSAGE
  let parts = e.data.split("|");

  if (parts.length === 5 && parts[0] === "PERSONAL") {
    let mode = parts[0];
    let sender = parts[1];
    let receiver = parts[2];
    let text = parts[3];
    let id = parts[4];

    if (!(sender === username || receiver === username)) return;

    checkConflictDetection(text, sender);
    renderMessageItem({ id: parseInt(id), sender, content: text, mode, receiver, type: 'text', timestamp: new Date() }, sender === username);
    if (sender !== username) {
      showMessageNotification(sender, text, mode, receiver);
    }
    return;
  }

  if (parts.length === 4) {
    let mode = parts[0];
    let sender = parts[1];
    let arg3 = parts[2];
    let arg4 = parts[3];

    if (mode === "PERSONAL") {
      if (!(sender === username || arg3 === username)) return;
      checkConflictDetection(arg4, sender);
      renderMessageItem({ sender, content: arg4, mode, receiver: arg3, type: 'text', timestamp: new Date() }, sender === username);
      if (sender !== username) {
        showMessageNotification(sender, arg4, mode, arg3);
      }
    } else {
      let text = arg3;
      let id = arg4;
      checkConflictDetection(text, sender);
      renderMessageItem({ id: parseInt(id), sender, content: text, mode, type: 'text', timestamp: new Date() }, sender === username);
      if (sender !== username) {
        showMessageNotification(sender, text, mode, null);
      }
    }
    return;
  }

  if (parts.length === 3) {
    let mode = parts[0];
    let sender = parts[1];
    let text = parts[2];

    checkConflictDetection(text, sender);
    renderMessageItem({ sender, content: text, mode, type: 'text', timestamp: new Date() }, sender === username);
    if (sender !== username) {
      showMessageNotification(sender, text, mode, null);
    }
  }
};

// ================= TIMESTAMP FORMATTER =================
function formatTimestamp(ts) {
  if (!ts) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (Array.isArray(ts)) {
    let d = new Date(ts[0], ts[1] - 1, ts[2], ts[3] || 0, ts[4] || 0, ts[5] || 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  let date = new Date(ts);
  if (isNaN(date.getTime())) {
    return ts;
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

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
    if (onlineUsersList.has(selectedUser)) {
      showDeliveryToast(`Delivered to ${selectedUser} (Online 🟢)`);
    } else {
      showDeliveryToast(`${selectedUser} is currently offline ⚪ (Delivered to inbox)`);
    }
  } else {
    payload = mode + "|" + username + "|" + msg;
  }

  socket.send(payload);
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
        timestamp: m.timestamp,
        edited: m.edited
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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeQuote(str) {
  if (!str) return "";
  return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function renderMessageItem(msg, mine) {
  let div = document.createElement("div");
  div.classList.add("message", mine ? "right" : "left");
  div.setAttribute("data-mode", msg.mode);
  if (msg.id) {
    div.id = "msg-" + msg.id;
  }

  let timeStr = formatTimestamp(msg.timestamp);

  let headerText = msg.sender;
  if (msg.mode === "PERSONAL") {
    headerText = mine ? "To " + msg.receiver : msg.sender;
  }

  let modeBadge = msg.mode === "PERSONAL" ? "private" : msg.mode;
  let isEdited = msg.edited || msg.isEdited;

  let menuHtml = "";
  if (msg.id && (mine || msg.sender === username)) {
    menuHtml = `
      <div class="msg-menu-wrap" style="position: relative; display: inline-block; margin-left: 4px;">
        <button onclick="toggleMsgDropdown(event, ${msg.id})" style="background:none; border:none; color:inherit; font-size:14px; cursor:pointer; padding:0 2px; line-height:1; opacity:0.7;" title="Message options">⋮</button>
        <div id="msgMenu-${msg.id}" class="msg-dropdown-menu" style="display:none; position:absolute; right:0; top:18px; background:#ffffff; color:#333333; border:1px solid #ccc; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:100; min-width:90px; text-align:left;">
          <div onclick="editMessagePrompt(${msg.id}, '${escapeQuote(msg.content)}')" style="padding:6px 10px; font-size:12px; cursor:pointer; border-bottom:1px solid #eee;">✏️ Edit</div>
          <div onclick="deleteMessageConfirm(${msg.id})" style="padding:6px 10px; font-size:12px; cursor:pointer; color:#d9534f;">🗑️ Delete</div>
        </div>
      </div>
    `;
  }

  div.innerHTML = `
    <div style="font-size: 11px; font-weight: bold; opacity: 0.85; margin-bottom: 2px; display: flex; justify-content: space-between; gap: 8px; align-items: center;">
      <span>${headerText} <span style="font-weight: normal; font-size: 10px; opacity: 0.7; background: rgba(0,0,0,0.08); padding: 1px 4px; border-radius: 3px;">${modeBadge}</span></span>
      <div style="display:flex; align-items:center; gap:4px;">
        <span class="msg-edited-badge" style="font-size: 9px; font-style: italic; opacity: 0.6; display: ${isEdited ? 'inline' : 'none'};">(edited)</span>
        <span style="font-size: 10px; font-weight: normal; opacity: 0.65; white-space: nowrap;">${timeStr}</span>
        ${menuHtml}
      </div>
    </div>
    <div class="msg-content" style="font-size: 13.5px; line-height: 1.35; word-break: break-word; margin-bottom: 2px;">${escapeHtml(msg.content)}</div>
  `;

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

  let timeStr = formatTimestamp(file.timestamp);

  let html = "";

  if (file.fileType && file.fileType.startsWith("image")) {
    html += `<img src="${file.filePath}" class="chat-image" style="max-width:200px; border-radius:8px; display:block; margin-bottom:5px;">`;
  }

  html += `
    <div class="file-box">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span>📄 <b>${file.fileName}</b></span>
          <span style="font-size: 10px; opacity: 0.65; white-space: nowrap;">${timeStr}</span>
        </div>
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

  // Close message 3-dot menus on outside click
  let allMsgMenus = document.querySelectorAll(".msg-dropdown-menu");
  allMsgMenus.forEach(m => {
    if (!m.contains(e.target) && !e.target.matches("button[onclick*='toggleMsgDropdown']")) {
      m.style.display = "none";
    }
  });
});

// ================= 3-DOT MESSAGE OPTIONS =================
function toggleMsgDropdown(e, id) {
  if (e) e.stopPropagation();
  let allMenus = document.querySelectorAll(".msg-dropdown-menu");
  allMenus.forEach(m => {
    if (m.id !== "msgMenu-" + id) m.style.display = "none";
  });
  let menu = document.getElementById("msgMenu-" + id);
  if (menu) {
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  }
}

async function editMessagePrompt(id, currentText) {
  let menu = document.getElementById("msgMenu-" + id);
  if (menu) menu.style.display = "none";

  let newText = prompt("Edit your message:", currentText);
  if (newText === null || newText.trim() === "" || newText === currentText) return;

  try {
    let res = await fetch("/messages/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newText.trim(), sender: username })
    });
    let data = await res.json();
    if (!data.success) {
      alert("Error editing message: " + (data.error || "Failed"));
    }
  } catch (err) {
    console.error(err);
    alert("Failed to edit message");
  }
}

async function deleteMessageConfirm(id) {
  let menu = document.getElementById("msgMenu-" + id);
  if (menu) menu.style.display = "none";

  if (!confirm("Are you sure you want to delete this message?")) return;

  try {
    let res = await fetch("/messages/" + id + "?sender=" + encodeURIComponent(username), {
      method: "DELETE"
    });
    let data = await res.json();
    if (!data.success) {
      alert("Error deleting message: " + (data.error || "Failed"));
    }
  } catch (err) {
    console.error(err);
    alert("Failed to delete message");
  }
}

