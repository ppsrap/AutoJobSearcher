import config from './config.js'

// API base URL from config
const API_BASE_URL = config.API_BASE_URL

class JobApi {
  static async saveJob (jobData) {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error saving job:', error)
      throw error
    }
  }

  static async getJobById (id) {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${id}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting job:', error)
      throw error
    }
  }
}

export default JobApi 