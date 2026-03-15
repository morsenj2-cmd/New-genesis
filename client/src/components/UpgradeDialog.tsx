import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Download, Infinity, Loader2, CheckCircle, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface UpgradeDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UpgradeDialog({ trigger, open: controlledOpen, onOpenChange }: UpgradeDialogProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  async function loadRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function handleUpgrade() {
    setIsPending(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast({ title: "Error", description: "Could not load payment system. Please try again.", variant: "destructive" });
        return;
      }

      const token = await getToken();
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.message || "Failed to create order");
      }
      const { orderId, amount, currency, keyId } = await orderRes.json();

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Morse",
        description: "Morse Black - Monthly Subscription",
        order_id: orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const freshToken = await getToken();
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(freshToken ? { Authorization: `Bearer ${freshToken}` } : {}),
              },
              credentials: "include",
              body: JSON.stringify(response),
            });
            if (!verifyRes.ok) {
              const err = await verifyRes.json().catch(() => ({ message: "Verification failed" }));
              throw new Error(err.message || "Verification failed");
            }
            toast({ title: "Welcome to Morse Black!", description: "Your account has been upgraded. You now have 4,000 credits per project." });
            queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
            queryClient.invalidateQueries({ queryKey: ["/api/project"] });
            setIsOpen(false);
            setIsPending(false);
            navigate("/dashboard");
          } catch (err) {
            setIsPending(false);
            console.error("Payment verification error:", err);
            toast({ title: "Verification failed", description: err instanceof Error ? err.message : "Please contact support.", variant: "destructive" });
          }
        },
        theme: { color: "#000000" },
        modal: {
          ondismiss: () => setIsPending(false),
          escape: true,
          backdropclose: false,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setIsPending(false);
        const errorDesc = response?.error?.description || "Payment could not be completed.";
        const errorReason = response?.error?.reason || "";
        let userMessage = errorDesc;
        if (errorReason === "payment_failed" || errorDesc.includes("website")) {
          userMessage = "Payment was declined. Please try again or contact support if the issue persists.";
        }
        toast({
          title: "Payment Failed",
          description: userMessage,
          variant: "destructive",
        });
      });
      rzp.open();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade to Morse Black
          </DialogTitle>
          <DialogDescription>
            Unlock the full power of Morse with a premium subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground">&#8377;129</span>
              <span className="text-xs text-muted-foreground">/month</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm" data-testid="feature-credits">
                <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
                <span>4,000 additional AI credits</span>
              </div>
              <div className="flex items-center gap-2 text-sm" data-testid="feature-export">
                <Download className="h-4 w-4 text-yellow-500 shrink-0" />
                <span>Export projects as downloadable apps</span>
              </div>
              <div className="flex items-center gap-2 text-sm" data-testid="feature-projects">
                <Infinity className="h-4 w-4 text-yellow-500 shrink-0" />
                <span>Unlimited project creation</span>
              </div>
              <div className="flex items-center gap-2 text-sm" data-testid="feature-collab">
                <Users className="h-4 w-4 text-yellow-500 shrink-0" />
                <span>Real-time collaboration (up to 6 people)</span>
              </div>
              <div className="flex items-center gap-2 text-sm" data-testid="feature-support">
                <Shield className="h-4 w-4 text-yellow-500 shrink-0" />
                <span>Priority support</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-md bg-muted/50 p-2.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
            <span>Secure payment via Razorpay. Cancel anytime.</span>
          </div>

          <Button
            className="w-full gap-2 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            onClick={handleUpgrade}
            disabled={isPending}
            data-testid="button-upgrade-pay"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4" />
            )}
            {isPending ? "Processing..." : "Pay \u20B9129 & Upgrade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
