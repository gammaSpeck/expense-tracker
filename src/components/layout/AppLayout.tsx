import { BottomNav, SidebarNav } from "./Navigation";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <SidebarNav />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50 lg:hidden">
          <h1 className="text-lg font-bold gradient-text">Expense Tracker</h1>
        </header>

        {/* Desktop header */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-end px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50"></header>

        {/* Main content */}
        <main className="flex-1 pb-20 lg:pb-6">{children}</main>

        {/* Bottom navigation - hidden at lg via CSS */}
        <BottomNav />
      </div>
    </div>
  );
}
