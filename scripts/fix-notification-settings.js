const { PrismaClient } = require('@prisma/client');

// Create a new Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing NotificationSettings table...');
  
  try {
    // Check if the push column exists, if not add it
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = 'NotificationSettings'
              AND column_name = 'push'
          ) THEN
              ALTER TABLE "NotificationSettings" ADD COLUMN "push" BOOLEAN NOT NULL DEFAULT false;
              RAISE NOTICE 'Added push column to NotificationSettings';
          ELSE
              RAISE NOTICE 'push column already exists in NotificationSettings';
          END IF;
      END
      $$;
    `).catch(err => {
      // If the DO statement fails (e.g., in SQLite), try a simpler approach
      console.log('Using alternative approach to add column...');
      return prisma.$executeRawUnsafe(`
        ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "push" BOOLEAN NOT NULL DEFAULT false;
      `).catch(err2 => {
        console.log('Could not alter table using standard SQL, trying direct column add...');
        return prisma.$executeRawUnsafe(`
          ALTER TABLE "NotificationSettings" ADD COLUMN "push" BOOLEAN NOT NULL DEFAULT false;
        `).catch(err3 => {
          console.log('All column add methods failed, may already exist or table does not exist yet');
        });
      });
    });
    
    console.log('NotificationSettings table fix attempt completed');
  } catch (error) {
    console.error('Error fixing NotificationSettings table:', error);
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