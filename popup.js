const monitorView = document.getElementById("monitorView");
const addView = document.getElementById("addView");

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
  setTimeout(()=> t.style.display="none",2000);
}

/* =========================
   АВТОСОХРАНЕНИЕ ЧЕРНОВИКА
========================= */

async function saveDraft() {
  const draft = {};
  draftFields.forEach(id=>{
    const el = document.getElementById(id);
    if (el) draft[id] = el.value;
  });
  await chrome.storage.local.set({ draftForm: draft });
}

async function restoreDraft() {
  const data = await chrome.storage.local.get("draftForm");
  if (!data.draftForm) return;

  draftFields.forEach(id=>{
    const el = document.getElementById(id);
    if (el && data.draftForm[id] !== undefined) {
      el.value = data.draftForm[id];
    }
  });
}

draftFields.forEach(id=>{
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
      ? Math.floor((nextCheckTime - now)/1000)
      : "-";

  monitorView.innerHTML = "";

  /* ===== СТАТУС ===== */

  const status = document.createElement("div");
  status.className = "status";

  if (items.length) {
    status.innerHTML =
      `🟢 Мониторинг активен<br>
       Следующая проверка через: ${remaining}`;
  } else {
    status.innerHTML =
      `⚪ Нет добавленных предметов`;
  }

  monitorView.appendChild(status);

  /* ===== СПИСОК ===== */

  items.forEach((item,i)=>{

    const symbol =
      item.currency==="37"?"₸":"₽";

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
        ${item.priceBelow ? "↓ " + item.priceBelow + " " + symbol : ""}
        ${item.priceAbove ? " ↑ " + item.priceAbove + " " + symbol : ""}
      </div>
      <div class="last">Последняя проверка: ${item.lastCheck || "-"}</div>
    `;

    const del = document.createElement("button");
    del.textContent = "Удалить";

    del.onclick = async ()=>{
      const data =
        await chrome.storage.local.get("items");
      const arr = data.items || [];
      arr.splice(i,1);
      await chrome.storage.local.set({items:arr});
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

  const link = url.value.trim();
  if(!link) return;

  const currencyVal = currency.value;
  const marketHashName =
    decodeURIComponent(link.split("/").pop());

  const apiUrl =
    `https://steamcommunity.com/market/priceoverview/?appid=730&currency=${currencyVal}&market_hash_name=${marketHashName}`;

  const response =
    await fetch(apiUrl,{credentials:"omit"});
  const json = await response.json();
  if(!json.success) return;

  const price =
    parseFloat(json.lowest_price
      .replace(/[^\d.,]/g,"")
      .replace(",","."));

  const data =
    await chrome.storage.local.get("items");
  const items = data.items || [];

  items.push({
    name: marketHashName,
    pageUrl: link,
    apiUrl,
    currency: currencyVal,
    startPrice: price,
    previousPrice: price,
    currentPrice: price,
    priceBelow: parseFloat(priceBelow.value)||null,
    priceAbove: parseFloat(priceAbove.value)||null
  });

  await chrome.storage.local.set({items});

  await chrome.storage.local.remove("draftForm");

  draftFields.forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.value="";
  });

  toast("Предмет добавлен");
  render();
};

/* =========================
   СОХРАНЕНИЕ ИНТЕРВАЛА
========================= */

saveInterval.onclick = async ()=>{
  const settings = {
    minInterval:parseInt(minInterval.value)||60,
    maxInterval:parseInt(maxInterval.value)||120,
    minChance:parseFloat(minChance.value)||30
  };
  await chrome.storage.local.set({globalSettings:settings});
  toast("Интервал сохранён");
};

setInterval(render,1000);

document.addEventListener("DOMContentLoaded", async ()=>{
  await restoreDraft();
  await render();
});