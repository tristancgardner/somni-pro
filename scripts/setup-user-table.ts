import { PrismaClient } from '@prisma/client';

// Create a new Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log('Setting up User table...');
  
  try {
    // Create the User model
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT,
        "image" TEXT,
        
        CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "User_email_key" UNIQUE ("email")
      );
    `);
    console.log('Created User table');
    
    // Check if foreign key for Project exists
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'Project'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Project_userId_fkey'
          ) THEN
            ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END IF;
      END
      $$;
    `);
    
    console.log('User table setup completed successfully!');
  } catch (error) {
    console.error('Error setting up User table:', error);
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