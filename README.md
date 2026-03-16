# Steam Market Monitor

![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-v1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A Manifest V3 Chrome extension for monitoring Steam Market item prices with customizable price triggers and randomized check intervals.

Developed by **GFL25**

---

## 🚀 Features

- Monitor multiple Steam Market items
- Custom price triggers:
  - Price below threshold
  - Price above threshold
- Randomized polling interval
- Background monitoring using `chrome.alarms`
- System notifications on trigger
- Automatic tab opening when condition is met
- Monitoring status indicator
- Auto-save draft form inputs
- Persistent storage via `chrome.storage.local`

---

## 🛠 Installation

1. Clone or download this repository
2. Open your browser and go to:
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder

The extension will now appear in your browser.

---

## 📌 Usage

1. Open the extension popup
2. Go to the **Add** tab
3. Paste a Steam Market item URL
4. Set price thresholds:
- Price below
- Price above
5. Save interval settings
6. Switch to the **Monitoring** tab

The extension will begin checking prices automatically.

---

## ⚙ Interval Settings

| Parameter | Description |
|------------|-------------|
| **Min Interval (sec)** | Minimum delay between checks |
| **Max Interval (sec)** | Maximum delay between checks |
| **Min Chance (%)** | Probability of selecting the minimum interval |

The next check time is calculated dynamically using a randomized algorithm.

---

## 🧠 How It Works

- Uses Steam Market `priceoverview` endpoint
- Background logic runs via Service Worker
- Polling handled through `chrome.alarms`
- Price comparison performed per item
- Notification triggered only when thresholds are crossed

---

## 📁 Project Structure
steam-market-monitor/
├── background.js
├── content.js
├── manifest.json
├── popup.html
├── popup.js
├── style.css
├── LICENSE
└── README.md


---

## ✅ Manual QA Checklist

Use this checklist after loading the unpacked extension in Chrome (`chrome://extensions`).

### 1) Installation and startup
- [ ] Extension loads without errors in `chrome://extensions`.
- [ ] Popup opens successfully.
- [ ] In extension Service Worker console there are no uncaught errors on startup.

### 2) Add item flow
- [ ] Open **Add** tab.
- [ ] Paste a valid Steam Market listing URL (e.g. `https://steamcommunity.com/market/listings/730/...`).
- [ ] Click **Добавить предмет**.
- [ ] Verify success toast appears.
- [ ] Switch to **Мониторинг** tab and verify item card is visible.

### 3) Validation checks
- [ ] Try empty URL and verify validation message is shown.
- [ ] Try invalid/non-Steam URL and verify validation message is shown.
- [ ] Try invalid interval values:
  - min interval `<= 0`
  - max interval `< min interval`
  - min chance `< 0` or `> 100`
  - verify each case shows a validation message and does not save.

### 4) Draft autosave/restore
- [ ] Fill several form fields in **Add** tab (without submitting).
- [ ] Close popup and open again.
- [ ] Verify draft values are restored.

### 5) Monitoring cycle
- [ ] Save short interval settings (e.g. min 60, max 60, chance 100).
- [ ] Confirm **Следующая проверка через** counter is shown in Monitor tab.
- [ ] Wait for at least one check cycle.
- [ ] Verify item card **Последняя проверка** value updates.

### 6) Trigger behavior
- [ ] Configure `priceBelow`/`priceAbove` near current price (or use a test item expected to cross threshold).
- [ ] When threshold crossing occurs, verify:
  - system notification appears,
  - a new tab opens with the item page,
  - page flash script (`content.js`) runs.

### 7) Delete flow
- [ ] Click **Удалить** on an item.
- [ ] Verify item disappears from list.
- [ ] Verify monitoring status updates accordingly.

### 8) Restart resilience
- [ ] Reload extension from `chrome://extensions`.
- [ ] Close and reopen browser.
- [ ] Verify monitoring resumes (counter and checks continue, no startup errors).

### 9) Regression quick check
- [ ] Confirm popup layout is intact (tabs, buttons, fields, cards).
- [ ] Confirm no console errors in popup and Service Worker during normal usage.

---

## 🔐 License

This project is licensed under the **MIT License**.  
See the `LICENSE` file for details.

---

## 👤 Author

**GFL25**
