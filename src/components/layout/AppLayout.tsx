import { BottomNav, SidebarNav } from "./Navigation";

import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarNav />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50 lg:hidden">
          <h1 className="text-lg font-bold gradient-text">Expense Tracker</h1>
        </header>

        {/* Desktop header */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-end px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50"></header>

        {/* Main content */}
        <main className="flex-1 pb-20 lg:pb-6">{children}</main>

        {/* Bottom navigation - mobile only */}
        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}
