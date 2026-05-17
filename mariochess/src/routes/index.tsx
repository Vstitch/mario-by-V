import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import heroBg from "@/assets/hero-bg.jpg";
import marioImg from "@/assets/pieces/w-king.png";
import bowserImg from "@/assets/pieces/b-king.png";
import yoshiImg from "@/assets/pieces/w-knight.png";
import peachImg from "@/assets/pieces/w-queen.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Super Mario Chess — Chess enters the Mushroom Kingdom" },
      { name: "description", content: "Classic strategy meets chaotic Mario magic. Play chess with Mario, Bowser, Yoshi and friends against a Stockfish-style AI." },
      { property: "og:title", content: "Super Mario Chess" },
      { property: "og:description", content: "Chess enters the Mushroom Kingdom. Play now." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Hero background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/90" />

      {/* Floating decorative pieces */}
      <img src={peachImg} alt="" className="hidden md:block absolute top-20 left-[8%] w-28 animate-float" style={{ animationDelay: "0s" }} />
      <img src={yoshiImg} alt="" className="hidden md:block absolute top-40 right-[10%] w-32 animate-float" style={{ animationDelay: "1.2s" }} />
      <img src={bowserImg} alt="" className="hidden lg:block absolute bottom-32 right-[6%] w-40 animate-float" style={{ animationDelay: "0.6s" }} />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20 text-center">
        {/* Logo / badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-mario-red/90 border-2 border-coin-gold shadow-coin mb-8 animate-bob">
          <span className="w-2 h-2 rounded-full bg-coin-gold animate-pulse" />
          <span className="text-xs font-display tracking-widest uppercase text-primary-foreground">Mushroom Kingdom Open</span>
        </div>

        <img src={marioImg} alt="Mario King" className="w-32 md:w-48 mb-6 drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] animate-bob" />

        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-stroke text-coin-gold leading-tight mb-4">
          Super Mario
          <br />
          <span className="text-mario-red">Chess</span>
        </h1>

        <p className="text-lg md:text-2xl text-foreground/90 max-w-2xl mb-2 font-medium">
          Chess enters the Mushroom Kingdom.
        </p>
        <p className="text-sm md:text-base text-foreground/70 max-w-xl mb-10">
          Classic strategy meets chaotic Mario magic. Play with Mario, Peach, Yoshi & Luigi — defeat Bowser's army.
        </p>

        <div className="flex flex-col gap-6 items-center">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link
              to="/play"
              search={{ d: "koopa" }}
              className="group relative px-10 py-4 rounded-2xl bg-gradient-to-b from-mario-red to-[oklch(0.5_0.22_22)] border-2 border-coin-gold text-primary-foreground font-display text-xl tracking-wider uppercase shadow-glow-red hover:scale-105 transition-transform active:scale-95"
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />
              <span className="relative">▶ Play Vs AI</span>
            </Link>

            <Link
              to="/multiplayer"
              className="group relative px-10 py-4 rounded-2xl bg-gradient-to-b from-luigi-green to-emerald-600 border-2 border-coin-gold text-primary-foreground font-display text-xl tracking-wider uppercase shadow-glow-green hover:scale-105 transition-transform active:scale-95"
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />
              <span className="relative">👥 Play Online</span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <span className="text-xs font-display text-muted-foreground uppercase tracking-widest self-center mr-2">Or Choose AI:</span>
            <Link
              to="/play"
              search={{ d: "goomba" }}
              className="px-4 py-2 rounded-xl bg-card/85 backdrop-blur border border-muted hover:border-luigi-green text-xs text-foreground font-display tracking-wider uppercase hover:bg-luigi-green/20 transition-all"
            >
              🍄 Goomba (Easy)
            </Link>

            <Link
              to="/play"
              search={{ d: "koopa" }}
              className="px-4 py-2 rounded-xl bg-card/85 backdrop-blur border border-muted hover:border-coin-gold text-xs text-foreground font-display tracking-wider uppercase hover:bg-coin-gold/20 transition-all"
            >
              🐢 Koopa (Medium)
            </Link>

            <Link
              to="/play"
              search={{ d: "bowser" }}
              className="px-4 py-2 rounded-xl bg-card/85 backdrop-blur border border-muted hover:border-mario-red text-xs text-foreground font-display tracking-wider uppercase hover:bg-mario-red/20 transition-all"
            >
              🔥 Bowser (Hard)
            </Link>
          </div>
        </div>

        {/* Feature stripe */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full">
          {[
            { icon: "♛", label: "Full chess rules" },
            { icon: "🤖", label: "3 AI difficulties" },
            { icon: "🍄", label: "Mario characters" },
            { icon: "🎵", label: "Retro SFX" },
          ].map((f) => (
            <div key={f.label} className="mario-card p-4 text-center">
              <div className="text-3xl mb-1">{f.icon}</div>
              <div className="text-xs font-display tracking-wide text-foreground/80 uppercase">{f.label}</div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-foreground/50 font-display tracking-widest uppercase">
          Not affiliated with Nintendo · Fan tribute
        </p>
      </div>
    </main>
  );
}
