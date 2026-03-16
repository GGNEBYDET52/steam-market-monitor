/* Steam Monitor — GFL25 */

const ALARM_NAME = "steamCheck";

async function getSettings() {
  const data = await chrome.storage.local.get("globalSettings");
  const settings = data.globalSettings || {};

  const minInterval = Number.parseInt(settings.minInterval, 10) || 60;
  const maxIntervalRaw = Number.parseInt(settings.maxInterval, 10) || 120;
  const minChanceRaw = Number.parseFloat(settings.minChance);

  const maxInterval = Math.max(maxIntervalRaw, minInterval);
  const minChance = Number.isFinite(minChanceRaw)
    ? Math.min(100, Math.max(0, minChanceRaw))
    : 30;

  return { minInterval, maxInterval, minChance };
}

function calculateDelay(settings) {
  const roll = Math.random() * 100;

  if (roll <= settings.minChance) {
    return settings.minInterval;
  }

  return Math.floor(
    Math.random() *
    (settings.maxInterval - settings.minInterval + 1)
  ) + settings.minInterval;
}

async function scheduleNextAlarm() {
  const data = await chrome.storage.local.get(["items", "monitoringEnabled"]);
  const items = data.items || [];
  const monitoringEnabled = data.monitoringEnabled !== false;
  const activeItems = items.filter((item) => item.monitoringEnabled !== false);

  if (!items.length || !monitoringEnabled || !activeItems.length) {
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.storage.local.set({ nextCheckTime: 0 });
    return;
  }

  const settings = await getSettings();
  const delay = calculateDelay(settings);

  const nextTime = Date.now() + delay * 1000;
  await chrome.storage.local.set({ nextCheckTime: nextTime });

  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: delay / 60
  });
}

function parseSteamPrice(lowestPrice) {
  if (typeof lowestPrice !== "string") return null;

  const normalized = lowestPrice
    .replace(/\s/g, "")
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

async function checkAll() {
  const data = await chrome.storage.local.get(["items", "priceHistory", "monitoringEnabled"]);
  const items = data.items || [];
  const history = data.priceHistory || [];
  const monitoringEnabled = data.monitoringEnabled !== false;

  if (!items.length || !monitoringEnabled) return;

  let shouldStopMonitoring = false;

  for (const item of items) {
    if (item.monitoringEnabled === false) {
      continue;
    }
    let response;

    try {
      response = await fetch(item.apiUrl, { credentials: "omit" });
    } catch {
      continue;
    }

    if (!response.ok) continue;

    let json;

    try {
      json = await response.json();
    } catch {
      continue;
    }

    if (!json.success) continue;

    const price = parseSteamPrice(json.lowest_price);
    if (price === null) continue;

    const previous = item.previousPrice ?? item.startPrice;

    item.currentPrice = price;
    item.lastCheck = new Date().toLocaleTimeString();

    let triggered = false;

    if (
      item.priceBelow &&
      previous > item.priceBelow &&
      price <= item.priceBelow
    ) {
      triggered = true;
    }

    if (
      item.priceAbove &&
      previous < item.priceAbove &&
      price >= item.priceAbove
    ) {
      triggered = true;
    }

    item.previousPrice = price;

    history.push({
      name: item.name,
      price,
      currency: item.currency,
      timestamp: Date.now(),
      event: triggered ? "trigger" : "check"
    });

    if (triggered) {
      item.monitoringEnabled = false;
      shouldStopMonitoring = true;
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Steam Monitor",
        message: `${item.name}\nЦена: ${price}`
      });

      chrome.tabs.create(
        {
          url: item.pageUrl,
          active: true
        },
        (tab) => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          });
        }
      );
    }
  }

  const trimmedHistory = history.slice(-1000);

  await chrome.storage.local.set({
    items,
    priceHistory: trimmedHistory,
    monitoringEnabled: shouldStopMonitoring ? false : monitoringEnabled
  });

  await scheduleNextAlarm();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkAll();
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.items || changes.globalSettings || changes.monitoringEnabled) {
    scheduleNextAlarm();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ monitoringEnabled: true });
  scheduleNextAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleNextAlarm();
});
