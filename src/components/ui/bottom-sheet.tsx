import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const BottomSheet = DialogPrimitive.Root;

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl border border-b-0 border-border/50 bg-background shadow-lg duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full",
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
BottomSheetContent.displayName = "BottomSheetContent";

export {
  BottomSheet,
  BottomSheetContent,
  DialogTitle as BottomSheetTitle,
  DialogDescription as BottomSheetDescription,
  DialogClose as BottomSheetClose,
};
