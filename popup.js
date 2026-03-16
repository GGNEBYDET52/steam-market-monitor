const monitorView = document.getElementById("monitorView");
const addView = document.getElementById("addView");
const tabMonitor = document.getElementById("tabMonitor");
const tabAdd = document.getElementById("tabAdd");
const add = document.getElementById("add");
const saveInterval = document.getElementById("saveInterval");

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

tabMonitor.onclick = () => {
  monitorView.style.display = "block";
  addView.style.display = "none";
};

tabAdd.onclick = () => {
  monitorView.style.display = "none";
  addView.style.display = "block";
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

async function render() {
  const data = await chrome.storage.local.get([
    "items",
    "nextCheckTime"
  ]);

  const items = data.items || [];
  const nextCheckTime = data.nextCheckTime || 0;

  const now = Date.now();
  const remaining =
    nextCheckTime && nextCheckTime > now
      ? Math.floor((nextCheckTime - now) / 1000)
      : "-";

  monitorView.innerHTML = "";

  const status = document.createElement("div");
  status.className = "status";

  if (items.length) {
    status.innerHTML =
      `🟢 Мониторинг активен<br>
       Следующая проверка через: ${remaining}`;
  } else {
    status.innerHTML = "⚪ Нет добавленных предметов";
  }

  monitorView.appendChild(status);

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
    `;

    const del = document.createElement("button");
    del.textContent = "Удалить";

    del.onclick = async () => {
      const saved = await chrome.storage.local.get("items");
      const arr = saved.items || [];
      arr.splice(i, 1);
      await chrome.storage.local.set({ items: arr });
      render();
    };

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

  const data = await chrome.storage.local.get("items");
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
    priceAbove: parsePriceValue(priceAboveInput.value)
  });

  await chrome.storage.local.set({ items });

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

setInterval(render, 1000);

document.addEventListener("DOMContentLoaded", async () => {
  await restoreDraft();
  await loadSettingsIntoForm();
  await render();
});
