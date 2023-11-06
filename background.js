chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startScript') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0].id;
      chrome.scripting.executeScript({
        target: { tabId: id, allFrames: true },
        files: ['content.js']
      });
    });
  } else if (message.type === 'startScriptmanual') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0].id;
      chrome.scripting.executeScript({
        target: { tabId: id, allFrames: true },
        files: ['contentmanual.js']
      });
    });
  } else if (message.type === 'resetAndStartCapture') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0].id;
      chrome.scripting.executeScript({
        target: { tabId: id, allFrames: true },
        files: ['resetcache.js']
      });
    });
  }
});

