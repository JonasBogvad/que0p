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
    title: 'Ready-Up System',
    desc: '30 seconds to !qready or lose your slot. No AFK players holding up the lobby.',
  },
  {
    icon: '?',
    title: 'Activity Check',
    desc: 'Only active chatters get drawn. Been quiet for 10 minutes? You get skipped.',
  },
  {
    icon: '[]',
    title: 'Lobby Tracker',
    desc: 'Confirmed players build up a lobby list. Persists until !qreset — always know who\'s in.',
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
    title: 'Watch live',
    desc: 'Share /queue.html?channel=you so viewers can watch the queue update in real time.',
  },
];

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

export default function App() {
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
            Fair draws, ready-up timers, activity checks. Keep the lobby moving — all from Twitch chat.
          </p>
          <a href="/add-channel">
            <Button size="lg" className="text-sm tracking-wide">
              $ add-channel
            </Button>
          </a>
          <p className="mt-4 text-xs text-muted-foreground">
            whitelist only —{' '}
            <a
              href="https://twitch.tv/swisz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              twitch.tv/swisz
            </a>{' '}
            to get approved
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <TypedPrompt text="que0p --features" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
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
            whitelist only —{' '}
            <a
              href="https://twitch.tv/swisz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              twitch.tv/swisz
            </a>{' '}
            to get approved
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
              developer — come hang out
            </p>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <div>want the bot in your channel?</div>
            <a
              href="https://twitch.tv/swisz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              ask swisz on Twitch
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>que0p v1.0.0 — queue bot for Twitch</span>
          <a href="/add-channel" className="hover:text-foreground transition-colors">
            $ add-channel →
          </a>
        </div>
      </footer>
    </div>
  );
}
