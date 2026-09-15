(function () {
  "use strict";

  var APP_ID = "1089";
  var WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=" + APP_ID;
  var SYMBOLS = {
    "Volatility 100 Index": "R_100",
    "Volatility 75 Index": "R_75",
    "Step Index": "stpRNG"
  };

  function DerivLiveClient() {
    this.socket = null;
    this.requestId = 0;
    this.pending = {};
    this.currency = "";
    this.loginId = "";
    this.balance = null;
    this.connected = false;
  }

  DerivLiveClient.prototype.request = function (payload) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!self.socket || self.socket.readyState !== WebSocket.OPEN) {
        reject(new Error("Deriv connection is not open."));
        return;
      }
      var reqId = ++self.requestId;
      self.pending[reqId] = { resolve: resolve, reject: reject };
      self.socket.send(JSON.stringify(Object.assign({}, payload, { req_id: reqId })));
    });
  };

  DerivLiveClient.prototype.connect = function (token) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!token) {
        reject(new Error("A Deriv API token is required."));
        return;
      }
      self.disconnect();
      var settled = false;
      self.socket = new WebSocket(WS_URL);
      self.socket.onopen = function () {
        self.request({ authorize: token }).then(function (response) {
          var auth = response.authorize || {};
          self.currency = auth.currency || "";
          self.loginId = auth.loginid || "";
          self.connected = true;
          self.request({ balance: 1, subscribe: 1 }).then(function (balanceResponse) {
            self.balance = balanceResponse.balance?.balance ?? null;
            if (!settled) {
              settled = true;
              resolve({ loginId: self.loginId, currency: self.currency, balance: self.balance });
            }
          }).catch(function (error) {
            if (!settled) {
              settled = true;
              reject(error);
            }
          });
        }).catch(function (error) {
          if (!settled) {
            settled = true;
            reject(error);
          }
        });
      };
      self.socket.onmessage = function (event) {
        var message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          return;
        }
        if (message.msg_type === "balance" && message.balance) {
          self.balance = message.balance.balance;
          if (typeof self.onBalance === "function") self.onBalance(message.balance);
        }
        var request = self.pending[message.req_id];
        if (!request) return;
        delete self.pending[message.req_id];
        if (message.error) request.reject(new Error(message.error.message || "Deriv request failed."));
        else request.resolve(message);
      };
      self.socket.onerror = function () {
        if (!settled) {
          settled = true;
          reject(new Error("Could not connect to Deriv."));
        }
      };
      self.socket.onclose = function () {
        self.connected = false;
        Object.keys(self.pending).forEach(function (key) {
          self.pending[key].reject(new Error("Deriv connection closed."));
          delete self.pending[key];
        });
        if (typeof self.onDisconnect === "function") self.onDisconnect();
      };
    });
  };

  DerivLiveClient.prototype.buy = async function (order) {
    if (!this.connected) throw new Error("Connect a Deriv account first.");
    var symbol = SYMBOLS[order.market];
    if (!symbol) throw new Error("This market is not supported for live orders.");
    var isDigit = order.contract === "Even / Odd";
    var contractType;
    if (order.contract === "Higher / Lower") {
      contractType = order.direction === "BUY" ? "CALL" : "PUT";
    } else if (isDigit) {
      contractType = order.direction === "BUY" ? "DIGITEVEN" : "DIGITODD";
    } else {
      throw new Error("Live Over / Under contracts are not enabled yet.");
    }
    var proposalResponse = await this.request({
      proposal: 1,
      amount: order.stake,
      basis: "stake",
      contract_type: contractType,
      currency: this.currency,
      duration: isDigit ? 1 : 5,
      duration_unit: "t",
      symbol: symbol
    });
    var proposal = proposalResponse.proposal;
    if (!proposal || !proposal.id) throw new Error("Deriv did not return a valid proposal.");
    var buyResponse = await this.request({ buy: proposal.id, price: Number(proposal.ask_price) });
    var bought = buyResponse.buy || {};
    return {
      contractId: bought.contract_id,
      buyPrice: bought.buy_price,
      payout: bought.payout,
      balanceAfter: bought.balance_after,
      currency: this.currency,
      symbol: symbol
    };
  };

  DerivLiveClient.prototype.disconnect = function () {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
    this.socket = null;
    this.connected = false;
    this.currency = "";
    this.loginId = "";
    this.balance = null;
    Object.keys(this.pending).forEach(function (key) {
      this.pending[key].reject(new Error("Deriv connection closed."));
      delete this.pending[key];
    }, this);
  };

  window.DiceiceDeriv = {
    createClient: function () { return new DerivLiveClient(); },
    symbols: SYMBOLS
  };
}());