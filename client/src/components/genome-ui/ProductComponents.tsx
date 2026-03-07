import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutSection } from "@shared/layoutEngine";

export interface GenomeTokens {
  genome: DesignGenome;
  projectName: string;
  projectPrompt: string;
}

interface R { tokens: GenomeTokens; section: LayoutSection }

function hex(color: string, alpha = 1): string {
  if (alpha < 1) {
    return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  }
  return color;
}

function Card({ children, tokens, style }: { children: React.ReactNode; tokens: GenomeTokens; style?: React.CSSProperties }) {
  const { genome } = tokens;
  return (
    <div style={{
      background: genome.colors.surface,
      borderRadius: genome.radius.md,
      border: `1px solid ${hex(genome.colors.primary, 0.15)}`,
      padding: genome.spacing.md,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionWrap({ children, tokens, style }: { children: React.ReactNode; tokens: GenomeTokens; style?: React.CSSProperties }) {
  const { genome } = tokens;
  return (
    <section style={{
      background: genome.colors.background,
      padding: `${genome.spacing["2xl"]} ${genome.spacing.xl}`,
      fontFamily: `'${genome.typography.body}', sans-serif`,
      color: genome.colors.background === "hsl(0, 0%, 0%)" ? "#e5e7eb" : "#1f2937",
      ...style,
    }}>
      {children}
    </section>
  );
}

const TEXT_COLOR = "rgba(255,255,255,0.9)";
const TEXT_MUTED = "rgba(255,255,255,0.45)";
const TEXT_FAINT = "rgba(255,255,255,0.2)";

function ProgressBar({ value, tokens, height = 8 }: { value: number; tokens: GenomeTokens; height?: number }) {
  return (
    <div style={{ background: TEXT_FAINT, borderRadius: 999, height, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: tokens.genome.colors.primary, borderRadius: 999 }} />
    </div>
  );
}

function Avatar({ initials, color, size = 32 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.38, fontWeight: 700,
      color: "#fff", flexShrink: 0,
    }}>{initials}</div>
  );
}

function Badge({ children, color, bg }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999,
      background: bg ?? TEXT_FAINT, color: color ?? TEXT_COLOR,
      fontSize: 10, fontWeight: 600, letterSpacing: "0.02em",
    }}>{children}</span>
  );
}

function IconBox({ children, size = 32, tokens }: { children: React.ReactNode; size?: number; tokens: GenomeTokens }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: tokens.genome.radius.sm,
      background: hex(tokens.genome.colors.primary, 0.15),
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>{children}</div>
  );
}

export function FileUploaderSection({ tokens }: R) {
  const { genome, projectName } = tokens;
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["2xl"], fontWeight: 700, color: TEXT_COLOR, marginBottom: genome.spacing.sm }}>
          {projectName}
        </h2>
        <p style={{ color: TEXT_MUTED, marginBottom: genome.spacing.xl, fontSize: genome.typography.sizes.sm }}>
          Secure cloud storage for your files, documents, and media.
        </p>
        <div style={{
          border: `2px dashed ${hex(genome.colors.primary, 0.5)}`,
          borderRadius: genome.radius.lg,
          padding: genome.spacing["2xl"],
          textAlign: "center",
          background: hex(genome.colors.primary, 0.04),
          marginBottom: genome.spacing.lg,
        }}>
          <div style={{ fontSize: 40, marginBottom: genome.spacing.sm, color: genome.colors.primary }}>☁</div>
          <p style={{ fontWeight: 600, color: TEXT_COLOR, marginBottom: 4, fontSize: genome.typography.sizes.base }}>Drop files here or click to browse</p>
          <p style={{ color: TEXT_MUTED, fontSize: genome.typography.sizes.xs }}>Supports PDF, PNG, DOCX, MP4 — up to 2 GB per file</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: genome.spacing.md, flexWrap: "wrap" }}>
            {["PDF", "PNG", "DOCX", "XLS", "MP4", "ZIP"].map(ext => (
              <Badge key={ext} bg={hex(genome.colors.primary, 0.12)} color={genome.colors.primary}>{ext}</Badge>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: genome.spacing.md }}>
          {[
            { name: "Q4 Report.pdf", size: "2.4 MB", time: "2 min ago", icon: "📄" },
            { name: "product-mockup.png", size: "4.1 MB", time: "10 min ago", icon: "🖼" },
            { name: "team-data.xlsx", size: "890 KB", time: "1 hr ago", icon: "📊" },
          ].map(f => (
            <Card key={f.name} tokens={tokens} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{f.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: TEXT_COLOR, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                <p style={{ color: TEXT_MUTED, fontSize: 10 }}>{f.size} · {f.time}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

export function FolderBrowserSection({ tokens }: R) {
  const { genome } = tokens;
  const folders = [
    { name: "Documents", count: 142, icon: "📁", color: genome.colors.primary },
    { name: "Images", count: 891, icon: "🖼", color: genome.colors.secondary },
    { name: "Videos", count: 23, icon: "🎬", color: genome.colors.accent },
    { name: "Projects", count: 17, icon: "📂", color: genome.colors.primary },
    { name: "Archives", count: 55, icon: "🗜", color: genome.colors.secondary },
    { name: "Shared", count: 31, icon: "🤝", color: genome.colors.accent },
    { name: "Downloads", count: 67, icon: "⬇", color: genome.colors.primary },
    { name: "Backups", count: 8, icon: "💾", color: genome.colors.secondary },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: genome.spacing.lg }}>
        <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700 }}>My Folders</h3>
        <Badge bg={hex(genome.colors.primary, 0.15)} color={genome.colors.primary}>+ New Folder</Badge>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: genome.spacing.md }}>
        {folders.map(f => (
          <Card key={f.name} tokens={tokens} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            <IconBox tokens={tokens} size={36}><span style={{ fontSize: 18 }}>{f.icon}</span></IconBox>
            <p style={{ color: TEXT_COLOR, fontWeight: 600, fontSize: 13 }}>{f.name}</p>
            <p style={{ color: TEXT_MUTED, fontSize: 11 }}>{f.count} items</p>
          </Card>
        ))}
      </div>
    </SectionWrap>
  );
}

export function StorageUsageSection({ tokens }: R) {
  const { genome } = tokens;
  const types = [
    { label: "Documents", used: 18, total: 40, color: genome.colors.primary },
    { label: "Media", used: 35, total: 100, color: genome.colors.secondary },
    { label: "Backups", used: 8, total: 20, color: genome.colors.accent },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700, marginBottom: genome.spacing.lg }}>Storage Usage</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: genome.spacing.lg }}>
        {types.map(t => (
          <Card key={t.label} tokens={tokens} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: TEXT_COLOR, fontWeight: 600, fontSize: 13 }}>{t.label}</span>
              <Badge bg={hex(t.color, 0.15)} color={t.color}>{t.used} GB</Badge>
            </div>
            <ProgressBar value={(t.used / t.total) * 100} tokens={{ ...tokens, genome: { ...genome, colors: { ...genome.colors, primary: t.color } } }} height={6} />
            <p style={{ color: TEXT_MUTED, fontSize: 11 }}>{t.used} GB of {t.total} GB used</p>
          </Card>
        ))}
      </div>
      <Card tokens={tokens} style={{ marginTop: genome.spacing.lg, display: "flex", alignItems: "center", gap: genome.spacing.lg }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: TEXT_COLOR, fontWeight: 600, fontSize: 14 }}>Total Storage</span>
            <span style={{ color: genome.colors.primary, fontWeight: 700, fontSize: 14 }}>61 GB / 160 GB</span>
          </div>
          <ProgressBar value={38} tokens={tokens} height={10} />
        </div>
        <Badge bg={hex(genome.colors.primary, 0.15)} color={genome.colors.primary}>Upgrade Plan ↗</Badge>
      </Card>
    </SectionWrap>
  );
}

export function FileListSection({ tokens }: R) {
  const { genome } = tokens;
  const files = [
    { name: "Annual Report 2024.pdf", type: "PDF", size: "3.2 MB", modified: "Today", shared: true, icon: "📄" },
    { name: "product-screenshots.zip", type: "ZIP", size: "12.4 MB", modified: "Yesterday", shared: false, icon: "🗜" },
    { name: "team-roster.xlsx", type: "XLS", size: "480 KB", modified: "Dec 10", shared: true, icon: "📊" },
    { name: "landing-page-v3.fig", type: "FIG", size: "8.1 MB", modified: "Dec 8", shared: true, icon: "🎨" },
    { name: "database-backup.sql", type: "SQL", size: "44 MB", modified: "Dec 5", shared: false, icon: "💾" },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: genome.spacing.md }}>
        <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700 }}>Recent Files</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge>Sort: Name</Badge>
          <Badge bg={hex(genome.colors.primary, 0.15)} color={genome.colors.primary}>+ Upload</Badge>
        </div>
      </div>
      <Card tokens={tokens} style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 80px 40px", padding: "8px 16px", borderBottom: `1px solid ${TEXT_FAINT}` }}>
          {["Name", "Type", "Modified", "Size", ""].map(h => (
            <span key={h} style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
          ))}
        </div>
        {files.map((f, i) => (
          <div key={f.name} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 80px 40px", padding: "10px 16px", borderBottom: i < files.length - 1 ? `1px solid ${TEXT_FAINT}` : "none", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span style={{ color: TEXT_COLOR, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
            </div>
            <Badge bg={hex(genome.colors.primary, 0.1)} color={genome.colors.primary}>{f.type}</Badge>
            <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{f.modified}</span>
            <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{f.size}</span>
            <span style={{ color: f.shared ? genome.colors.primary : TEXT_FAINT, fontSize: 14 }}>🔗</span>
          </div>
        ))}
      </Card>
    </SectionWrap>
  );
}

export function SharingControlsSection({ tokens }: R) {
  const { genome } = tokens;
  const roles = [
    { label: "View Only", desc: "Can view files and folders", icon: "👁", active: false },
    { label: "Commenter", desc: "Can view and add comments", icon: "💬", active: false },
    { label: "Editor", desc: "Can view, edit and upload", icon: "✏️", active: true },
    { label: "Admin", desc: "Full access including sharing", icon: "🛡", active: false },
  ];
  const members = [
    { name: "Sarah K.", role: "Admin", color: genome.colors.primary },
    { name: "Tom R.", role: "Editor", color: genome.colors.secondary },
    { name: "Lisa M.", role: "View Only", color: genome.colors.accent },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700, marginBottom: genome.spacing.lg }}>Sharing & Permissions</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: genome.spacing.lg }}>
        <div>
          <p style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: genome.spacing.sm }}>Permission Levels</p>
          <div style={{ display: "flex", flexDirection: "column", gap: genome.spacing.sm }}>
            {roles.map(r => (
              <Card key={r.label} tokens={tokens} style={{ display: "flex", alignItems: "center", gap: 12, border: r.active ? `1px solid ${hex(genome.colors.primary, 0.5)}` : undefined }}>
                <span style={{ fontSize: 20 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: r.active ? genome.colors.primary : TEXT_COLOR, fontWeight: 600, fontSize: 13 }}>{r.label}</p>
                  <p style={{ color: TEXT_MUTED, fontSize: 11 }}>{r.desc}</p>
                </div>
                {r.active && <Badge bg={hex(genome.colors.primary, 0.15)} color={genome.colors.primary}>Selected</Badge>}
              </Card>
            ))}
          </div>
        </div>
        <div>
          <p style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: genome.spacing.sm }}>Shared With</p>
          <div style={{ display: "flex", flexDirection: "column", gap: genome.spacing.sm }}>
            {members.map(m => (
              <Card key={m.name} tokens={tokens} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar initials={m.name.split(" ").map(x => x[0]).join("")} color={m.color} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: TEXT_COLOR, fontWeight: 600, fontSize: 13 }}>{m.name}</p>
                  <p style={{ color: TEXT_MUTED, fontSize: 11 }}>{m.role}</p>
                </div>
                <button style={{ color: TEXT_MUTED, background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
              </Card>
            ))}
            <Card tokens={tokens} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px dashed ${hex(genome.colors.primary, 0.3)}`, cursor: "pointer" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: hex(genome.colors.primary, 0.1), display: "flex", alignItems: "center", justifyContent: "center", color: genome.colors.primary, fontSize: 18 }}>+</div>
              <span style={{ color: genome.colors.primary, fontSize: 13, fontWeight: 600 }}>Invite people</span>
            </Card>
          </div>
        </div>
      </div>
    </SectionWrap>
  );
}

export function ChatListSection({ tokens }: R) {
  const { genome } = tokens;
  const chats = [
    { name: "Product Team", msg: "Let's sync on the roadmap today", time: "2m", unread: 3, color: genome.colors.primary },
    { name: "Sarah Chen", msg: "The designs look great! 🎉", time: "14m", unread: 1, color: genome.colors.secondary },
    { name: "Engineering", msg: "PR #247 is ready for review", time: "1h", unread: 0, color: genome.colors.accent },
    { name: "Marketing", msg: "Campaign goes live tomorrow", time: "3h", unread: 0, color: genome.colors.primary },
    { name: "Tom Rivera", msg: "Can we reschedule Friday?", time: "5h", unread: 0, color: genome.colors.secondary },
    { name: "Design Review", msg: "Feedback added to Figma", time: "1d", unread: 0, color: genome.colors.accent },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: genome.spacing.lg }}>
          <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700 }}>Messages</h3>
          <Badge bg={hex(genome.colors.primary, 0.15)} color={genome.colors.primary}>+ New Chat</Badge>
        </div>
        <Card tokens={tokens} style={{ padding: 0, overflow: "hidden" }}>
          {chats.map((c, i) => (
            <div key={c.name} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px",
              borderBottom: i < chats.length - 1 ? `1px solid ${TEXT_FAINT}` : "none",
              background: i === 0 ? hex(genome.colors.primary, 0.06) : "transparent",
            }}>
              <Avatar initials={c.name.split(" ").map(x => x[0]).join("").slice(0, 2)} color={c.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ color: TEXT_COLOR, fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                  <span style={{ color: TEXT_MUTED, fontSize: 11 }}>{c.time}</span>
                </div>
                <p style={{ color: TEXT_MUTED, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.msg}</p>
              </div>
              {c.unread > 0 && (
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: genome.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>{c.unread}</div>
              )}
            </div>
          ))}
        </Card>
      </div>
    </SectionWrap>
  );
}

export function MessageBubblesSection({ tokens }: R) {
  const { genome, projectName } = tokens;
  const messages = [
    { text: "Hey, have you reviewed the new dashboard designs?", own: false, time: "10:12 AM" },
    { text: "Just finished going through them! Really clean layout.", own: true, time: "10:14 AM" },
    { text: "Thanks! I updated the color palette to match the brand guide.", own: false, time: "10:14 AM" },
    { text: "Looks great. Can we add a dark mode toggle?", own: true, time: "10:16 AM" },
    { text: "Already in progress 🚀 Will push tomorrow.", own: false, time: "10:17 AM" },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700, marginBottom: genome.spacing.lg, textAlign: "center" }}>
        {projectName}
      </h3>
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: genome.spacing.md }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.own ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "70%", padding: "10px 14px",
              borderRadius: m.own ? `${genome.radius.lg} ${genome.radius.lg} ${genome.radius.sm} ${genome.radius.lg}` : `${genome.radius.lg} ${genome.radius.lg} ${genome.radius.lg} ${genome.radius.sm}`,
              background: m.own ? genome.colors.primary : genome.colors.surface,
              color: m.own ? "#fff" : TEXT_COLOR,
              fontSize: 13,
            }}>
              {m.text}
            </div>
            <span style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 4 }}>{m.time}{m.own ? " · ✓✓" : ""}</span>
          </div>
        ))}
      </div>
    </SectionWrap>
  );
}

export function MessageInputBarSection({ tokens }: R) {
  const { genome } = tokens;
  const actions = [
    { icon: "📎", label: "Attachment" },
    { icon: "🖼", label: "Image" },
    { icon: "😊", label: "Emoji" },
    { icon: "🎤", label: "Voice" },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <Card tokens={tokens} style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: genome.spacing.sm, marginBottom: genome.spacing.md }}>
          {actions.map(a => (
            <button key={a.label} title={a.label} style={{
              width: 36, height: 36, borderRadius: genome.radius.md,
              background: hex(genome.colors.primary, 0.08),
              border: "none", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{a.icon}</button>
          ))}
          <div style={{ flex: 1, background: genome.colors.background, borderRadius: genome.radius.md, padding: "8px 12px", color: TEXT_MUTED, fontSize: 13 }}>
            Type a message…
          </div>
          <button style={{
            width: 36, height: 36, borderRadius: "50%",
            background: genome.colors.primary, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>➤</button>
        </div>
        <div style={{ display: "flex", gap: genome.spacing.md, borderTop: `1px solid ${TEXT_FAINT}`, paddingTop: genome.spacing.sm }}>
          {["📝 Format", "📅 Schedule", "🔒 Encrypted", "👁 Seen by 3"].map(t => (
            <span key={t} style={{ color: TEXT_MUTED, fontSize: 11 }}>{t}</span>
          ))}
        </div>
      </Card>
    </SectionWrap>
  );
}

export function OnlineStatusSection({ tokens }: R) {
  const { genome } = tokens;
  const users = [
    { name: "Alice W.", status: "online", task: "Design Review", color: genome.colors.primary },
    { name: "Bob K.", status: "online", task: "Sprint Planning", color: genome.colors.secondary },
    { name: "Carol M.", status: "busy", task: "On a call", color: genome.colors.accent },
    { name: "Dave S.", status: "online", task: "PR Review", color: genome.colors.primary },
    { name: "Eve T.", status: "away", task: "Back in 30 min", color: genome.colors.secondary },
    { name: "Frank J.", status: "offline", task: "Last seen 1h ago", color: genome.colors.accent },
    { name: "Gina R.", status: "online", task: "User Testing", color: genome.colors.primary },
    { name: "Henry P.", status: "online", task: "Deployment", color: genome.colors.secondary },
  ];
  const statusColors: Record<string, string> = { online: "#22c55e", busy: "#ef4444", away: "#f59e0b", offline: "#6b7280" };
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: genome.spacing.lg }}>
        <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700 }}>Team Online</h3>
        <div style={{ display: "flex", gap: genome.spacing.sm }}>
          <Badge bg="#22c55e22" color="#22c55e">5 online</Badge>
          <Badge>8 members</Badge>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: genome.spacing.md }}>
        {users.map(u => (
          <Card key={u.name} tokens={tokens} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
            <div style={{ position: "relative" }}>
              <Avatar initials={u.name.split(" ").map(x => x[0]).join("")} color={u.color} size={40} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: statusColors[u.status], border: `2px solid ${genome.colors.surface}` }} />
            </div>
            <div>
              <p style={{ color: TEXT_COLOR, fontSize: 12, fontWeight: 600 }}>{u.name}</p>
              <p style={{ color: TEXT_MUTED, fontSize: 10 }}>{u.task}</p>
            </div>
          </Card>
        ))}
      </div>
    </SectionWrap>
  );
}

export function AnalyticsChartSection({ tokens }: R) {
  const { genome } = tokens;
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const values = [42, 65, 58, 80, 72, 95];
  const secondary = [28, 45, 40, 55, 48, 67];
  const maxVal = Math.max(...values);
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: genome.spacing.xl }}>
        <Card tokens={tokens}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: genome.spacing.lg }}>
            <div>
              <p style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 4 }}>Monthly Active Users</p>
              <p style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: genome.colors.primary, fontSize: genome.typography.sizes["2xl"], fontWeight: 700 }}>24,891</p>
              <Badge bg="#22c55e22" color="#22c55e">↑ 18.2% vs last month</Badge>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[{ label: "Users", color: genome.colors.primary }, { label: "Sessions", color: genome.colors.secondary }].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                  <span style={{ color: TEXT_MUTED, fontSize: 11 }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {months.map((m, i) => (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2, width: "100%" }}>
                  <div style={{ height: `${(values[i] / maxVal) * 100}%`, background: genome.colors.primary, borderRadius: `${genome.radius.sm} ${genome.radius.sm} 0 0`, minHeight: 4 }} />
                  <div style={{ height: `${(secondary[i] / maxVal) * 100}%`, background: genome.colors.secondary, borderRadius: `${genome.radius.sm} ${genome.radius.sm} 0 0`, minHeight: 2, opacity: 0.7 }} />
                </div>
                <span style={{ color: TEXT_MUTED, fontSize: 10 }}>{m}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card tokens={tokens}>
          <p style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: genome.spacing.md }}>Revenue Breakdown</p>
          <div style={{ display: "flex", flexDirection: "column", gap: genome.spacing.sm }}>
            {[
              { label: "Enterprise", value: 68, color: genome.colors.primary },
              { label: "Pro Plan", value: 21, color: genome.colors.secondary },
              { label: "Starter", value: 11, color: genome.colors.accent },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: TEXT_COLOR, fontSize: 12, fontWeight: 500 }}>{s.label}</span>
                  <span style={{ color: s.color, fontSize: 12, fontWeight: 700 }}>{s.value}%</span>
                </div>
                <ProgressBar value={s.value} tokens={{ ...tokens, genome: { ...genome, colors: { ...genome.colors, primary: s.color } } }} height={6} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: genome.spacing.lg, display: "grid", gridTemplateColumns: "1fr 1fr", gap: genome.spacing.sm }}>
            <Card tokens={tokens} style={{ textAlign: "center", padding: genome.spacing.sm }}>
              <p style={{ color: genome.colors.primary, fontWeight: 700, fontSize: 18 }}>$128K</p>
              <p style={{ color: TEXT_MUTED, fontSize: 10 }}>MRR</p>
            </Card>
            <Card tokens={tokens} style={{ textAlign: "center", padding: genome.spacing.sm }}>
              <p style={{ color: genome.colors.secondary, fontWeight: 700, fontSize: 18 }}>94.2%</p>
              <p style={{ color: TEXT_MUTED, fontSize: 10 }}>Retention</p>
            </Card>
          </div>
        </Card>
      </div>
    </SectionWrap>
  );
}

export function DataTableSection({ tokens }: R) {
  const { genome } = tokens;
  const rows = [
    { name: "Acme Corp", plan: "Enterprise", users: 240, mrr: "$4,800", status: "active" },
    { name: "TechStart Inc", plan: "Pro", users: 45, mrr: "$450", status: "active" },
    { name: "Design Co", plan: "Starter", users: 12, mrr: "$96", status: "trial" },
    { name: "BuildFast LLC", plan: "Enterprise", users: 380, mrr: "$7,600", status: "active" },
    { name: "MediaGroup", plan: "Pro", users: 67, mrr: "$670", status: "churned" },
  ];
  const statusStyle: Record<string, { bg: string; color: string }> = {
    active: { bg: "#22c55e22", color: "#22c55e" },
    trial: { bg: "#f59e0b22", color: "#f59e0b" },
    churned: { bg: "#ef444422", color: "#ef4444" },
  };
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: genome.spacing.md }}>
        <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700 }}>Accounts</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge>Filter</Badge>
          <Badge>Sort: MRR ↓</Badge>
          <Badge bg={hex(genome.colors.primary, 0.15)} color={genome.colors.primary}>Export CSV</Badge>
        </div>
      </div>
      <Card tokens={tokens} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 100px 80px", padding: "8px 16px", borderBottom: `1px solid ${TEXT_FAINT}` }}>
          {["Account", "Plan", "Users", "MRR", "Status"].map(h => (
            <span key={h} style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
          ))}
        </div>
        {rows.map((r, i) => (
          <div key={r.name} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 100px 80px", padding: "12px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${TEXT_FAINT}` : "none", alignItems: "center" }}>
            <span style={{ color: TEXT_COLOR, fontWeight: 600, fontSize: 13 }}>{r.name}</span>
            <Badge bg={hex(genome.colors.primary, 0.1)} color={genome.colors.primary}>{r.plan}</Badge>
            <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{r.users}</span>
            <span style={{ color: genome.colors.primary, fontWeight: 700, fontSize: 13 }}>{r.mrr}</span>
            <Badge bg={statusStyle[r.status].bg} color={statusStyle[r.status].color}>{r.status}</Badge>
          </div>
        ))}
      </Card>
    </SectionWrap>
  );
}

export function FiltersSection({ tokens }: R) {
  const { genome } = tokens;
  const filterGroups = [
    { label: "Status", options: ["Active", "Trial", "Churned", "All"] },
    { label: "Plan", options: ["Enterprise", "Pro", "Starter", "All"] },
    { label: "Date", options: ["Today", "This Week", "This Month", "All Time"] },
    { label: "Region", options: ["US", "EU", "APAC", "All"] },
  ];
  const activeFilters = ["Active", "Enterprise", "This Month"];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "flex", alignItems: "center", gap: genome.spacing.md, flexWrap: "wrap", marginBottom: genome.spacing.lg }}>
        <span style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 600 }}>Filters:</span>
        {activeFilters.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: hex(genome.colors.primary, 0.15), color: genome.colors.primary, fontSize: 12, fontWeight: 600 }}>
            {f} <span style={{ cursor: "pointer" }}>×</span>
          </div>
        ))}
        <span style={{ color: genome.colors.primary, fontSize: 12, cursor: "pointer" }}>Clear all</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: genome.spacing.lg }}>
        {filterGroups.map(group => (
          <div key={group.label}>
            <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: genome.spacing.sm }}>{group.label}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.options.map((opt, i) => (
                <div key={opt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${i === 0 ? genome.colors.primary : TEXT_FAINT}`, background: i === 0 ? hex(genome.colors.primary, 0.15) : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {i === 0 && <div style={{ width: 8, height: 8, borderRadius: 2, background: genome.colors.primary }} />}
                  </div>
                  <span style={{ color: i === 0 ? TEXT_COLOR : TEXT_MUTED, fontSize: 13 }}>{opt}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionWrap>
  );
}

export function MetricCardsSection({ tokens }: R) {
  const { genome } = tokens;
  const metrics = [
    { label: "Total Revenue", value: "$128,450", change: "+18.2%", up: true, icon: "💰", color: genome.colors.primary },
    { label: "Active Users", value: "24,891", change: "+6.1%", up: true, icon: "👥", color: genome.colors.secondary },
    { label: "Conversion Rate", value: "3.84%", change: "+0.3%", up: true, icon: "⚡", color: genome.colors.accent },
    { label: "Churn Rate", value: "1.2%", change: "-0.4%", up: false, icon: "📉", color: genome.colors.primary },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: genome.spacing.lg }}>
        {metrics.map(m => (
          <Card key={m.label} tokens={tokens} style={{ display: "flex", flexDirection: "column", gap: genome.spacing.sm }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{m.label}</span>
              <IconBox tokens={tokens} size={28}><span style={{ fontSize: 14 }}>{m.icon}</span></IconBox>
            </div>
            <p style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontWeight: 700, fontSize: genome.typography.sizes.xl }}>{m.value}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: m.up ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 600 }}>{m.change}</span>
              <span style={{ color: TEXT_MUTED, fontSize: 11 }}>vs last month</span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: TEXT_FAINT, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${60 + Math.random() * 30}%`, background: m.color, borderRadius: 999 }} />
            </div>
          </Card>
        ))}
      </div>
    </SectionWrap>
  );
}

export function ProductGridSection({ tokens, section }: R) {
  const { genome, projectName } = tokens;
  const products = [
    { name: "Pro Wireless Headphones", price: "$149.99", rating: 4.8, reviews: 2341, badge: "Best Seller", icon: "🎧" },
    { name: "Mechanical Keyboard", price: "$89.00", rating: 4.6, reviews: 1205, badge: "New", icon: "⌨️" },
    { name: "USB-C Hub 7-in-1", price: "$44.99", rating: 4.9, reviews: 891, badge: "Top Rated", icon: "🔌" },
    { name: "Portable Charger 26800mAh", price: "$59.99", rating: 4.7, reviews: 3102, badge: "Sale", icon: "🔋" },
    { name: "Webcam 4K Pro", price: "$199.99", rating: 4.5, reviews: 567, badge: null, icon: "📷" },
    { name: "LED Desk Lamp", price: "$34.99", rating: 4.4, reviews: 443, badge: "Sale", icon: "💡" },
  ];
  const cols = section.columns ?? 3;
  const displayProducts = products.slice(0, cols * 2);
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: genome.spacing.lg }}>
        <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700 }}>{projectName}</h3>
        <Badge bg={hex(genome.colors.primary, 0.15)} color={genome.colors.primary}>View All →</Badge>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: genome.spacing.lg }}>
        {displayProducts.map(p => (
          <Card key={p.name} tokens={tokens} style={{ display: "flex", flexDirection: "column", gap: genome.spacing.sm, overflow: "hidden", padding: 0 }}>
            <div style={{ height: 140, background: hex(genome.colors.primary, 0.08), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, position: "relative" }}>
              {p.icon}
              {p.badge && (
                <div style={{ position: "absolute", top: 8, left: 8 }}>
                  <Badge bg={hex(genome.colors.primary, 0.9)} color="#fff">{p.badge}</Badge>
                </div>
              )}
            </div>
            <div style={{ padding: genome.spacing.md }}>
              <p style={{ color: TEXT_COLOR, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                <span style={{ color: "#f59e0b", fontSize: 12 }}>★ {p.rating}</span>
                <span style={{ color: TEXT_MUTED, fontSize: 11 }}>({p.reviews.toLocaleString()})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: genome.colors.primary, fontWeight: 700, fontSize: 16 }}>{p.price}</span>
                <button style={{ padding: "4px 12px", borderRadius: genome.radius.sm, background: genome.colors.primary, border: "none", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Add to Cart</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </SectionWrap>
  );
}

export function CartSummarySection({ tokens }: R) {
  const { genome } = tokens;
  const items = [
    { name: "Pro Wireless Headphones", qty: 1, price: "$149.99", icon: "🎧" },
    { name: "USB-C Hub 7-in-1", qty: 2, price: "$89.98", icon: "🔌" },
    { name: "LED Desk Lamp", qty: 1, price: "$34.99", icon: "💡" },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700, marginBottom: genome.spacing.lg }}>Your Cart (3 items)</h3>
        <Card tokens={tokens} style={{ marginBottom: genome.spacing.lg, padding: 0, overflow: "hidden" }}>
          {items.map((item, i) => (
            <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < items.length - 1 ? `1px solid ${TEXT_FAINT}` : "none" }}>
              <div style={{ width: 48, height: 48, borderRadius: genome.radius.sm, background: hex(genome.colors.primary, 0.08), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: TEXT_COLOR, fontWeight: 600, fontSize: 13 }}>{item.name}</p>
                <p style={{ color: TEXT_MUTED, fontSize: 12 }}>Qty: {item.qty}</p>
              </div>
              <span style={{ color: genome.colors.primary, fontWeight: 700 }}>{item.price}</span>
            </div>
          ))}
        </Card>
        <Card tokens={tokens}>
          {[
            { label: "Subtotal", value: "$274.96" },
            { label: "Shipping", value: "Free" },
            { label: "Tax", value: "$22.00" },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: genome.spacing.sm }}>
              <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{r.label}</span>
              <span style={{ color: r.label === "Shipping" ? "#22c55e" : TEXT_COLOR, fontWeight: r.label === "Shipping" ? 600 : 400, fontSize: 13 }}>{r.value}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${TEXT_FAINT}`, paddingTop: genome.spacing.md, marginTop: genome.spacing.sm, display: "flex", justifyContent: "space-between", marginBottom: genome.spacing.lg }}>
            <span style={{ color: TEXT_COLOR, fontWeight: 700, fontSize: 15 }}>Total</span>
            <span style={{ color: genome.colors.primary, fontWeight: 700, fontSize: 18 }}>$296.96</span>
          </div>
          <button style={{ width: "100%", padding: "12px", borderRadius: genome.radius.md, background: genome.colors.primary, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Proceed to Checkout →</button>
        </Card>
      </div>
    </SectionWrap>
  );
}

export function ReviewsSection({ tokens, section }: R) {
  const { genome } = tokens;
  const reviews = [
    { name: "Alex T.", rating: 5, text: "Absolutely transformed the way our team works. The interface is incredibly intuitive.", role: "Product Manager", color: genome.colors.primary },
    { name: "Marina S.", rating: 5, text: "Setup took 10 minutes. Within a week the whole team was onboarded. Game changer.", role: "Startup Founder", color: genome.colors.secondary },
    { name: "James L.", rating: 4, text: "Really solid platform. The analytics dashboard is my favorite feature by far.", role: "Growth Lead", color: genome.colors.accent },
    { name: "Priya K.", rating: 5, text: "Support team is incredibly responsive. Best SaaS experience I've had.", role: "CTO", color: genome.colors.primary },
  ];
  const cols = section.cardCount ?? 2;
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ textAlign: "center", marginBottom: genome.spacing.xl }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: genome.spacing.sm }}>
          {Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ color: "#f59e0b", fontSize: 20 }}>★</span>)}
        </div>
        <p style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontWeight: 700, fontSize: genome.typography.sizes.lg }}>4.9 / 5.0 — Loved by thousands</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: genome.spacing.lg }}>
        {reviews.slice(0, cols).map(r => (
          <Card key={r.name} tokens={tokens} style={{ display: "flex", flexDirection: "column", gap: genome.spacing.md }}>
            <div style={{ color: "#f59e0b", fontSize: 14 }}>{Array.from({ length: r.rating }).map((_, i) => "★").join("")}</div>
            <p style={{ color: TEXT_COLOR, fontSize: 13, lineHeight: 1.6, flex: 1 }}>"{r.text}"</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar initials={r.name.split(" ").map(x => x[0]).join("")} color={r.color} size={34} />
              <div>
                <p style={{ color: TEXT_COLOR, fontWeight: 600, fontSize: 13 }}>{r.name}</p>
                <p style={{ color: TEXT_MUTED, fontSize: 11 }}>{r.role}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </SectionWrap>
  );
}

export function KanbanBoardSection({ tokens }: R) {
  const { genome } = tokens;
  const columns = [
    {
      title: "To Do", color: TEXT_MUTED,
      tasks: [
        { title: "User auth flow redesign", priority: "high", assignee: "SK" },
        { title: "Add dark mode toggle", priority: "medium", assignee: "TR" },
        { title: "Write API docs", priority: "low", assignee: "LM" },
      ],
    },
    {
      title: "In Progress", color: genome.colors.primary,
      tasks: [
        { title: "Dashboard analytics v2", priority: "high", assignee: "SK" },
        { title: "Mobile responsive fixes", priority: "medium", assignee: "LM" },
      ],
    },
    {
      title: "Done", color: "#22c55e",
      tasks: [
        { title: "Onboarding wizard", priority: "high", assignee: "TR" },
        { title: "Email notifications", priority: "medium", assignee: "SK" },
        { title: "Billing integration", priority: "high", assignee: "LM" },
      ],
    },
    {
      title: "Review", color: genome.colors.accent,
      tasks: [
        { title: "Homepage redesign", priority: "high", assignee: "TR" },
      ],
    },
  ];
  const priorityColors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  const avatarColors = [genome.colors.primary, genome.colors.secondary, genome.colors.accent];
  return (
    <SectionWrap tokens={tokens}>
      <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700, marginBottom: genome.spacing.lg }}>Sprint Board</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: genome.spacing.md }}>
        {columns.map(col => (
          <div key={col.title}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: genome.spacing.md }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
              <span style={{ color: TEXT_COLOR, fontWeight: 700, fontSize: 13 }}>{col.title}</span>
              <Badge>{col.tasks.length}</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: genome.spacing.sm }}>
              {col.tasks.map((task, i) => (
                <Card key={task.title} tokens={tokens} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ color: TEXT_COLOR, fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>{task.title}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Badge bg={`${priorityColors[task.priority]}22`} color={priorityColors[task.priority]}>{task.priority}</Badge>
                    <Avatar initials={task.assignee} color={avatarColors[i % avatarColors.length]} size={20} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionWrap>
  );
}

export function TaskListSection({ tokens }: R) {
  const { genome } = tokens;
  const tasks = [
    { title: "Finalize Q1 OKRs with leadership team", done: true, priority: "high", assignees: ["SK", "TR"], due: "Today" },
    { title: "Review and merge PR #289 — authentication flow", done: false, priority: "high", assignees: ["LM"], due: "Today" },
    { title: "Update onboarding copy per user research findings", done: false, priority: "medium", assignees: ["SK"], due: "Dec 15" },
    { title: "Audit all API endpoints for rate limiting", done: false, priority: "high", assignees: ["TR", "LM"], due: "Dec 16" },
    { title: "Prepare product roadmap for board presentation", done: false, priority: "medium", assignees: ["SK"], due: "Dec 18" },
    { title: "Fix mobile layout bugs reported by QA", done: true, priority: "low", assignees: ["LM"], due: "Dec 12" },
  ];
  const priorityColors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  const avatarColors = [genome.colors.primary, genome.colors.secondary, genome.colors.accent];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: genome.spacing.lg }}>
        <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700 }}>Tasks</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge>2 done</Badge>
          <Badge bg={hex(genome.colors.primary, 0.15)} color={genome.colors.primary}>+ Add Task</Badge>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: genome.spacing.sm }}>
        {tasks.map((t, i) => (
          <Card key={t.title} tokens={tokens} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${t.done ? genome.colors.primary : TEXT_FAINT}`, background: t.done ? hex(genome.colors.primary, 0.15) : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {t.done && <span style={{ color: genome.colors.primary, fontSize: 12 }}>✓</span>}
            </div>
            <span style={{ flex: 1, color: t.done ? TEXT_MUTED : TEXT_COLOR, fontSize: 13, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
            <Badge bg={`${priorityColors[t.priority]}22`} color={priorityColors[t.priority]}>{t.priority}</Badge>
            <div style={{ display: "flex", gap: -4 }}>
              {t.assignees.map((a, j) => (
                <Avatar key={a} initials={a} color={avatarColors[j % avatarColors.length]} size={22} />
              ))}
            </div>
            <span style={{ color: TEXT_MUTED, fontSize: 11, whiteSpace: "nowrap" }}>{t.due}</span>
          </Card>
        ))}
      </div>
    </SectionWrap>
  );
}

export function TeamMembersSection({ tokens, section }: R) {
  const { genome } = tokens;
  const members = [
    { name: "Sarah Kim", role: "Product Design", dept: "Design", color: genome.colors.primary, online: true },
    { name: "Tom Rivera", role: "Frontend Eng.", dept: "Engineering", color: genome.colors.secondary, online: true },
    { name: "Lisa Moore", role: "Data Analytics", dept: "Analytics", color: genome.colors.accent, online: false },
    { name: "James Park", role: "Backend Eng.", dept: "Engineering", color: genome.colors.primary, online: true },
    { name: "Emma Wilson", role: "Marketing Lead", dept: "Marketing", color: genome.colors.secondary, online: false },
    { name: "Raj Patel", role: "DevOps Eng.", dept: "Engineering", color: genome.colors.accent, online: true },
  ];
  const cols = section.columns ?? 3;
  return (
    <SectionWrap tokens={tokens}>
      <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.lg, fontWeight: 700, marginBottom: genome.spacing.lg }}>Team</h3>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: genome.spacing.lg }}>
        {members.slice(0, cols * 2).map(m => (
          <Card key={m.name} tokens={tokens} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: genome.spacing.sm, textAlign: "center" }}>
            <div style={{ position: "relative" }}>
              <Avatar initials={m.name.split(" ").map(x => x[0]).join("")} color={m.color} size={48} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: m.online ? "#22c55e" : "#6b7280", border: `2px solid ${genome.colors.surface}` }} />
            </div>
            <div>
              <p style={{ color: TEXT_COLOR, fontWeight: 700, fontSize: 13 }}>{m.name}</p>
              <p style={{ color: TEXT_MUTED, fontSize: 12 }}>{m.role}</p>
            </div>
            <Badge bg={hex(genome.colors.primary, 0.1)} color={genome.colors.primary}>{m.dept}</Badge>
          </Card>
        ))}
      </div>
    </SectionWrap>
  );
}

export function BillingPlanSection({ tokens }: R) {
  const { genome } = tokens;
  const plans = [
    {
      name: "Starter", price: "$9", period: "/mo", color: genome.colors.secondary,
      features: ["5 users", "10 GB storage", "Basic analytics", "Email support", "API access"],
      cta: "Get Started",
    },
    {
      name: "Pro", price: "$49", period: "/mo", color: genome.colors.primary, popular: true,
      features: ["25 users", "100 GB storage", "Advanced analytics", "Priority support", "Webhooks", "SSO"],
      cta: "Start Free Trial",
    },
    {
      name: "Enterprise", price: "Custom", period: "", color: genome.colors.accent,
      features: ["Unlimited users", "Unlimited storage", "Custom integrations", "Dedicated SLA", "On-premise option", "Custom contracts"],
      cta: "Contact Sales",
    },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ textAlign: "center", marginBottom: genome.spacing.xl }}>
        <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontWeight: 700, fontSize: genome.typography.sizes.xl }}>Simple, transparent pricing</h3>
        <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: genome.spacing.sm }}>No hidden fees. Cancel anytime.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: genome.spacing.lg, maxWidth: 820, margin: "0 auto" }}>
        {plans.map(plan => (
          <Card key={plan.name} tokens={tokens} style={{ display: "flex", flexDirection: "column", gap: genome.spacing.md, border: plan.popular ? `2px solid ${genome.colors.primary}` : undefined, position: "relative" }}>
            {plan.popular && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)" }}>
                <Badge bg={genome.colors.primary} color="#fff">Most Popular</Badge>
              </div>
            )}
            <div>
              <p style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 4 }}>{plan.name}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                <span style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: plan.color, fontWeight: 800, fontSize: 28 }}>{plan.price}</span>
                <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{plan.period}</span>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: plan.color, fontSize: 14 }}>✓</span>
                  <span style={{ color: TEXT_COLOR, fontSize: 13 }}>{f}</span>
                </div>
              ))}
            </div>
            <button style={{ padding: "10px", borderRadius: genome.radius.md, background: plan.popular ? genome.colors.primary : hex(genome.colors.primary, 0.1), border: "none", color: plan.popular ? "#fff" : genome.colors.primary, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{plan.cta}</button>
          </Card>
        ))}
      </div>
    </SectionWrap>
  );
}

export function CodeEditorSection({ tokens, section }: R) {
  const { genome, projectName } = tokens;
  const code = `import { ${projectName.split(" ")[0]}Client } from '@morse/sdk';

// Initialize the client
const client = new ${projectName.split(" ")[0]}Client({
  apiKey: process.env.API_KEY,
  region: 'us-east-1',
});

// Upload a file
async function uploadFile(file: File) {
  const result = await client.files.upload({
    file,
    folder: '/documents',
    permissions: 'private',
  });
  
  console.log('Uploaded:', result.url);
  return result;
}`;

  const lines = code.split("\n");
  const colors = {
    keyword: genome.colors.primary,
    string: genome.colors.accent,
    comment: TEXT_MUTED,
    fn: genome.colors.secondary,
    default: TEXT_COLOR,
  };

  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: genome.spacing.xl }}>
        <div>
          <h2 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes.xl, fontWeight: 700, color: TEXT_COLOR, marginBottom: genome.spacing.sm }}>
            Powerful API, Simple Integration
          </h2>
          <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6, marginBottom: genome.spacing.lg }}>
            Integrate {projectName} into your app in minutes. Our SDK supports TypeScript, Python, Go, and more.
          </p>
          {["TypeScript SDK", "REST API", "Webhooks", "CLI Tools"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: genome.spacing.sm }}>
              <span style={{ color: genome.colors.primary }}>✓</span>
              <span style={{ color: TEXT_COLOR, fontSize: 13 }}>{f}</span>
            </div>
          ))}
        </div>
        <Card tokens={tokens} style={{ fontFamily: "monospace", padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: hex(genome.colors.primary, 0.1), borderBottom: `1px solid ${TEXT_FAINT}` }}>
            {[genome.colors.primary, genome.colors.secondary, genome.colors.accent].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
            <span style={{ color: TEXT_MUTED, fontSize: 11, marginLeft: 4 }}>upload-example.ts</span>
          </div>
          <div style={{ padding: genome.spacing.md, overflowX: "auto" }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: genome.spacing.sm, lineHeight: 1.6 }}>
                <span style={{ color: TEXT_FAINT, fontSize: 11, minWidth: 20, textAlign: "right", userSelect: "none" }}>{i + 1}</span>
                <span style={{ fontSize: 11, color: line.includes("//") ? TEXT_MUTED : line.includes("import") || line.includes("const") || line.includes("async") || line.includes("return") || line.includes("function") ? genome.colors.primary : line.includes("'") ? genome.colors.accent : TEXT_COLOR }}>{line || " "}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </SectionWrap>
  );
}

export function VideoPlayerSection({ tokens }: R) {
  const { genome, projectName } = tokens;
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontSize: genome.typography.sizes.xl, fontWeight: 700, marginBottom: genome.spacing.sm }}>{projectName}</h3>
        <Card tokens={tokens} style={{ padding: 0, overflow: "hidden", marginBottom: genome.spacing.lg }}>
          <div style={{ height: 300, background: `linear-gradient(135deg, ${hex(genome.colors.primary, 0.15)}, ${hex(genome.colors.secondary, 0.15)})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <button style={{ width: 64, height: 64, borderRadius: "50%", background: genome.colors.primary, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>▶</button>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <ProgressBar value={35} tokens={tokens} height={4} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ color: "#fff", fontSize: 20 }}>⏮</span>
                  <span style={{ color: "#fff", fontSize: 20 }}>⏸</span>
                  <span style={{ color: "#fff", fontSize: 20 }}>⏭</span>
                  <span style={{ color: "#fff", fontSize: 20 }}>🔊</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>12:48 / 36:22</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#fff", fontSize: 20 }}>⚙</span>
                  <span style={{ color: "#fff", fontSize: 20 }}>⛶</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: genome.spacing.md }}>
          {[
            { title: "Getting Started", duration: "8:24", views: "12.4K", icon: "🎬" },
            { title: "Advanced Features", duration: "22:15", views: "8.1K", icon: "⚡" },
            { title: "Integration Guide", duration: "15:33", views: "5.6K", icon: "🔌" },
          ].map(v => (
            <Card key={v.title} tokens={tokens} style={{ cursor: "pointer", overflow: "hidden", padding: 0 }}>
              <div style={{ height: 80, background: hex(genome.colors.primary, 0.1), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{v.icon}</div>
              <div style={{ padding: genome.spacing.sm }}>
                <p style={{ color: TEXT_COLOR, fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{v.title}</p>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: TEXT_MUTED, fontSize: 10 }}>{v.duration}</span>
                  <span style={{ color: TEXT_MUTED, fontSize: 10 }}>{v.views} views</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

export function CalendarViewSection({ tokens }: R) {
  const { genome } = tokens;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dates = Array.from({ length: 35 }, (_, i) => {
    const d = i - 3;
    return { day: d + 1, inMonth: d >= 0 && d < 31, hasEvent: [3, 7, 10, 14, 15, 21, 22, 28].includes(d) };
  });
  const events = [
    { time: "9:00 AM", title: "Team Standup", color: genome.colors.primary },
    { time: "11:00 AM", title: "Product Review", color: genome.colors.secondary },
    { time: "2:00 PM", title: "User Interview", color: genome.colors.accent },
    { time: "4:30 PM", title: "Sprint Planning", color: genome.colors.primary },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: genome.spacing.xl }}>
        <Card tokens={tokens}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: genome.spacing.md }}>
            <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontWeight: 700, fontSize: 15 }}>December 2024</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ background: "none", border: `1px solid ${TEXT_FAINT}`, borderRadius: genome.radius.sm, padding: "4px 10px", color: TEXT_MUTED, cursor: "pointer", fontSize: 14 }}>‹</button>
              <button style={{ background: "none", border: `1px solid ${TEXT_FAINT}`, borderRadius: genome.radius.sm, padding: "4px 10px", color: TEXT_MUTED, cursor: "pointer", fontSize: 14 }}>›</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
            {days.map(d => <span key={d} style={{ color: TEXT_MUTED, fontSize: 11, textAlign: "center", fontWeight: 600 }}>{d}</span>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {dates.map((d, i) => (
              <div key={i} style={{
                height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: genome.radius.sm,
                background: d.day === 15 ? genome.colors.primary : "transparent",
                cursor: d.inMonth ? "pointer" : "default", position: "relative",
              }}>
                <span style={{ color: !d.inMonth ? TEXT_FAINT : d.day === 15 ? "#fff" : TEXT_COLOR, fontSize: 12, fontWeight: d.day === 15 ? 700 : 400 }}>
                  {d.inMonth ? d.day : ""}
                </span>
                {d.hasEvent && d.inMonth && d.day !== 15 && (
                  <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: genome.colors.primary }} />
                )}
              </div>
            ))}
          </div>
        </Card>
        <div>
          <p style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 600, marginBottom: genome.spacing.sm, textTransform: "uppercase" }}>Today's Schedule</p>
          <div style={{ display: "flex", flexDirection: "column", gap: genome.spacing.sm }}>
            {events.map(e => (
              <Card key={e.title} tokens={tokens} style={{ display: "flex", gap: 10, borderLeft: `3px solid ${e.color}`, paddingLeft: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: TEXT_COLOR, fontSize: 12, fontWeight: 600 }}>{e.title}</p>
                  <p style={{ color: TEXT_MUTED, fontSize: 11 }}>{e.time}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </SectionWrap>
  );
}

export function ProfileHeroSection({ tokens }: R) {
  const { genome, projectName } = tokens;
  const stats = [
    { label: "Followers", value: "12.4K" },
    { label: "Following", value: "891" },
    { label: "Posts", value: "347" },
    { label: "Likes", value: "48.2K" },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ height: 120, background: `linear-gradient(135deg, ${genome.colors.primary}, ${genome.colors.secondary})`, borderRadius: `${genome.radius.lg} ${genome.radius.lg} 0 0`, marginBottom: -40 }} />
        <Card tokens={tokens} style={{ borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: genome.spacing.md }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: genome.colors.primary, border: `4px solid ${genome.colors.surface}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 700, marginTop: -50 }}>
              {projectName[0]}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ padding: "6px 16px", borderRadius: genome.radius.md, background: hex(genome.colors.primary, 0.1), border: "none", color: genome.colors.primary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Message</button>
              <button style={{ padding: "6px 16px", borderRadius: genome.radius.md, background: genome.colors.primary, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Follow</button>
            </div>
          </div>
          <h2 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: TEXT_COLOR, fontWeight: 700, fontSize: genome.typography.sizes.lg }}>{projectName}</h2>
          <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4, marginBottom: genome.spacing.md }}>Building better experiences. Creator, designer, thinker.</p>
          <div style={{ display: "flex", gap: genome.spacing.xl }}>
            {stats.map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{ color: TEXT_COLOR, fontWeight: 700, fontSize: 16 }}>{s.value}</p>
                <p style={{ color: TEXT_MUTED, fontSize: 11 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </SectionWrap>
  );
}

export function FeedPostsSection({ tokens, section }: R) {
  const { genome } = tokens;
  const posts = [
    { user: "Sarah K.", handle: "@sarahk", time: "2m", content: "Just shipped a major redesign of our dashboard! The new card layout is so much cleaner. 🚀", likes: 142, comments: 23, reposts: 18, color: genome.colors.primary },
    { user: "Tom R.", handle: "@tomrivera", time: "14m", content: "Hot take: the best product decisions come from talking to users, not from analytics alone. Change my mind.", likes: 891, comments: 156, reposts: 204, color: genome.colors.secondary },
    { user: "Lisa M.", handle: "@lisamoore", time: "1h", content: "If you're not using TypeScript in 2024, you're working too hard. Type safety is just better software.", likes: 2341, comments: 345, reposts: 567, color: genome.colors.accent },
  ];
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: genome.spacing.md }}>
        {posts.map(p => (
          <Card key={p.user} tokens={tokens}>
            <div style={{ display: "flex", gap: 12, marginBottom: genome.spacing.sm }}>
              <Avatar initials={p.user.split(" ").map(x => x[0]).join("")} color={p.color} />
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ color: TEXT_COLOR, fontWeight: 700, fontSize: 13 }}>{p.user}</span>
                  <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{p.handle}</span>
                  <span style={{ color: TEXT_MUTED, fontSize: 11 }}>· {p.time}</span>
                </div>
              </div>
            </div>
            <p style={{ color: TEXT_COLOR, fontSize: 13, lineHeight: 1.5, marginBottom: genome.spacing.md }}>{p.content}</p>
            <div style={{ display: "flex", gap: genome.spacing.xl }}>
              {[
                { icon: "💬", count: p.comments },
                { icon: "🔁", count: p.reposts },
                { icon: "❤️", count: p.likes },
              ].map(action => (
                <div key={action.icon} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <span style={{ fontSize: 14 }}>{action.icon}</span>
                  <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{action.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </SectionWrap>
  );
}

export function SaasHeroSection({ tokens }: R) {
  const { genome, projectName } = tokens;
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: genome.spacing["2xl"], alignItems: "center" }}>
        <div>
          <Badge bg={hex(genome.colors.primary, 0.1)} color={genome.colors.primary} >New: AI-powered insights →</Badge>
          <h1 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["3xl"], fontWeight: 800, color: TEXT_COLOR, lineHeight: 1.15, marginTop: genome.spacing.md, marginBottom: genome.spacing.md }}>
            {projectName}<br />
            <span style={{ color: genome.colors.primary }}>Supercharged</span>
          </h1>
          <p style={{ color: TEXT_MUTED, fontSize: genome.typography.sizes.base, lineHeight: 1.7, marginBottom: genome.spacing.xl }}>
            The all-in-one platform built for modern teams. Ship faster, collaborate smarter, and scale with confidence.
          </p>
          <div style={{ display: "flex", gap: genome.spacing.md }}>
            <button style={{ padding: "12px 24px", borderRadius: genome.radius.md, background: genome.colors.primary, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Start Free Trial</button>
            <button style={{ padding: "12px 24px", borderRadius: genome.radius.md, background: "transparent", border: `1px solid ${TEXT_FAINT}`, color: TEXT_COLOR, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Watch Demo ▶</button>
          </div>
          <div style={{ display: "flex", gap: genome.spacing.xl, marginTop: genome.spacing.xl }}>
            {[{ v: "10K+", l: "Teams" }, { v: "99.9%", l: "Uptime" }, { v: "4.9★", l: "Rating" }].map(s => (
              <div key={s.l}>
                <p style={{ color: genome.colors.primary, fontWeight: 800, fontSize: genome.typography.sizes.xl }}>{s.v}</p>
                <p style={{ color: TEXT_MUTED, fontSize: 12 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <Card tokens={tokens} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: hex(genome.colors.primary, 0.1), borderBottom: `1px solid ${TEXT_FAINT}`, display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
            <div style={{ flex: 1, background: genome.colors.background, borderRadius: genome.radius.sm, height: 20, marginLeft: 8 }} />
          </div>
          <div style={{ padding: genome.spacing.md }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: genome.spacing.sm, marginBottom: genome.spacing.md }}>
              {[{ l: "Revenue", v: "$128K", up: true }, { l: "Users", v: "24.8K", up: true }, { l: "MRR", v: "+18%", up: true }].map(s => (
                <div key={s.l} style={{ background: hex(genome.colors.primary, 0.07), borderRadius: genome.radius.sm, padding: genome.spacing.sm, textAlign: "center" }}>
                  <p style={{ color: genome.colors.primary, fontWeight: 700, fontSize: 14 }}>{s.v}</p>
                  <p style={{ color: TEXT_MUTED, fontSize: 10 }}>{s.l}</p>
                </div>
              ))}
            </div>
            <div style={{ height: 80, display: "flex", alignItems: "flex-end", gap: 4 }}>
              {[40, 55, 35, 70, 60, 80, 65, 90, 75, 95].map((v, i) => (
                <div key={i} style={{ flex: 1, height: `${v}%`, background: i === 9 ? genome.colors.primary : hex(genome.colors.primary, 0.25 + (i * 0.07)), borderRadius: `${genome.radius.sm} ${genome.radius.sm} 0 0` }} />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </SectionWrap>
  );
}

export function ChatHeroSection({ tokens }: R) {
  const { genome, projectName } = tokens;
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: genome.spacing["2xl"], alignItems: "center" }}>
        <div>
          <h1 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["3xl"], fontWeight: 800, color: TEXT_COLOR, lineHeight: 1.15, marginBottom: genome.spacing.md }}>
            Where teams<br /><span style={{ color: genome.colors.primary }}>communicate</span>
          </h1>
          <p style={{ color: TEXT_MUTED, fontSize: genome.typography.sizes.base, lineHeight: 1.7, marginBottom: genome.spacing.xl }}>
            {projectName} brings all your team conversations, files, and tools together in one powerful platform.
          </p>
          <div style={{ display: "flex", gap: genome.spacing.md }}>
            <button style={{ padding: "12px 24px", borderRadius: genome.radius.md, background: genome.colors.primary, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Launch App</button>
            <button style={{ padding: "12px 24px", borderRadius: genome.radius.md, background: hex(genome.colors.primary, 0.08), border: "none", color: genome.colors.primary, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Explore Features</button>
          </div>
        </div>
        <Card tokens={tokens} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: hex(genome.colors.primary, 0.1), borderBottom: `1px solid ${TEXT_FAINT}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: TEXT_COLOR, fontSize: 12, fontWeight: 600 }}># general</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <Avatar initials="SK" color={genome.colors.primary} size={20} />
              <Avatar initials="TR" color={genome.colors.secondary} size={20} />
              <Avatar initials="LM" color={genome.colors.accent} size={20} />
            </div>
          </div>
          <div style={{ padding: genome.spacing.md, display: "flex", flexDirection: "column", gap: genome.spacing.sm }}>
            {[
              { u: "SK", msg: "Just pushed the new dashboard changes 🚀", own: false },
              { u: "TR", msg: "Nice! Looks great. Merging now.", own: false },
              { u: "LM", msg: "Just left comments in Figma too", own: false },
              { u: "You", msg: "Thanks team! Ship it 🎉", own: true },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 8, flexDirection: m.own ? "row-reverse" : "row", alignItems: "flex-end" }}>
                {!m.own && <Avatar initials={m.u} color={genome.colors.primary} size={24} />}
                <div style={{
                  maxWidth: "75%", padding: "8px 12px", fontSize: 12,
                  borderRadius: m.own ? `${genome.radius.md} ${genome.radius.md} ${genome.radius.sm} ${genome.radius.md}` : `${genome.radius.md} ${genome.radius.md} ${genome.radius.md} ${genome.radius.sm}`,
                  background: m.own ? genome.colors.primary : genome.colors.surface,
                  color: m.own ? "#fff" : TEXT_COLOR,
                }}>{m.msg}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 4, borderTop: `1px solid ${TEXT_FAINT}`, paddingTop: genome.spacing.sm }}>
              <div style={{ flex: 1, background: genome.colors.background, borderRadius: genome.radius.md, padding: "8px 12px", color: TEXT_MUTED, fontSize: 12 }}>Message #general…</div>
              <button style={{ width: 32, height: 32, borderRadius: "50%", background: genome.colors.primary, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14 }}>➤</button>
            </div>
          </div>
        </Card>
      </div>
    </SectionWrap>
  );
}

export function ProductHeroSection({ tokens }: R) {
  const { genome, projectName } = tokens;
  return (
    <SectionWrap tokens={tokens}>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: genome.spacing["2xl"], alignItems: "center" }}>
        <div style={{ height: 300, background: `linear-gradient(135deg, ${hex(genome.colors.primary, 0.12)}, ${hex(genome.colors.secondary, 0.12)})`, borderRadius: genome.radius.xl, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100 }}>
          🛍
        </div>
        <div>
          <Badge bg={hex(genome.colors.accent, 0.15)} color={genome.colors.accent}>New Arrival</Badge>
          <h1 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["2xl"], fontWeight: 800, color: TEXT_COLOR, lineHeight: 1.2, marginTop: genome.spacing.sm, marginBottom: genome.spacing.sm }}>
            {projectName}
          </h1>
          <div style={{ display: "flex", gap: 4, marginBottom: genome.spacing.sm }}>
            {"★★★★★".split("").map((s, i) => <span key={i} style={{ color: "#f59e0b", fontSize: 16 }}>{s}</span>)}
            <span style={{ color: TEXT_MUTED, fontSize: 13, marginLeft: 4 }}>4.9 (2,341 reviews)</span>
          </div>
          <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6, marginBottom: genome.spacing.lg }}>
            Premium quality, delivered fast. Trusted by thousands of customers worldwide.
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: genome.spacing.lg }}>
            <span style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, color: genome.colors.primary, fontWeight: 800, fontSize: genome.typography.sizes["2xl"] }}>$149.99</span>
            <span style={{ color: TEXT_MUTED, textDecoration: "line-through", fontSize: 15 }}>$199.99</span>
            <Badge bg="#22c55e22" color="#22c55e">25% OFF</Badge>
          </div>
          <div style={{ display: "flex", gap: genome.spacing.md }}>
            <button style={{ flex: 1, padding: "12px 20px", borderRadius: genome.radius.md, background: genome.colors.primary, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Add to Cart 🛒</button>
            <button style={{ padding: "12px 16px", borderRadius: genome.radius.md, background: hex(genome.colors.primary, 0.08), border: "none", fontSize: 18, cursor: "pointer" }}>♡</button>
          </div>
        </div>
      </div>
    </SectionWrap>
  );
}

const COMPONENT_RENDERERS: Record<string, (props: R) => React.ReactNode> = {
  file_uploader:     (p) => <FileUploaderSection {...p} />,
  folder_browser:    (p) => <FolderBrowserSection {...p} />,
  storage_usage_bar: (p) => <StorageUsageSection {...p} />,
  file_list:         (p) => <FileListSection {...p} />,
  sharing_controls:  (p) => <SharingControlsSection {...p} />,
  chat_list:         (p) => <ChatListSection {...p} />,
  chat_hero:         (p) => <ChatHeroSection {...p} />,
  message_bubbles:   (p) => <MessageBubblesSection {...p} />,
  message_input_bar: (p) => <MessageInputBarSection {...p} />,
  online_status:     (p) => <OnlineStatusSection {...p} />,
  analytics_chart:   (p) => <AnalyticsChartSection {...p} />,
  data_table:        (p) => <DataTableSection {...p} />,
  filters:           (p) => <FiltersSection {...p} />,
  metric_cards:      (p) => <MetricCardsSection {...p} />,
  product_grid:      (p) => <ProductGridSection {...p} />,
  product_hero:      (p) => <ProductHeroSection {...p} />,
  cart_summary:      (p) => <CartSummarySection {...p} />,
  reviews:           (p) => <ReviewsSection {...p} />,
  kanban_board:      (p) => <KanbanBoardSection {...p} />,
  task_list:         (p) => <TaskListSection {...p} />,
  team_members:      (p) => <TeamMembersSection {...p} />,
  billing_plan:      (p) => <BillingPlanSection {...p} />,
  code_editor:       (p) => <CodeEditorSection {...p} />,
  video_player:      (p) => <VideoPlayerSection {...p} />,
  calendar_view:     (p) => <CalendarViewSection {...p} />,
  profile_hero:      (p) => <ProfileHeroSection {...p} />,
  feed_posts:        (p) => <FeedPostsSection {...p} />,
  saas_hero:         (p) => <SaasHeroSection {...p} />,
};

export function renderProductSection(
  componentType: string,
  tokens: GenomeTokens,
  section: LayoutSection,
): React.ReactNode {
  const renderer = COMPONENT_RENDERERS[componentType];
  if (!renderer) return null;
  return renderer({ tokens, section });
}
