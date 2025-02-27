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
import { Settings, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define account form schema
const accountFormSchema = z.object({
  language: z.string().min(1, { message: "Please select a language" }),
  timezone: z.string().min(1, { message: "Please select a timezone" }),
  autoSave: z.boolean().default(true),
  soundEffects: z.boolean().default(true),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function AccountSettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize account form
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      language: "en-US",
      timezone: "America/New_York",
      autoSave: true,
      soundEffects: true,
    },
  });

  // Load account data from API
  useEffect(() => {
    async function loadAccountData() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/account/settings/account");
        if (!response.ok) throw new Error("Failed to load account data");
        
        const data = await response.json();
        accountForm.reset(data.account);
      } catch (error) {
        console.error("Error loading account data:", error);
        toast.error("Failed to load account data");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      // Uncomment when API is ready
      // loadAccountData();
      
      // For demo, simulate API loading
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [session, accountForm]);

  // Handle account form submission
  async function onAccountSubmit(values: AccountFormValues) {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Account settings:", values);
      toast.success("Account settings updated successfully");
    } catch (error) {
      console.error("Error updating account settings:", error);
      toast.error("Failed to update account settings");
    } finally {
      setIsLoading(false);
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
              <p className="mt-4 text-gray-400">Loading account information...</p>
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
            <Card className="bg-black/50 border-gray-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Account Settings
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Manage your general account preferences and settings.
                </CardDescription>
              </CardHeader>
              <Form {...accountForm}>
                <form onSubmit={accountForm.handleSubmit(onAccountSubmit)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={accountForm.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-black/30 border-gray-800">
                                <SelectValue placeholder="Select a language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-black/90 border-gray-800 text-white">
                              <SelectItem value="en-US">English (US)</SelectItem>
                              <SelectItem value="en-GB">English (UK)</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="de">German</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-gray-400">
                            The language used throughout the application.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={accountForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-black/30 border-gray-800">
                                <SelectValue placeholder="Select a timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-black/90 border-gray-800 text-white">
                              <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                              <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                              <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                              <SelectItem value="Europe/London">Greenwich Mean Time (GMT)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-gray-400">
                            Your local timezone for timestamps and scheduled events.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={accountForm.control}
                      name="autoSave"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-800 bg-black/30 p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Auto-Save Drafts
                            </FormLabel>
                            <FormDescription className="text-gray-400">
                              Automatically save your work as you type
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
                    
                    <FormField
                      control={accountForm.control}
                      name="soundEffects"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-800 bg-black/30 p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Sound Effects
                            </FormLabel>
                            <FormDescription className="text-gray-400">
                              Play sound effects for notifications and alerts
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
                    
                    <Alert className="bg-[#45b7aa]/10 text-[#45b7aa] border-[#45b7aa]/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Account Preferences</AlertTitle>
                      <AlertDescription>
                        Changes to your account settings will be applied immediately.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading} className="bg-[#45b7aa] hover:bg-[#45b7aa]/90 text-white">
                      {isLoading ? "Saving..." : "Save account settings"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 