import { useState } from "react";
import { useAuth } from "@clerk/react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BlogPost } from "@shared/schema";
import spiralBg from "@assets/image_1772970592054.png";

export default function BlogPage() {
  usePageTitle("Blog");
  const { isSignedIn } = useAuth();

  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/blog/admin-status"],
    enabled: !!isSignedIn,
  });
  const isAdmin = adminStatus?.isAdmin ?? false;

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/list"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const res = await apiRequest("POST", "/api/blog/create", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/list"] });
      setTitle("");
      setContent("");
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/blog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/list"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createMutation.mutate({ title: title.trim(), content: content.trim() });
  };

  return (
    <SidebarProvider>
      <div
        className="relative flex h-screen w-full"
        style={{
          backgroundColor: "#000",
          backgroundImage: `url(${spiralBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-transparent sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-lg font-semibold text-foreground">Blog</h1>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setShowForm(!showForm)}
                data-testid="button-new-blog"
                className="gap-2"
              >
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? "Cancel" : "New Post"}
              </Button>
            )}
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {isAdmin && showForm && (
              <div
                className="max-w-2xl mx-auto mb-8 rounded-2xl p-6 border border-white/[0.08]"
                style={{
                  background: "rgba(12, 12, 12, 0.55)",
                  backdropFilter: "blur(24px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                  boxShadow:
                    "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06), 0 16px 48px rgba(0, 0, 0, 0.5)",
                }}
                data-testid="blog-form"
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Post title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/[0.15] transition-colors"
                    data-testid="input-blog-title"
                  />
                  <textarea
                    placeholder="Write your post..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/[0.15] transition-colors resize-none"
                    data-testid="input-blog-content"
                  />
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || !title.trim() || !content.trim()}
                    className="w-full"
                    data-testid="button-publish-blog"
                  >
                    {createMutation.isPending ? "Publishing..." : "Publish"}
                  </Button>
                </form>
              </div>
            )}

            <div className="max-w-2xl mx-auto space-y-6">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl p-6 border border-white/[0.06]" style={{ background: "rgba(12,12,12,0.4)" }}>
                    <Skeleton className="h-6 w-2/3 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))
              ) : !posts || posts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-white/40 text-sm" data-testid="text-no-blogs">No blog posts yet.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-2xl p-6 border border-white/[0.08]"
                    style={{
                      background: "rgba(12, 12, 12, 0.55)",
                      backdropFilter: "blur(24px) saturate(1.4)",
                      WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                      boxShadow:
                        "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06), 0 16px 48px rgba(0, 0, 0, 0.5)",
                    }}
                    data-testid={`blog-post-${post.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h2
                        className="text-xl font-bold text-white"
                        style={{ fontFamily: "'Arimo', sans-serif" }}
                        data-testid={`text-blog-title-${post.id}`}
                      >
                        {post.title}
                      </h2>
                      {isAdmin && (
                        <button
                          onClick={() => deleteMutation.mutate(post.id)}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/[0.06] transition-all shrink-0"
                          data-testid={`button-delete-blog-${post.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div
                      className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap mb-4"
                      style={{ fontFamily: "'Arimo', sans-serif" }}
                      data-testid={`text-blog-content-${post.id}`}
                    >
                      {post.content}
                    </div>
                    <p className="text-white/30 text-xs">
                      {format(new Date(post.createdAt), "MMMM d, yyyy")}
                    </p>
                  </article>
                ))
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
