import { supportedWebsites } from './websites.js'

// Move checkbox change handler outside DOMContentLoaded
const handleCheckboxChange = async (e) => {
  if (e.target.type === 'checkbox' && e.target.closest('.website-option')) {
    const newSettings = {}
    supportedWebsites.forEach(website => {
      const checkbox = document.getElementById(website.id)
      if (checkbox) {
        newSettings[website.id] = checkbox.checked
      }
    })
    await chrome.storage.sync.set({ websiteSettings: newSettings })
    const statusMessage = document.getElementById('statusMessage')
    if (statusMessage) {
      statusMessage.textContent = 'Settings saved'
      statusMessage.className = 'status-message success'
      statusMessage.style.display = 'block'
      setTimeout(() => {
        statusMessage.style.display = 'none'
      }, 2000)
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded')
  const locationInput = document.getElementById('location')
  const searchBtn = document.getElementById('searchBtn')
  const scrapeBtn = document.getElementById('scrapeBtn')
  const showInJobJourneyBtn = document.getElementById('showInJobJourneyBtn')
  const jobList = document.getElementById('jobList')
  const statusMessage = document.getElementById('statusMessage')
  const progressSection = document.getElementById('progressSection')
  const progressFill = document.getElementById('progressFill')
  const progressText = document.getElementById('progressText')
  const progressDetail = document.getElementById('progressDetail')
  const overlay = document.getElementById('overlay')
  const overlayText = document.getElementById('overlayText')
  const overlayDetail = document.getElementById('overlayDetail')
  const websiteOptions = document.getElementById('websiteOptions')
  console.log('websiteOptions element:', websiteOptions)
  console.log('supportedWebsites:', supportedWebsites)

  let scrapedJobs = []

  // Load last used location from storage
  chrome.storage.local.get(['lastLocation'], (result) => {
    if (result.lastLocation) {
      const locationSelect = document.getElementById('location')
      // Find and select the option that matches the last location
      const options = Array.from(locationSelect.options)
      const matchingOption = options.find(option => option.value === result.lastLocation)
      if (matchingOption) {
        locationSelect.value = result.lastLocation
      }
    }
  })

  // Load saved settings
  const settings = await chrome.storage.sync.get('websiteSettings')
  const savedSettings = settings.websiteSettings || {}
  console.log('savedSettings:', savedSettings)

  // Create checkbox for each website
  supportedWebsites.forEach(website => {
    console.log('Creating checkbox for:', website.name)
    const isEnabled = savedSettings[website.id] !== undefined ?
      savedSettings[website.id] : website.enabled

    const div = document.createElement('div')
    div.className = 'website-option'

    div.innerHTML = `
      <label>
        <input type="checkbox" 
               id="${website.id}" 
               ${isEnabled ? 'checked' : ''}>
        ${website.name}
      </label>
    `
    websiteOptions.appendChild(div)
    console.log('Added checkbox for:', website.name)
  })

  // Add the change event listener to the websiteOptions container
  if (websiteOptions) {
    websiteOptions.addEventListener('change', handleCheckboxChange)
  }

  function showMessage (message, isError = false) {
    statusMessage.textContent = message
    statusMessage.className = `status-message ${isError ? 'error' : 'success'}`
    statusMessage.style.display = 'block'
    setTimeout(() => {
      statusMessage.style.display = 'none'
    }, 2000)
  }

  function showOverlay (show) {
    overlay.style.display = show ? 'flex' : 'none'
    // Disable all interactive elements when overlay is shown
    const interactiveElements = document.querySelectorAll('button, input, select')
    interactiveElements.forEach(element => {
      element.disabled = show
    })
  }

  function updateProgress (percent, text, detail) {
    progressFill.style.width = `${percent}%`
    progressText.textContent = text
    if (detail) {
      progressDetail.textContent = detail
      overlayDetail.textContent = detail
    }
    overlayText.textContent = text
  }

  function createJobCard (job) {
    const card = document.createElement('div')
    card.className = 'job-card'

    const title = document.createElement('h3')
    title.textContent = job.title

    const company = document.createElement('p')
    company.textContent = `Company: ${job.company}`

    const location = document.createElement('p')
    location.textContent = `Location: ${job.location}`

    const platform = document.createElement('p')
    platform.textContent = `Platform: ${job.platform}`

    // Add job type if available
    const jobType = document.createElement('p')
    jobType.className = 'job-type'
    jobType.textContent = job.jobType ? `Job Type: ${job.jobType}` : ''
    jobType.style.display = job.jobType ? 'block' : 'none'

    // Add salary if available
    const salary = document.createElement('p')
    salary.className = 'salary'
    salary.textContent = job.salary ? `Salary: ${job.salary}` : ''
    salary.style.display = job.salary ? 'block' : 'none'

    // Add description if available
    const description = document.createElement('p')
    description.className = 'job-description'
    description.textContent = job.description ? `Description: ${job.description}` : ''
    description.style.display = job.description ? 'block' : 'none'

    // Add posted date if available
    const postedDate = document.createElement('p')
    postedDate.className = 'posted-date'
    postedDate.textContent = job.postedDate ? `Posted: ${job.postedDate}` : ''
    postedDate.style.display = job.postedDate ? 'block' : 'none'

    const actions = document.createElement('div')
    actions.className = 'job-actions'

    const viewBtn = document.createElement('button')
    viewBtn.textContent = 'View'
    viewBtn.onclick = () => {
      chrome.tabs.create({ url: job.jobUrl })
    }

    const saveBtn = document.createElement('button')
    saveBtn.textContent = 'Save'
    saveBtn.className = 'save-btn'
    saveBtn.onclick = async () => {
      showMessage('Save feature will be available when connected to backend')
    }

    actions.appendChild(viewBtn)
    actions.appendChild(saveBtn)

    card.appendChild(title)
    card.appendChild(company)
    card.appendChild(location)
    card.appendChild(platform)
    card.appendChild(jobType)
    card.appendChild(salary)
    card.appendChild(description)
    card.appendChild(postedDate)
    card.appendChild(actions)

    return card
  }

  // 等待页面加载完成
  function waitForPageLoad (tabId) {
    return new Promise((resolve) => {
      function listener (updatedTabId, info) {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          // 给页面额外的3秒加载时间
          setTimeout(resolve, 2000)
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
    })
  }

  // 从单个标签页爬取数据
  async function scrapeFromTab (tab) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeJobs' }, (response) => {
        console.group('Tab Scraping Debug')
        console.log('Tab URL:', tab.url)
        console.log('Initial response:', response)

        if (chrome.runtime.lastError) {
          console.error(`Error with tab ${tab.id}:`, chrome.runtime.lastError)
          console.groupEnd()
          resolve([])
        } else if (response && response.success) {
          console.log('response:', response)
          const jobs = response.data || []

          // Remove duplicates
          console.log('Total jobs before deduplication:', jobs.length)
          const uniqueJobs = removeDuplicateJobs(jobs)
          console.log('Total jobs after deduplication:', uniqueJobs.length)
          console.groupEnd()
          resolve(uniqueJobs)
        } else {
          console.groupEnd()
          resolve([])
        }
      })
    })
  }

  // 根据标题和公司名称去重
  function removeDuplicateJobs (jobs) {
    const seen = new Set()
    return jobs.filter(job => {
      const key = `${job.title}-${job.company}-${job.location}`.toLowerCase()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // Generic function to handle pagination for any platform
  async function scrapeWithPagination (tab, platform, callback) {
    let allJobs = []
    let pageNum = 1

    try {
      // Get the current tab info to ensure we have the URL
      const currentTab = await chrome.tabs.get(tab.id)
      let currentUrl = currentTab.url
      console.log(`Initial ${platform} URL:`, currentUrl)

      // Show overlay and set scraping state at the start
      await chrome.storage.local.set({ isScrapingActive: true })
      await chrome.tabs.sendMessage(tab.id, { action: 'showScrapeOverlay' })

      while (currentUrl) {
        console.log(`${platform} - Processing page ${pageNum}, URL:`, currentUrl)

        // Check if tab still exists
        try {
          await chrome.tabs.get(tab.id)
        } catch (error) {
          console.log(`Tab was closed for ${platform}, returning collected jobs`)
          await chrome.storage.local.set({ isScrapingActive: false })
          return allJobs
        }

        // Update tab URL if not first page
        if (currentUrl !== currentTab.url) {
          console.log("Updating tab URL to:", currentUrl)
          await chrome.tabs.update(tab.id, { url: currentUrl })
          await waitForPageLoad(tab.id)
          // The overlay will be automatically restored by the content script
        }

        // Update progress with current page number
        callback(pageNum)

        // Scrape current page
        const response = await new Promise(resolve => {
          chrome.tabs.sendMessage(tab.id, { action: 'scrapeJobs' }, (response) => {
            if (chrome.runtime.lastError) {
              // Tab was closed or errored
              resolve({ success: false, error: chrome.runtime.lastError })
            } else {
              resolve(response)
            }
          })
        })

        if (!response || !response.success) {
          console.log(`${platform} - Tab closed or error occurred`)
          break
        }

        console.log(`${platform} scraping response:`, response)
        console.log(`${platform} jobs found:`, response.data.length)
        console.log(`${platform} next URL:`, response.nextUrl)

        allJobs.push(...response.data)
        currentUrl = response.nextUrl
        pageNum++

        // Small delay before next page
        if (currentUrl) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    } catch (error) {
      console.log(`Error during ${platform} scraping:`, error)
      await chrome.storage.local.set({ isScrapingActive: false })
    } finally {
      // Clear scraping state and remove overlay
      await chrome.storage.local.set({ isScrapingActive: false })
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'removeScrapeOverlay' })
      } catch (error) {
        console.log('Tab might be closed, cannot remove overlay:', error)
      }
    }

    console.log(`Total ${platform} jobs before deduplication:`, allJobs.length)
    const uniqueJobs = removeDuplicateJobs(allJobs)
    console.log(`Total ${platform} jobs after deduplication:`, uniqueJobs.length)
    return uniqueJobs
  }

  // Add show in JobJourney button handler
  showInJobJourneyBtn.addEventListener('click', async () => {
    console.log('Show in JobJourney button clicked')
    console.log('Jobs to send:', scrapedJobs)

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'openJobJourney',
        jobs: scrapedJobs
      })
      console.log('Response from openJobJourney:', response)

      if (response && response.success) {
        showMessage('Opening jobs in JobJourney...')
      } else {
        showMessage('Failed to open JobJourney', true)
        console.error('Failed to open JobJourney:', response)
      }
    } catch (error) {
      console.error('Error sending jobs to JobJourney:', error)
      showMessage('Error opening JobJourney', true)
    }
  })

  // Update search button click handler
  searchBtn.addEventListener('click', async () => {
    const locationSelect = document.getElementById('location')
    const searchInput = document.getElementById('searchInput')
    const location = locationSelect.value.trim()
    const searchTerm = searchInput.value.trim()

    if (!location) {
      showMessage('Please select a location', true)
      return
    }

    if (!searchTerm) {
      showMessage('Please enter search keywords', true)
      return
    }

    console.log('=== Starting Job Search ===')
    console.log('Search Term:', searchTerm)
    console.log('Location:', location)

    // Show overlay and disable interaction
    showOverlay(true)

    // Save location to storage
    chrome.storage.local.set({ lastLocation: location })

    // Reset state
    scrapedJobs = []
    jobList.innerHTML = ''

    // Show progress section
    progressSection.style.display = 'block'
    updateProgress(0, 'Starting job search...')

    try {
      // Clear any existing scraping state at the start
      await chrome.storage.local.set({ isScrapingActive: false })

      // Get current website settings
      const settings = await chrome.storage.sync.get('websiteSettings')
      const savedSettings = settings.websiteSettings || {}
      console.log('Current website settings:', savedSettings)

      // Format search term for SEEK URL
      const seekSearchTerm = searchTerm.toLowerCase().replace(/\s+/g, '-')

      // Filter sites based on checkbox selection
      const sites = [
        {
          id: 'linkedin',
          url: `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(location)}`,
          platform: 'LinkedIn',
          action: 'scrapeLinkedIn'
        },
        {
          id: 'seek',
          url: `https://www.seek.com.au/${seekSearchTerm}-jobs/in-${location.split(',')[0].toLowerCase().replace(/\s+/g, '-')}`,
          platform: 'SEEK',
          action: 'scrapeSEEK'
        },
        {
          id: 'indeed',
          url: `https://au.indeed.com/jobs?q=${encodeURIComponent(searchTerm)}&l=${encodeURIComponent(location)}`,
          platform: 'Indeed',
          action: 'scrapeJobs'
        }
      ].filter(site => {
        const checkbox = document.getElementById(site.id)
        return checkbox && checkbox.checked
      })

      if (sites.length === 0) {
        showMessage('Please select at least one website', true)
        progressSection.style.display = 'none'
        showOverlay(false)
        return
      }

      console.log('Sites to scrape after filtering:', sites)
      let completedSites = 0
      const totalSites = sites.length

      // Get all windows to find the main browser window
      const windows = await chrome.windows.getAll({ windowTypes: ['normal'] })
      console.log('Found browser windows:', windows.length)

      const mainWindow = windows.find(w => w.type === 'normal')
      if (!mainWindow) {
        throw new Error('Could not find main browser window')
      }

      // Get the current extension window
      const currentWindow = await chrome.windows.getCurrent()

      for (const site of sites) {
        console.log(`\n=== Processing ${site.platform} ===`)
        const progress = (completedSites / totalSites) * 100
        updateProgress(
          progress,
          `Scraping ${site.platform}...`,
          `Starting scrape for ${site.platform}`
        )

        const tab = await chrome.tabs.create({
          url: site.url,
          windowId: mainWindow.id,
          active: true
        })

        // Add tab close listener
        const tabClosedPromise = new Promise(resolve => {
          const listener = (tabId) => {
            if (tabId === tab.id) {
              chrome.tabs.onRemoved.removeListener(listener)
              resolve()
            }
          }
          chrome.tabs.onRemoved.addListener(listener)
        })

        try {
          await waitForPageLoad(tab.id)

          // Race between scraping and tab closure
          const jobs = await Promise.race([
            scrapeWithPagination(tab, site.platform, (currentPage) => {
              updateProgress(
                progress,
                `Scraping ${site.platform}...`,
                `Processing page ${currentPage} in ${site.platform}`
              )
            }),
            tabClosedPromise.then(async () => {
              console.log(`Tab closed for ${site.platform}`)
              // Clear scraping state if tab is closed
              await chrome.storage.local.set({ isScrapingActive: false })
              return [] // Return empty array if tab was closed
            })
          ])

          scrapedJobs.push(...jobs)
          completedSites++
          const progressPercent = (completedSites / totalSites) * 100
          updateProgress(
            progressPercent,
            `Completed ${site.platform}`,
            `Found ${jobs.length} jobs from ${site.platform}`
          )
          showMessage(`Scraped ${jobs.length} jobs from ${site.platform}`)

          // Update UI
          jobList.innerHTML = ''
          scrapedJobs.forEach(job => {
            jobList.appendChild(createJobCard(job))
          })
        } catch (error) {
          console.error(`Error processing ${site.platform}:`, error)
          // Clear scraping state on error
          await chrome.storage.local.set({ isScrapingActive: false })
          completedSites++
        }
      }

      console.log('=== Scraping Complete ===')
      console.log('Total jobs scraped:', scrapedJobs.length)
      updateProgress(
        100,
        `Scraping Complete!`,
        `Found ${scrapedJobs.length} jobs from ${totalSites} sites`
      )
      showMessage(`Successfully scraped ${scrapedJobs.length} jobs!`)
      updateButtonStates(scrapedJobs.length > 0)

      // Automatically trigger show in JobJourney if jobs were found
      if (scrapedJobs.length > 0) {
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'openJobJourney',
            jobs: scrapedJobs
          })
          console.log('Auto-opening in JobJourney:', response)

          if (response && response.success) {
            showMessage('Opening jobs in JobJourney...')
          } else {
            console.error('Failed to auto-open JobJourney:', response)
          }
        } catch (error) {
          console.error('Error auto-opening JobJourney:', error)
        }
      }

    } catch (error) {
      console.error('Error during scraping:', error)
      showMessage('An error occurred during scraping', true)
      updateProgress(0, 'Scraping failed', error.message)
    } finally {
      // Clear scraping state and clean up
      await chrome.storage.local.set({ isScrapingActive: false })
      showOverlay(false)
      // Focus back on the extension window at the end
      chrome.windows.update(currentWindow.id, { focused: true })
    }
  })

  // Update button states function to only handle showInJobJourneyBtn
  const updateButtonStates = (hasJobs) => {
    showInJobJourneyBtn.disabled = !hasJobs
  }
})

// Update message listener in content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request)

  if (request.action === 'getNextPageUrl') {
    const platform = Object.values(scrapers).find(s => s.isMatch(window.location.href))
    if (platform && platform.getNextPageUrl) {
      const nextUrl = platform.getNextPageUrl()
      sendResponse({ nextUrl })
    } else {
      sendResponse({ nextUrl: null })
    }
    return true
  }

  // ... existing message handling code ...
}) 
