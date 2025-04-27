document.addEventListener("DOMContentLoaded", function () {
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const guideBtn = document.getElementById("guide-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const apiKeyInput = document.getElementById("api-key-input");
  const saveKeyBtn = document.getElementById("save-key-btn");
  const keyStatus = document.getElementById("key-status");

  let guideMode = false;

  // Load saved API key
  chrome.storage.local.get(["openaiKey"], function (result) {
    if (result.openaiKey) {
      apiKeyInput.value = result.openaiKey;
      keyStatus.textContent = "API key loaded";
    }
  });

  saveKeyBtn.addEventListener("click", function () {
    const key = apiKeyInput.value.trim();
    if (!key) return;

    chrome.runtime.sendMessage(
      {
        type: "set-api-key",
        key: key,
      },
      function (response) {
        if (response.status === "success") {
          keyStatus.textContent = "API key saved successfully";
          keyStatus.style.color = "green";

          // Hide settings after 2 seconds
          setTimeout(() => {
            settingsPanel.style.display = "none";
          }, 2000);
        }
      }
    );
  });

  // Toggle guide mode
  guideBtn.addEventListener("click", function () {
    guideMode = !guideMode;
    guideBtn.textContent = guideMode
      ? "Disable UI Guidance"
      : "Enable UI Guidance";

    // Send message to content script to clear highlights when disabling
    if (!guideMode) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "clear-highlights" });
      });
    }
  });

  // Send message when button clicked or Enter pressed
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });

// Updated sendMessage function in popup.js
function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
  
    addMessage(message, "user");
    userInput.value = "";
  
    // Show loading indicator
    const loadingMessage = addMessage("Thinking...", "bot");
    
    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
  
      // Send to background script
      chrome.runtime.sendMessage(
        {
          type: "ask-ai",
          question: message,
          url: currentTab.url,
          guideMode: guideMode,
        },
        function (response) {
          // Remove loading message
          chatMessages.removeChild(loadingMessage);
          
          if (!response) {
            addMessage("Error: No response from the extension background", "bot");
            return;
          }
          
          if (response.answer) {
            addMessage(response.answer, "bot");
  
            // If in guide mode, highlight elements
            if (guideMode && response.elements) {
              chrome.tabs.sendMessage(currentTab.id, {
                action: "highlight-elements",
                elements: response.elements,
              });
            }
          } else {
            addMessage("Error: Invalid response format", "bot");
          }
        }
      );
    });
  }

  const toggleSettings = document.createElement("button");
  toggleSettings.textContent = "⚙️";
  toggleSettings.className = "settings-toggle";
  toggleSettings.addEventListener("click", () => {
    settingsPanel.style.display =
      settingsPanel.style.display === "none" ? "block" : "none";
  });
  document.body.prepend(toggleSettings);

  
  function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
