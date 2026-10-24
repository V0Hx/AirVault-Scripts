// ==UserScript==
// @name         AirVault — Private Banker Console
// @namespace    airvault.torn.travel.banker
// @version      0.5.3
// @updateURL    https://raw.githubusercontent.com/V0Hx/AirVault-Scripts/main/userscript/airvault-banker.user.js
// @downloadURL  https://raw.githubusercontent.com/V0Hx/AirVault-Scripts/main/userscript/airvault-banker.user.js
// @description  Operator interface. Banker access requires server-side Torn identity verification. Shared AirVault backend required; local prototype.
// @match        https://www.torn.com/*
// @match        https://torn.com/*
// @run-at       document-idle
// @noframes
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.xmlHttpRequest
// @grant        GM.registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      ezkwoxnbpwyegeouxqon.supabase.co
// @connect      127.0.0.1
// @connect      localhost
// ==/UserScript==
"use strict";
(() => {
  // userscript/client.js
  (async () => {
    "use strict";
    let STORE = "airvault.banker.v3", EXPECTED_ROLE = "banker", gm = typeof GM < "u" ? GM : null, cached = /* @__PURE__ */ new Map(), storageWarning = "", storageWrites = Promise.resolve();
    for (let key of ["endpoint", "token", "pending", "launcherSeen"])
      try {
        let full = `${STORE}.${key}`, value = typeof GM_getValue == "function" ? GM_getValue(full, "") : typeof gm?.getValue == "function" ? await gm.getValue(full, "") : "";
        cached.set(key, value);
      } catch {
        storageWarning = "AirVault storage could not be read. Check userscript permissions.";
      }
    let get = (key) => cached.get(key) ?? "";
    function persist(key, value, deleting = !1) {
      let full = `${STORE}.${key}`;
      deleting ? cached.delete(key) : cached.set(key, value);
      let write = () => {
        if (deleting) {
          if (typeof GM_deleteValue == "function") return GM_deleteValue(full);
          if (typeof gm?.deleteValue == "function") return gm.deleteValue(full);
        } else {
          if (typeof GM_setValue == "function") return GM_setValue(full, value);
          if (typeof gm?.setValue == "function") return gm.setValue(full, value);
        }
        throw new Error("Userscript storage is unavailable. Enable the script in Tampermonkey.");
      };
      return storageWrites = storageWrites.then(write, write), storageWrites.catch(() => console.warn("[AirVault] Userscript storage write failed.")), storageWrites;
    }
    let set = (key, value) => persist(key, value), remove = (key) => persist(key, void 0, !0), HOSTED_SERVICE = "https://ezkwoxnbpwyegeouxqon.supabase.co/functions/v1/AirVault", endpoint = get("endpoint") || HOSTED_SERVICE, token = get("token"), state = null, open = !get("launcherSeen"), busy = !1, polling = !1, error = storageWarning, notice = "";
    !get("pending") && ["https://ezkwoxnbpwyegeouxqon.supabase.co", "https://ezkwoxnbpwyegeouxqon.supabase.co/", "https://ezkwoxnbpwyegeouxqon.supabase.co/functions/v1/airvault", "https://ezkwoxnbpwyegeouxqon.supabase.co/functions/v1/airvault/"].includes(endpoint) && (endpoint = HOSTED_SERVICE, token = "", await remove("token"), await set("endpoint", endpoint));
    let epoch = 0, registration = !1, settings = !endpoint, queueFilter = "open", customerQuery = "", uncertain = get("pending") || null;
    uncertain && uncertain.endpoint !== endpoint && (uncertain = null);
    let pendingRender = !1, stateReceivedAt = Date.now(), host = document.createElement("div");
    host.id = "airvault-banker-userscript", host.style.cssText = "all:initial;position:fixed!important;right:16px!important;top:80px!important;z-index:2147483647!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;";
    let shadow = host.attachShadow({ mode: "closed" });
    document.body.append(host), new MutationObserver(scheduleDock).observe(document.documentElement, { childList: !0, subtree: !0, attributes: !0, attributeFilter: ["class", "hidden"] });
    let style = document.createElement("style");
    style.textContent = `
    :host{all:initial}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer}
    .av{font:14px/1.5 system-ui,sans-serif;color:#e9edf1;color-scheme:dark;text-align:left}
    .launcher{border:1px solid #d3b475;border-radius:24px;padding:12px 20px;background:#c8aa6c;color:#171d25;font-weight:750;box-shadow:0 5px 24px #0008}
    .panel{width:min(410px,calc(100vw - 32px));max-height:calc(100dvh - 104px);overflow:auto;border:1px solid #49515d;border-radius:12px;background:#151b23;box-shadow:0 8px 40px #000a}
    header{position:sticky;top:0;background:#1d2530;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #38404c;z-index:1}
    header strong{letter-spacing:2px;color:#d4b87c}main{padding:16px}h2{font-size:18px;margin:0 0 12px}h3{font-size:14px;margin:14px 0 8px}p{margin:8px 0 12px;color:#b6c0cd}small{font-size:11px;color:#9ba8b9;display:block;overflow-wrap:anywhere}
    button{border:1px solid #c8aa6c;border-radius:6px;background:#c8aa6c;color:#171d25;font-weight:650;padding:9px 12px;margin:4px 4px 4px 0}
    button:disabled{opacity:.45;cursor:not-allowed}.ghost{background:transparent;color:#c8d1df;border-color:#46505f}.close{margin:0;padding:3px 10px}
    form{display:grid;gap:10px;margin:12px 0}label{display:grid;gap:4px;font-size:12px;color:#c5ceda}table{width:100%;border-collapse:collapse;font-size:11px;margin:12px 0}th,td{text-align:left;vertical-align:top;padding:7px;border:1px solid #35404f}th{width:30%;color:#d7bc82}input,select,textarea{width:100%;min-width:0;border:1px solid #46515f;border-radius:5px;background:#10161e;color:#eff3f8;padding:9px}input:focus,select:focus,button:focus-visible{outline:2px solid #d8bd82;outline-offset:2px}
    .check{display:flex;gap:8px;align-items:start}.check input{width:17px;height:17px;flex-shrink:0}
    article{border-top:1px solid #343d49;margin-top:14px;padding-top:12px}.amount{font-size:23px;font-weight:700;display:block;color:#e5d1a8}.status{color:#e0bf79;font-size:12px}.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}.stat{background:#212a36;border:1px solid #35404f;border-radius:6px;padding:10px}.stat strong{display:block;font-size:17px;font-variant-numeric:tabular-nums}
    .warning,.error,.notice{padding:10px;border-radius:6px;margin-bottom:12px;font-size:12px}.warning{background:#332d1d;color:#e0c68f}.error{background:#472c33;color:#f4bbc5;overflow-wrap:anywhere}.notice{background:#203b33;color:#a5dec4}.row{display:flex;gap:6px;flex-wrap:wrap}.activity{padding:9px 0;border-top:1px solid #303947;font-size:12px}footer{border-top:1px solid #343d49;padding:12px 16px;font-size:11px;color:#9aa9ba}
    @media(max-width:480px){.panel{max-height:calc(100dvh - 104px)}}`, shadow.append(style);
    let root = document.createElement("div");
    root.className = "av", shadow.append(root);
    let cash = (n) => "$" + Number(n || 0).toLocaleString("en-US");
    function node(tag, text, attrs = {}) {
      let element = document.createElement(tag);
      return text != null && (element.textContent = text), Object.assign(element, attrs), element;
    }
    function button(text, fn, secondary = !1) {
      let b = node("button", text, { type: "button", className: secondary ? "ghost" : "" });
      return b.disabled = busy, b.addEventListener("click", fn), b;
    }
    function field(form, text, name, attrs = {}) {
      let label = node("label", text), input = node("input", null, { name, ...attrs });
      return input.required = !0, label.append(input), form.append(label), input;
    }
    function validEndpoint(value) {
      let url = new URL(value);
      if (url.username || url.password || url.search || url.hash || !["/", "/functions/v1/AirVault", "/functions/v1/AirVault/"].includes(url.pathname)) throw new Error("Use an AirVault service URL, without credentials or query parameters.");
      if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) throw new Error("HTTPS is required, except for a local test server.");
      return url.origin + url.pathname.replace(/\/$/, "");
    }
    async function request(path, data, key, sessionOverride) {
      await storageWrites;
      let base = validEndpoint(endpoint), session = sessionOverride ?? token, send = typeof GM_xmlhttpRequest == "function" ? GM_xmlhttpRequest : gm?.xmlHttpRequest?.bind(gm);
      if (typeof send != "function") throw new Error("Userscript network API unavailable. Check Tampermonkey permissions.");
      return new Promise((resolve, reject) => send({
        method: data === void 0 ? "GET" : "POST",
        url: base + "/api/script/" + path,
        headers: { "Content-Type": "application/json", ...session ? { Authorization: `Bearer ${session}` } : {}, ...key ? { "Idempotency-Key": key } : {} },
        data: data === void 0 ? void 0 : JSON.stringify(data),
        anonymous: !0,
        timeout: 15e3,
        onload: (response) => {
          if (response.finalUrl && new URL(response.finalUrl).origin !== new URL(base).origin) {
            reject(new Error("Unexpected service redirect. Check your configured host."));
            return;
          }
          let result;
          try {
            result = JSON.parse(response.responseText);
          } catch {
            reject(new Error("The configured service did not return an AirVault response."));
            return;
          }
          if (response.status === 401 && token === session && (token = "", remove("token"), state = null), response.status < 200 || response.status >= 300) {
            let err = new Error(result.error || "Service request failed.");
            err.status = response.status, reject(err);
          } else resolve(result);
        },
        onerror: () => reject(new Error("Cannot reach the service. Check its URL and Tampermonkey connection permissions.")),
        ontimeout: () => reject(new Error("Service timed out. The operation may have succeeded; refresh before retrying."))
      }));
    }
    async function refresh(manual = !1) {
      if (!token || !endpoint || polling || busy || settings) return;
      polling = !0;
      let version = epoch;
      try {
        let next = await request("state");
        if (version !== epoch) return;
        let changed = JSON.stringify({ ...next, now: 0 }) !== JSON.stringify({ ...state, now: 0 });
        if (next.actor.role !== EXPECTED_ROLE) throw new Error(`This script is for ${EXPECTED_ROLE} accounts. Sign out and use the other AirVault script.`);
        state = next, stateReceivedAt = Date.now(), pendingRender ||= changed, (error.startsWith("Cannot reach") || error.startsWith("Service timed out")) && (error = ""), open && (pendingRender || manual) && (manual || !shadow.activeElement) && render();
      } catch (e) {
        version === epoch && (error = e.message, open && !shadow.activeElement && render());
      } finally {
        polling = !1;
      }
    }
    async function mutate(operation, data) {
      if (busy) return;
      if (uncertain && uncertain.actorId !== state?.actor.id) {
        error = "The uncertain operation belongs to a different account. Sign in as its owner and reconcile it.", render();
        return;
      }
      let signature = JSON.stringify({ operation, data });
      if (uncertain && uncertain.signature !== signature) {
        error = "A previous operation has an uncertain result. Refresh and reconcile it before starting a different action.", render();
        return;
      }
      let key = uncertain?.key || crypto.randomUUID();
      uncertain = { operation, data, key, signature, endpoint, actorId: state.actor.id }, set("pending", uncertain), busy = !0, error = "", notice = "", render();
      try {
        await request("actions/" + operation, data, key), uncertain = null, remove("pending"), notice = "Recorded by the service.";
      } catch (e) {
        error = e.message, e.status && e.status < 500 && (uncertain = null, remove("pending"));
      } finally {
        busy = !1, await refresh(!0), render();
      }
    }
    function formSubmit(form, action) {
      form.addEventListener("submit", (event) => {
        event.preventDefault(), busy || action(new FormData(form));
      });
    }
    function renderSettings(main) {
      main.append(node("h2", "Connect your AirVault service"), node("p", "Use the AirVault service URL. Its database and function must be deployed before sign-in works."));
      let form = node("form"), url = field(form, "Service URL", "endpoint", { type: "url", value: endpoint, placeholder: "https://your-airvault-service.example" });
      form.append(node("small", "Only use a service you trust. Your Torn API key and session are sent to this host. Changing hosts signs you out."));
      let save = node("button", "Save service URL", { type: "submit" });
      save.disabled = busy, form.append(save), formSubmit(form, () => {
        try {
          let next = validEndpoint(url.value.trim());
          if (uncertain) throw new Error("Resolve the uncertain operation before changing the service.");
          next !== endpoint && (epoch++, token = "", state = null, remove("token")), endpoint = next, set("endpoint", endpoint), settings = !1, error = "", render(), refresh(!0);
        } catch (e) {
          error = e.message, render();
        }
      }), main.append(form, button("Use hosted AirVault service", () => {
        url.value = HOSTED_SERVICE;
      }, !0), button("Use local test server", () => {
        url.value = "http://127.0.0.1:3000";
      }, !0)), endpoint && main.append(button("Back", () => {
        settings = !1, render(), refresh(!0);
      }, !0));
    }
    function renderAuth(main) {
      main.append(node("h2", "Banker API-key sign in")), main.append(node("p", "No AirVault registration or password is needed. Your key is checked by the service against Torn."));
      let disclosure = node("table");
      for (let [label, value] of [
        ["Data storage", "Identity, connection history, wallet and audit records are stored persistently. Audit records are retained indefinitely."],
        ["Data sharing", "The service operator can view service records. Customers can view their own records."],
        ["Purpose", "Collateral-backed travel funding and transaction records."],
        ["Key storage and sharing", "Sent securely to AirVault and Torn for sign-in; not retained in script storage or the database."],
        ["Key access level", "Public identity access only. Travel and activity-log monitoring are not enabled."]
      ]) {
        let row = node("tr");
        row.append(node("th", label), node("td", value)), disclosure.append(row);
      }
      main.append(disclosure);
      let form = node("form"), key = field(form, "Torn API key", "apiKey", { type: "password", minLength: 16, maxLength: 16, pattern: "[A-Za-z0-9]{16}", autoComplete: "off" }), consent = node("label", null, { className: "check" }), check = node("input", null, { type: "checkbox", required: !0 });
      consent.append(check, document.createTextNode("I understand the data and key usage described above.")), form.append(consent);
      let submit = node("button", "Verify Torn identity", { type: "submit" });
      submit.disabled = busy, form.append(submit), formSubmit(form, async (data) => {
        busy = !0, error = "";
        let version = epoch;
        submit.disabled = !0;
        try {
          let login = await request("auth/login", { apiKey: data.get("apiKey") });
          if (key.value = "", version !== epoch) return;
          if (login.actor?.role !== EXPECTED_ROLE)
            throw await request("logout", {}, void 0, login.token), new Error(`This script is for ${EXPECTED_ROLE} accounts. Use the other AirVault script.`);
          token = login.token, await set("token", token);
        } catch (e) {
          key.value = "", error = e.message;
        } finally {
          busy = !1, version === epoch && (await refresh(!0), render());
        }
      }), main.append(form);
    }
    function stat(target, label, value) {
      let cell = node("div", null, { className: "stat" });
      cell.append(node("small", label), node("strong", cash(value))), target.append(cell);
    }
    let fundingForm = null, bankerForms = function(main) {
      let details = node("details"), summary = node("summary", "Banker controls: cash and deposits");
      details.append(summary);
      let serviceForm = node("form"), availability = node("label", null, { className: "check" }), toggle = node("input", null, { type: "checkbox", name: "acceptingRequests", checked: state.service.acceptingRequests });
      availability.append(toggle, document.createTextNode("Accept new funding requests")), serviceForm.append(availability), field(serviceForm, "Confirmation window (seconds)", "handshakeSeconds", { type: "number", min: 10, max: 300, value: String(state.service.handshakeSeconds) }), field(serviceForm, "Emergency cash reserve", "emergencyReserve", { type: "number", min: 0, max: 1e14, value: String(state.bank.emergencyReserve) }), serviceForm.append(node("small", "The reserve protects cash from new requests. Existing payouts remain committed. Current confirmation deadlines keep their original expiry."));
      let saveService = node("button", "Save service settings", { type: "submit" });
      saveService.disabled = busy, serviceForm.append(saveService), formSubmit(serviceForm, (data) => mutate("service", { acceptingRequests: data.has("acceptingRequests"), handshakeSeconds: Number(data.get("handshakeSeconds")), emergencyReserve: Number(data.get("emergencyReserve")) })), details.append(serviceForm);
      let bankForm = node("form");
      field(bankForm, "Liquid cash actually held", "cash", { type: "number", min: 0, max: 1e14, value: String(state.bank.cash) }), field(bankForm, "Value per Xanax for future deposits", "valuation", { type: "number", min: 1, max: 1e12, value: String(state.bank.valuation) });
      let reconcile = node("button", "Record cash reconciliation", { type: "submit" });
      reconcile.disabled = busy, bankForm.append(reconcile), formSubmit(bankForm, (data) => mutate("bank", { cash: Number(data.get("cash")), valuation: Number(data.get("valuation")) })), details.append(bankForm);
      let deposit = node("form"), label = node("label", "Customer"), select = node("select", null, { name: "userId", required: !0 });
      select.append(node("option", "Select a customer", { value: "" }));
      for (let c of state.customers) select.append(node("option", `${c.name} #${c.tornId}`, { value: c.id }));
      label.append(select), deposit.append(label), field(deposit, "Xanax actually received", "quantity", { type: "number", min: 1, max: 1e6 }), field(deposit, "Unique deposit receipt reference", "reference", { minLength: 3, maxLength: 160 });
      let received = node("button", "Confirm received collateral", { type: "submit" });
      received.disabled = busy || !state.customers.length, deposit.append(received), formSubmit(deposit, (data) => mutate("deposit", { userId: data.get("userId"), quantity: Number(data.get("quantity")), reference: data.get("reference") })), details.append(deposit), main.append(details);
    }, bankerCustomers = function(main) {
      let directory = node("details");
      directory.append(node("summary", `Customer accounts (${state.customers.length})`));
      let label = node("label", "Search by name or Torn ID"), search = node("input", null, { type: "search", value: customerQuery, placeholder: "Find a traveler" });
      label.append(search), directory.append(label);
      let entries = [];
      for (let customer of state.customers) {
        let entry = node("details");
        entry.append(node("summary", `${customer.name} #${customer.tornId} \xB7 ${customer.status}`)), entry.append(node("p", `${cash(customer.available)} available \xB7 ${cash(customer.principal)} outstanding \xB7 ${cash(customer.reserved)} reserved`), node("small", `${customer.depositedQuantity} Xanax recorded as deposited; original values remain locked. Identity verified by Torn.`)), customer.lastSeen && entry.append(node("small", "Last connected: " + new Date(customer.lastSeen).toLocaleString()));
        let form = node("form"), statusLabel = node("label", "Account status"), status = node("select", null, { name: "status", required: !0 });
        for (let value of ["active", "suspended"]) status.append(node("option", value, { value, selected: customer.status === value }));
        statusLabel.append(status), form.append(statusLabel);
        let notesLabel = node("label", "Private banker notes"), notes = node("textarea", null, { name: "notes", value: customer.notes, maxLength: 2e3, rows: 3 });
        notesLabel.append(notes), form.append(notesLabel), form.append(node("small", "Suspension blocks funding and resets readiness. It preserves balances and reservations; review pending requests to cancel them if needed."));
        let save = node("button", "Save customer record", { type: "submit" });
        save.disabled = busy, form.append(save), formSubmit(form, (data) => mutate("customer", { userId: customer.id, status: data.get("status"), notes: data.get("notes") })), entry.append(form), directory.append(entry), entries.push({ entry, text: `${customer.name} ${customer.tornId}`.toLocaleLowerCase() });
      }
      let filter = () => {
        let query = customerQuery.trim().toLocaleLowerCase();
        for (let { entry, text } of entries) entry.hidden = !text.includes(query);
      };
      search.addEventListener("input", () => {
        customerQuery = search.value, filter();
      }), filter(), main.append(directory);
    };
    function renderRequest(main, r) {
      let item = node("article");
      if (item.append(node("strong", cash(r.amount), { className: "amount" }), node("span", r.status.replaceAll("_", " "), { className: "status" }), node("p", `${r.name + " #" + r.tornId + " \xB7 "}${r.destination}`), node("small", `Fee: ${r.feeQuantity} ${r.feeItem} \xB7 ${r.feeReceived ? "received" : "not received"}`)), r.deadline) {
        let deadline = node("p", null, { className: "countdown" });
        deadline.dataset.deadline = String(r.deadline), item.append(deadline);
      }
      let messages = { pending: "Waiting for banker review.", banker_ready: "Banker is ready. Traveler must confirm readiness.", customer_ready: "Traveler confirmed. Banker must manually send cash in Torn before this window expires.", sent: "Recorded as manually sent. Check Torn. Principal remains outstanding.", completed: "Principal repaid; credit restored.", cancelled: "Cancelled; reserved credit released." };
      item.append(node("p", messages[r.status] || r.status));
      let actions = node("div", null, { className: "row" });
      if (r.status === "pending" && actions.append(button("Ready to fund", () => mutate("ready", { requestId: r.id }))), ["pending", "banker_ready", "customer_ready"].includes(r.status) && actions.append(button("Decline / cancel", () => mutate("cancel", { requestId: r.id }), !0)), item.append(actions), ["customer_ready", "sent"].includes(r.status) || r.status === "completed" && !r.feeReceived) {
        let form = node("form");
        field(form, "Unique actual transfer / receipt reference", "reference", { minLength: 3, maxLength: 160 });
        let add = (text, op) => {
          let b = node("button", text, { type: "submit" });
          b.disabled = busy, b.value = op, form.append(b);
        };
        r.status === "customer_ready" && add("Confirm manually sent", "sent"), r.status === "sent" && add("Record full repayment received", "repay"), ["sent", "completed"].includes(r.status) && !r.feeReceived && add("Record 1 Xanax fee received", "fee"), form.addEventListener("submit", (event) => {
          event.preventDefault(), !busy && event.submitter && mutate(event.submitter.value, { requestId: r.id, reference: new FormData(form).get("reference") });
        }), item.append(form);
      }
      item.append(node("small", "Request " + r.id)), main.append(item);
    }
    let dockButton = null, dockVisible = !1, dockTimer = 0;
    function updateHostVisibility() {
      host.style.setProperty("display", !open && dockVisible ? "none" : "block", "important");
    }
    function syncDock() {
      !host.isConnected && document.body && document.body.append(host);
      let people = document.getElementById("people_panel_button") || document.querySelector('[id*="people_panel_button"], [aria-label="People" i]'), row = people?.parentElement, bounds = people?.getBoundingClientRect();
      if (!!(row && bounds?.width && bounds?.height && people.getClientRects().length && getComputedStyle(people).visibility !== "hidden")) {
        dockButton || (dockButton = document.createElement("button"), dockButton.type = "button", dockButton.id = "airvault-banker-dock", dockButton.title = "AirVault Banker", dockButton.setAttribute("aria-label", "Open AirVault Banker"), dockButton.textContent = "AV\xB7B", dockButton.style.cssText = "display:flex;position:relative;flex:0 0 auto;align-items:center;justify-content:center;min-width:34px;min-height:30px;padding:0 5px;margin:0;border:1px solid #6b614a;border-radius:5px;background:linear-gradient(#34414c,#17212a);color:#e0c386;font:700 12px system-ui;cursor:pointer;", dockButton.addEventListener("click", (event) => {
          event.preventDefault(), event.stopPropagation(), open = !0, render(), refresh(!0);
        }));
        let classes = [...people.classList].filter((name) => !name.includes("opened")).join(" ");
        dockButton.className !== classes && (dockButton.className = classes), dockButton.parentElement !== row && row.append(dockButton);
        let box = dockButton.getBoundingClientRect();
        dockVisible = !!(box.width && box.height && box.right > 0 && box.left < innerWidth && box.bottom > 0 && box.top < innerHeight);
      } else
        dockButton?.remove(), dockVisible = !1;
      updateHostVisibility();
    }
    function scheduleDock() {
      dockTimer || (dockTimer = setTimeout(() => {
        dockTimer = 0, syncDock();
      }, 80));
    }
    function tick() {
      for (let el of shadow.querySelectorAll("[data-deadline]")) {
        let remaining = Math.max(0, Math.ceil((Number(el.dataset.deadline) - (state?.now || Date.now()) - (Date.now() - stateReceivedAt)) / 1e3));
        el.textContent = remaining ? `Confirmation window: ${remaining}s` : "Confirmation expired. Refreshing; a new handshake is required.";
      }
    }
    function render() {
      if (pendingRender = !1, updateHostVisibility(), host.style.setProperty("top", "80px", "important"), root.replaceChildren(), !open) {
        root.append(button("AirVault Banker", () => {
          open = !0, render(), refresh(!0);
        })), root.firstChild.className = "launcher";
        return;
      }
      let panel = node("section", null, { className: "panel" });
      panel.setAttribute("aria-label", "AirVault travel wallet");
      let header = node("header");
      header.append(node("strong", "AIRVAULT \xB7 BANKER"), button("Close", () => {
        open = !1, render();
      }, !0)), panel.append(header);
      let main = node("main");
      if (main.append(node("div", "TEST SERVICE \xB7 API-key sign-in. Transfers in Torn are always manual. Use test records until the service is validated.", { className: "warning" })), error && main.append(node("div", error, { className: "error", role: "alert" })), notice && main.append(node("div", notice, { className: "notice", role: "status" })), uncertain && main.append(node("div", "An operation has an uncertain result. Retry the same operation safely, or refresh and reconcile before clearing it.", { className: "warning" }), button("Retry same operation", () => mutate(uncertain.operation, uncertain.data)), button("I reconciled the result \u2014 clear retry", () => {
        uncertain = null, remove("pending"), error = "", render();
      }, !0)), settings || !endpoint) renderSettings(main);
      else if (!token) renderAuth(main);
      else if (!state)
        main.append(node("p", "Connecting to your wallet\u2026"), button("Refresh", () => {
          refresh(!0);
        }, !0));
      else {
        main.append(node("h2", "Master desk"), node("small", `${state.actor.name} #${state.actor.tornId} \xB7 Torn identity verified`));
        let stats = node("div", null, { className: "stats" });
        stat(stats, "Liquid cash", state.bank.cash), stat(stats, "Customer liabilities", state.bank.liability), stat(stats, "Reserved payouts", state.bank.reserved), stat(stats, "Coverage surplus / shortfall", state.bank.free), main.append(stats), main.append(node("p", state.service.acceptingRequests ? "Service: accepting new funding requests." : "Service: paused for new funding requests."));
        {
          let statusAction = button(state.service.acceptingRequests ? "Pause new requests" : "Start accepting requests", () => mutate("service", { acceptingRequests: !state.service.acceptingRequests, handshakeSeconds: state.service.handshakeSeconds, emergencyReserve: state.bank.emergencyReserve }));
          main.append(statusAction), main.append(node("small", `${cash(state.bank.allocatable)} available for new payouts after reservations and emergency reserve.`)), state.bank.free < 0 && main.append(node("div", `Liquidity shortfall: ${cash(-state.bank.free)} against customer wallet liabilities.`, { className: "warning" })), bankerForms(main), bankerCustomers(main);
        }
        main.append(node("h3", "Funding queue"));
        let visible = state.requests;
        {
          let filters = node("div", null, { className: "row" });
          for (let [value, title] of [["open", "Open requests"], ["outstanding", "Principal / fees due"], ["history", "History"], ["all", "All requests"]]) {
            let pick = button(title, () => {
              queueFilter = value, render();
            }, queueFilter !== value);
            pick.setAttribute("aria-pressed", String(queueFilter === value)), filters.append(pick);
          }
          main.append(filters), visible = state.requests.filter((r) => queueFilter === "all" || queueFilter === "open" && ["pending", "banker_ready", "customer_ready"].includes(r.status) || queueFilter === "outstanding" && (r.status === "sent" || r.status === "completed" && !r.feeReceived) || queueFilter === "history" && ["completed", "cancelled"].includes(r.status)), visible.sort((a, b) => {
            let urgency = { customer_ready: 0, pending: 1, banker_ready: 2, sent: 3, completed: 4, cancelled: 5 };
            return (urgency[a.status] ?? 9) - (urgency[b.status] ?? 9) || a.created - b.created;
          });
        }
        visible.length || main.append(node("p", "No requests in this view."));
        for (let r of visible.slice(0, 30)) renderRequest(main, r);
        visible.length > 30 && main.append(node("small", `Showing the first 30 of ${visible.length} requests.`));
        let activity = node("details");
        activity.append(node("summary", "Recent activity"));
        for (let event of state.activity.slice(0, 20)) {
          let line = node("div", null, { className: "activity" });
          line.append(node("strong", event.kind.replaceAll("_", " ")), node("small", (event.amount ? cash(event.amount) + " \xB7 " : "") + event.note)), activity.append(line);
        }
        main.append(activity);
      }
      let footer = node("footer");
      footer.append(node("small", endpoint || "No service configured"), button("Service settings", () => {
        settings = !0, error = "", render();
      }, !0)), token && footer.append(button("Refresh", () => {
        refresh(!0);
      }, !0), button("Sign out", async () => {
        if (!busy) {
          if (uncertain) {
            error = "Reconcile the uncertain operation before signing out.", render();
            return;
          }
          busy = !0;
          try {
            await request("logout", {}), epoch++, token = "", state = null, remove("token"), error = "";
          } catch (e) {
            error = "Sign out could not be confirmed. Retry to revoke the service session. " + e.message;
          } finally {
            busy = !1, render();
          }
        }
      }, !0)), panel.append(main, footer), root.append(panel), tick();
    }
    let menu = typeof GM_registerMenuCommand == "function" ? GM_registerMenuCommand : gm?.registerMenuCommand?.bind(gm);
    if (typeof menu == "function")
      try {
        menu("Open AirVault Banker", () => {
          open = !0, render(), refresh(!0);
        }), menu("AirVault service settings", () => {
          open = !0, settings = !0, render();
        });
      } catch {
        console.warn("[AirVault] Extension menu shortcuts unavailable; on-page buttons remain active.");
      }
    window.addEventListener("resize", scheduleDock), window.addEventListener("pageshow", scheduleDock), setInterval(() => {
      document.hidden || syncDock();
    }, 2e3), setInterval(() => {
      open && !document.hidden && refresh();
    }, 2500), setInterval(tick, 1e3), render(), syncDock(), set("launcherSeen", !0);
  })();
})();

// AIRVAULT BANKER SCRIPT END
