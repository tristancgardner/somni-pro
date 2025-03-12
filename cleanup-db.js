// Direct database cleanup script using Prisma
// This script directly interfaces with the database to remove the corrupted file entry
// Run with: node cleanup-db.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupOrphanedFile() {
  try {
    const filename = "S_CC24_S001_S001_T001.wav";
    console.log(`Looking for file entries matching: ${filename}`);
    
    // First, find any matching files
    const files = await prisma.TranscriptionFile.findMany({
      where: {
        filename: { contains: filename }
      },
      include: {
        project: true
      }
    });
    
    if (files.length === 0) {
      console.log('No files found matching the criteria');
      return;
    }
    
    console.log(`Found ${files.length} matching files:`);
    files.forEach(file => {
      console.log(`- ID: ${file.id}, Filename: ${file.filename}, Size: ${file.size} bytes, Project: ${file.project?.name || 'None'}`);
    });
    
    // For safety, we'll ask for confirmation
    console.log('\nAbout to delete these file entries from the database. This cannot be undone.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
    
    // Wait 5 seconds for potential cancellation
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete each file
    for (const file of files) {
      console.log(`Deleting file: ${file.filename}, ID: ${file.id}`);
      await prisma.TranscriptionFile.delete({
        where: { id: file.id }
      });
      console.log(`✓ File deleted successfully`);
    }
    
    console.log('\nCleanup complete! All matching file entries have been removed from the database.');
    console.log('Please refresh your application to see the changes.');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphanedFile(); 