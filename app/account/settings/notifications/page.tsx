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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsSidebar, settingsNavItems } from "@/components/account/settings-sidebar";
import { BellRing, AlertCircle, Mail, MessageSquare, Clock, File } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Define notifications form schema
const notificationsFormSchema = z.object({
  email: z.object({
    transcription_complete: z.boolean().default(true),
    mentions: z.boolean().default(true),
    updates: z.boolean().default(false),
    marketing: z.boolean().default(false),
  }),
  app: z.object({
    transcription_complete: z.boolean().default(true),
    mentions: z.boolean().default(true),
    updates: z.boolean().default(true),
  }),
  frequency: z.enum(["immediate", "daily", "weekly", "never"]).default("immediate"),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export default function NotificationsSettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize notifications form
  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      email: {
        transcription_complete: true,
        mentions: true,
        updates: false,
        marketing: false,
      },
      app: {
        transcription_complete: true,
        mentions: true,
        updates: true,
      },
      frequency: "immediate",
    },
  });

  // Load notifications data from API
  useEffect(() => {
    async function loadNotificationsData() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/account/settings/notifications");
        if (!response.ok) throw new Error("Failed to load notifications data");
        
        const data = await response.json();
        notificationsForm.reset(data.notifications);
      } catch (error) {
        console.error("Error loading notifications data:", error);
        toast.error("Failed to load notifications data");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      // Uncomment when API is ready
      // loadNotificationsData();
      
      // For demo, simulate API loading
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [session, notificationsForm]);

  // Handle notifications form submission
  async function onSubmit(values: NotificationsFormValues) {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Notifications settings:", values);
      toast.success("Notification preferences saved successfully");
    } catch (error) {
      console.error("Error updating notifications:", error);
      toast.error("Failed to update notification preferences");
    } finally {
      setIsSaving(false);
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
              <p className="mt-4 text-gray-400">Loading notification preferences...</p>
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
                  <BellRing className="mr-2 h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Choose how and when you'd like to be notified about activity.
                </CardDescription>
              </CardHeader>
              <Form {...notificationsForm}>
                <form onSubmit={notificationsForm.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-6">
                    {/* Email Notifications Section */}
                    <div>
                      <div className="flex items-center mb-4">
                        <Mail className="mr-2 h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-medium">Email Notifications</h3>
                      </div>
                      <div className="space-y-3 ml-6">
                        <FormField
                          control={notificationsForm.control}
                          name="email.transcription_complete"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <FormLabel className="text-sm font-normal">
                                Transcription complete
                              </FormLabel>
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
                          control={notificationsForm.control}
                          name="email.mentions"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <FormLabel className="text-sm font-normal">
                                Mentions and comments
                              </FormLabel>
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
                          control={notificationsForm.control}
                          name="email.updates"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <FormLabel className="text-sm font-normal">
                                Product updates and announcements
                              </FormLabel>
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
                          control={notificationsForm.control}
                          name="email.marketing"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <FormLabel className="text-sm font-normal">
                                Marketing emails and promotions
                              </FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <Separator className="bg-gray-800" />
                    
                    {/* In-App Notifications Section */}
                    <div>
                      <div className="flex items-center mb-4">
                        <MessageSquare className="mr-2 h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-medium">In-App Notifications</h3>
                      </div>
                      <div className="space-y-3 ml-6">
                        <FormField
                          control={notificationsForm.control}
                          name="app.transcription_complete"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <FormLabel className="text-sm font-normal">
                                Transcription complete
                              </FormLabel>
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
                          control={notificationsForm.control}
                          name="app.mentions"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <FormLabel className="text-sm font-normal">
                                Mentions and comments
                              </FormLabel>
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
                          control={notificationsForm.control}
                          name="app.updates"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <FormLabel className="text-sm font-normal">
                                Product updates and announcements
                              </FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <Separator className="bg-gray-800" />
                    
                    {/* Notification Frequency Section */}
                    <div>
                      <div className="flex items-center mb-4">
                        <Clock className="mr-2 h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-medium">Notification Frequency</h3>
                      </div>
                      <div className="ml-6">
                        <FormField
                          control={notificationsForm.control}
                          name="frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <RadioGroup
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  className="space-y-3"
                                >
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="immediate" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      Immediate: Send notifications as they occur
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="daily" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      Daily: Send a daily digest of notifications
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="weekly" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      Weekly: Send a weekly digest of notifications
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="never" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      Never: Only show notifications in the app
                                    </FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <Alert className="bg-[#45b7aa]/10 text-[#45b7aa] border-[#45b7aa]/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Stay Connected</AlertTitle>
                      <AlertDescription>
                        Keep at least transcription notifications enabled to be notified when your audio files have been processed.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-[#45b7aa] hover:bg-[#45b7aa]/90 text-white"
                    >
                      {isSaving ? "Saving preferences..." : "Save notification preferences"}
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