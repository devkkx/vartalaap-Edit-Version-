function loadStats() {
  fetch("/admin/stats")
    .then((res) => res.json())
    .then((data) => {
      let statsEl = document.getElementById("stats");
      if (statsEl) {
        statsEl.innerHTML = `<strong>Total Users:</strong> ${data.totalUsers} | <strong>Total Messages:</strong> ${data.totalMessages}`;
      }
    })
    .catch((err) => console.error("Error loading stats:", err));
}

function loadUsers() {
  fetch("/admin/users")
    .then((res) => res.json())
    .then((data) => {
      let usersDiv = document.getElementById("users");
      if (!usersDiv) return;
      usersDiv.innerHTML = "";

      data.forEach((user) => {
        let buttonText = user.blocked ? "Unblock" : "Block";
        let buttonClass = user.blocked ? "unblock-btn" : "block-btn";
        let action = user.blocked
          ? `unblockUser('${user.username}')`
          : `blockUser('${user.username}')`;

        usersDiv.innerHTML += `
          <div class="user-row" style="margin: 8px 0; display: flex; align-items: center; gap: 10px;">
              <span class="user-name">${user.username} ${user.blocked ? "<span style='color:red;'>(Blocked)</span>" : ""}</span>
              <button class="${buttonClass}" onclick="${action}">
                  ${buttonText}
              </button>
          </div>
        `;
      });
    })
    .catch((err) => console.error("Error loading users:", err));
}

function unblockUser(username) {
  fetch(`/admin/unblock/${username}`, {
    method: "POST",
  })
    .then((res) => res.text())
    .then((msg) => {
      alert(msg);
      loadUsers();
      loadStats();
    });
}

function blockUser(username) {
  fetch(`/admin/block/${username}`, {
    method: "POST",
  })
    .then((res) => res.text())
    .then((msg) => {
      alert(msg);
      loadUsers();
      loadStats();
    });
}

window.onload = function () {
  loadStats();
  loadUsers();
};
