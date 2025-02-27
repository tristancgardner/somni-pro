"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsSidebar, settingsNavItems } from "@/components/account/settings-sidebar";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CreditCard, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

// Define the form schema with zod
const formSchema = z.object({
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

type FormValues = z.infer<typeof formSchema>;
type BillingFormValues = z.infer<typeof billingFormSchema>;

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [creditUsage, setCreditUsage] = useState({
    used: 120,
    total: 500,
    percentage: 24,
    hasLowBalance: false,
  });
  const [usageData, setUsageData] = useState([
    { date: 'May 1', amount: 15 },
    { date: 'May 5', amount: 24 },
    { date: 'May 10', amount: 8 },
    { date: 'May 15', amount: 32 },
    { date: 'May 20', amount: 18 },
    { date: 'May 25', amount: 23 },
  ]);

  // Initialize the form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      notifications: {
        email: false,
        marketing: false,
        updates: false,
      },
    },
  });

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

  // Load user data from API
  useEffect(() => {
    async function loadUserData() {
      try {
        const response = await fetch("/api/account/settings");
        if (!response.ok) throw new Error("Failed to load user data");
        
        const data = await response.json();
        form.reset(data.user);
      } catch (error) {
        console.error("Error loading user data:", error);
        toast.error("Failed to load user data");
      }
    }

    if (session?.user) {
      loadUserData();
    }
  }, [session, form]);

  // Handle form submission
  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update settings");
      }
      
      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle billing form submission
  async function onBillingSubmit(values: BillingFormValues) {
    setIsBillingLoading(true);
    try {
      // In a real app, this would be an API call
      console.log("Billing settings:", values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Billing settings updated successfully");
    } catch (error) {
      console.error("Error updating billing settings:", error);
      toast.error("Failed to update billing settings");
    } finally {
      setIsBillingLoading(false);
    }
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
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-4 bg-black/30">
                <TabsTrigger value="general" className="data-[state=active]:bg-[#45b7aa]/20 data-[state=active]:text-[#45b7aa]">General</TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-[#45b7aa]/20 data-[state=active]:text-[#45b7aa]">Notifications</TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:bg-[#45b7aa]/20 data-[state=active]:text-[#45b7aa]">Billing</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general">
                <Card className="bg-black/50 border-gray-800 text-white">
                  <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription className="text-gray-300">
                      Manage your personal information.
                    </CardDescription>
                  </CardHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your name" className="bg-black/30 border-gray-800" {...field} />
                              </FormControl>
                              <FormDescription className="text-gray-400">
                                This is your public display name.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Your email" className="bg-black/30 border-gray-800" {...field} />
                              </FormControl>
                              <FormDescription className="text-gray-400">
                                Your email address is used for notifications.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us about yourself"
                                  className="resize-none bg-black/30 border-gray-800"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription className="text-gray-400">
                                Brief description for your profile.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                      <CardFooter>
                        <Button type="submit" disabled={isLoading} className="bg-[#45b7aa] hover:bg-[#45b7aa]/90 text-white">
                          {isLoading ? "Saving..." : "Save changes"}
                        </Button>
                      </CardFooter>
                    </form>
                  </Form>
                </Card>
              </TabsContent>
              
              <TabsContent value="notifications">
                <Card className="bg-black/50 border-gray-800 text-white">
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription className="text-gray-300">
                      Choose what notifications you receive.
                    </CardDescription>
                  </CardHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="notifications.email"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-800 bg-black/30 p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Email Notifications</FormLabel>
                                <FormDescription className="text-gray-400">
                                  Receive email notifications about your account.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="notifications.marketing"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-800 bg-black/30 p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Marketing Emails</FormLabel>
                                <FormDescription className="text-gray-400">
                                  Receive emails about new features and updates.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="notifications.updates"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-800 bg-black/30 p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Product Updates</FormLabel>
                                <FormDescription className="text-gray-400">
                                  Receive notifications about product updates.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                      <CardFooter>
                        <Button type="submit" disabled={isLoading} className="bg-[#45b7aa] hover:bg-[#45b7aa]/90 text-white">
                          {isLoading ? "Saving..." : "Save changes"}
                        </Button>
                      </CardFooter>
                    </form>
                  </Form>
                </Card>
              </TabsContent>
              
              <TabsContent value="billing">
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
                        <span className="text-sm text-muted-foreground">Started: May 1, 2023</span>
                        <span className="text-sm text-muted-foreground">Ends: May 31, 2023</span>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          className="mr-2 border-gray-700 hover:bg-gray-800"
                          onClick={() => toast.success("Usage details downloaded")}
                        >
                          Download Usage Report
                        </Button>
                        <Button 
                          onClick={() => toast.success("Added 100 credits to your account")}
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
                            <div className="text-xl font-semibold">4.0</div>
                          </div>
                          <div className="border border-gray-800 rounded p-3 bg-black/30">
                            <div className="text-gray-400 mb-1">Cost to Date</div>
                            <div className="text-xl font-semibold">$12.00</div>
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 