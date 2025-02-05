// Add test function
function testScraping () {
  const currentUrl = window.location.href
  console.log('Testing scraping on URL:', currentUrl)

  // Test selectors
  if (currentUrl.includes('linkedin.com')) {
    console.log('Testing LinkedIn selectors:')
    console.log('Job cards:', document.querySelectorAll('div.base-card.base-card--link.job-search-card').length)
    console.log('First job title:', document.querySelector('h3.base-search-card__title')?.textContent.trim())
    console.log('First company:', document.querySelector('h4.base-search-card__subtitle a')?.textContent.trim())
  }
  else if (currentUrl.includes('seek.com.au')) {
    console.log('Testing SEEK selectors:')
    console.log('Job cards:', document.querySelectorAll('article[data-card-type="JobCard"]').length)
    console.log('First job title:', document.querySelector('[data-automation="job-title"]')?.textContent.trim())
    console.log('First company:', document.querySelector('[data-automation="job-company-name"]')?.textContent.trim())
  }
  else if (currentUrl.includes('indeed.com')) {
    console.log('Testing Indeed selectors:')
    console.log('Job cards:', document.querySelectorAll('div.job_seen_beacon').length)
    console.log('First job title:', document.querySelector('h2.jobTitle a')?.textContent.trim())
    console.log('First company:', document.querySelector('span.companyName')?.textContent.trim())
  }
  1
  // Test actual scraping
  const platform = Object.values(scrapers).find(s => s.isMatch(currentUrl))
  if (platform) {
    console.log('Testing scraping function:')
    const jobs = platform.scrapeJobList()
    console.log('Scraped jobs:', jobs)
    return jobs
  }
  return null
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request)
  console.log('Current page URL:', window.location.href)
  console.log('Current page title:', document.title)
  console.log('Document ready state:', document.readyState)

  if (request.action === 'scrapeJobs') {
    const currentUrl = window.location.href
    console.log('=== Starting Job Scraping ===')
    console.log('Page URL:', currentUrl)

    const platform = Object.values(scrapers).find(s => s.isMatch(currentUrl))
    if (platform) {
      try {
        platform.scrapeJobList().then(result => {
          console.log('Scraping result:', result)
          console.log(result.jobs)
          console.log('Next URL found:', result.nextUrl)
          sendResponse({
            success: true,
            data: result.jobs,
            nextUrl: result.nextUrl
          })
        })
        return true // Keep message channel open
      } catch (error) {
        console.error('Error during scraping:', error)
        sendResponse({ success: false, error: error.message })
      }
    } else {
      sendResponse({ success: false, error: 'Unsupported platform' })
    }
    return true
  }

  if (request.action === 'scrapeJobDetail') {
    const currentUrl = window.location.href
    console.log('Current URL:', currentUrl)

    const platform = Object.values(scrapers).find(s => s.isMatch(currentUrl))
    console.log('Matched platform:', platform?.constructor.name)

    if (platform) {
      try {
        const jobDetail = platform.scrapeJobDetail()
        console.log('Scraped job detail:', jobDetail)
        sendResponse({ success: true, data: jobDetail })
      } catch (error) {
        console.error('Error during detail scraping:', error)
        sendResponse({ success: false, error: error.message })
      }
    } else {
      console.log('No matching platform found')
      sendResponse({ success: false, error: 'Unsupported platform' })
    }
  }

  // Required for async response
  return true
})