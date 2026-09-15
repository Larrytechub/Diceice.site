(function () {
  "use strict";

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var STORAGE_KEY = "diceice.paper.workspace.v1";
  var panels = $$(".pm-panel");
  var modal = $("#pm-modal");
  var modalPassword = $("#modal-password");
  var toast = $("#pm-toast");
  var liveConfirmModal = $("#live-confirm-modal");
  var liveClient = null;
  var pendingLiveOrder = null;
  var liveRisk = 0;
  var selectedProtected = "";
  var toastTimer;
  var state = { loadedBot: "", queuedBots: [], running: false, execution: "FAST", experiments: [], customBots: [], orders: [], copiedStrategies: [], paperBalance: 10842.5 };

  try {
    var saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) {
      state.loadedBot = saved.loadedBot || "";
      state.queuedBots = Array.isArray(saved.queuedBots) ? saved.queuedBots : [];
      state.execution = saved.execution === "SAFE" ? "SAFE" : "FAST";
      state.experiments = Array.isArray(saved.experiments) ? saved.experiments : [];
      state.customBots = Array.isArray(saved.customBots) ? saved.customBots : [];
      state.orders = Array.isArray(saved.orders) ? saved.orders : [];
      state.copiedStrategies = Array.isArray(saved.copiedStrategies) ? saved.copiedStrategies : [];
      state.paperBalance = Number.isFinite(saved.paperBalance) ? saved.paperBalance : 10842.5;
    }
  } catch (error) {}

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        loadedBot: state.loadedBot,
        queuedBots: state.queuedBots,
        execution: state.execution,
        experiments: state.experiments.slice(-10),
        customBots: state.customBots,
        orders: state.orders.slice(-12),
        copiedStrategies: state.copiedStrategies,
        paperBalance: state.paperBalance
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

  function formatMoney(amount) {
    return "$" + Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function updatePaperMetrics() {
    var balance = $("#paper-balance");
    var net = $("#net-return");
    var wins = state.orders.filter(function (order) { return order.result === "WIN"; }).length;
    var losses = state.orders.filter(function (order) { return order.result === "LOSS"; }).length;
    var total = wins + losses;
    var winRate = $("#win-rate");
    if (balance) balance.textContent = formatMoney(state.paperBalance);
    if (net) net.textContent = (state.paperBalance >= 10000 ? "+" : "") + formatMoney(state.paperBalance - 10000);
    if (winRate && total) winRate.textContent = Math.round((wins / total) * 100) + "%";
  }

  function setLiveStatus(message, connected) {
    var status = $("#live-status");
    var dot = $("#live-status-dot");
    var balance = $("#live-balance");
    if (status) status.textContent = message;
    if (dot) dot.classList.toggle("connected", !!connected);
    if (balance && liveClient && liveClient.balance !== null) {
      balance.textContent = formatMoney(liveClient.balance) + " " + (liveClient.currency || "");
    }
  }

  function closeLiveConfirmation() {
    pendingLiveOrder = null;
    if (liveConfirmModal) liveConfirmModal.classList.remove("open");
    var check = $("#live-confirm-check");
    if (check) check.checked = false;
  }

  function openLiveConfirmation(order) {
    pendingLiveOrder = order;
    var summary = $("#live-confirm-summary");
    var mode = order.contract + " · " + (order.direction === "BUY" ? "Buy / Higher" : "Sell / Lower");
    if (summary) summary.innerHTML = "<strong>" + order.market + "</strong><span>" + mode + "</span><b>" + formatMoney(order.stake) + " " + (liveClient?.currency || "") + "</b>";
    if (liveConfirmModal) liveConfirmModal.classList.add("open");
  }

  function renderPaperOrders() {
    var table = $("#paper-orders");
    if (!table) return;
    table.innerHTML = "";
    if (!state.orders.length) {
      var empty = document.createElement("tr");
      empty.innerHTML = '<td colspan="5" class="pm-empty">No manual orders yet. Your first paper order will appear here.</td>';
      table.appendChild(empty);
      return;
    }
    state.orders.slice().reverse().forEach(function (order) {
      var row = document.createElement("tr");
      row.innerHTML = "<td>" + order.time + "</td><td>" + order.market + "</td><td>" + order.direction + "</td><td>" + formatMoney(order.stake) + '<\/td><td class="' + (order.result === "WIN" ? "pm-positive" : "pm-negative") + '">' + order.result + " " + (order.result === "WIN" ? "+" : "") + formatMoney(order.pnl) + "</td>";
      table.appendChild(row);
    });
  }

  function recordPaperOrder(market, contract, direction, stake, source) {
    var won = Math.random() > .36;
    var pnl = won ? stake * .82 : -stake;
    state.paperBalance += pnl;
    state.orders.push({
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      market: market,
      contract: contract,
      direction: direction,
      stake: stake,
      pnl: Number(pnl.toFixed(2)),
      result: won ? "WIN" : "LOSS",
      source: source || "manual"
    });
    state.orders = state.orders.slice(-12);
    persist();
    renderPaperOrders();
    updatePaperMetrics();
    showToast((source || "Paper") + " order settled " + (won ? "in profit" : "at a loss") + ". No real trade was placed.");
  }

  function updateCopySelection() {
    state.copiedStrategies = $$("[data-copy]:checked").map(function (input) { return input.dataset.copy; });
    var count = $("#copy-count");
    if (count) count.textContent = state.copiedStrategies.length + " selected";
    persist();
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

  $$('[data-action="refresh-market"]').forEach(function (button) {
    button.addEventListener("click", function () {
      $$("[data-market-change]").forEach(function (node, index) {
        var drift = (Math.random() * 1.8 + .2).toFixed(2);
        node.textContent = (index === 2 ? "-" : "+") + drift + "%";
        node.classList.toggle("pm-negative", index === 2);
        node.classList.toggle("pm-positive", index !== 2);
      });
      var updated = $("#market-updated");
      if (updated) updated.textContent = "just now";
      showToast("Paper market feed refreshed.");
    });
  });

  $$("[data-timeframe]").forEach(function (button) {
    button.addEventListener("click", function () {
      $$("[data-timeframe]").forEach(function (item) { item.classList.toggle("active", item === button); });
      showToast("Chart interval set to " + button.dataset.timeframe + ".");
    });
  });

  $$("[data-direction]").forEach(function (button) {
    button.addEventListener("click", function () {
      $$("[data-direction]").forEach(function (item) { item.classList.toggle("active", item === button); });
    });
  });

  $$("[data-copy]").forEach(function (input) {
    input.checked = state.copiedStrategies.indexOf(input.dataset.copy) !== -1;
    input.addEventListener("change", updateCopySelection);
  });

  $('[data-action="manual-order"]')?.addEventListener("click", function () {
    var market = $("#manual-market")?.value || "Volatility 100 Index";
    var contract = $("#manual-contract")?.value || "Higher / Lower";
    var direction = $("[data-direction].active")?.dataset.direction || "BUY";
    var stake = Number($("#manual-stake")?.value || 0);
    if (!Number.isFinite(stake) || stake <= 0) {
      showToast("Enter a stake greater than zero.");
      $("#manual-stake")?.focus();
      return;
    }
    if ($("#live-mode")?.checked) {
      var maxStake = Number($("#live-max-stake")?.value || 0);
      var maxLoss = Number($("#live-max-loss")?.value || 0);
      if (!liveClient || !liveClient.connected) {
        showToast("Connect and authorize your Deriv account first.");
        return;
      }
      if (contract === "Over / Under") {
        showToast("Live Over / Under contracts are not enabled yet.");
        return;
      }
      if (!Number.isFinite(maxStake) || stake > maxStake) {
        showToast("Live stake exceeds your configured maximum.");
        return;
      }
      if (!Number.isFinite(maxLoss) || liveRisk + stake > maxLoss) {
        showToast("This order would exceed your live session loss limit.");
        return;
      }
      openLiveConfirmation({ market: market, contract: contract, direction: direction, stake: stake });
      return;
    }
    recordPaperOrder(market, contract, direction, stake, "Manual");
  });

  $('[data-action="connect-live"]')?.addEventListener("click", async function (button) {
    var tokenInput = $("#deriv-token");
    var token = tokenInput ? tokenInput.value.trim() : "";
    if (!token) {
      showToast("Enter a Deriv API token. It will stay in memory only.");
      tokenInput?.focus();
      return;
    }
    if (!window.DiceiceDeriv) {
      showToast("The Deriv trading module is unavailable.");
      return;
    }
    button.currentTarget.disabled = true;
    setLiveStatus("Connecting…", false);
    try {
      liveClient = window.DiceiceDeriv.createClient();
      liveClient.onBalance = function () { setLiveStatus("Authorized · live mode off", true); };
      liveClient.onDisconnect = function () {
        var liveMode = $("#live-mode");
        if (liveMode) { liveMode.checked = false; liveMode.disabled = true; }
        setLiveStatus("Disconnected", false);
      };
      var account = await liveClient.connect(token);
      tokenInput.value = "";
      var liveMode = $("#live-mode");
      if (liveMode) liveMode.disabled = false;
      var disconnect = $('[data-action="disconnect-live"]');
      if (disconnect) disconnect.disabled = false;
      setLiveStatus("Authorized · live mode off", true);
      showToast("Deriv account connected. Live trading is still off.");
      if (account.currency) $("#live-balance").textContent = formatMoney(account.balance) + " " + account.currency;
    } catch (error) {
      if (liveClient) liveClient.disconnect();
      liveClient = null;
      setLiveStatus("Connection failed", false);
      showToast(error.message || "Could not connect to Deriv.");
    } finally {
      button.currentTarget.disabled = false;
    }
  });

  $('[data-action="disconnect-live"]')?.addEventListener("click", function () {
    if (liveClient) liveClient.disconnect();
    liveClient = null;
    liveRisk = 0;
    var liveMode = $("#live-mode");
    if (liveMode) { liveMode.checked = false; liveMode.disabled = true; }
    this.disabled = true;
    setLiveStatus("Disconnected", false);
    showToast("Deriv account disconnected. No order was sent.");
  });

  $('[data-action="emergency-stop"]')?.addEventListener("click", function () {
    if (liveClient) liveClient.disconnect();
    liveClient = null;
    liveRisk = 0;
    var liveMode = $("#live-mode");
    if (liveMode) { liveMode.checked = false; liveMode.disabled = true; }
    var disconnect = $('[data-action="disconnect-live"]');
    if (disconnect) disconnect.disabled = true;
    setLiveStatus("Emergency stop active", false);
    closeLiveConfirmation();
    showToast("Emergency stop active. Live mode is disabled.");
  });

  $('[data-action="cancel-live-order"]')?.addEventListener("click", closeLiveConfirmation);
  if (liveConfirmModal) liveConfirmModal.addEventListener("click", function (event) { if (event.target === liveConfirmModal) closeLiveConfirmation(); });

  $('[data-action="confirm-live-order"]')?.addEventListener("click", async function (button) {
    var check = $("#live-confirm-check");
    if (!pendingLiveOrder || !check?.checked) {
      showToast("Check the real-money risk acknowledgement before placing the order.");
      return;
    }
    if (!liveClient || !liveClient.connected) {
      closeLiveConfirmation();
      showToast("Deriv account is no longer connected.");
      return;
    }
    var order = pendingLiveOrder;
    var maxLoss = Number($("#live-max-loss")?.value || 0);
    button.currentTarget.disabled = true;
    try {
      if (liveRisk + order.stake > maxLoss) throw new Error("The session loss limit was reached.");
      var result = await liveClient.buy(order);
      liveRisk += order.stake;
      closeLiveConfirmation();
      if (liveClient.balance !== null) $("#live-balance").textContent = formatMoney(liveClient.balance) + " " + (liveClient.currency || "");
      showToast("Live order placed: " + (result.contractId || "confirmed") + ". Max exposed risk: " + formatMoney(liveRisk) + ".");
    } catch (error) {
      showToast(error.message || "Live order was rejected.");
    } finally {
      button.currentTarget.disabled = false;
    }
  });

  $("#live-mode")?.addEventListener("change", function () {
    var alert = $("#paper-mode-alert");
    var button = $("#manual-order-button");
    if (this.checked) {
      if (alert) { alert.classList.add("live"); alert.innerHTML = "<strong>Live mode is armed</strong><span>Every order will require a second confirmation and can lose real money.</span>"; }
      if (button) button.textContent = "Review live order";
      setLiveStatus("Authorized · live mode armed", true);
    } else {
      if (alert) { alert.classList.remove("live"); alert.innerHTML = "<strong>Paper mode is on</strong><span>This order stays in your browser and never reaches a broker.</span>"; }
      if (button) button.textContent = "Place paper order";
      if (liveClient?.connected) setLiveStatus("Authorized · live mode off", true);
    }
  });

  $('[data-action="connect-copy"]')?.addEventListener("click", function () {
    if (!state.copiedStrategies.length) {
      showToast("Select at least one paper source first.");
      return;
    }
    var connected = $("#copy-session-status");
    var note = $("#copy-session-note");
    var meter = $("#copy-meter");
    if (connected) connected.textContent = "Paper session active";
    if (note) note.textContent = "Mirroring " + state.copiedStrategies.join(", ") + ".";
    if (meter) meter.style.width = Math.min(100, state.copiedStrategies.length * 33) + "%";
    state.queuedBots = state.copiedStrategies.slice();
    state.loadedBot = state.copiedStrategies[0];
    persist();
    updateWorkspaceState();
    showToast("Paper copy session started. No account was connected.");
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
  renderPaperOrders();
  updatePaperMetrics();
  updateWorkspaceState();
}());
