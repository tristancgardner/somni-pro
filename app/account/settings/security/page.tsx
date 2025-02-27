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
import { KeyRound, Shield, Lock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";

// Define security form schema
const securityFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
  twoFactorEnabled: z.boolean().default(false),
  sessionTimeout: z.boolean().default(false),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Define session history type
type SessionHistory = {
  deviceName: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrentDevice: boolean;
};

type SecurityFormValues = z.infer<typeof securityFormSchema>;

export default function SecuritySettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([]);

  // Initialize security form
  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      twoFactorEnabled: false,
      sessionTimeout: false,
    },
  });

  // Load security data from API
  useEffect(() => {
    async function loadSecurityData() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/account/settings/security");
        if (!response.ok) throw new Error("Failed to load security data");
        
        const data = await response.json();
        securityForm.setValue("twoFactorEnabled", data.security.twoFactorEnabled);
        securityForm.setValue("sessionTimeout", data.security.sessionTimeout);
        setSessionHistory(data.security.sessionHistory);
      } catch (error) {
        console.error("Error loading security data:", error);
        toast.error("Failed to load security data");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      // Uncomment when API is ready
      // loadSecurityData();
      
      // For demo, simulate API loading and set some dummy data
      setTimeout(() => {
        setSessionHistory([
          {
            deviceName: "Chrome on macOS",
            location: "San Francisco, USA",
            ipAddress: "192.168.1.1",
            lastActive: "Just now",
            isCurrentDevice: true,
          },
          {
            deviceName: "Firefox on Windows",
            location: "New York, USA",
            ipAddress: "203.0.113.1",
            lastActive: "Yesterday",
            isCurrentDevice: false,
          },
          {
            deviceName: "Safari on iOS",
            location: "Chicago, USA",
            ipAddress: "198.51.100.1",
            lastActive: "3 days ago",
            isCurrentDevice: false,
          },
        ]);
        setIsLoading(false);
      }, 500);
    }
  }, [session, securityForm]);

  // Handle password change form submission
  async function onPasswordSubmit(values: SecurityFormValues) {
    setIsPasswordLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Security settings:", values);
      toast.success("Password changed successfully");
      
      // Reset form fields
      securityForm.reset({
        ...values,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    } finally {
      setIsPasswordLoading(false);
    }
  }

  // Handle 2FA toggle
  async function handleToggle2FA(enabled: boolean) {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      securityForm.setValue("twoFactorEnabled", enabled);
      toast.success(enabled 
        ? "Two-factor authentication enabled" 
        : "Two-factor authentication disabled"
      );
    } catch (error) {
      console.error("Error toggling 2FA:", error);
      toast.error("Failed to update two-factor authentication settings");
    }
  }

  // Handle session timeout toggle
  async function handleToggleSessionTimeout(enabled: boolean) {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      securityForm.setValue("sessionTimeout", enabled);
      toast.success(enabled 
        ? "Automatic session timeout enabled" 
        : "Automatic session timeout disabled"
      );
    } catch (error) {
      console.error("Error toggling session timeout:", error);
      toast.error("Failed to update session timeout settings");
    }
  }

  // Handle ending a session
  async function handleEndSession(ipAddress: string) {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove the session from the list
      setSessionHistory(prev => prev.filter(session => session.ipAddress !== ipAddress));
      toast.success("Session ended successfully");
    } catch (error) {
      console.error("Error ending session:", error);
      toast.error("Failed to end session");
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
              <p className="mt-4 text-gray-400">Loading security information...</p>
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
          <div className="flex-1 lg:max-w-3xl space-y-6">
            {/* Change Password Card */}
            <Card className="bg-black/50 border-gray-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="mr-2 h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Update your account password to maintain security.
                </CardDescription>
              </CardHeader>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onPasswordSubmit)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={securityForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your current password" 
                              className="bg-black/30 border-gray-800"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your new password" 
                              className="bg-black/30 border-gray-800"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-gray-400">
                            Password must be at least 8 characters with uppercase, lowercase and numbers.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm your new password" 
                              className="bg-black/30 border-gray-800"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={isPasswordLoading} 
                      className="bg-[#45b7aa] hover:bg-[#45b7aa]/90 text-white"
                    >
                      {isPasswordLoading ? "Saving..." : "Update Password"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
            
            {/* Security Settings Card */}
            <Card className="bg-black/50 border-gray-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Configure additional security features for your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-row items-center justify-between rounded-lg border border-gray-800 bg-black/30 p-4">
                  <div className="space-y-0.5">
                    <div className="text-base font-medium">Two-Factor Authentication</div>
                    <div className="text-sm text-gray-400">
                      Add an extra layer of security to your account
                    </div>
                  </div>
                  <Switch
                    checked={securityForm.watch("twoFactorEnabled")}
                    onCheckedChange={handleToggle2FA}
                  />
                </div>
                
                <div className="flex flex-row items-center justify-between rounded-lg border border-gray-800 bg-black/30 p-4">
                  <div className="space-y-0.5">
                    <div className="text-base font-medium">Automatic Session Timeout</div>
                    <div className="text-sm text-gray-400">
                      Automatically log out after 30 minutes of inactivity
                    </div>
                  </div>
                  <Switch
                    checked={securityForm.watch("sessionTimeout")}
                    onCheckedChange={handleToggleSessionTimeout}
                  />
                </div>
                
                <Alert className="bg-[#45b7aa]/10 text-[#45b7aa] border-[#45b7aa]/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Security Tip</AlertTitle>
                  <AlertDescription>
                    We recommend enabling two-factor authentication for enhanced account security.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
            
            {/* Active Sessions Card */}
            <Card className="bg-black/50 border-gray-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <KeyRound className="mr-2 h-5 w-5" />
                  Active Sessions
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Manage devices where you're currently logged in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessionHistory.map((session, index) => (
                    <div key={index} className="flex justify-between items-center border border-gray-800 rounded-lg p-3 bg-black/30">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium">{session.deviceName}</span>
                          {session.isCurrentDevice && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-[#45b7aa]/20 text-[#45b7aa] rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {session.location} • {session.ipAddress}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Last active: {session.lastActive}
                        </div>
                      </div>
                      {!session.isCurrentDevice && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-gray-700 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800"
                          onClick={() => handleEndSession(session.ipAddress)}
                        >
                          End Session
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 