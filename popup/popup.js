import { supportedWebsites } from '../src/config/websites.js'

document.addEventListener('DOMContentLoaded', async () => {
  const websiteOptions = document.getElementById('websiteOptions')

  // Load saved settings
  const settings = await chrome.storage.sync.get('websiteSettings')
  const savedSettings = settings.websiteSettings || {}

  // Create checkbox for each website
  supportedWebsites.forEach(website => {
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
  })

  // Save settings when button is clicked
  document.getElementById('saveSettings').addEventListener('click', async () => {
    const newSettings = {}
    supportedWebsites.forEach(website => {
      newSettings[website.id] = document.getElementById(website.id).checked
    })

    await chrome.storage.sync.set({ websiteSettings: newSettings })
    window.close()
  })
}) 