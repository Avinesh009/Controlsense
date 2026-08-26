async function updatePopup() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].url) {
      const url = new URL(tabs[0].url);
      document.getElementById("current-domain").textContent = url.hostname;
    } else {
      document.getElementById("current-domain").textContent = "System / New Tab";
    }
  } catch (e) {
    document.getElementById("current-domain").textContent = "Local Session";
  }
}

document.addEventListener("DOMContentLoaded", updatePopup);
