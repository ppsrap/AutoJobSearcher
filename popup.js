document.addEventListener('DOMContentLoaded', () => {
  const locationInput = document.getElementById('location')
  const searchBtn = document.getElementById('searchBtn')
  const scrapeBtn = document.getElementById('scrapeBtn')
  const downloadBtn = document.getElementById('downloadBtn')
  const jobList = document.getElementById('jobList')
  const statusMessage = document.getElementById('statusMessage')
  const progressSection = document.getElementById('progressSection')
  const progressFill = document.getElementById('progressFill')
  const progressText = document.getElementById('progressText')

  let scrapedJobs = []

  // Load last used location from storage
  chrome.storage.local.get(['lastLocation'], (result) => {
    if (result.lastLocation) {
      locationInput.value = result.lastLocation
    }
  })

  function showMessage (message, isError = false) {
    statusMessage.textContent = message
    statusMessage.className = `status-message ${isError ? 'error' : 'success'}`
    statusMessage.style.display = 'block'
    setTimeout(() => {
      statusMessage.style.display = 'none'
    }, 2000)
  }

  function updateProgress (percent, text) {
    progressFill.style.width = `${percent}%`
    progressText.textContent = text
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

  function downloadExcel (jobs) {
    const headers = ['Title', 'Company', 'Location', 'Platform', 'URL', 'Description', 'Salary', 'Job Type']
    const csvContent = [
      headers.join(','),
      ...jobs.map(job => [
        `"${job.title || ''}"`,
        `"${job.company || ''}"`,
        `"${job.location || ''}"`,
        `"${job.platform || ''}"`,
        `"${job.jobUrl || ''}"`,
        `"${(job.description || '').replace(/"/g, '""')}"`,
        `"${job.salary || ''}"`,
        `"${job.jobType || ''}"`,
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `jobs_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
        if (chrome.runtime.lastError) {
          console.error(`Error with tab ${tab.id}:`, chrome.runtime.lastError)
          resolve([])
        } else if (response && response.success) {
          // 对爬取到的工作进行去重
          const uniqueJobs = removeDuplicateJobs(response.data)
          resolve(uniqueJobs)
        } else {
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

  searchBtn.addEventListener('click', async () => {
    const location = locationInput.value.trim()

    if (!location) {
      showMessage('Please enter a location', true)
      return
    }

    console.log('=== Starting Job Search ===')
    console.log('Location:', location)

    // Save location to storage
    chrome.storage.local.set({ lastLocation: location })

    // Reset state
    scrapedJobs = []
    jobList.innerHTML = ''
    downloadBtn.disabled = true

    // Show progress section
    progressSection.style.display = 'block'
    updateProgress(0, 'Starting job search...')

    const sites = [
      {
        url: `https://www.linkedin.com/jobs/search?keywords=Full+Stack&location=${encodeURIComponent(location)}`,
        platform: 'LinkedIn'
      },
      {
        url: `https://www.seek.com.au/full-stack-jobs/in-${location.replace(/\s+/g, '-')}`,
        platform: 'SEEK'
      },
      {
        url: `https://au.indeed.com/jobs?q=Full+Stack&l=${encodeURIComponent(location)}`,
        platform: 'Indeed'
      }
    ]

    console.log('Sites to scrape:', sites)
    let completedSites = 0
    const totalSites = sites.length

    // Get all windows to find the main browser window
    const windows = await new Promise(resolve => {
      chrome.windows.getAll({ windowTypes: ['normal'] }, resolve)
    })
    console.log('Found browser windows:', windows.length)

    // Find the main browser window (usually the first normal window)
    const mainWindow = windows.find(w => w.type === 'normal')
    if (!mainWindow) {
      console.error('No main browser window found')
      showMessage('Could not find main browser window', true)
      return
    }
    console.log('Selected main window:', mainWindow.id)

    // Get the current extension window
    const currentWindow = await new Promise(resolve => {
      chrome.windows.getCurrent(resolve)
    })

    for (const site of sites) {
      console.log(`\n=== Processing ${site.platform} ===`)
      console.log('URL:', site.url)

      updateProgress(
        (completedSites / totalSites) * 100,
        `Opening ${site.platform}...`
      )

      // Create new tab in the main window
      const tab = await new Promise(resolve => {
        chrome.tabs.create({
          url: site.url,
          active: true,
          windowId: mainWindow.id
        }, resolve)
      })
      console.log('Created tab:', tab.id)

      // Bring extension window back to front after 500ms
      setTimeout(() => {
        chrome.windows.update(currentWindow.id, { focused: true })
      }, 700)

      // 等待页面加载
      updateProgress(
        (completedSites / totalSites) * 100,
        `Waiting for ${site.platform} to load...`
      )
      console.log('Waiting for page load...')
      await waitForPageLoad(tab.id)
      console.log('Page loaded')

      // Additional wait for dynamic content
      console.log('Waiting additional 5 seconds for dynamic content...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      console.log('Additional wait completed')

      // 爬取数据
      updateProgress(
        (completedSites / totalSites) * 100,
        `Scraping from ${site.platform}...`
      )
      console.log('Starting scraping...')
      const jobs = await scrapeFromTab(tab)
      console.log(`Scraped ${jobs.length} jobs from ${site.platform}:`, jobs)
      scrapedJobs.push(...jobs)

      // 关闭标签页
      // chrome.tabs.remove(tab.id)
      // console.log('Closed tab:', tab.id)

      completedSites++
      showMessage(`Scraped ${jobs.length} jobs from ${site.platform}`)

      // Update UI
      jobList.innerHTML = ''
      scrapedJobs.forEach(job => {
        jobList.appendChild(createJobCard(job))
      })
      console.log(`Completed ${site.platform} processing\n`)
    }

    console.log('=== Scraping Complete ===')
    console.log('Total jobs scraped:', scrapedJobs.length)
    updateProgress(100, `Scraped ${scrapedJobs.length} jobs from ${totalSites} sites`)
    showMessage(`Successfully scraped ${scrapedJobs.length} jobs!`)
    downloadBtn.disabled = scrapedJobs.length === 0

    // Focus back on the extension window at the end
    chrome.windows.update(currentWindow.id, { focused: true })
  })

  downloadBtn.addEventListener('click', () => {
    if (scrapedJobs.length === 0) {
      showMessage('No jobs to download', true)
      return
    }
    downloadExcel(scrapedJobs)
    showMessage('Jobs downloaded successfully!')
  })
}) 
