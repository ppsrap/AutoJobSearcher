import supportedWebsites from '../config/websites.js'

class ScraperService {
  static async shouldScrapeWebsite (url) {
    const settings = await chrome.storage.sync.get('websiteSettings')
    const savedSettings = settings.websiteSettings || {}

    return supportedWebsites.some(website => {
      const isEnabled = savedSettings[website.id] !== undefined ?
        savedSettings[website.id] : website.enabled
      return isEnabled && url.includes(website.domain)
    })
  }

  static async scrapeJobData (url) {
    // Determine which website we're on and use appropriate scraper
    if (url.includes('linkedin.com')) {
      return this.scrapeLinkedIn()
    } else if (url.includes('indeed.com')) {
      return this.scrapeIndeed()
    } else if (url.includes('seek.com.au')) {
      return this.scrapeSeek()
    }
  }

  static async scrapeLinkedIn () {
    // LinkedIn specific scraping logic
  }

  static async scrapeIndeed () {
    // Indeed specific scraping logic
  }

  static async scrapeSeek () {
    // SEEK specific scraping logic
  }
}

export default ScraperService 