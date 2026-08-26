// Background Service Worker for Manifest V3 Browser Companion Extension

const LOCAL_AGENT_ENDPOINT = "http://127.0.0.1:8765/api/active_tab";

async function reportActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].url) {
      const activeTab = tabs[0];
      const url = new URL(activeTab.url);

      // Clean protocol & credentials for privacy
      const sanitizedUrl = url.origin + url.pathname;
      const domain = url.hostname;

      const payload = {
        domain: domain,
        url: sanitizedUrl,
        title: activeTab.title || "",
        timestamp: new Date().toISOString()
      };

      // Forward to local Python agent
      fetch(LOCAL_AGENT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {
        // Agent might be in standalone mode
      });
    }
  } catch (err) {
    // Non-web pages (e.g. chrome://)
  }
}

// Listen to tab switches
chrome.tabs.onActivated.addListener(() => {
  reportActiveTab();
});

// Listen to URL navigation updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    reportActiveTab();
  }
});
