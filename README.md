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

## 🔐 License

This project is licensed under the **MIT License**.  
See the `LICENSE` file for details.

---

## 👤 Author

**GFL25**
