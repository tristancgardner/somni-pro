import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

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
    
    // In a real app, save to database here
    // For example: await db.user.update({ ... })
    
    // Simulated success response
    return NextResponse.json(
      { 
        message: "Billing settings updated successfully", 
        settings: validated.data
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
    
    // In a real app, get from database
    // For example: const userData = await db.user.findUnique({ ... })
    
    // Mock billing data
    const billingData = {
      creditUsage: {
        used: 120,
        total: 500,
        percentage: 24,
        hasLowBalance: false,
      },
      usageData: [
        { date: 'May 1', amount: 15 },
        { date: 'May 5', amount: 24 },
        { date: 'May 10', amount: 8 },
        { date: 'May 15', amount: 32 },
        { date: 'May 20', amount: 18 },
        { date: 'May 25', amount: 23 },
      ],
      billingSettings: {
        autoReload: false,
        reloadAmount: "100",
        reloadThreshold: "50",
        paymentMethod: "card_1234",
      }
    };
    
    return NextResponse.json({ billing: billingData }, { status: 200 });
  } catch (error) {
    console.error("Error fetching billing settings:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 