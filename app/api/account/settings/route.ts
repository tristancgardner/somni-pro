import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

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
    
    // In a real app, save to database here
    // For example: await db.user.update({ ... })
    
    // Simulated success response
    return NextResponse.json(
      { 
        message: "Settings updated successfully", 
        user: { 
          ...session.user,
          ...validated.data
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
    
    // In a real app, get from database
    // For example: const userData = await db.user.findUnique({ ... })
    
    // Mock user data based on session
    const userData = {
      name: session.user.name || "",
      email: session.user.email || "",
      bio: "Web developer and designer",
      notifications: {
        email: true,
        marketing: false,
        updates: true,
      },
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