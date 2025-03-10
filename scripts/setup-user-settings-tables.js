const { PrismaClient } = require('@prisma/client');

// Create a new Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log('Setting up user settings tables...');
  
  try {
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
        
        CONSTRAINT "AccountSettings_pkey" PRIMARY KEY ("userId"),
        CONSTRAINT "AccountSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
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
        
        CONSTRAINT "BillingSettings_pkey" PRIMARY KEY ("userId"),
        CONSTRAINT "BillingSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
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
        
        CONSTRAINT "DisplaySettings_pkey" PRIMARY KEY ("userId"),
        CONSTRAINT "DisplaySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
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
        
        CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("userId"),
        CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
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
        
        CONSTRAINT "SecuritySettings_pkey" PRIMARY KEY ("userId"),
        CONSTRAINT "SecuritySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('Created SecuritySettings table');
    
    console.log('All user settings tables setup completed successfully!');
  } catch (error) {
    console.error('Error setting up user settings tables:', error);
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