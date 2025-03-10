import { PrismaClient } from '@prisma/client';

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
    
    // Create necessary foreign key constraints
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'TranscriptionFile_projectId_fkey'
        ) THEN
          ALTER TABLE "TranscriptionFile" ADD CONSTRAINT "TranscriptionFile_projectId_fkey" 
          FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END
      $$;
    `);
    
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