// Script to remove the orphaned file entry from the database
// Run with: node cleanup-orphaned-file.js

const filename = "S_CC24_S001_S001_T001.wav";
// From the screenshot, we know it belongs to project C1A, but we can use projectId or projectName
const projectName = "C1A"; // We might use this for a more specific search

async function cleanupOrphanedFile() {
  try {
    console.log(`Attempting to clean up orphaned file: ${filename} in project: ${projectName}`);
    
    const response = await fetch('http://localhost:3001/api/admin/cleanup-orphaned-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        // We don't have the project ID but our endpoint will search by filename
      }),
      credentials: 'include', // Important for sending cookies/session
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Success:', data);
      console.log('The corrupted file entry has been removed from the database.');
      console.log('You should now refresh your project view to see the changes.');
    } else {
      console.error('Error:', data);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

cleanupOrphanedFile();

// After running this script, you can remove it and the API endpoint as they are
// only needed for this one-time cleanup operation
