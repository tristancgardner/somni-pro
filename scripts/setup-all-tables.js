const { PrismaClient } = require('@prisma/client');

// Create a new Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log('Setting up all database tables...');
  
  try {
    console.log('Step 1: Setting up User table...');
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
    
    console.log('Step 2: Setting up Project tables...');
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
    
    console.log('Step 3: Setting up user settings tables...');
    // Create the AccountSettings model
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AccountSettings" (
        "userId" TEXT NOT NULL,
        "language" TEXT DEFAULT 'en',
        "timezone" TEXT DEFAULT 'UTC',
        "autoSave" BOOLEAN NOT NULL DEFAULT true,
        "soundEffects" BOOLEAN NOT NULL DEFAULT true,
        "bio" TEXT DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "AccountSettings_pkey" PRIMARY KEY ("userId")
      );
    `);
    console.log('Created AccountSettings table');
    
    // Create the BillingSettings model
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BillingSettings" (
        "userId" TEXT NOT NULL,
        "autoReload" BOOLEAN NOT NULL DEFAULT false,
        "reloadAmount" DOUBLE PRECISION,
        "paymentMethod" TEXT,
        "billingEmail" TEXT,
        "billingAddress" TEXT,
        "creditLimit" DOUBLE PRECISION DEFAULT 0,
        "subscriptionTier" TEXT DEFAULT 'free',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "BillingSettings_pkey" PRIMARY KEY ("userId")
      );
    `);
    console.log('Created BillingSettings table');
    
    // Create the DisplaySettings model
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DisplaySettings" (
        "userId" TEXT NOT NULL,
        "theme" TEXT DEFAULT 'dark',
        "fontSize" TEXT DEFAULT 'medium',
        "contrastMode" BOOLEAN NOT NULL DEFAULT false,
        "colorBlindMode" TEXT DEFAULT 'none',
        "reduceAnimations" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "DisplaySettings_pkey" PRIMARY KEY ("userId")
      );
    `);
    console.log('Created DisplaySettings table');
    
    // Create the NotificationSettings model
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "NotificationSettings" (
        "userId" TEXT NOT NULL,
        "email" BOOLEAN NOT NULL DEFAULT true,
        "push" BOOLEAN NOT NULL DEFAULT false,
        "marketing" BOOLEAN NOT NULL DEFAULT false,
        "updates" BOOLEAN NOT NULL DEFAULT true,
        "jobCompletions" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("userId")
      );
    `);
    console.log('Created NotificationSettings table');
    
    // Create the SecuritySettings model
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SecuritySettings" (
        "userId" TEXT NOT NULL,
        "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
        "twoFactorMethod" TEXT DEFAULT 'none',
        "accountLocked" BOOLEAN NOT NULL DEFAULT false,
        "lastLogin" TIMESTAMP(3),
        "lastPasswordChange" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "SecuritySettings_pkey" PRIMARY KEY ("userId")
      );
    `);
    console.log('Created SecuritySettings table');
    
    console.log('Step 4: Setting up foreign key constraints...');
    // Add foreign keys after all tables are created to avoid circular references
    try {
      // Project to User foreign key
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
      console.log('Note: Project to User foreign key already exists or error adding it');
    }
    
    try {
      // TranscriptionFile to Project foreign key
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
      console.log('Note: TranscriptionFile to Project foreign key already exists or error adding it');
    }
    
    try {
      // AccountSettings to User foreign key
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "AccountSettings" 
        ADD CONSTRAINT "AccountSettings_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `);
      console.log('Added AccountSettings to User foreign key');
    } catch (err) {
      console.log('Note: AccountSettings to User foreign key already exists or error adding it');
    }
    
    try {
      // BillingSettings to User foreign key
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "BillingSettings" 
        ADD CONSTRAINT "BillingSettings_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `);
      console.log('Added BillingSettings to User foreign key');
    } catch (err) {
      console.log('Note: BillingSettings to User foreign key already exists or error adding it');
    }
    
    try {
      // DisplaySettings to User foreign key
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "DisplaySettings" 
        ADD CONSTRAINT "DisplaySettings_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `);
      console.log('Added DisplaySettings to User foreign key');
    } catch (err) {
      console.log('Note: DisplaySettings to User foreign key already exists or error adding it');
    }
    
    try {
      // NotificationSettings to User foreign key
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "NotificationSettings" 
        ADD CONSTRAINT "NotificationSettings_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `);
      console.log('Added NotificationSettings to User foreign key');
    } catch (err) {
      console.log('Note: NotificationSettings to User foreign key already exists or error adding it');
    }
    
    try {
      // SecuritySettings to User foreign key
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "SecuritySettings" 
        ADD CONSTRAINT "SecuritySettings_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `);
      console.log('Added SecuritySettings to User foreign key');
    } catch (err) {
      console.log('Note: SecuritySettings to User foreign key already exists or error adding it');
    }
    
    console.log('All database tables setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database tables:', error);
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