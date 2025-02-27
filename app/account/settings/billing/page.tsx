"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsSidebar, settingsNavItems } from "@/components/account/settings-sidebar";
import { AlertCircle, CreditCard, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useSession } from "next-auth/react";

// Define billing form schema
const billingFormSchema = z.object({
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

type BillingFormValues = z.infer<typeof billingFormSchema>;
type UsageDataPoint = { date: string; amount: number };

export default function BillingSettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [creditUsage, setCreditUsage] = useState({
    used: 0,
    total: 0,
    percentage: 0,
    hasLowBalance: false,
  });
  const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);

  // Initialize billing form
  const billingForm = useForm<BillingFormValues>({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      autoReload: false,
      reloadAmount: "100",
      reloadThreshold: "50",
      paymentMethod: "card_1234",
    },
  });

  // Load billing data from API
  useEffect(() => {
    async function loadBillingData() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/account/settings/billing");
        if (!response.ok) throw new Error("Failed to load billing data");
        
        const data = await response.json();
        setCreditUsage(data.billing.creditUsage);
        setUsageData(data.billing.usageData);
        billingForm.reset(data.billing.billingSettings);
      } catch (error) {
        console.error("Error loading billing data:", error);
        toast.error("Failed to load billing data");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      loadBillingData();
    }
  }, [session, billingForm]);

  // Toggle low balance alert for demo purposes
  const toggleLowBalanceAlert = () => {
    setCreditUsage(prev => ({
      ...prev,
      hasLowBalance: !prev.hasLowBalance
    }));
    
    if (!creditUsage.hasLowBalance) {
      toast.warning("Low balance alert activated for demonstration");
    } else {
      toast.success("Low balance alert cleared");
    }
  };

  // Add credits for demo purposes
  const addCredits = (amount: number) => {
    setCreditUsage(prev => {
      const newTotal = prev.total;
      const newUsed = Math.max(0, prev.used - amount);
      const newPercentage = Math.round((newUsed / newTotal) * 100);
      
      return {
        ...prev,
        used: newUsed,
        percentage: newPercentage,
        hasLowBalance: newPercentage > 80
      };
    });
    
    toast.success(`Added ${amount} credits to your account`);
  };

  // Handle billing form submission
  async function onBillingSubmit(values: BillingFormValues) {
    setIsBillingLoading(true);
    try {
      const response = await fetch("/api/account/settings/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update billing settings");
      }
      
      toast.success("Billing settings updated successfully");
    } catch (error) {
      console.error("Error updating billing settings:", error);
      toast.error("Failed to update billing settings");
    } finally {
      setIsBillingLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black/90">
        <PageHeader />
        <div className="container py-12 px-24 pt-9 mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#45b7aa] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading billing information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/90">
      <PageHeader />
      
      <div className="container py-12 px-24 pt-9 mx-auto">
        <div className="flex flex-col lg:flex-row lg:space-x-6 lg:space-y-0">
          <aside className="lg:w-1/4 xl:w-1/5 mb-6 lg:mb-0">
            <Card className="bg-black/50 border-gray-800 text-white">
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription className="text-gray-300">
                  Manage your account settings and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsSidebar items={settingsNavItems} />
              </CardContent>
            </Card>
          </aside>
          <div className="flex-1 lg:max-w-3xl">
            <div className="space-y-6">
              {/* Credit Usage Card */}
              <Card className="bg-black/50 border-gray-800 text-white">
                <CardHeader>
                  <CardTitle>Credit Usage</CardTitle>
                  <CardDescription className="text-gray-300">
                    Your current credit usage for this billing period
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {creditUsage.hasLowBalance && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Low Balance Alert</AlertTitle>
                      <AlertDescription>
                        Your credit balance is running low. Consider adding more credits to avoid service interruption.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Credits Used: {creditUsage.used} / {creditUsage.total}</span>
                      <span className="font-medium">{creditUsage.percentage}%</span>
                    </div>
                    <Progress value={creditUsage.percentage} className="h-2 bg-gray-800" />
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Started: May 1, 2023</span>
                    <span className="text-sm text-gray-400">Ends: May 31, 2023</span>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={toggleLowBalanceAlert}
                      className="border-gray-700 hover:bg-gray-800"
                    >
                      Toggle Alert (Demo)
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => toast.success("Usage details downloaded")}
                      className="border-gray-700 hover:bg-gray-800"
                    >
                      Download Report
                    </Button>
                    <Button 
                      onClick={() => addCredits(100)}
                      className="bg-[#45b7aa] hover:bg-[#45b7aa]/90 text-white"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Add Credits
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Usage Breakdown Card */}
              <Card className="bg-black/50 border-gray-800 text-white">
                <CardHeader>
                  <CardTitle>Usage Breakdown</CardTitle>
                  <CardDescription className="text-gray-300">
                    Your credit usage history for this month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[200px] w-full">
                      <div className="flex h-full">
                        {usageData.map((item, i) => (
                          <div key={i} className="flex-1 flex flex-col justify-end">
                            <div 
                              className="bg-[#45b7aa] rounded-t-sm w-4/5 mx-auto" 
                              style={{ height: `${item.amount * 5}px` }}
                            ></div>
                            <div className="text-xs text-center mt-2 text-gray-400">
                              {item.date}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="border border-gray-800 rounded p-3 bg-black/30">
                        <div className="text-gray-400 mb-1">Total Credits Used</div>
                        <div className="text-xl font-semibold">{creditUsage.used}</div>
                      </div>
                      <div className="border border-gray-800 rounded p-3 bg-black/30">
                        <div className="text-gray-400 mb-1">Remaining Credits</div>
                        <div className="text-xl font-semibold">{creditUsage.total - creditUsage.used}</div>
                      </div>
                      <div className="border border-gray-800 rounded p-3 bg-black/30">
                        <div className="text-gray-400 mb-1">Daily Average</div>
                        <div className="text-xl font-semibold">
                          {usageData.length > 0 
                            ? (usageData.reduce((sum, item) => sum + item.amount, 0) / usageData.length).toFixed(1)
                            : "0.0"}
                        </div>
                      </div>
                      <div className="border border-gray-800 rounded p-3 bg-black/30">
                        <div className="text-gray-400 mb-1">Cost to Date</div>
                        <div className="text-xl font-semibold">${(creditUsage.used * 0.10).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Auto-Reload Settings Card */}
              <Card className="bg-black/50 border-gray-800 text-white">
                <CardHeader>
                  <CardTitle>Auto-Reload Settings</CardTitle>
                  <CardDescription className="text-gray-300">
                    Configure automatic credit reloading when your balance gets low
                  </CardDescription>
                </CardHeader>
                <Form {...billingForm}>
                  <form onSubmit={billingForm.handleSubmit(onBillingSubmit)}>
                    <CardContent className="space-y-4">
                      <FormField
                        control={billingForm.control}
                        name="autoReload"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-800 bg-black/30 p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Auto-Reload Credits
                              </FormLabel>
                              <FormDescription className="text-gray-400">
                                Automatically add credits when your balance is low
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={billingForm.control}
                          name="reloadAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reload Amount</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="100" 
                                  type="number" 
                                  disabled={!billingForm.watch("autoReload")}
                                  className="bg-black/30 border-gray-800"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription className="text-gray-400">
                                Number of credits to add automatically
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={billingForm.control}
                          name="reloadThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reload Threshold</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="50" 
                                  type="number" 
                                  disabled={!billingForm.watch("autoReload")}
                                  className="bg-black/30 border-gray-800"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription className="text-gray-400">
                                Trigger reload when balance falls below this amount
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={billingForm.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <FormControl>
                              <div className="flex items-center border border-gray-800 rounded-md p-3 bg-black/30">
                                <CreditCard className="mr-2 h-4 w-4 text-gray-400" />
                                <span>•••• •••• •••• 4242</span>
                                <Button 
                                  variant="link" 
                                  className="ml-auto text-[#45b7aa]"
                                  type="button"
                                  onClick={() => toast.info("Payment method management would open here")}
                                >
                                  Change
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription className="text-gray-400">
                              Card used for automatic reloads
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" disabled={isBillingLoading} className="bg-[#45b7aa] hover:bg-[#45b7aa]/90 text-white">
                        {isBillingLoading ? "Saving..." : "Save billing settings"}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 