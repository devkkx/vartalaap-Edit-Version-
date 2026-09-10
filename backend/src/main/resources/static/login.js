function login(event) {
  if (event) event.preventDefault();

  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;

  console.log(username, password);

  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: username,
      password: password,
    }),
  })
    .then((res) => res.text())
    .then((result) => {
      console.log("Server Response:", result);

      if (result === "ADMIN") {
        localStorage.setItem("username", username);
        window.location.href = "admin.html";
      } else if (result === "USER") {
        localStorage.setItem("username", username);
        window.location.href = "index.html";
      } else if (result === "BLOCKED") {
        alert("You are blocked by admin");
      } else {
        alert("Invalid username or password");
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Server connection error");
    });
}
