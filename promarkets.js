(function () {
  var panels = document.querySelectorAll(".pm-panel");
  var navButtons = document.querySelectorAll("[data-panel]");
  var toast = document.getElementById("pm-toast");
  var modal = document.getElementById("pm-modal");
  var modalPassword = document.getElementById("modal-password");
  var selectedProtected = "";
  var toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2800);
  }
  function openPanel(name) {
    panels.forEach(function (panel) { panel.classList.toggle("active", panel.id === "panel-" + name); });
    document.querySelectorAll(".pm-nav-btn, .pm-feature").forEach(function (button) { button.classList.toggle("active", button.dataset.panel === name); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  navButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      openPanel(button.dataset.panel);
    });
  });
  document.querySelectorAll(".pm-filter button[data-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll(".pm-filter button[data-filter]").forEach(function (item) { item.classList.remove("active"); });
      button.classList.add("active");
      document.querySelectorAll(".pm-bot-card").forEach(function (card) { card.style.display = button.dataset.filter === "all" || card.dataset.access === button.dataset.filter ? "" : "none"; });
    });
  });
  document.querySelectorAll("[data-load]").forEach(function (button) {
    button.addEventListener("click", function () {
      var card = button.closest(".pm-bot-card");
      var botName = button.dataset.load;
      if (card.dataset.access === "locked") {
        selectedProtected = botName;
        document.getElementById("modal-title").textContent = "Unlock " + botName;
        document.getElementById("modal-copy").textContent = "This protected strategy needs a password before it can be loaded into your paper workspace.";
        modal.classList.add("open");
        modalPassword.focus();
        return;
      }
      document.getElementById("dock-state").textContent = botName + " loaded · ready to run";
      showToast(botName + " is loaded in paper mode.");
    });
  });
  document.getElementById("unlock-bot").addEventListener("click", function () {
    modal.classList.remove("open");
    modalPassword.value = "";
    document.getElementById("dock-state").textContent = selectedProtected + " loaded · ready to run";
    showToast(selectedProtected + " unlocked for this paper session.");
  });
  document.querySelectorAll('[data-action="close-modal"]').forEach(function (button) { button.addEventListener("click", function () { modal.classList.remove("open"); }); });
  modal.addEventListener("click", function (event) { if (event.target === modal) modal.classList.remove("open"); });
  document.querySelectorAll('[data-action="login"], [data-action="signup"]').forEach(function (button) { button.addEventListener("click", function () { showToast(button.dataset.action === "login" ? "Login is ready to connect." : "Sign up is coming next."); }); });
  document.querySelectorAll('[data-action="refresh"]').forEach(function (button) { button.addEventListener("click", function () { showToast("Dashboard refreshed with paper-market snapshots."); }); });
  document.querySelectorAll('[data-action="speed"]').forEach(function (button) { button.addEventListener("click", function () { showToast("Paper experiment queued in Speed Lab."); }); });
  document.getElementById("run-toggle").addEventListener("click", function () {
    var button = document.getElementById("run-toggle");
    var running = button.classList.toggle("running");
    button.querySelector("i").textContent = running ? "■" : "▶";
    button.querySelector("span").textContent = running ? "Stop" : "Run";
    document.getElementById("dock-state").textContent = running ? "Paper bot is running · monitoring signals" : "Bot is not running";
    showToast(running ? "Paper run started. No real trades are placed." : "Paper run stopped.");
  });
  document.getElementById("select-all").addEventListener("change", function (event) { document.querySelectorAll(".bot-check").forEach(function (check) { check.checked = event.target.checked; }); });
  document.getElementById("bulk-run").addEventListener("click", function () {
    var count = document.querySelectorAll(".bot-check:checked").length;
    if (!count) { showToast("Select at least one bot to run."); return; }
    document.getElementById("dock-state").textContent = count + " bots queued · ready to run";
    showToast(count + " paper bots queued.");
  });
  document.getElementById("create-bot").addEventListener("click", function () {
    var name = document.getElementById("builder-name").value.trim() || "My momentum bot";
    document.getElementById("dock-state").textContent = name + " created · ready to run";
    showToast(name + " created in paper mode.");
  });
  document.querySelector(".pm-menu").addEventListener("click", function () { document.querySelector(".pm-main-nav").classList.toggle("open"); });
}());
