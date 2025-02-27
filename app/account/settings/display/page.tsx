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
import { Layout, AlertCircle, Monitor, SunMoon, Sparkles, Palette } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define display form schema
const displayFormSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).default("system"),
  reducedMotion: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  fontSize: z.number().min(12).max(24).default(16),
  colorScheme: z.enum(["default", "blue", "green", "purple"]).default("default"),
  compactMode: z.boolean().default(false),
  showTimeStamps: z.boolean().default(true),
});

type DisplayFormValues = z.infer<typeof displayFormSchema>;

// Theme preview component
const ThemePreview = ({ theme }: { theme: string }) => {
  const getPreviewStyles = () => {
    switch (theme) {
      case "light":
        return "bg-white border-gray-200";
      case "dark":
        return "bg-gray-900 border-gray-700";
      default: // system
        return "bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700";
    }
  };
  
  return (
    <div className={`border rounded-md p-3 ${getPreviewStyles()} w-full h-20 flex items-center justify-center`}>
      <div className="text-center">
        <div className={theme === "light" ? "text-black" : "text-white"}>
          {theme.charAt(0).toUpperCase() + theme.slice(1)} Theme
        </div>
      </div>
    </div>
  );
};

// Color scheme preview component
const ColorSchemePreview = ({ scheme }: { scheme: string }) => {
  const getColorStyles = () => {
    switch (scheme) {
      case "blue":
        return "bg-blue-600";
      case "green":
        return "bg-green-600";
      case "purple":
        return "bg-purple-600";
      default:
        return "bg-[#45b7aa]";
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-full ${getColorStyles()}`}></div>
      <span className="text-xs text-gray-400">
        {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
      </span>
    </div>
  );
};

export default function DisplaySettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize display form
  const displayForm = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues: {
      theme: "system",
      reducedMotion: false,
      highContrast: false,
      fontSize: 16,
      colorScheme: "default",
      compactMode: false,
      showTimeStamps: true,
    },
  });

  // Load display data from API
  useEffect(() => {
    async function loadDisplayData() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/account/settings/display");
        if (!response.ok) throw new Error("Failed to load display data");
        
        const data = await response.json();
        displayForm.reset(data.display);
      } catch (error) {
        console.error("Error loading display data:", error);
        toast.error("Failed to load display settings");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      // Uncomment when API is ready
      // loadDisplayData();
      
      // For demo, simulate API loading
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [session, displayForm]);

  // Handle display form submission
  async function onSubmit(values: DisplayFormValues) {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Display settings:", values);
      toast.success("Display settings saved successfully");
    } catch (error) {
      console.error("Error updating display settings:", error);
      toast.error("Failed to update display settings");
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
              <p className="mt-4 text-gray-400">Loading display settings...</p>
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
                  <Layout className="mr-2 h-5 w-5" />
                  Display Settings
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Customize the appearance and behavior of the application.
                </CardDescription>
              </CardHeader>
              <Form {...displayForm}>
                <form onSubmit={displayForm.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-6">
                    {/* Theme Section */}
                    <div>
                      <div className="flex items-center mb-4">
                        <SunMoon className="mr-2 h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-medium">Theme</h3>
                      </div>
                      <FormField
                        control={displayForm.control}
                        name="theme"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="grid grid-cols-3 gap-4"
                              >
                                <FormItem className="flex flex-col items-center space-y-2">
                                  <FormControl>
                                    <RadioGroupItem value="system" className="sr-only" />
                                  </FormControl>
                                  <ThemePreview theme="system" />
                                  <FormLabel className={field.value === "system" ? "text-[#45b7aa]" : ""}>
                                    System
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex flex-col items-center space-y-2">
                                  <FormControl>
                                    <RadioGroupItem value="light" className="sr-only" />
                                  </FormControl>
                                  <ThemePreview theme="light" />
                                  <FormLabel className={field.value === "light" ? "text-[#45b7aa]" : ""}>
                                    Light
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex flex-col items-center space-y-2">
                                  <FormControl>
                                    <RadioGroupItem value="dark" className="sr-only" />
                                  </FormControl>
                                  <ThemePreview theme="dark" />
                                  <FormLabel className={field.value === "dark" ? "text-[#45b7aa]" : ""}>
                                    Dark
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormDescription className="text-center text-gray-400 mt-2">
                              Choose your preferred theme appearance
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator className="bg-gray-800" />
                    
                    {/* Color Scheme Section */}
                    <div>
                      <div className="flex items-center mb-4">
                        <Palette className="mr-2 h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-medium">Color Scheme</h3>
                      </div>
                      <FormField
                        control={displayForm.control}
                        name="colorScheme"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="flex justify-center gap-8"
                              >
                                <FormItem className="flex flex-col items-center space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="default" className="sr-only" />
                                  </FormControl>
                                  <ColorSchemePreview scheme="default" />
                                </FormItem>
                                <FormItem className="flex flex-col items-center space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="blue" className="sr-only" />
                                  </FormControl>
                                  <ColorSchemePreview scheme="blue" />
                                </FormItem>
                                <FormItem className="flex flex-col items-center space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="green" className="sr-only" />
                                  </FormControl>
                                  <ColorSchemePreview scheme="green" />
                                </FormItem>
                                <FormItem className="flex flex-col items-center space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="purple" className="sr-only" />
                                  </FormControl>
                                  <ColorSchemePreview scheme="purple" />
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormDescription className="text-center text-gray-400 mt-2">
                              Select an accent color for buttons and interactive elements
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator className="bg-gray-800" />
                    
                    {/* Font Size Section */}
                    <div>
                      <div className="flex items-center mb-4">
                        <Monitor className="mr-2 h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-medium">Text Size</h3>
                      </div>
                      <FormField
                        control={displayForm.control}
                        name="fontSize"
                        render={({ field: { value, onChange } }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm">Small</span>
                              <span className="font-medium">{value}px</span>
                              <span className="text-sm">Large</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={12}
                                max={24}
                                step={1}
                                value={[value]}
                                onValueChange={(vals) => onChange(vals[0])}
                                className="w-full"
                              />
                            </FormControl>
                            <FormDescription className="text-gray-400 mt-2">
                              Adjust the text size throughout the application
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator className="bg-gray-800" />
                    
                    {/* Accessibility Section */}
                    <div>
                      <div className="flex items-center mb-4">
                        <Sparkles className="mr-2 h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-medium">Accessibility & Display</h3>
                      </div>
                      <div className="space-y-4">
                        <FormField
                          control={displayForm.control}
                          name="reducedMotion"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <div>
                                <FormLabel>Reduced Motion</FormLabel>
                                <FormDescription className="text-gray-400">
                                  Minimize animations throughout the app
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
                          control={displayForm.control}
                          name="highContrast"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <div>
                                <FormLabel>High Contrast</FormLabel>
                                <FormDescription className="text-gray-400">
                                  Increase contrast for better readability
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
                          control={displayForm.control}
                          name="compactMode"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <div>
                                <FormLabel>Compact Mode</FormLabel>
                                <FormDescription className="text-gray-400">
                                  Reduce spacing and show more content
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
                          control={displayForm.control}
                          name="showTimeStamps"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <div>
                                <FormLabel>Show Timestamps</FormLabel>
                                <FormDescription className="text-gray-400">
                                  Display timestamps in transcriptions
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
                      </div>
                    </div>
                    
                    <Alert className="bg-[#45b7aa]/10 text-[#45b7aa] border-[#45b7aa]/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Display Settings</AlertTitle>
                      <AlertDescription>
                        Settings take effect immediately after saving and apply to all devices where you're logged in.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-[#45b7aa] hover:bg-[#45b7aa]/90 text-white"
                    >
                      {isSaving ? "Saving settings..." : "Save display settings"}
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