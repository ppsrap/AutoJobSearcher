// Configuration for the JobJourney extension
const config = {
  // Development environment
  development: {
    jobJourneyUrl: 'http://localhost:3000',
  },
  // Production environment
  production: {
    jobJourneyUrl: 'https://jobjourney.me',
  },
  // Get the current environment configuration
  get current () {
    return new Promise((resolve) => {
      // Try to detect development environment
      const checkDev = () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1000) // 1 second timeout

        fetch('http://localhost:3000/health', {
          signal: controller.signal,
          mode: 'no-cors' // This allows us to at least detect if the server responds
        })
          .then(() => {
            clearTimeout(timeoutId)
            console.log('Development environment detected')
            resolve(this.development)
          })
          .catch(() => {
            clearTimeout(timeoutId)
            console.log('Production environment detected')
            resolve(this.production)
          })
      }

      // Check if we're in development mode
      try {
        checkDev()
      } catch (error) {
        console.log('Error checking environment, defaulting to production:', error)
        resolve(this.production)
      }
    })
  },
  // Get the base URL for JobJourney website
  async getBaseUrl () {
    try {
      const env = await this.current
      return env.jobJourneyUrl
    } catch (error) {
      console.error('Error getting environment, defaulting to production:', error)
      return this.production.jobJourneyUrl
    }
  }
}

export default config 