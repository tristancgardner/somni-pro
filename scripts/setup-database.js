const { PrismaClient } = require('@prisma/client');

// Create a new Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log('Setting up database tables...');
  
  try {
    // Create the Project model
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Project" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "userId" TEXT NOT NULL,
        
        CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Created Project table');
    
    // Create the TranscriptionFile model
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TranscriptionFile" (
        "id" TEXT NOT NULL,
        "s3Key" TEXT NOT NULL,
        "filename" TEXT NOT NULL,
        "size" INTEGER NOT NULL,
        "lastModified" TIMESTAMP(3) NOT NULL,
        "projectId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "TranscriptionFile_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "TranscriptionFile_s3Key_key" UNIQUE ("s3Key")
      );
    `);
    console.log('Created TranscriptionFile table');
    
    // Add foreign key from Project to User
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Project" 
        ADD CONSTRAINT "Project_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `);
      console.log('Added Project to User foreign key');
    } catch (err) {
      // Constraint might already exist
      console.log('Note: Project to User foreign key already exists or error adding it');
    }
    
    // Add foreign key from TranscriptionFile to Project
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TranscriptionFile" 
        ADD CONSTRAINT "TranscriptionFile_projectId_fkey" 
        FOREIGN KEY ("projectId") 
        REFERENCES "Project"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
      `);
      console.log('Added TranscriptionFile to Project foreign key');
    } catch (err) {
      // Constraint might already exist
      console.log('Note: TranscriptionFile to Project foreign key already exists or error adding it');
    }
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 