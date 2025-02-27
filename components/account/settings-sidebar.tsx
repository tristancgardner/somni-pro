"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  User, 
  Settings, 
  Key, 
  BellRing,
  Layout,
  CreditCard
} from "lucide-react";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
    icon: React.ReactNode;
  }[];
}

export function SettingsSidebar({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-[#45b7aa]/20 text-[#45b7aa]"
              : "text-gray-300 hover:bg-[#45b7aa]/10 hover:text-[#45b7aa]"
          )}
        >
          <div className="mr-2 h-4 w-4">{item.icon}</div>
          {item.title}
        </Link>
      ))}
    </nav>
  );
}

export const settingsNavItems = [
  {
    title: "Profile",
    href: "/account/settings",
    icon: <User className="h-4 w-4" />,
  },
  {
    title: "Account",
    href: "/account/settings/account",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    title: "Billing",
    href: "/account/settings/billing",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    title: "Security",
    href: "/account/settings/security",
    icon: <Key className="h-4 w-4" />,
  },
  {
    title: "Notifications",
    href: "/account/settings/notifications",
    icon: <BellRing className="h-4 w-4" />,
  },
  {
    title: "Display",
    href: "/account/settings/display",
    icon: <Layout className="h-4 w-4" />,
  },
]; 