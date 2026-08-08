import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TWITCH_TEXT = 'Twitch';

function TypedPrompt({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          let i = 0;
          const interval = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) clearInterval(interval);
          }, 40);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={ref} className="text-muted-foreground text-sm mb-10">
      <span className="text-foreground">$</span>{' '}
      {displayed}
      {displayed.length < text.length && displayed.length > 0 && (
        <span className="cursor-blink">|</span>
      )}
    </div>
  );
}

function TwitchLogo({ visible }: { visible: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        marginRight: '0.25em',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <svg
        height="0.85em"
        viewBox="0 0 24 24"
        fill="#9146FF"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'inline', verticalAlign: 'middle' }}
      >
        <path d="M2.149 0L.537 4.119v16.836h5.731V24l4.286-4.286h3.428L22.286 12V0H2.149zm18.137 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.429v9.429zM16.571 5.143h-1.714v4.571h1.714V5.143zm-4.571 0H10.286v4.571H12V5.143z" />
      </svg>
    </span>
  );
}

function TypedTwitch() {
  const [logoVisible, setLogoVisible] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const logoTimer = setTimeout(() => setLogoVisible(true), 400);
    let i = 0;
    const typeTimer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setTyped(TWITCH_TEXT.slice(0, i));
        if (i >= TWITCH_TEXT.length) clearInterval(interval);
      }, 150);
      return () => clearInterval(interval);
    }, 1400);
    return () => {
      clearTimeout(logoTimer);
      clearTimeout(typeTimer);
    };
  }, []);

  return (
    <>
      <TwitchLogo visible={logoVisible} />
      <span>{typed}</span>
      {typed.length < TWITCH_TEXT.length && (
        <span style={{ opacity: 0.5 }}>|</span>
      )}
    </>
  );
}

const features = [
  {
    icon: '>_',
    title: 'Fair Queue System',
    desc: 'Sequential or random draw — everyone gets a fair shot at joining the lobby.',
  },
  {
    icon: '!!',
    title: 'Ready-Up Timers',
    desc: '30 seconds to !qready or the slot passes on. No-shows are requeued automatically.',
  },
  {
    icon: '?',
    title: 'AFK Check',
    desc: 'Only active chatters get drawn. Been quiet for 10 minutes? You get skipped.',
  },
  {
    icon: '[]',
    title: 'Lobby Tracker',
    desc: 'Confirmed players build up a lobby list. Persists until !qreset — always know who\'s in.',
  },
  {
    icon: '⧉',
    title: 'OBS Overlay',
    desc: 'Transparent browser source with the queue, lobby, and live ready-up countdown on stream.',
  },
  {
    icon: '</>',
    title: 'Free & Open Source',
    desc: 'No downloads, no setup, no paywall. One-click add — and the code is on GitHub.',
  },
];

const viewerCommands = [
  { cmd: '!qjoin', desc: 'Enter the queue' },
  { cmd: '!qleave', desc: 'Leave the queue' },
  { cmd: '!qpos', desc: 'Check your position' },
  { cmd: '!qready', desc: 'Accept when drawn' },
  { cmd: '!qskip', desc: 'Pass your slot' },
  { cmd: '!qhelp', desc: 'Show all commands' },
];

const modCommands = [
  { cmd: '!qopen seq', desc: 'Open queue (sequential)' },
  { cmd: '!qopen ran', desc: 'Open queue (random)' },
  { cmd: '!qstop', desc: 'Close the queue' },
  { cmd: '!qdraw [1-5]', desc: 'Draw players' },
  { cmd: '!qlist', desc: 'View the queue' },
  { cmd: '!qremove <user>', desc: 'Remove a player from the queue' },
  { cmd: '!qban <user>', desc: 'Ban a player from joining' },
  { cmd: '!qunban <user>', desc: 'Unban a player' },
  { cmd: '!qbanlist', desc: 'View banned players' },
  { cmd: '!qnext', desc: 'Move lobby back to queue, clear lobby' },
  { cmd: '!qreset', desc: 'Wipe queue + lobby, start fresh' },
  { cmd: '!qpart', desc: 'Remove bot from your channel' },
];

const adminCommands = [
  { cmd: '!qallow <user>', desc: 'Approve a channel' },
  { cmd: '!qapproved', desc: 'View approved channels' },
];

const steps = [
  {
    n: '01',
    title: 'Open the queue',
    desc: 'Type !qopen seq for first-come first-served, or !qopen ran for random draw.',
  },
  {
    n: '02',
    title: 'Viewers join',
    desc: 'Viewers type !qjoin to enter. They can check their spot with !qpos anytime.',
  },
  {
    n: '03',
    title: 'Draw & play',
    desc: 'Type !qdraw to pick players. They !qready up to join the lobby. Use !qreset to wipe and start fresh.',
  },
  {
    n: '04',
    title: 'Show it on stream',
    desc: 'Add the transparent overlay as an OBS browser source, or share the live queue page with viewers.',
  },
];

const demoLines: { who: 'mod' | 'bot' | 'viewer'; name: string; text: string }[] = [
  { who: 'mod', name: 'streamer', text: '!qopen seq' },
  { who: 'bot', name: 'que0p', text: '>_ queue open [sequential] — type !qjoin to enter' },
  { who: 'viewer', name: 'zoe', text: '!qjoin' },
  { who: 'bot', name: 'que0p', text: '> @zoe joined [#1]' },
  { who: 'viewer', name: 'kai', text: '!qjoin' },
  { who: 'bot', name: 'que0p', text: '> @kai joined [#2]' },
  { who: 'mod', name: 'streamer', text: '!qdraw 2' },
  { who: 'bot', name: 'que0p', text: '>_ @zoe — type !qready within 30s or !qskip to pass' },
  { who: 'viewer', name: 'zoe', text: '!qready' },
  { who: 'bot', name: 'que0p', text: '> @zoe ready — slot confirmed' },
];

function TerminalDemo() {
  return (
    <div className="rounded border border-border overflow-hidden text-sm font-mono">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <span className="text-xs text-muted-foreground">twitch chat — #yourchannel</span>
        <span className="text-xs text-muted-foreground">● live</span>
      </div>
      <div className="p-4 flex flex-col gap-1.5 bg-background">
        {demoLines.map((l, i) => (
          <div key={i} className="leading-relaxed">
            <span className={l.who === 'bot' ? 'text-[#9146FF] font-bold' : 'text-foreground font-bold'}>
              {l.name}
            </span>
            <span className="text-muted-foreground">: </span>
            <span className={l.who === 'bot' ? 'text-green-400' : 'text-muted-foreground'}>{l.text}</span>
          </div>
        ))}
        <div className="text-muted-foreground">
          <span className="cursor-blink">_</span>
        </div>
      </div>
    </div>
  );
}

function OverlayPreview() {
  return (
    <div
      className="rounded border border-border p-6 flex justify-center"
      style={{ background: 'linear-gradient(135deg, #101018 0%, #1a1030 55%, #0d0d12 100%)' }}
      aria-label="Preview of the stream overlay"
    >
      <div className="w-56 flex flex-col gap-2 text-xs font-mono">
        <div className="flex items-center justify-between rounded border border-border bg-black/80 px-3 py-2">
          <span className="font-bold"><span className="text-muted-foreground">~/</span>que0p</span>
          <span className="border border-green-400 text-green-400 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider">open · seq</span>
        </div>
        <div className="rounded border border-green-400 bg-black/80 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-green-400 text-[0.6rem] font-bold uppercase tracking-wider">⚡ ready-up</span>
            <span className="text-green-400 font-black text-lg leading-none">17</span>
          </div>
          <div className="font-bold text-sm">@zoe</div>
          <div className="text-muted-foreground text-[0.65rem]">type !qready in chat</div>
        </div>
        <div className="rounded border border-border bg-black/80 overflow-hidden">
          <div className="flex justify-between px-3 py-1.5 border-b border-border text-muted-foreground text-[0.6rem] font-bold uppercase tracking-wider">
            <span>lobby</span><span>1</span>
          </div>
          <div className="px-3 py-1.5 font-bold"><span className="text-green-400 text-[0.55rem]">● </span>kai</div>
        </div>
        <div className="rounded border border-border bg-black/80 overflow-hidden">
          <div className="flex justify-between px-3 py-1.5 border-b border-border text-muted-foreground text-[0.6rem] font-bold uppercase tracking-wider">
            <span>queue — !qjoin</span><span>3</span>
          </div>
          {['mira', 'dex', 'sam'].map((n, i) => (
            <div key={n} className="px-3 py-1.5 font-bold border-b border-border last:border-b-0">
              <span className="text-green-400/70 text-[0.6rem] font-normal">{i + 1} </span>{n}
            </div>
          ))}
        </div>
        <div className="text-right text-muted-foreground text-[0.6rem]">que0p.stream</div>
      </div>
    </div>
  );
}

function CommandTable({
  commands,
  label,
}: {
  commands: { cmd: string; desc: string }[];
  label: string;
}) {
  return (
    <div className="flex-1">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
        // {label}
      </div>
      <div className="rounded border border-border overflow-hidden">
        {commands.map((c, i) => (
          <div
            key={c.cmd}
            className={cn(
              'flex items-center justify-between px-4 py-3 gap-4',
              i !== commands.length - 1 && 'border-b border-border',
            )}
          >
            <code className="text-foreground font-mono text-sm font-bold">{c.cmd}</code>
            <span className="text-muted-foreground text-sm text-right">{c.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useStats() {
  const [stats, setStats] = useState<{ queuesStarted: number; playersJoined: number; channelsAllTime: number; commandsUsed: number } | null>(null);
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);
  return stats;
}

export default function App() {
  const stats = useStats();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 sticky top-0 bg-background z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <a href="/" className="text-sm font-bold tracking-widest hover:text-muted-foreground transition-colors">
            <span className="text-muted-foreground">~/</span>que0p
          </a>
          <div className="flex items-center gap-4">
            <a href="/channels.html" className="text-sm text-muted-foreground hover:text-foreground transition-colors">channels</a>
            <a href="/faq.html" className="text-sm text-muted-foreground hover:text-foreground transition-colors">faq</a>
            <a href="/add-channel">
              <Button size="sm">add-channel</Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-24 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-muted-foreground text-sm mb-4">
            <span className="text-foreground">$</span> ./que0p --help
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            <TypedTwitch /> queue bot<br />
            <span className="text-muted-foreground">for any game.</span>
            <span className="cursor-blink text-muted-foreground"> _</span>
          </h1>
          <p className="text-muted-foreground mb-10 max-w-xl leading-relaxed">
            Play with your viewers without the chaos. Fair draws, automated ready-up timers,
            AFK checks, and a live overlay for OBS — all from Twitch chat.
          </p>
          <a href="/add-channel">
            <Button size="lg" className="text-sm tracking-wide">
              $ add-channel
            </Button>
          </a>
          <p className="mt-4 text-xs text-muted-foreground">
            free &amp; open — authorize and the bot joins instantly. type <span className="text-foreground">/mod que0p</span> in chat after.
          </p>
          {stats && (
            <div className="mt-6 grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground font-mono">
              <span><span className="text-foreground">{stats.channelsAllTime}</span> channels</span>
              <span><span className="text-foreground">{stats.queuesStarted}</span> queues run</span>
              <span><span className="text-foreground">{stats.playersJoined}</span> players joined</span>
              <span><span className="text-foreground">{stats.commandsUsed}</span> commands used</span>
            </div>
          )}
          <div className="mt-12">
            <TerminalDemo />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <TypedPrompt text="que0p --features" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {features.map((f) => (
              <div key={f.title} className="bg-background p-6">
                <div className="text-xl font-black mb-4 text-muted-foreground">{f.icon}</div>
                <h3 className="font-bold text-sm mb-2 uppercase tracking-wide">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-right">
            <a href="/faq.html" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              questions? → faq
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <TypedPrompt text="que0p --how-it-works" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="text-4xl font-black text-muted-foreground mb-4">{s.n}</div>
                <h3 className="font-bold mb-2 uppercase tracking-wide text-sm">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Overlay */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <TypedPrompt text="que0p --overlay" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-black mb-4 tracking-tight">Queue on stream.</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                A transparent browser-source overlay for OBS and Streamlabs. Your viewers see the
                queue, the lobby, and the live 30-second ready-up countdown right over your gameplay.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                It hides itself when the queue is closed and empty — add it to your scene once and
                forget it.
              </p>
              <div className="text-xs font-mono text-muted-foreground border border-border rounded px-4 py-3">
                <span className="text-foreground">browser source</span> — 340×620<br />
                que0p.stream/overlay.html?channel=<span className="text-foreground">you</span>
              </div>
            </div>
            <OverlayPreview />
          </div>
        </div>
      </section>

      {/* Commands */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <TypedPrompt text="que0p --list-commands" />
          <div className="flex flex-col md:flex-row gap-6">
            <CommandTable commands={viewerCommands} label="viewers" />
            <CommandTable commands={modCommands} label="mods" />
            <CommandTable commands={adminCommands} label="swisz channel only" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <TypedPrompt text="que0p --add-to-channel" />
          <h2 className="text-4xl font-black mb-4 tracking-tight">Ready to run it?</h2>
          <p className="text-muted-foreground mb-8 text-sm">
            Authorize Que0p and it joins your channel instantly. No setup, no downloads.
          </p>
          <a href="/add-channel">
            <Button size="lg" className="text-sm tracking-wide">
              $ add-channel
            </Button>
          </a>
          <p className="mt-4 text-xs text-muted-foreground">
            free &amp; open — authorize and the bot joins instantly. type <span className="text-foreground">/mod que0p</span> in chat after.
          </p>
        </div>
      </section>

      {/* Made by */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1">// made by</div>
            <a
              href="https://twitch.tv/swisz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold hover:text-muted-foreground transition-colors"
            >
              twitch.tv/swisz
            </a>
            <p className="text-xs text-muted-foreground mt-1">
              developer —{' '}
              <a
                href="https://www.linkedin.com/in/jonasbogvad/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4"
              >
                linkedin
              </a>
              {' '}· open source —{' '}
              <a
                href="https://github.com/JonasBogvad/que0p"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4"
              >
                github
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>que0p v1.0.0 — queue bot for Twitch</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/JonasBogvad/que0p"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              github
            </a>
            <a href="/add-channel" className="hover:text-foreground transition-colors">
              $ add-channel →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
