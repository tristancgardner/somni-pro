const { PrismaClient } = require('@prisma/client');

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