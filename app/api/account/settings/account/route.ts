import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Validation schema for account settings
const accountSettingsSchema = z.object({
  language: z.string().min(1, { message: "Please select a language" }),
  timezone: z.string().min(1, { message: "Please select a timezone" }),
  autoSave: z.boolean().default(true),
  soundEffects: z.boolean().default(true),
});

export async function PATCH(req: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be logged in to update account settings." },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await req.json();
    
    // Validate the request body
    const validated = accountSettingsSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.format() },
        { status: 400 }
      );
    }
    
    // Get the user ID
    const email = session.user.email;
    if (!email) {
      return NextResponse.json(
        { error: "User email not found in session" },
        { status: 400 }
      );
    }
    
    // Find or create the user
    let user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      // Create the user if they don't exist
      user = await prisma.user.create({
        data: {
          email,
          name: session.user.name || "",
          image: session.user.image || "",
        },
      });
    }
    
    // Update account settings
    const accountSettings = await prisma.accountSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        language: validated.data.language,
        timezone: validated.data.timezone,
        autoSave: validated.data.autoSave,
        soundEffects: validated.data.soundEffects
      },
      update: {
        language: validated.data.language,
        timezone: validated.data.timezone,
        autoSave: validated.data.autoSave,
        soundEffects: validated.data.soundEffects
      }
    });
    
    // Return updated account settings
    return NextResponse.json(
      { 
        message: "Account settings updated successfully", 
        account: accountSettings
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating account settings:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be logged in to view account settings." },
        { status: 401 }
      );
    }
    
    const email = session.user.email;
    if (!email) {
      return NextResponse.json(
        { error: "User email not found in session" },
        { status: 400 }
      );
    }
    
    // Find the user and their account settings
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accountSettings: true }
    });
    
    if (!user) {
      // Create a default user
      const newUser = await prisma.user.create({
        data: {
          email,
          name: session.user.name || "",
          image: session.user.image || "",
        }
      });
      
      // Return default account settings
      return NextResponse.json({
        account: {
          language: "en-US",
          timezone: "America/New_York",
          autoSave: true,
          soundEffects: true
        }
      }, { status: 200 });
    }
    
    // Return account settings or defaults
    if (!user.accountSettings) {
      return NextResponse.json({
        account: {
          language: "en-US",
          timezone: "America/New_York",
          autoSave: true,
          soundEffects: true
        }
      }, { status: 200 });
    }
    
    return NextResponse.json({ account: user.accountSettings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching account settings:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 