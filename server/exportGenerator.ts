import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph } from "@shared/layoutEngine";
import type { Project } from "@shared/schema";

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "morse-export";
}

function genPackageJson(project: Project): string {
  const pkg = safeName(project.name);
  return JSON.stringify({
    name: pkg,
    version: "1.0.0",
    private: true,
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.4",
      autoprefixer: "^10.4.20",
      postcss: "^8.4.47",
      tailwindcss: "^3.4.14",
      vite: "^5.4.10",
    },
  }, null, 2);
}

function genViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
`;
}

function genTailwindConfig(genome: DesignGenome): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '${genome.colors.primary}',
        secondary: '${genome.colors.secondary}',
        accent: '${genome.colors.accent}',
        surface: '${genome.colors.surface}',
      },
      fontFamily: {
        heading: ['${genome.typography.heading}', 'sans-serif'],
        body: ['${genome.typography.body}', 'sans-serif'],
        mono: ['${genome.typography.mono}', 'monospace'],
      },
      borderRadius: {
        genome: '${genome.radius.md}',
        'genome-lg': '${genome.radius.lg}',
      },
    },
  },
  plugins: [],
}
`;
}

function genPostcssConfig(): string {
  return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
}

function genIndexHtml(project: Project): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name}</title>
    <meta name="description" content="${project.prompt.slice(0, 160)}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
}

function genGlobalsCss(genome: DesignGenome): string {
  const h = encodeURIComponent(genome.typography.heading);
  const b = encodeURIComponent(genome.typography.body);
  return `@import url('https://fonts.googleapis.com/css2?family=${h}:wght@400;500;600;700;800&family=${b}:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: ${genome.colors.primary};
  --color-secondary: ${genome.colors.secondary};
  --color-accent: ${genome.colors.accent};
  --color-bg: ${genome.colors.background};
  --color-surface: ${genome.colors.surface};
  --radius-sm: ${genome.radius.sm};
  --radius-md: ${genome.radius.md};
  --radius-lg: ${genome.radius.lg};
  --radius-xl: ${genome.radius.xl};
  --font-heading: '${genome.typography.heading}', sans-serif;
  --font-body: '${genome.typography.body}', sans-serif;
  --spacing-base: ${genome.spacing.base}px;
  --duration-base: ${genome.motion.duration.base};
  --easing: ${genome.motion.easing};
}

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-body);
  background-color: var(--color-bg);
  color: #ffffff;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  margin: 0;
}
`;
}

function genIconsSvg(genome: DesignGenome): string {
  const sw = genome.iconStyle.strokeWidth;
  const cap = genome.iconStyle.cornerRoundness > 50 ? "round" : "square";
  const join = genome.iconStyle.cornerRoundness > 50 ? "round" : "miter";

  return `export const ICONS = {
  star: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>\`,
  zap: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>\`,
  shield: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>\`,
  globe: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>\`,
  cpu: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 9V6h6v3M9 15v3h6v-3M6 9H3v6h3M15 9h3v6h-3"/><rect x="2" y="2" width="20" height="20" rx="2"/></svg>\`,
  layers: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>\`,
  box: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>\`,
  chart: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>\`,
};

const ICON_KEYS = Object.keys(ICONS);

export function getIcon(index = 0) {
  return ICONS[ICON_KEYS[index % ICON_KEYS.length]];
}
`;
}

function genMainJsx(genome: DesignGenome): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import '../styles/globals.css'
import Home from '../pages/index.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>
)
`;
}

function genNavbarJsx(): string {
  return `import React from 'react'

export default function GenomeNavbar({ genome, projectName }) {
  const { colors, typography, radius, spacing } = genome
  const pad = \`\${parseInt(spacing.md)} \${parseInt(spacing['2xl']) * 4}px\`

  return (
    <nav style={{
      backgroundColor: colors.background,
      borderBottom: \`1px solid \${colors.primary}25\`,
      padding: \`\${spacing.md} \${spacing['2xl']}\`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          backgroundColor: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 700,
          color: '#fff',
          fontFamily: typography.heading,
        }}>
          {projectName.charAt(0).toUpperCase()}
        </div>
        <span style={{
          fontFamily: typography.heading,
          fontWeight: 700,
          fontSize: 16,
          color: '#fff',
        }}>{projectName}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xl }}>
        {['Features', 'Pricing', 'About'].map(link => (
          <a key={link} href="#" style={{
            fontFamily: typography.body,
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
          >{link}</a>
        ))}
        <a href="#" style={{
          fontFamily: typography.body,
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          backgroundColor: colors.primary,
          padding: \`\${spacing.sm} \${spacing.xl}\`,
          borderRadius: radius.full,
          textDecoration: 'none',
          display: 'inline-block',
        }}>Get Started</a>
      </div>
    </nav>
  )
}
`;
}

function genHeroJsx(): string {
  return `import React from 'react'

export default function GenomeHero({ genome, section, projectName, projectPrompt }) {
  const { colors, typography, spacing, radius } = genome
  const textAlign = section.alignment === 'center' ? 'center' : section.alignment === 'right' ? 'right' : 'left'
  const words = projectName.split(' ')
  const mid = Math.ceil(words.length / 2)
  const first = words.slice(0, mid).join(' ')
  const second = words.slice(mid).join(' ')

  return (
    <section style={{
      backgroundColor: colors.background,
      padding: \`\${parseInt(spacing.xl) * 8}px \${parseInt(spacing['2xl']) * 4}px\`,
      textAlign,
      display: 'flex',
      flexDirection: section.orientation === 'horizontal' && section.imagePlacement !== 'none' ? 'row' : 'column',
      alignItems: 'center',
      gap: spacing['2xl'],
      justifyContent: section.alignment === 'center' ? 'center' : 'flex-start',
      minHeight: '70vh',
    }}>
      <div style={{ flex: 1, maxWidth: section.imagePlacement !== 'none' ? '50%' : '700px' }}>
        <div style={{
          display: 'inline-block',
          padding: \`\${spacing.xs} \${spacing.lg}\`,
          borderRadius: radius.full,
          border: \`1px solid \${colors.primary}50\`,
          color: colors.primary,
          fontFamily: typography.body,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: spacing.xl,
        }}>Built with Morse</div>
        <h1 style={{
          fontFamily: typography.heading,
          fontWeight: 800,
          fontSize: 'clamp(40px, 6vw, 72px)',
          lineHeight: 1.1,
          color: '#fff',
          margin: \`0 0 \${spacing.lg} 0\`,
        }}>
          {first}{second ? <span style={{ color: colors.primary }}> {second}</span> : ''}
        </h1>
        <p style={{
          fontFamily: typography.body,
          fontSize: 18,
          lineHeight: 1.7,
          color: 'rgba(255,255,255,0.65)',
          margin: \`0 0 \${parseInt(spacing['2xl']) * 2}px 0\`,
          maxWidth: 520,
        }}>{projectPrompt.slice(0, 160)}{projectPrompt.length > 160 ? '…' : ''}</p>
        <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap', justifyContent: textAlign === 'center' ? 'center' : 'flex-start' }}>
          <a href="#" style={{
            fontFamily: typography.body,
            fontWeight: 600,
            fontSize: 15,
            color: '#fff',
            backgroundColor: colors.primary,
            padding: \`14px \${parseInt(spacing['2xl']) * 2}px\`,
            borderRadius: radius.md,
            textDecoration: 'none',
            display: 'inline-block',
          }}>Get Started Free</a>
          <a href="#" style={{
            fontFamily: typography.body,
            fontWeight: 600,
            fontSize: 15,
            color: colors.primary,
            backgroundColor: 'transparent',
            padding: \`14px \${parseInt(spacing['2xl']) * 2}px\`,
            borderRadius: radius.md,
            textDecoration: 'none',
            border: \`1px solid \${colors.primary}40\`,
            display: 'inline-block',
          }}>Learn More →</a>
        </div>
      </div>
      {section.imagePlacement !== 'none' && (
        <div style={{
          flex: 1,
          aspectRatio: '16/9',
          borderRadius: radius.lg,
          background: \`linear-gradient(135deg, \${colors.primary}20, \${colors.accent}20)\`,
          border: \`1px solid \${colors.primary}25\`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: typography.body,
          fontSize: 14,
        }}>
          <span>Hero Image</span>
        </div>
      )}
    </section>
  )
}
`;
}

function genFeatureGridJsx(): string {
  return `import React from 'react'
import { getIcon } from './icons.jsx'

const FEATURES = [
  { title: 'Lightning Fast', desc: 'Built for speed and performance at every level of the stack.' },
  { title: 'Secure by Default', desc: 'Enterprise-grade security with zero configuration required.' },
  { title: 'Always Available', desc: '99.99% uptime SLA with global redundancy and failover.' },
  { title: 'Scales Instantly', desc: 'Auto-scaling infrastructure that grows with your needs.' },
  { title: 'Deep Analytics', desc: 'Real-time insights and dashboards for every metric.' },
  { title: 'API First', desc: 'Comprehensive REST and GraphQL APIs for every feature.' },
]

export default function GenomeFeatureGrid({ genome, section, projectName }) {
  const { colors, typography, spacing, radius } = genome
  const cols = section.columns || 3

  return (
    <section style={{
      backgroundColor: colors.surface,
      padding: \`\${parseInt(spacing.xl) * 6}px \${parseInt(spacing['2xl']) * 4}px\`,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: section.alignment || 'center', marginBottom: \`\${parseInt(spacing['2xl']) * 3}px\` }}>
          <h2 style={{
            fontFamily: typography.heading,
            fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 44px)',
            color: '#fff',
            margin: \`0 0 \${spacing.md} 0\`,
          }}>Everything You Need</h2>
          <p style={{
            fontFamily: typography.body,
            fontSize: 16,
            color: 'rgba(255,255,255,0.55)',
            margin: 0,
            maxWidth: 500,
            display: 'inline-block',
          }}>Powerful features designed to accelerate your workflow</p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: \`repeat(\${Math.min(cols, 3)}, 1fr)\`,
          gap: spacing.xl,
        }}>
          {FEATURES.slice(0, cols * 2).map((f, i) => (
            <div key={i} style={{
              backgroundColor: colors.background,
              borderRadius: radius.lg,
              padding: \`\${parseInt(spacing['2xl']) * 2}px\`,
              border: \`1px solid \${colors.primary}18\`,
              transition: 'border-color 0.2s',
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: radius.sm,
                backgroundColor: \`\${colors.primary}20\`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.primary,
                marginBottom: spacing.lg,
              }} dangerouslySetInnerHTML={{ __html: getIcon(i) }} />
              <h3 style={{
                fontFamily: typography.heading,
                fontWeight: 600,
                fontSize: 17,
                color: '#fff',
                margin: \`0 0 \${spacing.sm} 0\`,
              }}>{f.title}</h3>
              <p style={{
                fontFamily: typography.body,
                fontSize: 14,
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.55)',
                margin: 0,
              }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`;
}

function genCardListJsx(): string {
  return `import React from 'react'
import { getIcon } from './icons.jsx'

const CARDS = [
  { title: 'Starter', desc: 'Perfect for individuals and small teams getting started.', badge: 'Free' },
  { title: 'Professional', desc: 'Advanced features for growing teams and businesses.', badge: 'Popular' },
  { title: 'Enterprise', desc: 'Custom solutions for large organizations at scale.', badge: 'Custom' },
  { title: 'Developer', desc: 'Full API access with generous rate limits for builders.', badge: 'API' },
]

export default function GenomeCardList({ genome, section }) {
  const { colors, typography, spacing, radius } = genome
  const cols = section.columns || 2
  const count = section.cardCount || 3

  return (
    <section style={{
      backgroundColor: colors.background,
      padding: \`\${parseInt(spacing.xl) * 6}px \${parseInt(spacing['2xl']) * 4}px\`,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: typography.heading,
          fontWeight: 700,
          fontSize: 'clamp(28px, 4vw, 40px)',
          color: '#fff',
          textAlign: section.alignment || 'left',
          margin: \`0 0 \${parseInt(spacing['2xl']) * 2}px 0\`,
        }}>Explore Options</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: \`repeat(\${Math.min(cols, 3)}, 1fr)\`,
          gap: spacing.xl,
        }}>
          {CARDS.slice(0, count).map((card, i) => (
            <div key={i} style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: \`\${parseInt(spacing['2xl']) * 2}px\`,
              border: \`1px solid \${i === 1 ? colors.primary + '50' : colors.primary + '15'}\`,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {i === 1 && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: colors.primary,
                  color: '#fff',
                  fontFamily: typography.body,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: radius.full,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>{card.badge}</div>
              )}
              <div style={{
                color: colors.primary,
                marginBottom: spacing.lg,
              }} dangerouslySetInnerHTML={{ __html: getIcon(i + 2) }} />
              <h3 style={{
                fontFamily: typography.heading,
                fontWeight: 700,
                fontSize: 20,
                color: '#fff',
                margin: \`0 0 \${spacing.sm} 0\`,
              }}>{card.title}</h3>
              <p style={{
                fontFamily: typography.body,
                fontSize: 14,
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.55)',
                margin: \`0 0 \${spacing.xl} 0\`,
              }}>{card.desc}</p>
              <a href="#" style={{
                fontFamily: typography.body,
                fontSize: 13,
                fontWeight: 600,
                color: colors.primary,
                textDecoration: 'none',
              }}>Learn more →</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`;
}

function genStatsJsx(): string {
  return `import React from 'react'

const STATS = [
  { value: '10M+', label: 'Active Users' },
  { value: '99.99%', label: 'Uptime SLA' },
  { value: '< 50ms', label: 'Avg Response' },
  { value: '180+', label: 'Countries' },
]

export default function GenomeStats({ genome, section }) {
  const { colors, typography, spacing, radius } = genome
  const cols = section.columns || 4

  return (
    <section style={{
      backgroundColor: colors.surface,
      padding: \`\${parseInt(spacing.xl) * 5}px \${parseInt(spacing['2xl']) * 4}px\`,
      borderTop: \`1px solid \${colors.primary}18\`,
      borderBottom: \`1px solid \${colors.primary}18\`,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: \`repeat(\${Math.min(cols, 4)}, 1fr)\`,
        gap: spacing.xl,
        textAlign: 'center',
      }}>
        {STATS.slice(0, cols).map((stat, i) => (
          <div key={i}>
            <div style={{
              fontFamily: typography.heading,
              fontWeight: 800,
              fontSize: 'clamp(32px, 5vw, 52px)',
              color: colors.primary,
              lineHeight: 1,
              marginBottom: spacing.sm,
            }}>{stat.value}</div>
            <div style={{
              fontFamily: typography.body,
              fontSize: 14,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.02em',
            }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
`;
}

function genTestimonialJsx(): string {
  return `import React from 'react'

const TESTIMONIALS = [
  { quote: 'This product completely transformed how our team works. The speed and reliability are unmatched.', author: 'Sarah K.', role: 'CTO, TechCorp' },
  { quote: 'The best investment we have made this year. Setup took minutes and the results speak for themselves.', author: 'Marcus L.', role: 'Founder, StartupXYZ' },
  { quote: 'Finally a tool that does exactly what it promises. Highly recommend to any serious team.', author: 'Priya M.', role: 'Head of Engineering' },
  { quote: 'Exceptional quality and support. Our productivity has increased by over 40% since switching.', author: 'James R.', role: 'Director, InnovateCo' },
]

export default function GenomeTestimonial({ genome, section }) {
  const { colors, typography, spacing, radius } = genome
  const count = section.cardCount || 3

  return (
    <section style={{
      backgroundColor: colors.background,
      padding: \`\${parseInt(spacing.xl) * 6}px \${parseInt(spacing['2xl']) * 4}px\`,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: typography.heading,
          fontWeight: 700,
          fontSize: 'clamp(28px, 4vw, 40px)',
          color: '#fff',
          textAlign: 'center',
          margin: \`0 0 \${parseInt(spacing['2xl']) * 3}px 0\`,
        }}>What People Say</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: \`repeat(\${Math.min(count, 3)}, 1fr)\`,
          gap: spacing.xl,
        }}>
          {TESTIMONIALS.slice(0, count).map((t, i) => (
            <div key={i} style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: \`\${parseInt(spacing['2xl']) * 2}px\`,
              border: \`1px solid \${colors.primary}18\`,
            }}>
              <div style={{
                color: colors.primary,
                fontSize: 28,
                fontFamily: typography.heading,
                lineHeight: 1,
                marginBottom: spacing.md,
              }}>"</div>
              <p style={{
                fontFamily: typography.body,
                fontSize: 15,
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.75)',
                margin: \`0 0 \${spacing.xl} 0\`,
              }}>{t.quote}</p>
              <div>
                <div style={{
                  fontFamily: typography.heading,
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#fff',
                }}>{t.author}</div>
                <div style={{
                  fontFamily: typography.body,
                  fontSize: 12,
                  color: colors.primary,
                  marginTop: 2,
                }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`;
}

function genCTAJsx(): string {
  return `import React from 'react'

export default function GenomeCTA({ genome, section, projectName }) {
  const { colors, typography, spacing, radius } = genome
  const textAlign = section.alignment === 'center' ? 'center' : 'left'

  return (
    <section style={{
      background: \`linear-gradient(135deg, \${colors.primary}25 0%, \${colors.accent}20 100%)\`,
      borderTop: \`1px solid \${colors.primary}30\`,
      borderBottom: \`1px solid \${colors.primary}30\`,
      padding: \`\${parseInt(spacing.xl) * 7}px \${parseInt(spacing['2xl']) * 4}px\`,
      textAlign,
    }}>
      <div style={{ maxWidth: 680, margin: textAlign === 'center' ? '0 auto' : 0 }}>
        <h2 style={{
          fontFamily: typography.heading,
          fontWeight: 800,
          fontSize: 'clamp(32px, 5vw, 52px)',
          color: '#fff',
          margin: \`0 0 \${spacing.lg} 0\`,
          lineHeight: 1.15,
        }}>Ready to Get Started with {projectName}?</h2>
        <p style={{
          fontFamily: typography.body,
          fontSize: 17,
          lineHeight: 1.65,
          color: 'rgba(255,255,255,0.65)',
          margin: \`0 0 \${parseInt(spacing['2xl']) * 2}px 0\`,
        }}>Join thousands of teams already building with us. Free to start, scales with you.</p>
        <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap', justifyContent: textAlign === 'center' ? 'center' : 'flex-start' }}>
          <a href="#" style={{
            fontFamily: typography.body,
            fontWeight: 700,
            fontSize: 16,
            color: '#fff',
            backgroundColor: colors.primary,
            padding: \`16px \${parseInt(spacing['2xl']) * 2.5}px\`,
            borderRadius: radius.md,
            textDecoration: 'none',
            display: 'inline-block',
          }}>Start for Free</a>
          <a href="#" style={{
            fontFamily: typography.body,
            fontWeight: 600,
            fontSize: 16,
            color: '#fff',
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: \`16px \${parseInt(spacing['2xl']) * 2.5}px\`,
            borderRadius: radius.md,
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'inline-block',
          }}>Contact Sales</a>
        </div>
      </div>
    </section>
  )
}
`;
}

function genFooterJsx(): string {
  return `import React from 'react'

export default function GenomeFooter({ genome, projectName }) {
  const { colors, typography, spacing, radius } = genome

  return (
    <footer style={{
      backgroundColor: colors.surface,
      borderTop: \`1px solid \${colors.primary}18\`,
      padding: \`\${parseInt(spacing.xl) * 5}px \${parseInt(spacing['2xl']) * 4}px \${parseInt(spacing.xl) * 3}px\`,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: spacing.xl, marginBottom: \`\${parseInt(spacing['2xl']) * 3}px\` }}>
          <div>
            <div style={{
              fontFamily: typography.heading,
              fontWeight: 700,
              fontSize: 18,
              color: '#fff',
              marginBottom: spacing.md,
            }}>{projectName}</div>
            <p style={{
              fontFamily: typography.body,
              fontSize: 14,
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.45)',
              margin: 0,
              maxWidth: 220,
            }}>Built with Morse — deterministic design for generative AI.</p>
          </div>
          {[
            { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
          ].map(col => (
            <div key={col.title}>
              <div style={{
                fontFamily: typography.heading,
                fontWeight: 600,
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: spacing.lg,
              }}>{col.title}</div>
              {col.links.map(link => (
                <a key={link} href="#" style={{
                  display: 'block',
                  fontFamily: typography.body,
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.5)',
                  textDecoration: 'none',
                  marginBottom: spacing.sm,
                  transition: 'color 0.2s',
                }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
                >{link}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{
          borderTop: \`1px solid \${colors.primary}18\`,
          paddingTop: spacing.xl,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: typography.body, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()} {projectName}. All rights reserved.
          </span>
          <span style={{ fontFamily: typography.body, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
            Made with Morse
          </span>
        </div>
      </div>
    </footer>
  )
}
`;
}

function genIndexPageJsx(project: Project, genome: DesignGenome, layout: LayoutGraph): string {
  const genomeStr = JSON.stringify(genome, null, 2);
  const layoutStr = JSON.stringify(layout, null, 2);
  const nameStr = JSON.stringify(project.name);
  const promptStr = JSON.stringify(project.prompt);

  return `import React from 'react'
import GenomeNavbar from '../components/GenomeNavbar.jsx'
import GenomeHero from '../components/GenomeHero.jsx'
import GenomeFeatureGrid from '../components/GenomeFeatureGrid.jsx'
import GenomeCardList from '../components/GenomeCardList.jsx'
import GenomeStats from '../components/GenomeStats.jsx'
import GenomeTestimonial from '../components/GenomeTestimonial.jsx'
import GenomeCTA from '../components/GenomeCTA.jsx'
import GenomeFooter from '../components/GenomeFooter.jsx'

// ─── Design Genome ────────────────────────────────────────────────────────────
// Generated deterministically from seed: ${project.seed.slice(0, 16)}…
const genome = ${genomeStr}

// ─── Layout Graph ─────────────────────────────────────────────────────────────
const layout = ${layoutStr}

const projectName = ${nameStr}
const projectPrompt = ${promptStr}

// ─── Section → Component mapping ─────────────────────────────────────────────
const SECTION_COMPONENTS = {
  hero: GenomeHero,
  featureGrid: GenomeFeatureGrid,
  cardList: GenomeCardList,
  stats: GenomeStats,
  testimonial: GenomeTestimonial,
  cta: GenomeCTA,
  footer: GenomeFooter,
}

export default function Home() {
  return (
    <div style={{ backgroundColor: genome.colors.background, minHeight: '100vh' }}>
      <GenomeNavbar genome={genome} projectName={projectName} />
      {layout.sections.map((section, i) => {
        const Component = SECTION_COMPONENTS[section.type]
        if (!Component) return null
        return (
          <Component
            key={i}
            genome={genome}
            section={section}
            projectName={projectName}
            projectPrompt={projectPrompt}
          />
        )
      })}
    </div>
  )
}
`;
}

function genReadme(project: Project): string {
  return `# ${project.name}

> Exported from [Morse](https://morse.co.in) — deterministic design for generative AI.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) to view your site.

## Build for Production

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Project Structure

\`\`\`
├── pages/
│   └── index.jsx         # Main page with genome + layout constants
├── components/
│   ├── GenomeNavbar.jsx  # Navigation bar
│   ├── GenomeHero.jsx    # Hero section
│   ├── GenomeFeatureGrid.jsx
│   ├── GenomeCardList.jsx
│   ├── GenomeStats.jsx
│   ├── GenomeTestimonial.jsx
│   ├── GenomeCTA.jsx
│   ├── GenomeFooter.jsx
│   └── icons.jsx         # Genome-styled SVG icons
├── styles/
│   └── globals.css       # Tailwind + CSS variables from genome
├── src/
│   └── main.jsx          # React entry point
├── tailwind.config.js
├── vite.config.js
└── index.html
\`\`\`

## Design Genome

This project was generated with a deterministic design genome:
- **Seed**: \`${project.seed.slice(0, 32)}…\`
- **Primary color**: \`${project.seed}\`

Edit the \`genome\` constant in \`pages/index.jsx\` to experiment with different values,
or use Morse to regenerate a new variation.
`;
}

export function generateExportFiles(
  project: Project,
  genome: DesignGenome,
  layout: LayoutGraph
): Array<{ path: string; content: string }> {
  return [
    { path: "package.json", content: genPackageJson(project) },
    { path: "vite.config.js", content: genViteConfig() },
    { path: "tailwind.config.js", content: genTailwindConfig(genome) },
    { path: "postcss.config.cjs", content: genPostcssConfig() },
    { path: "index.html", content: genIndexHtml(project) },
    { path: "src/main.jsx", content: genMainJsx(genome) },
    { path: "styles/globals.css", content: genGlobalsCss(genome) },
    { path: "components/icons.jsx", content: genIconsSvg(genome) },
    { path: "components/GenomeNavbar.jsx", content: genNavbarJsx() },
    { path: "components/GenomeHero.jsx", content: genHeroJsx() },
    { path: "components/GenomeFeatureGrid.jsx", content: genFeatureGridJsx() },
    { path: "components/GenomeCardList.jsx", content: genCardListJsx() },
    { path: "components/GenomeStats.jsx", content: genStatsJsx() },
    { path: "components/GenomeTestimonial.jsx", content: genTestimonialJsx() },
    { path: "components/GenomeCTA.jsx", content: genCTAJsx() },
    { path: "components/GenomeFooter.jsx", content: genFooterJsx() },
    { path: "pages/index.jsx", content: genIndexPageJsx(project, genome, layout) },
    { path: "README.md", content: genReadme(project) },
  ];
}

export { safeName };
