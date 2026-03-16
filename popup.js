const monitorView = document.getElementById("monitorView");
const addView = document.getElementById("addView");
const historyView = document.getElementById("historyView");
const historyContent = document.getElementById("historyContent");
const tabMonitor = document.getElementById("tabMonitor");
const tabHistory = document.getElementById("tabHistory");
const tabAdd = document.getElementById("tabAdd");
const add = document.getElementById("add");
const saveInterval = document.getElementById("saveInterval");
const historyRange = document.getElementById("historyRange");

const urlInput = document.getElementById("url");
const currencyInput = document.getElementById("currency");
const priceBelowInput = document.getElementById("priceBelow");
const priceAboveInput = document.getElementById("priceAbove");
const minIntervalInput = document.getElementById("minInterval");
const maxIntervalInput = document.getElementById("maxInterval");
const minChanceInput = document.getElementById("minChance");

const draftFields = [
  "url",
  "currency",
  "priceBelow",
  "priceAbove",
  "minInterval",
  "maxInterval",
  "minChance"
];

function setActiveTab(activeTab) {
  tabMonitor.classList.toggle("active", activeTab === "monitor");
  tabHistory.classList.toggle("active", activeTab === "history");
  tabAdd.classList.toggle("active", activeTab === "add");

  monitorView.style.display = activeTab === "monitor" ? "block" : "none";
  historyView.style.display = activeTab === "history" ? "block" : "none";
  addView.style.display = activeTab === "add" ? "block" : "none";
}

tabMonitor.onclick = () => {
  setActiveTab("monitor");
};

tabHistory.onclick = () => {
  setActiveTab("history");
  renderHistory();
};

tabAdd.onclick = () => {
  setActiveTab("add");
};

function toast(text) {
  const t = document.getElementById("toast");
  t.innerText = text;
  t.style.display = "block";
  setTimeout(() => {
    t.style.display = "none";
  }, 2000);
}

function parsePriceValue(value) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function getMarketHashName(link) {
  let parsed;

  try {
    parsed = new URL(link);
  } catch {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const listingsIndex = segments.indexOf("listings");

  if (listingsIndex === -1 || segments.length <= listingsIndex + 2) {
    return null;
  }

  const hashNameSegments = segments.slice(listingsIndex + 2);
  if (!hashNameSegments.length) return null;

  return decodeURIComponent(hashNameSegments.join("/"));
}

async function loadSettingsIntoForm() {
  const data = await chrome.storage.local.get("globalSettings");
  const settings = data.globalSettings || {};

  minIntervalInput.value = settings.minInterval ?? 60;
  maxIntervalInput.value = settings.maxInterval ?? 120;
  minChanceInput.value = settings.minChance ?? 30;
}

/* =========================
   АВТОСОХРАНЕНИЕ ЧЕРНОВИКА
========================= */

async function saveDraft() {
  const draft = {};
  draftFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) draft[id] = el.value;
  });
  await chrome.storage.local.set({ draftForm: draft });
}

async function restoreDraft() {
  const data = await chrome.storage.local.get("draftForm");
  if (!data.draftForm) return;

  draftFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el && data.draftForm[id] !== undefined) {
      el.value = data.draftForm[id];
    }
  });
}

draftFields.forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", saveDraft);
  }
});

/* =========================
   РЕНДЕР СПИСКА
========================= */


function formatHistoryTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function getHistoryPeriodMs() {
  const value = Number.parseInt(historyRange.value, 10);
  return Number.isFinite(value) ? value : 1800000;
}

async function renderHistory() {
  const data = await chrome.storage.local.get("priceHistory");
  const history = data.priceHistory || [];
  const threshold = Date.now() - getHistoryPeriodMs();

  const filtered = history
    .filter((entry) => entry.timestamp >= threshold)
    .sort((a, b) => b.timestamp - a.timestamp);

  historyContent.innerHTML = "";

  if (!filtered.length) {
    historyContent.innerHTML = '<div class="status">За выбранный период записей нет.</div>';
    return;
  }

  filtered.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "card history-card";

    const symbol = entry.currency === "37" ? "₸" : "₽";
    const eventLabel = entry.event === "trigger" ? "Сработал таргет" : "Проверка";

    card.innerHTML = `
      <div class="name">${entry.name}</div>
      <div>${eventLabel}: ${entry.price} ${symbol}</div>
      <div class="last">${formatHistoryTime(entry.timestamp)}</div>
    `;

    historyContent.appendChild(card);
  });
}

async function render() {
  const data = await chrome.storage.local.get([
    "items",
    "nextCheckTime",
    "monitoringEnabled"
  ]);

  const items = data.items || [];
  const monitoringEnabled = data.monitoringEnabled !== false;
  const activeItems = items.filter((item) => item.monitoringEnabled !== false);
  const nextCheckTime = data.nextCheckTime || 0;

  const now = Date.now();
  const remaining =
    nextCheckTime && nextCheckTime > now
      ? Math.floor((nextCheckTime - now) / 1000)
      : "-";

  monitorView.innerHTML = "";

  const status = document.createElement("div");
  status.className = "status";

  if (!items.length) {
    status.innerHTML = "⚪ Нет добавленных предметов";
  } else if (!monitoringEnabled) {
    status.innerHTML = "🟠 Расширение выключено (мониторинг на паузе)";
  } else if (!activeItems.length) {
    status.innerHTML = "🟠 Все предметы остановлены";
  } else {
    status.innerHTML =
      `🟢 Мониторинг активен<br>
       Следующая проверка через: ${remaining}`;
  }

  const controls = document.createElement("div");
  controls.className = "card controls";

  const globalToggle = document.createElement("button");
  globalToggle.textContent = monitoringEnabled ? "Выключить расширение" : "Включить расширение";

  globalToggle.onclick = async () => {
    await chrome.storage.local.set({ monitoringEnabled: !monitoringEnabled });
    render();
  };

  const summary = document.createElement("div");
  summary.className = "last";
  summary.textContent = `Активных предметов: ${activeItems.length} / ${items.length}`;

  const itemList = document.createElement("div");
  itemList.className = "item-switch-list";

  items.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "item-switch-row";

    const name = document.createElement("span");
    name.textContent = item.name;

    const toggle = document.createElement("button");
    toggle.textContent = item.monitoringEnabled === false ? "Вкл" : "Выкл";

    toggle.onclick = async () => {
      const saved = await chrome.storage.local.get("items");
      const arr = saved.items || [];
      arr[i].monitoringEnabled = arr[i].monitoringEnabled === false;
      await chrome.storage.local.set({ items: arr });
      render();
    };

    row.appendChild(name);
    row.appendChild(toggle);
    itemList.appendChild(row);
  });

  controls.appendChild(globalToggle);
  controls.appendChild(summary);
  controls.appendChild(itemList);

  monitorView.appendChild(status);
  if (items.length) {
    monitorView.appendChild(controls);
  }

  items.forEach((item, i) => {
    const symbol = item.currency === "37" ? "₸" : "₽";

    const card = document.createElement("div");
    card.className = "card";

    const current = item.currentPrice || 0;

    let nearTrigger = false;

    if (item.priceBelow && current) {
      const diff =
        Math.abs((current - item.priceBelow) / item.priceBelow) * 100;
      if (diff <= 5) nearTrigger = true;
    }

    if (item.priceAbove && current) {
      const diff =
        Math.abs((current - item.priceAbove) / item.priceAbove) * 100;
      if (diff <= 5) nearTrigger = true;
    }

    if (nearTrigger) {
      card.classList.add("near");
    }

    card.innerHTML = `
      <div class="name">${item.name}</div>
      <div>Текущая: ${item.currentPrice || "-"} ${symbol}</div>
      <div class="triggers">
        ${item.priceBelow ? `↓ ${item.priceBelow} ${symbol}` : ""}
        ${item.priceAbove ? ` ↑ ${item.priceAbove} ${symbol}` : ""}
      </div>
      <div class="last">Последняя проверка: ${item.lastCheck || "-"}</div>
      <div class="last">Статус: ${item.monitoringEnabled === false ? "остановлен" : "активен"}</div>
    `;

    const toggle = document.createElement("button");
    toggle.textContent = item.monitoringEnabled === false ? "Включить" : "Остановить";

    toggle.onclick = async () => {
      const saved = await chrome.storage.local.get("items");
      const arr = saved.items || [];
      arr[i].monitoringEnabled = arr[i].monitoringEnabled === false;
      await chrome.storage.local.set({ items: arr });
      render();
    };

    const del = document.createElement("button");
    del.textContent = "Удалить";

    del.onclick = async () => {
      const saved = await chrome.storage.local.get("items");
      const arr = saved.items || [];
      arr.splice(i, 1);
      await chrome.storage.local.set({ items: arr });
      render();
    };

    card.appendChild(toggle);
    card.appendChild(del);
    monitorView.appendChild(card);
  });
}

/* =========================
   ДОБАВЛЕНИЕ
========================= */

add.onclick = async () => {
  const link = urlInput.value.trim();
  if (!link) {
    toast("Введите ссылку на предмет");
    return;
  }

  const marketHashName = getMarketHashName(link);

  if (!marketHashName) {
    toast("Неверная ссылка Steam Market");
    return;
  }

  const currencyVal = currencyInput.value;

  const apiUrl =
    `https://steamcommunity.com/market/priceoverview/?appid=730&currency=${currencyVal}&market_hash_name=${encodeURIComponent(marketHashName)}`;

  let response;

  try {
    response = await fetch(apiUrl, { credentials: "omit" });
  } catch {
    toast("Ошибка сети при запросе цены");
    return;
  }

  if (!response.ok) {
    toast("Steam API вернул ошибку");
    return;
  }

  const json = await response.json();
  if (!json.success) {
    toast("Не удалось получить цену предмета");
    return;
  }

  const price = parsePriceValue(
    String(json.lowest_price).replace(/[^\d.,]/g, "")
  );

  if (price === null) {
    toast("Цена предмета недоступна");
    return;
  }

  const data = await chrome.storage.local.get(["items", "monitoringEnabled"]);
  const items = data.items || [];

  items.push({
    name: marketHashName,
    pageUrl: link,
    apiUrl,
    currency: currencyVal,
    startPrice: price,
    previousPrice: price,
    currentPrice: price,
    priceBelow: parsePriceValue(priceBelowInput.value),
    priceAbove: parsePriceValue(priceAboveInput.value),
    monitoringEnabled: true
  });

  await chrome.storage.local.set({
    items,
    monitoringEnabled: data.monitoringEnabled !== false
  });

  await chrome.storage.local.remove("draftForm");

  draftFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  await loadSettingsIntoForm();

  toast("Предмет добавлен");
  render();
};

/* =========================
   СОХРАНЕНИЕ ИНТЕРВАЛА
========================= */

saveInterval.onclick = async () => {
  const minInterval = Number.parseInt(minIntervalInput.value, 10);
  const maxInterval = Number.parseInt(maxIntervalInput.value, 10);
  const minChance = Number.parseFloat(minChanceInput.value);

  if (!Number.isFinite(minInterval) || minInterval <= 0) {
    toast("Мин. интервал должен быть > 0");
    return;
  }

  if (!Number.isFinite(maxInterval) || maxInterval < minInterval) {
    toast("Макс. интервал должен быть >= мин.");
    return;
  }

  if (!Number.isFinite(minChance) || minChance < 0 || minChance > 100) {
    toast("Шанс мин должен быть от 0 до 100");
    return;
  }

  const settings = {
    minInterval,
    maxInterval,
    minChance
  };

  await chrome.storage.local.set({ globalSettings: settings });
  toast("Интервал сохранён");
};

historyRange.addEventListener("change", () => {
  renderHistory();
});

setInterval(() => {
  render();
  if (historyView.style.display !== "none") {
    renderHistory();
  }
}, 1000);

document.addEventListener("DOMContentLoaded", async () => {
  await restoreDraft();
  await loadSettingsIntoForm();
  setActiveTab("monitor");
  await render();
  await renderHistory();
});
