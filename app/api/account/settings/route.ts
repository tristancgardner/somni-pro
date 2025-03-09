import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Validation schema for user settings
const userSettingsSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  bio: z.string().optional(),
  notifications: z.object({
    email: z.boolean().default(false),
    marketing: z.boolean().default(false),
    updates: z.boolean().default(false),
  }),
  language: z.string().optional(),
  timezone: z.string().optional(),
  autoSave: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be logged in to update settings." },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await req.json();
    
    // Validate the request body
    const validated = userSettingsSchema.safeParse(body);
    
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
    
    // Find or create the user and their account settings
    let user = await prisma.user.findUnique({
      where: { email },
      include: { accountSettings: true }
    });
    
    if (!user) {
      // Create the user if they don't exist
      user = await prisma.user.create({
        data: {
          email,
          name: session.user.name || "",
          image: session.user.image || "",
        },
        include: { accountSettings: true }
      });
    }
    
    // Update user's name
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: validated.data.name,
        // We don't update email here as it might be connected to auth
      }
    });
    
    // Update account settings
    const accountSettings = await prisma.accountSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        bio: validated.data.bio || "",
        language: validated.data.language || "en",
        timezone: validated.data.timezone || "UTC",
        autoSave: validated.data.autoSave ?? true,
        soundEffects: validated.data.soundEffects ?? true
      },
      update: {
        bio: validated.data.bio,
        language: validated.data.language,
        timezone: validated.data.timezone,
        autoSave: validated.data.autoSave,
        soundEffects: validated.data.soundEffects
      }
    });
    
    // Update notification settings if provided
    if (validated.data.notifications) {
      await prisma.notificationSettings.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          email: validated.data.notifications.email,
          marketing: validated.data.notifications.marketing,
          updates: validated.data.notifications.updates
        },
        update: {
          email: validated.data.notifications.email,
          marketing: validated.data.notifications.marketing,
          updates: validated.data.notifications.updates
        }
      });
    }
    
    // Return updated user data
    return NextResponse.json(
      { 
        message: "Settings updated successfully", 
        user: {
          ...validated.data,
          id: user.id
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating settings:", error);
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
        { error: "You must be logged in to view settings." },
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
    
    // Find the user and their settings
    const user = await prisma.user.findUnique({
      where: { email },
      include: { 
        accountSettings: true,
        notificationSettings: true
      }
    });
    
    if (!user) {
      // Create a default user and return mock data
      const newUser = await prisma.user.create({
        data: {
          email,
          name: session.user.name || "",
          image: session.user.image || "",
        }
      });
      
      const userData = {
        id: newUser.id,
        name: newUser.name || "",
        email: newUser.email,
        bio: "",
        notifications: {
          email: true,
          marketing: false,
          updates: true,
        },
        language: "en",
        timezone: "UTC",
        autoSave: true,
        soundEffects: true
      };
      
      return NextResponse.json({ user: userData }, { status: 200 });
    }
    
    // Combine user data with settings
    const userData = {
      id: user.id,
      name: user.name || "",
      email: user.email,
      bio: user.accountSettings?.bio || "",
      notifications: {
        email: user.notificationSettings?.email || false,
        marketing: user.notificationSettings?.marketing || false,
        updates: user.notificationSettings?.updates || false,
      },
      language: user.accountSettings?.language || "en",
      timezone: user.accountSettings?.timezone || "UTC",
      autoSave: user.accountSettings?.autoSave || true,
      soundEffects: user.accountSettings?.soundEffects || true
    };
    
    return NextResponse.json({ user: userData }, { status: 200 });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 