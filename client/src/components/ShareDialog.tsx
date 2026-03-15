import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Trash2, Crown, Eye, PenLine, Loader2, Zap, Download, Infinity, Shield, CheckCircle } from "lucide-react";
import type { ProjectCollaborator } from "@shared/schema";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ShareDialogProps {
  projectId: string;
  isOwner: boolean;
  isPremium: boolean;
}

interface CollaboratorsData {
  owner: { userId: string; email: string; role: string } | null;
  collaborators: ProjectCollaborator[];
  maxCollaborators: number;
}

export function ShareDialog({ projectId, isOwner, isPremium }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("editor");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<CollaboratorsData>({
    queryKey: ["/api/project", projectId, "collaborators"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/project/${projectId}/collaborators`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch collaborators");
      return res.json();
    },
    enabled: open,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await apiRequest("POST", `/api/project/${projectId}/collaborators`, { email, role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "collaborators"] });
      setEmail("");
      toast({ title: "Collaborator invited", description: `${email} has been added to this project.` });
    },
    onError: (err: Error) => {
      const msg = err.message.includes(":") ? err.message.split(":").slice(1).join(":").trim() : err.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message || msg; } catch {}
      toast({ title: "Failed to invite", description: parsed, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ collabUserId, role }: { collabUserId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/project/${projectId}/collaborators/${collabUserId}`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "collaborators"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (collabUserId: string) => {
      const res = await apiRequest("DELETE", `/api/project/${projectId}/collaborators/${collabUserId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "collaborators"] });
      toast({ title: "Collaborator removed" });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate({ email: email.trim(), role });
  };

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

  async function handleUpgradePayment() {
    setIsPaymentPending(true);
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
            toast({ title: "Welcome to Morse Black!", description: "You can now add collaborators to your projects." });
            queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
            queryClient.invalidateQueries({ queryKey: ["/api/project"] });
            setShowUpgrade(false);
            setIsPaymentPending(false);
          } catch (err) {
            setIsPaymentPending(false);
            toast({ title: "Verification failed", description: err instanceof Error ? err.message : "Please contact support.", variant: "destructive" });
          }
        },
        theme: { color: "#000000" },
        modal: {
          ondismiss: () => setIsPaymentPending(false),
          escape: true,
          backdropclose: false,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setIsPaymentPending(false);
        const errorDesc = response?.error?.description || "Payment could not be completed.";
        const errorReason = response?.error?.reason || "";
        let userMessage = errorDesc;
        if (errorReason === "payment_failed" || errorDesc.includes("website")) {
          userMessage = "Payment was declined. Please try again or contact support if the issue persists.";
        }
        toast({ title: "Payment Failed", description: userMessage, variant: "destructive" });
      });
      rzp.open();
    } catch (err) {
      setIsPaymentPending(false);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    }
  }

  const collabCount = data?.collaborators?.length ?? 0;
  const maxCollabs = data?.maxCollaborators ?? 6;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-share-project">
          <Users className="h-4 w-4" />
          Share
          {collabCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
              {collabCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-share">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isOwner && isPremium && (
            <form onSubmit={handleInvite} className="flex gap-2" data-testid="form-invite">
              <Input
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                data-testid="input-invite-email"
              />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-[100px]" data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={inviteMutation.isPending || !email.trim()} data-testid="button-invite">
                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </form>
          )}

          {isOwner && !isPremium && !showUpgrade && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
              <p className="text-sm text-yellow-500/90 flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4" />
                Upgrade to Morse Black to collaborate with others
              </p>
              <Button
                size="sm"
                className="w-full gap-2 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                onClick={() => setShowUpgrade(true)}
                data-testid="button-show-upgrade"
              >
                <Crown className="h-3.5 w-3.5" />
                View Morse Black
              </Button>
            </div>
          )}

          {isOwner && !isPremium && showUpgrade && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold text-sm">Morse Black</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold">&#8377;129</span>
                  <span className="text-[10px] text-muted-foreground">/month</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 text-yellow-500 shrink-0" />
                  <span>4,000 additional AI credits</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3 text-yellow-500 shrink-0" />
                  <span>Real-time collaboration (up to 6 people)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Download className="h-3 w-3 text-yellow-500 shrink-0" />
                  <span>Export projects as apps</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Infinity className="h-3 w-3 text-yellow-500 shrink-0" />
                  <span>Unlimited project creation</span>
                </div>
              </div>
              <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground rounded bg-muted/50 p-2">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>Secure payment via Razorpay. 30-day billing cycle.</span>
              </div>
              <Button
                className="w-full gap-2 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                size="sm"
                onClick={handleUpgradePayment}
                disabled={isPaymentPending}
                data-testid="button-upgrade-pay-share"
              >
                {isPaymentPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Crown className="h-3.5 w-3.5" />
                )}
                {isPaymentPending ? "Processing..." : "Pay \u20B9129 & Upgrade"}
              </Button>
              <button
                className="w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowUpgrade(false)}
                type="button"
              >
                Maybe later
              </button>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            {collabCount}/{maxCollabs} collaborators
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data?.owner && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30" data-testid="member-owner">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                      <Crown className="h-3.5 w-3.5 text-yellow-500" />
                    </div>
                    <span className="text-sm truncate">{data.owner.email}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">Owner</Badge>
                </div>
              )}

              {data?.collaborators?.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30" data-testid={`member-collab-${c.userId}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {c.role === "editor" ? <PenLine className="h-3.5 w-3.5 text-primary" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <span className="text-sm truncate">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isOwner ? (
                      <>
                        <Select
                          value={c.role}
                          onValueChange={(newRole) => updateRoleMutation.mutate({ collabUserId: c.userId, role: newRole })}
                        >
                          <SelectTrigger className="h-7 w-[80px] text-[10px]" data-testid={`select-role-${c.userId}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
                          onClick={() => removeMutation.mutate(c.userId)}
                          data-testid={`button-remove-${c.userId}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">{c.role}</Badge>
                    )}
                  </div>
                </div>
              ))}

              {(!data?.collaborators || data.collaborators.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No collaborators yet
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
