// Define standard Job class
class Job {
  constructor({
    title,
    company,
    location,
    jobUrl,
    description = '',
    salary = '',
    postedDate = '',
    companyLogoUrl = null,
    platform,
    jobType = ''
  }) {
    this.title = title?.trim() || ''
    this.company = company?.trim() || ''
    this.location = location?.trim() || ''
    this.jobUrl = jobUrl || ''
    this.description = description?.trim() || ''
    this.salary = salary?.trim() || ''
    this.postedDate = postedDate?.trim() || ''
    this.companyLogoUrl = companyLogoUrl || null
    this.platform = platform || ''
    this.jobType = jobType?.trim() || ''
  }

  static createFromLinkedIn (data) {
    return new Job({
      title: data.title,
      company: data.company,
      location: data.location,
      jobUrl: data.jobUrl,
      description: data.description,
      salary: data.salary,
      postedDate: data.postedDate,
      companyLogoUrl: data.companyLogoUrl,
      platform: 'LinkedIn'
    })
  }

  static createFromSEEK (data) {
    return new Job({
      title: data.title,
      company: data.company,
      location: data.location,
      jobUrl: data.jobUrl,
      description: data.description,
      salary: data.salary,
      postedDate: data.postedDate,
      companyLogoUrl: data.companyLogoUrl,
      platform: 'SEEK'
    })
  }

  static createFromIndeed (data) {
    return new Job({
      title: data.title,
      company: data.company,
      location: data.location,
      jobUrl: data.jobUrl,
      description: data.description,
      salary: data.salary,
      postedDate: data.postedDate,
      companyLogoUrl: data.companyLogoUrl,
      platform: 'Indeed',
      jobType: data.jobType
    })
  }
}

// Job scraping functions for different platforms
const scrapers = {
  linkedin: {
    isMatch: (url) => url.includes('linkedin.com'),
    scrapeJobList: () => {
      const jobs = []
      console.log('=== LinkedIn Scraping Started ===')
      console.log('Current URL:', window.location.href)
      console.log('Document ready state:', document.readyState)

      // Updated selectors for the rendered page
      const jobNodes = document.querySelectorAll('div.job-card-container')
      console.log('Found LinkedIn job nodes:', jobNodes.length)

      // Log the first job node HTML for debugging
      if (jobNodes.length > 0) {
        console.log('First job node HTML:', jobNodes[0].outerHTML)
      }

      jobNodes.forEach((node, index) => {
        try {
          console.log(`\nProcessing LinkedIn job ${index + 1}:`)

          // Updated selectors based on the actual page structure
          const titleNode = node.querySelector('.job-card-list__title--link')
          const companyNode = node.querySelector('.artdeco-entity-lockup__subtitle span')
          const locationNode = node.querySelector('.artdeco-entity-lockup__caption span[dir="ltr"]')
          const jobUrlNode = node.querySelector('.job-card-list__title--link')
          const logoNode = node.querySelector('.ivm-image-view-model img')

          // Get metadata items for salary and job type
          const metadataItems = Array.from(node.querySelectorAll('.artdeco-entity-lockup__metadata li span[dir="ltr"]'))
            .map(el => el.textContent.trim())
            .filter(text => text)

          // Find salary (item containing currency symbols or ranges)
          const salaryText = metadataItems.find(text =>
            /[$€£¥]|per\s+|annum|annual|year|month|hour|week/i.test(text)
          )

          // Get job description from the job details section
          const descriptionNode = node.querySelector('.job-card-container__description, .job-card-list__description')
          const description = descriptionNode?.textContent?.trim()
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .trim()

          // Get posted date
          const postedDateNode = node.querySelector('time, .job-card-container__listed-time, span.job-card-container__footer-item--time')

          console.log('Found LinkedIn nodes:', {
            title: titleNode?.textContent?.trim(),
            company: companyNode?.textContent?.trim(),
            location: locationNode?.textContent?.trim(),
            salary: salaryText,
            description: description,
            postedDate: postedDateNode?.textContent?.trim(),
            url: jobUrlNode?.href,
            logo: logoNode?.src,
            allMetadata: metadataItems
          })

          if (titleNode && companyNode) {
            // Clean up the title by taking only the first line
            let title = titleNode.textContent.trim()
            title = title.split('\n')[0].trim()

            const job = Job.createFromLinkedIn({
              title: title,
              company: companyNode.textContent.trim(),
              location: locationNode?.textContent?.trim(),
              salary: salaryText || '',
              description: description || '',
              postedDate: postedDateNode?.textContent?.trim(),
              jobUrl: jobUrlNode?.href || window.location.href,
              companyLogoUrl: logoNode?.src
            })
            console.log('Successfully scraped LinkedIn job:', job)
            jobs.push(job)
          } else {
            console.log('Skipping job due to missing required fields')
          }
        } catch (error) {
          console.error('Error scraping LinkedIn job:', error)
        }
      })

      console.log(`=== LinkedIn Scraping Complete: ${jobs.length} jobs found ===`)
      return jobs
    },
    scrapeJobDetail: () => {
      try {
        const title = document.querySelector('h1.top-card-layout__title')?.textContent.trim()
        const company = document.querySelector('a.topcard__org-name-link')?.textContent.trim()
        const location = document.querySelector('span.topcard__flavor--bullet')?.textContent.trim()
        const description = document.querySelector('div.description__text')?.textContent.trim()
        const logoUrl = document.querySelector('img.artdeco-entity-image')?.src
        const workplaceType = document.querySelector('span.workplace-type')?.textContent.trim()
        const employmentType = document.querySelector('span.job-type')?.textContent.trim()

        const job = {
          title,
          company,
          location,
          description,
          companyLogoUrl: logoUrl,
          jobUrl: window.location.href,
          platform: 'LinkedIn',
          workArrangement: workplaceType || '',
          employmentType: employmentType || ''
        }
        console.log('Scraped LinkedIn job detail:', job)
        return job
      } catch (error) {
        console.error('Error scraping LinkedIn job detail:', error)
        return null
      }
    }
  },
  seek: {
    isMatch: (url) => url.includes('seek.com.au'),
    scrapeJobList: () => {
      const jobs = []
      console.log('=== SEEK Scraping Started ===')
      console.log('Current URL:', window.location.href)
      console.log('Document ready state:', document.readyState)

      // Try multiple possible selectors
      console.log('Trying different selectors...')

      // Log entire document HTML for debugging
      console.log('Document HTML:', document.documentElement.outerHTML)

      const selectors = [
        '[data-testid="job-card"]',
        'article[data-card-type="JobCard"]',
        'article[role="article"]',
        'a[data-testid="job-card-title"]',
        '[data-automation="job-card"]'
      ]

      let jobNodes = []
      for (const selector of selectors) {
        const nodes = document.querySelectorAll(selector)
        console.log(`Selector "${selector}" found ${nodes.length} nodes`)
        if (nodes.length > 0) {
          jobNodes = nodes
          console.log('Using selector:', selector)
          break
        }
      }

      console.log('Found SEEK job nodes:', jobNodes.length)

      // Log the first job node HTML for debugging
      if (jobNodes.length > 0) {
        console.log('First job node HTML:', jobNodes[0].outerHTML)
      } else {
        console.log('No job nodes found. Document body:', document.body.innerHTML)
      }

      jobNodes.forEach((node, index) => {
        try {
          console.log(`\nProcessing SEEK job ${index + 1}:`)
          console.log('Node HTML:', node.outerHTML)

          // Try multiple selectors for each field
          const titleNode =
            node.querySelector('[data-testid="job-card-title"]') ||
            node.querySelector('a[data-automation="jobTitle"]') ||
            node.querySelector('a[class*="job-title"]') ||
            node.querySelector('a[id^="job-title"]')

          const companyNode =
            node.querySelector('[data-automation="jobCompany"]') ||
            node.querySelector('span[class*="l1r1184z"] a[data-automation="jobCompany"]') ||
            node.querySelector('div.snwpn00 a[data-automation="jobCompany"]') ||
            node.querySelector('span._1l99f880 a[data-type="company"]')

          const locationNode =
            node.querySelector('span[data-automation="jobCardLocation"]') ||
            node.querySelector('a[data-automation="jobLocation"]') ||
            node.querySelector('span[data-type="location"]')

          const descriptionNode = node.querySelector('span[data-testid="job-card-teaser"]')
          const salaryNode = node.querySelector('span[data-automation="jobSalary"]')
          const postedDateNode = node.querySelector('span[data-automation="jobListingDate"] div._1kme6z20')

          console.log('Found SEEK nodes:', {
            title: titleNode?.textContent?.trim(),
            company: companyNode?.textContent?.trim(),
            location: locationNode?.textContent?.trim(),
            description: descriptionNode?.textContent?.trim(),
            salary: salaryNode?.textContent?.trim(),
            postedDate: postedDateNode?.textContent?.trim(),
            titleHref: titleNode?.href,
            titleParentHtml: titleNode?.parentElement?.outerHTML
          })

          if (titleNode && companyNode) {
            const job = Job.createFromSEEK({
              title: titleNode.textContent.trim(),
              company: companyNode.textContent.trim(),
              location: locationNode?.textContent?.trim(),
              jobUrl: titleNode.href || window.location.href,
              description: descriptionNode?.textContent?.trim(),
              salary: salaryNode?.textContent?.trim(),
              postedDate: postedDateNode?.textContent?.trim(),
              companyLogoUrl: null
            })
            console.log('Successfully scraped SEEK job:', job)
            jobs.push(job)
          } else {
            console.log('Skipping job due to missing required fields')
          }
        } catch (error) {
          console.error('Error scraping SEEK job:', error)
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            nodeHtml: node.outerHTML
          })
        }
      })

      console.log(`=== SEEK Scraping Complete: ${jobs.length} jobs found ===`)
      return jobs
    },
    scrapeJobDetail: () => {
      try {
        const title = document.querySelector('[data-automation="job-detail-title"]')?.textContent.trim()
        const company = document.querySelector('[data-automation="advertiser-name"]')?.textContent.trim()
        const location = document.querySelector('[data-automation="job-location"]')?.textContent.trim()
        const description = document.querySelector('[data-automation="jobDescription"]')?.textContent.trim()
        const logoUrl = document.querySelector('[data-automation="advertiser-logo"] img')?.src
        const workType = document.querySelector('[data-automation="job-work-type"]')?.textContent.trim()
        const salary = document.querySelector('[data-automation="job-salary"]')?.textContent.trim()

        const job = {
          title,
          company,
          location,
          description,
          companyLogoUrl: logoUrl,
          jobUrl: window.location.href,
          platform: 'SEEK',
          workType: workType || '',
          salary: salary || ''
        }
        console.log('Scraped SEEK job detail:', job)
        return job
      } catch (error) {
        console.error('Error scraping SEEK job detail:', error)
        return null
      }
    }
  },
  indeed: {
    isMatch: (url) => url.includes('indeed.com'),
    scrapeJobList: () => {
      const jobs = []
      const jobNodes = document.querySelectorAll([
        'div.job_seen_beacon',
        'div[class*="job_seen_"]',
        'div[class*="cardOutline"]',
        'div.resultContent',
        'div[data-testid="job-card"]',
        'td.resultContent'
      ].join(','))

      console.log('Found Indeed job nodes:', jobNodes.length)

      jobNodes.forEach((node, index) => {
        try {
          console.log(`\nProcessing Indeed job ${index + 1}:`)

          const titleNode = node.querySelector([
            'h2.jobTitle a',
            'h2 a[data-jk]',
            'h2.jobTitle span[title]',
            'a[data-jk] span[title]',
            '[class*="jobTitle"]',
            'a[id^="job_"]'
          ].join(','))

          const companyNode = node.querySelector([
            'span[data-testid="company-name"]',
            'span.css-1h7lukg[data-testid="company-name"]',
            'span.companyName',
            '[data-testid="company-name"]',
            'div[class*="company"] span',
            'span[class*="companyName"]'
          ].join(','))

          const locationNode = node.querySelector([
            'div[data-testid="text-location"]',
            'div.css-1restlb[data-testid="text-location"]',
            'div.companyLocation',
            'div[class*="location"]',
            'div[class*="workplace"]'
          ].join(','))

          const descriptionNode = node.querySelector([
            'div[data-testid="jobsnippet_footer"] ul li',
            '.job-snippet',
            '.underShelfFooter .heading6 ul li'
          ].join(','))

          const postedDateNode = node.querySelector('span.date')

          // Additional debug logging for company and location
          console.log('Debug - Company/Location:', {
            companyRawHtml: node.querySelector('.company_location')?.innerHTML,
            companyNodeHtml: companyNode?.outerHTML,
            locationNodeHtml: locationNode?.outerHTML,
            companyText: companyNode?.textContent?.trim(),
            locationText: locationNode?.textContent?.trim(),
            allCompanyNodes: Array.from(node.querySelectorAll('[data-testid="company-name"]')).map(el => el.outerHTML),
            allLocationNodes: Array.from(node.querySelectorAll('[data-testid="text-location"]')).map(el => el.outerHTML)
          })

          // Get all metadata items and clean up text content
          const metadataItems = Array.from(node.querySelectorAll([
            '.metadataContainer li .metadata div[data-testid="attribute_snippet_testid"]',
            '.metadataContainer li div[data-testid="attribute_snippet_testid"]',
            '.metadataContainer li div[data-testid^="attribute_snippet"]'
          ].join(',')))
            .map(el => {
              // First try to get direct text content before any SVG or span
              const textContent = Array.from(el.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .join(' ')
                .split('+')[0]  // Remove any "+N" suffix
                .trim()

              return textContent || el.textContent.trim().split('+')[0].trim()
            })
            .filter(text => text) // Remove empty strings

          console.log('Debug - Raw metadata items:', {
            items: metadataItems,
            nodes: Array.from(node.querySelectorAll('.metadataContainer li div[data-testid="attribute_snippet_testid"]'))
              .map(el => ({
                html: el.outerHTML,
                text: el.textContent,
                parentClass: el.parentElement.className
              }))
          })

          // Find salary (item containing '$')
          const salaryText = metadataItems.find(text => text.includes('$'))

          // Find job type (items matching employment types)
          const jobTypeText = metadataItems.find(text =>
            /\b(Full-time|Part-time|Contract|Temporary|Internship|Casual|Contractor)\b/i.test(text)
          )

          // Clean up job type text (remove any extra content)
          const jobType = jobTypeText?.match(/\b(Full-time|Part-time|Contract|Temporary|Internship|Casual|Contractor)\b/i)?.[0] || ''

          console.log('Found Indeed metadata:', {
            allMetadata: metadataItems,
            salary: salaryText,
            jobType: jobType,
            jobTypeText: jobTypeText,
            rawItems: Array.from(node.querySelectorAll('.metadataContainer li'))
              .map(el => el.textContent.trim())
          })

          // Clean up description text (remove ellipsis and extra whitespace)
          const description = descriptionNode?.textContent?.trim()
            .replace(/…$/, '')  // Remove trailing ellipsis
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .trim()

          console.log('Found Indeed nodes:', {
            title: titleNode?.textContent?.trim(),
            company: companyNode?.textContent?.trim(),
            location: locationNode?.textContent?.trim(),
            salary: salaryText,
            jobType: jobType,
            description: description,
            postedDate: postedDateNode?.textContent?.trim()
          })

          if (titleNode && companyNode) {
            let jobUrl = ''
            if (titleNode.href) {
              jobUrl = titleNode.href
            } else if (titleNode.closest('a')?.href) {
              jobUrl = titleNode.closest('a').href
            } else if (node.querySelector('a[data-jk]')?.href) {
              jobUrl = node.querySelector('a[data-jk]').href
            }

            // Ensure URL is complete
            if (!jobUrl.startsWith('http')) {
              jobUrl = 'https://indeed.com' + jobUrl
            }

            const job = Job.createFromIndeed({
              title: titleNode.textContent.trim(),
              company: companyNode.textContent.trim(),
              location: locationNode?.textContent?.trim(),
              jobUrl: jobUrl,
              description: description,
              salary: salaryText || '',
              postedDate: postedDateNode?.textContent?.trim(),
              companyLogoUrl: node.querySelector('img.companyAvatar')?.src || null,
              jobType: jobType
            })

            console.log('Successfully scraped Indeed job:', job)
            jobs.push(job)
          } else {
            console.log('Skipping job due to missing required fields')
          }
        } catch (error) {
          console.error('Error scraping Indeed job:', error)
        }
      })

      return jobs
    },
    scrapeJobDetail: () => {
      try {
        const title = document.querySelector('h1.jobsearch-JobInfoHeader-title')?.textContent.trim()
        const company = document.querySelector('div.jobsearch-CompanyInfoContainer a')?.textContent.trim()
        const location = document.querySelector('div.jobsearch-JobInfoHeader-subtitle div')?.textContent.trim()
        const description = document.querySelector('div#jobDescriptionText')?.textContent.trim()
        const logoUrl = document.querySelector('img.jobsearch-CompanyAvatar-image')?.src
        const salary = document.querySelector('div[data-testid="attribute_snippet_compensation"]')?.textContent.trim()
        const jobType = document.querySelector('div[data-testid="attribute_snippet_job_type"]')?.textContent.trim()

        const job = {
          title,
          company,
          location,
          description,
          companyLogoUrl: logoUrl,
          jobUrl: window.location.href,
          platform: 'Indeed',
          salary: salary || '',
          jobType: jobType || ''
        }
        console.log('Scraped Indeed job detail:', job)
        return job
      } catch (error) {
        console.error('Error scraping Indeed job detail:', error)
        return null
      }
    }
  }
}

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

  if (request.action === 'testScraping') {
    console.log('Running scraping test...')
    const results = testScraping()
    sendResponse({ success: true, data: results })
    return true
  }

  if (request.action === 'scrapeJobs') {
    const currentUrl = window.location.href
    console.log('=== Starting Job Scraping ===')
    console.log('Page URL:', currentUrl)
    console.log('Page Title:', document.title)
    console.log('Document Ready State:', document.readyState)
    console.log('Scroll Position:', window.scrollY)
    console.log('Viewport Height:', window.innerHeight)
    console.log('Document Height:', document.documentElement.scrollHeight)

    // Run test first
    console.log('Running pre-scrape test:')
    testScraping()

    const platform = Object.values(scrapers).find(s => s.isMatch(currentUrl))
    console.log('Matched platform:', platform?.constructor.name)

    if (platform) {
      try {
        console.log('Starting scraping for platform:', currentUrl.includes('linkedin.com') ? 'LinkedIn' :
          currentUrl.includes('seek.com.au') ? 'SEEK' :
            currentUrl.includes('indeed.com') ? 'Indeed' : 'Unknown')
        const jobs = platform.scrapeJobList()
        console.log(`Scraped ${jobs.length} jobs`)
        console.log('Scraped jobs details:', jobs)
        sendResponse({ success: true, data: jobs })
      } catch (error) {
        console.error('Error during scraping:', error)
        console.error('Error stack:', error.stack)
        sendResponse({ success: false, error: error.message })
      }
    } else {
      console.log('No matching platform found for URL:', currentUrl)
      sendResponse({ success: false, error: 'Unsupported platform' })
    }
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