import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router";
import { Home, FolderOpen, BarChart3, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LazyMotion, domAnimation, m } from "framer-motion";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/categories", icon: FolderOpen, label: "Categories" },
  { path: "/analysis", icon: BarChart3, label: "Analysis" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const sidebarNavItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/categories", icon: FolderOpen, label: "Categories" },
  { path: "/analysis", icon: BarChart3, label: "Analysis" },
  { path: "/transactions", icon: FolderOpen, label: "All Transactions" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <LazyMotion features={domAnimation}>
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
                <m.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-accent rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className={cn("h-5 w-5 relative z-10", isActive && "text-primary")} />
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium relative z-10",
                  isActive && "text-primary",
                )}
              >
                {item.label}
              </span>
            </RouterNavLink>
          );
        })}
      </nav>
    </LazyMotion>
  );
}

export function SidebarNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold gradient-text">Expense Tracker</h1>
        <p className="text-xs text-muted-foreground mt-1">Track your spending</p>
      </div>

      {/* Add Expense Button */}
      <button
        onClick={() => navigate("/add")}
        className="flex items-center justify-center gap-2 w-full py-3 mb-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-5 w-5" />
        Add Expense
      </button>

      <nav className="flex flex-col gap-1">
        {sidebarNavItems.map((item) => {
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
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </RouterNavLink>
          );
        })}
      </nav>
    </aside>
  );
}
