import { NavLink as RouterNavLink, useLocation } from "react-router";
import { Home, PlusCircle, FolderOpen, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/add", icon: PlusCircle, label: "Add" },
  { path: "/categories", icon: FolderOpen, label: "Categories" },
  { path: "/analysis", icon: BarChart3, label: "Analysis" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.path ||
          (item.path !== "/" && location.pathname.startsWith(item.path));
        const Icon = item.icon;

        return (
          <RouterNavLink
            key={item.path}
            to={item.path}
            className={cn("bottom-nav-item relative", isActive && "active")}
          >
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute inset-0 bg-accent rounded-xl"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon
              className={cn(
                "h-5 w-5 relative z-10",
                isActive && "text-primary"
              )}
            />
            <span
              className={cn(
                "text-[10px] mt-1 font-medium relative z-10",
                isActive && "text-primary"
              )}
            >
              {item.label}
            </span>
          </RouterNavLink>
        );
      })}
    </nav>
  );
}

export function SidebarNav() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold gradient-text">Expense Tracker</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Track your spending
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <RouterNavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl",
                "transition-all duration-200",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </RouterNavLink>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        <RouterNavLink
          to="/transactions"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            "transition-all duration-200"
          )}
        >
          <span className="text-sm">All Transactions</span>
        </RouterNavLink>
      </div>
    </aside>
  );
}
