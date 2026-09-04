import { Link } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWhatsNew } from "@/hooks/useWhatsNew";
import { MAX_DIALOG_GROUPS } from "@/lib/whatsNew";
import { WhatsNewList } from "@/components/whatsNew/WhatsNewList";

export function WhatsNewDialog() {
  const { unseen, open, dismiss } = useWhatsNew();

  if (unseen.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent
        className="max-h-[85vh] flex flex-col gap-0 p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 pr-10 text-left">
          <DialogTitle>What's new</DialogTitle>
          <DialogDescription>Here's what changed since you last used the app.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
          <WhatsNewList groups={unseen.slice(0, MAX_DIALOG_GROUPS)} onNavigate={dismiss} />
        </div>
        <DialogFooter className="flex-row items-center justify-between gap-3 p-6 pt-4 border-t border-border sm:justify-between sm:space-x-0">
          <Link
            to="/settings/changelog"
            onClick={dismiss}
            className="text-xs text-primary hover:underline"
          >
            View changelog
          </Link>
          <Button onClick={dismiss}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
