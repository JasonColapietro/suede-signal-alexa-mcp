/* A real, same-origin MCP client. Prompts and browser speech simulate the
   interaction; all audit results come from tools/call on the live server. */
(() => {
  const $ = (id) => document.getElementById(id);
  const protocol = "2025-11-25";
  let connected = false;
  let busy = false;
  let id = 0;
  let answerText = "";
  const requiredTools = ["check_ai_visibility", "compare_ai_visibility", "explain_ai_visibility_area"];

  function setStatus(text) {
    $("status").textContent = text;
    $("status").dataset.connected = String(connected);
  }

  function log(method, payload, status, response, elapsed) {
    $("rpc-log").querySelector(".empty-log")?.remove();
    const li = document.createElement("li");
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const title = document.createElement("span");
    title.textContent = method === "tools/call" ? payload.params.name : method;
    const meta = document.createElement("span");
    meta.textContent = `${status} · ${elapsed} ms`;
    summary.append(title, meta);
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify({ request: payload, response }, null, 2);
    details.append(summary, pre);
    li.append(details);
    $("rpc-log").append(li);
    // Bounded UI history; a long judge session cannot grow the DOM indefinitely.
    while ($("rpc-log").children.length > 12) $("rpc-log").firstElementChild.remove();
  }

  async function rpc(method, params = {}, notification = false) {
    const payload = { jsonrpc: "2.0", ...(notification ? {} : { id: ++id }), method, ...(notification ? {} : { params }) };
    const started = performance.now();
    let response;
    try {
      response = await fetch("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": protocol },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });
    } catch {
      log(method, payload, "network error", null, Math.round(performance.now() - started));
      connected = false;
      throw new Error("The MCP server did not respond. Check your connection and try again.");
    }
    const raw = await response.text();
    let body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch {
      log(method, payload, response.status, "Unexpected response format", Math.round(performance.now() - started));
      connected = false;
      throw new Error("The server returned an unreadable response. Try reconnecting.");
    }
    log(method, payload, response.status, body, Math.round(performance.now() - started));
    if (!response.ok || body?.error) {
      connected = false;
      throw new Error(body?.error?.message || `MCP request failed (${response.status}). Try reconnecting.`);
    }
    return body?.result;
  }

  async function connect() {
    connected = false;
    setStatus("Connecting to MCP…");
    const info = await rpc("initialize", { protocolVersion: protocol, capabilities: {}, clientInfo: { name: "suede-signal-judge-demo", version: "1.1.0" } });
    if (info?.protocolVersion !== protocol) throw new Error("The server did not negotiate the required MCP version.");
    await rpc("notifications/initialized", {}, true);
    const result = await rpc("tools/list");
    if (!requiredTools.every((name) => result?.tools?.some((tool) => tool.name === name))) throw new Error("The server did not list all three expected tools.");
    connected = true;
    setStatus(`Connected · ${result.tools.length} tools · ${info.protocolVersion}`);
    $("connect").textContent = "Reconnect";
  }

  function urlValue(field) {
    const input = $(field);
    const raw = input.value.trim();
    if (!raw) { input.focus(); throw new Error("Enter a website address first."); }
    try {
      const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) throw new Error();
      return url.href;
    } catch { input.focus(); throw new Error("Enter a public http or https website, such as example.com."); }
  }

  function scoreCard(report) {
    const card = document.createElement("div");
    card.className = "score";
    const value = document.createElement("strong");
    value.textContent = `${report.grade} · ${report.score}/100`;
    const label = document.createElement("span");
    label.textContent = report.url;
    card.append(value, label);
    return card;
  }

  async function run(action) {
    if (busy) return;
    busy = true;
    $("error").hidden = true;
    window.speechSynthesis?.cancel();
    // Validate before disabling inputs so an invalid address can receive focus.
    let args;
    try {
      if (action !== "connect") {
        args = { url: urlValue("site") };
        if (action === "compare") args.competitorUrl = urlValue("competitor");
        if (action === "explain") args.area = $("area").value;
      }
    } catch (error) {
      $("error").textContent = error.message;
      $("error").hidden = false;
      busy = false;
      return;
    }
    const controls = [...document.querySelectorAll("button, input, select")];
    controls.forEach((el) => { el.disabled = true; });
    try {
      if (!connected || action === "connect") await connect();
      if (action === "connect") return;
      const names = { check: "check_ai_visibility", compare: "compare_ai_visibility", explain: "explain_ai_visibility_area" };
      const titles = { check: "Your website check", compare: "A side-by-side comparison", explain: "A closer look" };
      setStatus("Running a live audit…");
      $("answer-title").textContent = "Checking the live page…";
      $("answer").textContent = "Waiting for the audit service. No new result yet.";
      $("scores").hidden = true;
      $("data-panel").hidden = true;
      $("speak").hidden = true;
      $("stop").hidden = true;
      const result = await rpc("tools/call", { name: names[action], arguments: args });
      if (!result || result.isError) throw new Error(result?.content?.find((c) => c.type === "text")?.text || "The audit did not return a result.");
      answerText = result.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
      $("answer-title").textContent = titles[action];
      $("action-label").textContent = "Live tool result · written to be spoken";
      $("answer").textContent = answerText;
      $("scores").replaceChildren();
      const data = result.structuredContent;
      if (action === "check" && data) $("scores").append(scoreCard(data));
      if (action === "compare" && data) $("scores").append(scoreCard(data.mine), scoreCard(data.competitor));
      $("scores").hidden = $("scores").children.length === 0;
      $("data-panel").hidden = !data;
      $("data-panel").open = false;
      $("data").textContent = data ? JSON.stringify(data, null, 2) : "";
      $("speak").hidden = !("speechSynthesis" in window);
      setStatus("Complete · real audit result");
    } catch (error) {
      if (action !== "connect") {
        $("answer-title").textContent = "No new audit result";
        $("answer").textContent = "The request did not complete. Correct the address or retry when the service is available.";
      }
      $("error").textContent = error.message || "The request could not be completed. Please try again.";
      $("error").hidden = false;
      setStatus(connected ? "Audit failed · you can retry" : "Disconnected · try again");
    } finally {
      busy = false;
      controls.forEach((el) => { el.disabled = false; });
    }
  }

  $("audit-form").addEventListener("submit", (event) => { event.preventDefault(); run("check"); });
  $("compare").addEventListener("click", () => run("compare"));
  $("explain").addEventListener("click", () => run("explain"));
  $("connect").addEventListener("click", () => run("connect"));
  $("speak").addEventListener("click", () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(answerText);
    utterance.lang = "en-US";
    utterance.onend = utterance.onerror = () => { $("stop").hidden = true; };
    $("stop").hidden = false;
    window.speechSynthesis.speak(utterance);
  });
  $("stop").addEventListener("click", () => { window.speechSynthesis.cancel(); $("stop").hidden = true; });
})();
