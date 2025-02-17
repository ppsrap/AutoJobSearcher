import config from './src/config/config.js'

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
    // Get the current screen dimensions
    chrome.system.display.getInfo((displays) => {
      const primaryDisplay = displays[0] // Use primary display
      const screenWidth = primaryDisplay.bounds.width
      const screenHeight = primaryDisplay.bounds.height

      // Calculate position to ensure window is always visible
      const windowWidth = 800
      const windowHeight = 800
      const left = Math.min(Math.max(0, screenWidth - windowWidth), screenWidth - (windowWidth / 2))
      const top = Math.min(Math.max(0, 0), screenHeight - (windowHeight / 2))

      // Create a new popup window
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: windowWidth,
        height: windowHeight,
        focused: true,
        top: top,
        left: left
      }, (window) => {
        popupWindowId = window.id
        chrome.windows.update(popupWindowId, { focused: true }) // Ensure the window is focused
      })
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
  console.log('Received message in background:', request.action, request)

  if (request.action === 'openJobJourney') {
    console.log('Opening JobJourney with jobs:', request.jobs)

    // Handle async config
    config.getBaseUrl().then(baseUrl => {
      const jobJourneyUrl = `${baseUrl}/job-market?source=extension`
      console.log('Using JobJourney URL:', jobJourneyUrl)

      // Store jobs data in localStorage
      const jobsData = request.jobs
      chrome.storage.local.set({ 'jobJourneyJobs': jobsData }, () => {
        console.log('Jobs data stored in chrome.storage.local')
        // Open JobJourney frontend in a new tab
        chrome.tabs.create({
          url: jobJourneyUrl,
          active: true
        }, (tab) => {
          console.log('JobJourney tab created, injecting content script')
          // Wait for the page to load before injecting the content script
          chrome.tabs.onUpdated.addListener(function listener (tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener)

              // Inject the content script
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (jobs) => {
                  console.log('Content script injected with jobs:', jobs)
                  // Listen for PAGE_READY message from the React app
                  window.addEventListener('message', function (event) {
                    // Only accept messages from our window
                    if (event.source !== window) return

                    if (event.data.type === 'PAGE_READY') {
                      console.log('Content script: Received PAGE_READY, sending jobs')
                      // Send the jobs to the page
                      window.postMessage({
                        type: 'FROM_EXTENSION',
                        source: 'extension',
                        jobs: jobs
                      }, '*')
                    }
                  })

                  // Also send jobs immediately in case we missed the PAGE_READY message
                  setTimeout(() => {
                    console.log('Content script: Sending jobs immediately')
                    window.postMessage({
                      type: 'FROM_EXTENSION',
                      source: 'extension',
                      jobs: jobs
                    }, '*')
                  }, 1000)
                },
                args: [jobsData]
              })
            }
          })
        })
      })

      sendResponse({ success: true })
    }).catch(error => {
      console.error('Error getting JobJourney URL:', error)
      sendResponse({ success: false, error: 'Failed to determine JobJourney URL' })
    })

    return true // Required for async response
  }

  if (request.action === 'pageReady') {
    console.log('Received pageReady signal from tab:', sender.tab.id)
    // When the page signals it's ready, send the stored jobs
    chrome.storage.local.get(['jobJourneyJobs'], (result) => {
      console.log('Retrieved stored jobs:', result.jobJourneyJobs)
      if (result.jobJourneyJobs) {
        console.log('Sending jobs to tab:', sender.tab.id)
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'importJobs',
          jobs: result.jobJourneyJobs
        }, (response) => {
          console.log('Response from importJobs message:', response)
        })
        // Clear the stored jobs after sending
        chrome.storage.local.remove(['jobJourneyJobs'])
        console.log('Cleared stored jobs')
      } else {
        console.log('No stored jobs found')
      }
    })
    sendResponse({ success: true })
    return true // Required for async response
  }


  if (request.action === 'openJobSites') {
    const sites = [
      'https://www.linkedin.com/jobs/search?keywords=Full+Stack&location=' + encodeURIComponent(request.location),
      'https://www.seek.com.nz/full-stack-jobs/in-' + request.location.replace(/\s+/g, '-'),
      'https://nz.indeed.com/jobs?q=Full+Stack&l=' + encodeURIComponent(request.location)
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