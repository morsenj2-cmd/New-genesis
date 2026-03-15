import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Users, UserPlus, Trash2, Crown, Eye, PenLine, Loader2 } from "lucide-react";
import type { ProjectCollaborator } from "@shared/schema";

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
  const { toast } = useToast();
  const { getToken } = useAuth();

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

          {isOwner && !isPremium && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
              <p className="text-sm text-yellow-500/90 flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Morse Black to collaborate with others
              </p>
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
