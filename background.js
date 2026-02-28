/* Steam Monitor С GFL25 */
/* Stable version without try/catch */

async function getSettings() {
  const data = await chrome.storage.local.get("globalSettings");
  return data.globalSettings || {
    minInterval: 60,
    maxInterval: 120,
    minChance: 30
  };
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
    chrome.alarms.clear("steamCheck");
    await chrome.storage.local.set({ nextCheckTime: 0 });
    return;
  }

  const settings = await getSettings();
  const delay = calculateDelay(settings);

  const nextTime = Date.now() + delay * 1000;
  await chrome.storage.local.set({ nextCheckTime: nextTime });

  chrome.alarms.create("steamCheck", {
    delayInMinutes: delay / 60
  });
}

async function checkAll() {
  const data = await chrome.storage.local.get("items");
  const items = data.items || [];

  if (!items.length) return;

  for (let item of items) {

    const response = await fetch(item.apiUrl, {
      credentials: "omit"
    });

    if (!response.ok) continue;

    const json = await response.json();
    if (!json.success) continue;

    const price = parseFloat(
      json.lowest_price
        .replace(/[^\d.,]/g, "")
        .replace(",", ".")
    );

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
        iconUrl: "https://steamcommunity.com/favicon.ico",
        title: "Steam сигнал",
        message: item.name + "\n–ена: " + price
      });

      chrome.tabs.create({
        url: item.pageUrl,
        active: true
      }, function(tab) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
      });

    }
  }

  await chrome.storage.local.set({ items });
  await scheduleNextAlarm();
}

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === "steamCheck") {
    checkAll();
  }
});

chrome.storage.onChanged.addListener(function(changes) {
  if (changes.items) {
    scheduleNextAlarm();
  }
});