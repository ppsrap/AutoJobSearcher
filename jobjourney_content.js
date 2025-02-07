// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'importJobs') {
    // Get jobs from the message
    const jobs = request.jobs

    // Create a custom event to pass data to the React application
    const event = new CustomEvent('JOBJOURNEY_IMPORT_JOBS', {
      detail: { jobs }
    })

    // Dispatch the event for the React app to handle
    window.dispatchEvent(event)

    sendResponse({ success: true })
  }
}) 