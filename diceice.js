(function () {
  "use strict";

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var STORAGE_KEY = "diceice.paper.workspace.v1";
  var panels = $$(".pm-panel");
  var modal = $("#pm-modal");
  var modalPassword = $("#modal-password");
  var toast = $("#pm-toast");
  var selectedProtected = "";
  var toastTimer;
  var state = { loadedBot: "", queuedBots: [], running: false, execution: "FAST", experiments: [], customBots: [] };

  try {
    var saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) {
      state.loadedBot = saved.loadedBot || "";
      state.queuedBots = Array.isArray(saved.queuedBots) ? saved.queuedBots : [];
      state.execution = saved.execution === "SAFE" ? "SAFE" : "FAST";
      state.experiments = Array.isArray(saved.experiments) ? saved.experiments : [];
      state.customBots = Array.isArray(saved.customBots) ? saved.customBots : [];
    }
  } catch (error) {}

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        loadedBot: state.loadedBot,
        queuedBots: state.queuedBots,
        execution: state.execution,
        experiments: state.experiments.slice(-10),
        customBots: state.customBots
      }));
    } catch (error) {}
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 3200);
  }

  function openPanel(name) {
    panels.forEach(function (panel) { panel.classList.toggle("active", panel.id === "panel-" + name); });
    $$(".pm-nav-btn, .pm-feature").forEach(function (button) { button.classList.toggle("active", button.dataset.panel === name); });
    var nav = $(".pm-main-nav");
    if (nav) nav.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setDockState(message) {
    var dock = $("#dock-state");
    if (dock) dock.textContent = message;
  }

  function updateRunControl() {
    var button = $("#run-toggle");
    if (!button) return;
    button.classList.toggle("running", state.running);
    var icon = $("i", button);
    var label = $("span", button);
    if (icon) icon.textContent = state.running ? "■" : "▶";
    if (label) label.textContent = state.running ? "Stop" : "Run";
    button.setAttribute("aria-pressed", state.running ? "true" : "false");
  }

  function updateWorkspaceState() {
    var active = $("#active-bots");
    if (active && state.queuedBots.length) active.textContent = String(state.queuedBots.length);
    updateRunControl();
    var execution = $(".pm-execution strong");
    if (execution && execution.firstChild) execution.firstChild.nodeValue = state.execution + " ";
    if (state.running) {
      setDockState((state.queuedBots.length || 1) + " paper bot" + (state.queuedBots.length === 1 ? "" : "s") + " running · monitoring signals");
    } else if (state.queuedBots.length) {
      setDockState(state.queuedBots.length + " bot" + (state.queuedBots.length === 1 ? "" : "s") + " queued · ready to run");
    } else if (state.loadedBot) {
      setDockState(state.loadedBot + " loaded · ready to run");
    } else {
      setDockState("Bot is not running");
    }
  }

  function markLoaded(name, card) {
    state.loadedBot = name;
    $$(".pm-bot-card").forEach(function (item) { item.classList.toggle("selected", item === card); });
    $$('[data-load]').forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.load === name ? "true" : "false"); });
    persist();
    updateWorkspaceState();
    showToast(name + " is loaded in paper mode.");
  }

  function loadBot(button) {
    var card = button.closest(".pm-bot-card");
    var name = button.dataset.load || (card && card.dataset.bot) || "Selected bot";
    if (card && card.dataset.access === "locked") {
      selectedProtected = name;
      var title = $("#modal-title");
      var copy = $("#modal-copy");
      if (title) title.textContent = "Unlock " + name;
      if (copy) copy.textContent = "Enter the session password to load this protected strategy into paper mode.";
      if (modal) modal.classList.add("open");
      if (modalPassword) { modalPassword.value = ""; window.setTimeout(function () { modalPassword.focus(); }, 0); }
      return;
    }
    markLoaded(name, card);
  }

  function closeModal() {
    if (modal) modal.classList.remove("open");
    if (modalPassword) modalPassword.value = "";
    selectedProtected = "";
  }

  function createNode(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function addCustomBot(bot) {
    var grid = $("#bot-grid");
    var selector = ".pm-bot-card[data-bot=\"" + CSS.escape(bot.name) + "\"]";
    if (!grid || !bot || !bot.name || $(selector)) return;
    var card = createNode("article", "pm-bot-card");
    card.dataset.access = "open";
    card.dataset.bot = bot.name;
    var top = createNode("div", "pm-bot-top");
    var badge = createNode("span", "pm-badge", "CUSTOM");
    var heading = createNode("h3", "", bot.name);
    var description = createNode("p", "", bot.strategy + " · " + bot.market);
    var actions = createNode("div", "pm-card-actions");
    var check = document.createElement("input");
    check.type = "checkbox";
    check.className = "bot-check";
    check.setAttribute("aria-label", "Select " + bot.name);
    var load = createNode("button", "pm-load", "↧ Load bot");
    load.type = "button";
    load.dataset.load = bot.name;
    top.appendChild(badge);
    top.appendChild(heading);
    card.appendChild(top);
    card.appendChild(description);
    actions.appendChild(check);
    actions.appendChild(load);
    card.appendChild(actions);
    grid.appendChild(card);
  }

  function applyFilter(filter) {
    $$(".pm-filter button[data-filter]").forEach(function (button) { button.classList.toggle("active", button.dataset.filter === filter); });
    $$(".pm-bot-card").forEach(function (card) {
      card.hidden = filter !== "all" && card.dataset.access !== filter;
    });
  }

  $$('[data-panel]').forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      openPanel(button.dataset.panel);
    });
  });

  document.addEventListener("click", function (event) {
    var loadButton = event.target.closest && event.target.closest("[data-load]");
    if (loadButton) loadBot(loadButton);
  });

  $$('[data-filter]').forEach(function (button) {
    button.addEventListener("click", function () { applyFilter(button.dataset.filter); });
  });

  $("#unlock-bot")?.addEventListener("click", function () {
    var password = modalPassword ? modalPassword.value.trim() : "";
    if (password.length < 4) {
      showToast("Enter at least 4 characters to unlock this paper strategy.");
      if (modalPassword) modalPassword.focus();
      return;
    }
    var card = $$(' .pm-bot-card').find(function (item) { return item.dataset.bot === selectedProtected; });
    var name = selectedProtected;
    closeModal();
    markLoaded(name, card);
    showToast(name + " unlocked for this paper session.");
  });

  $$('[data-action="close-modal"]').forEach(function (button) { button.addEventListener("click", closeModal); });
  if (modal) modal.addEventListener("click", function (event) { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape" && modal && modal.classList.contains("open")) closeModal(); });
  if (modalPassword) modalPassword.addEventListener("keydown", function (event) { if (event.key === "Enter") $("#unlock-bot")?.click(); });

  $$('[data-action="login"], [data-action="signup"]').forEach(function (button) {
    button.addEventListener("click", function () { showToast(button.dataset.action === "login" ? "Login is ready to connect." : "Sign up is ready to connect."); });
  });

  $$('[data-action="refresh"]').forEach(function (button) {
    button.addEventListener("click", function () {
      var now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      button.setAttribute("aria-label", "Last refreshed at " + now);
      showToast("Dashboard refreshed at " + now + ".");
    });
  });

  $$('[data-action="speed"]').forEach(function (button) {
    button.addEventListener("click", function () {
      state.experiments.push({ preset: "paper", startedAt: new Date().toISOString() });
      persist();
      setDockState("Paper experiment queued · ready to run");
      showToast("Paper experiment queued. No real trades are placed.");
    });
  });

  $("#run-toggle")?.addEventListener("click", function () {
    if (!state.running && !state.loadedBot && !state.queuedBots.length) {
      showToast("Load a bot or select bots before starting a paper run.");
      return;
    }
    state.running = !state.running;
    updateWorkspaceState();
    showToast(state.running ? "Paper run started. No real trades are placed." : "Paper run stopped.");
  });

  $("#select-all")?.addEventListener("change", function (event) {
    $$(".bot-check").forEach(function (check) {
      var card = check.closest(".pm-bot-card");
      check.checked = !card || !card.hidden ? event.target.checked : false;
    });
  });

  $("#bulk-run")?.addEventListener("click", function () {
    var selected = $$(".bot-check:checked").map(function (check) {
      var card = check.closest(".pm-bot-card");
      if (card) return card.dataset.bot || $("strong", card)?.textContent.trim();
      var row = check.closest("tr");
      return row ? $("strong", row)?.textContent.trim() : "Selected bot";
    }).filter(Boolean);
    if (!selected.length) { showToast("Select at least one bot to run."); return; }
    state.queuedBots = selected;
    state.loadedBot = selected[0];
    persist();
    updateWorkspaceState();
    showToast(selected.length + " paper bot" + (selected.length === 1 ? " queued." : "s queued."));
  });

  $("#create-bot")?.addEventListener("click", function () {
    var panel = $("#panel-bot-builder");
    var nameInput = $("#builder-name");
    var selects = panel ? $$('select', panel) : [];
    var numberInput = panel ? $("input[type=number]", panel) : null;
    var name = nameInput ? nameInput.value.trim() : "";
    var market = selects[0] ? selects[0].value : "Volatility 100 Index";
    var strategy = selects[1] ? selects[1].value : "Momentum follow";
    var stake = numberInput ? Number(numberInput.value) : 10;
    if (name.length < 3) { showToast("Give your paper bot a name with at least 3 characters."); if (nameInput) nameInput.focus(); return; }
    if (!Number.isFinite(stake) || stake <= 0) { showToast("Stake per trade must be greater than zero."); if (numberInput) numberInput.focus(); return; }
    var bot = { name: name, market: market, strategy: strategy, stake: stake };
    state.customBots = state.customBots.filter(function (item) { return item.name !== name; });
    state.customBots.push(bot);
    addCustomBot(bot);
    state.loadedBot = name;
    state.queuedBots = [name];
    persist();
    updateWorkspaceState();
    showToast(name + " created in paper mode.");
  });

  $(".pm-execution")?.addEventListener("click", function () {
    state.execution = state.execution === "FAST" ? "SAFE" : "FAST";
    persist();
    updateWorkspaceState();
    showToast("Execution mode set to " + state.execution + ".");
  });

  $(".pm-menu")?.addEventListener("click", function () { $(".pm-main-nav")?.classList.toggle("open"); });

  state.customBots.forEach(addCustomBot);
  applyFilter("all");
  updateWorkspaceState();
}());
