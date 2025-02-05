// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('JobJourney Assistant installed')
})

// Store the popup window id
let popupWindowId = null

// Handle toolbar icon click
chrome.action.onClicked.addListener(async () => {
  // Check if popup window exists and is still open
  if (popupWindowId !== null) {
    try {
      const window = await new Promise(resolve => chrome.windows.get(popupWindowId, resolve))
      if (window) {
        // Focus the existing popup window
        chrome.windows.update(popupWindowId, { focused: true })
        return
      }
    } catch (error) {
      // Window doesn't exist anymore
      popupWindowId = null
    }
  }

  // Get current window to determine screen position
  chrome.windows.getAll({ windowTypes: ['normal'] }, (windows) => {
    // Find the rightmost window to determine screen width
    const rightmostWindow = windows.reduce((prev, current) => {
      return (prev.left + prev.width) > (current.left + current.width) ? prev : current
    })

    // Create a new popup window
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 450,
      height: 600,
      focused: true,
      top: 0, // Position at the top of the screen
      left: Math.max(0, rightmostWindow.left + rightmostWindow.width - 450) // Position at the right of the screen
    }, (window) => {
      popupWindowId = window.id
      chrome.windows.update(popupWindowId, { focused: true }) // Ensure the window is focused
    })
  })
})

// Handle window close
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null
  }
})

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openJobSites') {
    const sites = [
      'https://www.linkedin.com/jobs/search?keywords=Full+Stack&location=' + encodeURIComponent(request.location),
      'https://www.seek.com.au/full-stack-jobs/in-' + request.location.replace(/\s+/g, '-'),
      'https://au.indeed.com/jobs?q=Full+Stack&l=' + encodeURIComponent(request.location)
    ]

    sites.forEach(url => {
      chrome.tabs.create({ url, active: true }) // Ensures the tab is focused
    })

    sendResponse({ success: true })
  }

  if (request.action === 'startScraping') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'scrapeJobs' }, (response) => {
          sendResponse(response)
        })
      }
    })
    return true // Required for async response
  }

  if (request.action === 'scrapeJobDetail') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'scrapeJobDetail' }, (response) => {
          sendResponse(response)
        })
      }
    })
    return true // Required for async response
  }
}) 