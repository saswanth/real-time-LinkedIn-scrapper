const domainInput = document.getElementById("domainInput");
const connectButton = document.getElementById("connectButton");
const singleFetchButton = document.getElementById("singleFetchButton");

const statusText = document.getElementById("statusText");
const refreshText = document.getElementById("refreshText");
const companyList = document.getElementById("companyList");
const signalGrid = document.getElementById("signalGrid");
const jobAnalytics = document.getElementById("jobAnalytics");
const rawOutput = document.getElementById("rawOutput");

let source;

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.style.color = isError ? "#b02a10" : "#0e7c66";
}

function renderSnapshot(payload) {
  const insights = payload?.insights || {};
  const snapshot = insights.companySnapshot || {};
  const signals = insights.insightSignals || {};
  const jobs = insights.jobAnalytics || {};

  companyList.innerHTML = [
    ["Name", snapshot.name || "-"],
    ["Industry", snapshot.industry || "-"],
    ["HQ", snapshot.headquarters || "-"],
    ["Followers", snapshot.followers ?? "-"],
    [
      "Employee Range",
      snapshot.employeeRange
        ? `${snapshot.employeeRange.start || 0} - ${snapshot.employeeRange.end || 0}`
        : "-"
    ]
  ]
    .map(([label, value]) => `<li><strong>${label}:</strong> ${value}</li>`)
    .join("");

  signalGrid.innerHTML = Object.entries(signals)
    .map(
      ([key, value]) =>
        `<div class="signal"><span>${key}</span><strong>${value}</strong></div>`
    )
    .join("");

  jobAnalytics.innerHTML = `
    <p><strong>Estimated Openings:</strong> ${jobs.estimatedOpeningsBand ?? "-"}</p>
    <p><strong>Hiring Urgency:</strong> ${jobs.hiringUrgency ?? "-"}</p>
    <p><strong>Market Story:</strong> ${jobs.marketStory ?? "-"}</p>
    <p><strong>Top Role Themes</strong></p>
    <ul>${(jobs.topRoleThemes || [])
      .map((role) => `<li>${role}</li>`)
      .join("")}</ul>
  `;

  refreshText.textContent = new Date().toLocaleString();
  rawOutput.textContent = JSON.stringify(payload.rawCompanyData, null, 2);
}

async function fetchOnce() {
  const domain = domainInput.value.trim() || "apple.com";
  setStatus("Fetching snapshot...");

  try {
    const response = await fetch(`/api/company?domain=${encodeURIComponent(domain)}`);
    const payload = await response.json();

    if (!payload.success) {
      throw new Error(payload.message || "Request failed");
    }

    renderSnapshot(payload);
    setStatus("Snapshot updated");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function connectStream() {
  const domain = domainInput.value.trim() || "apple.com";

  if (source) {
    source.close();
  }

  source = new EventSource(`/api/stream?domain=${encodeURIComponent(domain)}`);
  setStatus(`Streaming live data for ${domain}...`);

  source.addEventListener("insights", (event) => {
    const payload = JSON.parse(event.data);
    renderSnapshot(payload);
    setStatus(`Live feed active for ${domain}`);
  });

  source.addEventListener("error", (event) => {
    try {
      const payload = JSON.parse(event.data);
      setStatus(payload.message || "Stream error", true);
    } catch {
      setStatus("Stream disconnected", true);
    }
  });
}

connectButton.addEventListener("click", connectStream);
singleFetchButton.addEventListener("click", fetchOnce);

fetchOnce();
