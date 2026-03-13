import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: '>_',
    title: 'Fair Queue System',
    desc: 'Sequential or random draw — everyone gets a fair shot at joining the lobby.',
  },
  {
    icon: '!!',
    title: 'Ready-Up System',
    desc: '30 seconds to !ready or lose your slot. No AFK players holding up the lobby.',
  },
  {
    icon: '?',
    title: 'Activity Check',
    desc: 'Only active chatters get drawn. Been quiet for 10 minutes? You get skipped.',
  },
  {
    icon: '#',
    title: 'Multi-Channel',
    desc: 'Works across multiple streams at once. Each channel has its own isolated queue.',
  },
];

const viewerCommands = [
  { cmd: '!join', desc: 'Enter the queue' },
  { cmd: '!leave', desc: 'Leave the queue' },
  { cmd: '!pos', desc: 'Check your position' },
  { cmd: '!ready', desc: 'Accept when drawn' },
  { cmd: '!skip', desc: 'Pass your slot' },
  { cmd: '!help', desc: 'Show all commands' },
];

const modCommands = [
  { cmd: '!open seq', desc: 'Open queue (sequential)' },
  { cmd: '!open ran', desc: 'Open queue (random)' },
  { cmd: '!stop', desc: 'Close the queue' },
  { cmd: '!draw [1-5]', desc: 'Draw players' },
  { cmd: '!queue', desc: 'View the queue' },
  { cmd: '!reset', desc: 'Reset everything' },
];

const steps = [
  {
    n: '01',
    title: 'Open the queue',
    desc: 'Type !open seq for first-come first-served, or !open ran for random draw.',
  },
  {
    n: '02',
    title: 'Viewers join',
    desc: 'Viewers type !join to enter. They can check their spot with !pos anytime.',
  },
  {
    n: '03',
    title: 'Draw & play',
    desc: 'Type !draw to pick a player. They get 30 seconds to !ready up or lose the slot.',
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
          <span className="text-sm font-bold tracking-widest uppercase">
            <span className="text-muted-foreground">~/</span>que0p
          </span>
          <a href="/add-channel">
            <Button size="sm">add-channel</Button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-24 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-muted-foreground text-sm mb-4">
            <span className="text-foreground">$</span> ./que0p --help
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            CS queue bot<br />
            <span className="text-muted-foreground">for Twitch.</span>
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
          <div className="text-muted-foreground text-sm mb-10">
            <span className="text-foreground">$</span> cat features.txt
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {features.map((f) => (
              <div key={f.title} className="bg-background p-6">
                <div className="text-xl font-black mb-4 text-muted-foreground">{f.icon}</div>
                <h3 className="font-bold text-sm mb-2 uppercase tracking-wide">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-muted-foreground text-sm mb-10">
            <span className="text-foreground">$</span> cat how-it-works.txt
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="text-4xl font-black text-border mb-4">{s.n}</div>
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
          <div className="text-muted-foreground text-sm mb-10">
            <span className="text-foreground">$</span> que0p --list-commands
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <CommandTable commands={viewerCommands} label="viewers" />
            <CommandTable commands={modCommands} label="mods" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <div className="text-muted-foreground text-sm mb-6">
            <span className="text-foreground">$</span> que0p --add-to-channel
          </div>
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
          <span>que0p v1.0.0 — CS queue bot for Twitch</span>
          <a href="/add-channel" className="hover:text-foreground transition-colors">
            $ add-channel →
          </a>
        </div>
      </footer>
    </div>
  );
}
