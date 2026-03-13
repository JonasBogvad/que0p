import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: '🎯',
    title: 'Fair Queue System',
    desc: 'Sequential or random draw — everyone gets a fair shot at joining the lobby.',
  },
  {
    icon: '💣',
    title: 'Ready-Up System',
    desc: '30 seconds to !ready or lose your slot. No AFK players holding up the lobby.',
  },
  {
    icon: '☠️',
    title: 'Activity Check',
    desc: 'Only active chatters get drawn. Been quiet for 10 minutes? You get skipped.',
  },
  {
    icon: '🔫',
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
    n: '1',
    title: 'Open the queue',
    desc: 'Type !open seq for first-come first-served, or !open ran for random draw.',
  },
  {
    n: '2',
    title: 'Viewers join',
    desc: 'Viewers type !join to enter. They can check their spot with !pos anytime.',
  },
  {
    n: '3',
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
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {label}
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        {commands.map((c, i) => (
          <div
            key={c.cmd}
            className={cn(
              'flex items-center justify-between px-4 py-3 gap-4',
              i !== commands.length - 1 && 'border-b border-border',
            )}
          >
            <code className="text-primary font-mono text-sm font-semibold">{c.cmd}</code>
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
      <nav className="border-b border-border px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-black tracking-tight">☠️ Que0p</span>
          <a href="/add-channel">
            <Button size="sm">Add to Channel</Button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-24 pb-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-primary text-sm font-medium mb-8">
            🎮 CS Queue Bot for Twitch
          </div>
          <h1 className="text-6xl sm:text-7xl font-black mb-6 tracking-tight leading-none">
            Fair queues.{' '}
            <span className="text-primary">Hype lobbies.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Queue management built for CS streamers. Draw players, run ready-ups, and keep the lobby
            moving — all from Twitch chat.
          </p>
          <a href="/add-channel">
            <Button size="lg" className="text-base px-10">
              🔫 Add Que0p to Your Channel
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-card/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Built for the grind</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-colors"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-black text-lg">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commands */}
      <section className="px-6 py-20 bg-card/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Commands</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <CommandTable commands={viewerCommands} label="Viewers" />
            <CommandTable commands={modCommands} label="Mods & Broadcasters" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-6">💣</div>
          <h2 className="text-4xl font-black mb-4">Ready to run it?</h2>
          <p className="text-muted-foreground mb-8">
            Authorize Que0p and it joins your channel instantly. No setup, no downloads.
          </p>
          <a href="/add-channel">
            <Button size="lg" className="text-base px-10">
              🔫 Add to Your Channel
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>☠️ Que0p — CS Queue Bot</span>
          <a href="/add-channel" className="hover:text-foreground transition-colors">
            Add to your channel →
          </a>
        </div>
      </footer>
    </div>
  );
}
