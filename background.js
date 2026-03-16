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
  const data = await chrome.storage.local.get("items");
  const items = data.items || [];

  if (!items.length) {
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
  const data = await chrome.storage.local.get("items");
  const items = data.items || [];

  if (!items.length) return;

  for (const item of items) {
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

    if (triggered) {
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

  await chrome.storage.local.set({ items });
  await scheduleNextAlarm();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkAll();
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.items || changes.globalSettings) {
    scheduleNextAlarm();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  scheduleNextAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleNextAlarm();
});
