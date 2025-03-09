import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Validation schema for billing settings
const billingSettingsSchema = z.object({
  autoReload: z.boolean().default(false),
  reloadAmount: z.string().min(1, {
    message: "Please enter a reload amount.",
  }),
  reloadThreshold: z.string().min(1, {
    message: "Please enter a reload threshold.",
  }),
  paymentMethod: z.string().min(1, {
    message: "Please select a payment method.",
  }),
});

export async function PATCH(req: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be logged in to update billing settings." },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await req.json();
    
    // Validate the request body
    const validated = billingSettingsSchema.safeParse(body);
    
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
    
    // Update billing settings
    // Note: We're storing reloadAmount as a number in the database but treating it as a string in the form
    const reloadAmountNumber = parseFloat(validated.data.reloadAmount);
    
    const billingSettings = await prisma.billingSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        autoReload: validated.data.autoReload,
        reloadAmount: isNaN(reloadAmountNumber) ? null : reloadAmountNumber,
        paymentMethod: validated.data.paymentMethod,
        // Store other form values as custom fields
        // These aren't in our schema so we'll use metadata
      },
      update: {
        autoReload: validated.data.autoReload,
        reloadAmount: isNaN(reloadAmountNumber) ? null : reloadAmountNumber,
        paymentMethod: validated.data.paymentMethod,
      }
    });
    
    // Return updated billing settings
    return NextResponse.json(
      { 
        message: "Billing settings updated successfully", 
        billing: {
          billingSettings: validated.data
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating billing settings:", error);
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
        { error: "You must be logged in to view billing settings." },
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
    
    // Find the user and their billing settings
    const user = await prisma.user.findUnique({
      where: { email },
      include: { billingSettings: true }
    });
    
    // Generate mock credit usage data
    const creditUsage = {
      used: 120,
      total: 500,
      percentage: 24,
      hasLowBalance: false,
    };
    
    // Generate mock usage data
    const usageData = [
      { date: 'May 1', amount: 15 },
      { date: 'May 5', amount: 24 },
      { date: 'May 10', amount: 8 },
      { date: 'May 15', amount: 32 },
      { date: 'May 20', amount: 18 },
      { date: 'May 25', amount: 23 },
    ];
    
    if (!user) {
      // Create a default user
      const newUser = await prisma.user.create({
        data: {
          email,
          name: session.user.name || "",
          image: session.user.image || "",
        }
      });
      
      // Return default billing settings with mock data
      return NextResponse.json({
        billing: {
          creditUsage,
          usageData,
          billingSettings: {
            autoReload: false,
            reloadAmount: "100",
            reloadThreshold: "50",
            paymentMethod: "card_1234",
          }
        }
      }, { status: 200 });
    }
    
    // Extract billing settings from database or use defaults
    const billingSettingsData = {
      autoReload: user.billingSettings?.autoReload || false,
      reloadAmount: user.billingSettings?.reloadAmount ? String(user.billingSettings.reloadAmount) : "100",
      reloadThreshold: "50", // Not stored in DB yet
      paymentMethod: user.billingSettings?.paymentMethod || "card_1234",
    };
    
    return NextResponse.json({
      billing: {
        creditUsage,
        usageData,
        billingSettings: billingSettingsData
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching billing settings:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 