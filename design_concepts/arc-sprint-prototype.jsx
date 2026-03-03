import { useState, useEffect, useRef } from "react";

// ============================================================
// DESIGN SYSTEM — Seasonal tokens
// ============================================================
const SEASONS = {
  winter: {
    name: "Winter",
    color: "#3a4f5c",
    accent: "#5d7a8a",
    soft: "#8fa3b0",
    bg: "linear-gradient(168deg, #eef1f4 0%, #e2e7ec 40%, #d4dbe2 100%)",
    cardBg: "rgba(255,255,255,0.55)",
    cardBgSolid: "#f4f6f8",
    text: "#2a3540",
    textSec: "#5e7080",
    textFaint: "#94a3af",
    glow: "rgba(58,79,92,0.08)",
  },
};
const S = SEASONS.winter;

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Pill({ label, selected, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        borderRadius: 22,
        border: selected ? `2px solid ${S.color}` : "2px solid rgba(0,0,0,0.07)",
        backgroundColor: selected ? `${S.color}0d` : "transparent",
        color: selected ? S.color : S.textSec,
        fontFamily: "'Outfit', sans-serif",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
      }}
    >
      {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      {label}
    </button>
  );
}

function SectionLabel({ children, delay = 0 }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: S.textFaint,
        fontWeight: 600,
        marginBottom: 10,
        animation: `fadeUp 0.5s ease both`,
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children, style = {}, delay = 0, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: S.cardBg,
        backdropFilter: "blur(12px)",
        borderRadius: 18,
        padding: 22,
        animation: `fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both`,
        animationDelay: `${delay}s`,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SerifTitle({ children, size = 26, delay = 0, style = {} }) {
  return (
    <div
      style={{
        fontFamily: "'Newsreader', Georgia, serif",
        fontSize: size,
        fontWeight: 300,
        color: S.text,
        lineHeight: 1.25,
        animation: `fadeUp 0.6s ease both`,
        animationDelay: `${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, secondary = false, delay = 0, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: secondary ? 14 : 16,
        borderRadius: 16,
        border: secondary ? `1.5px solid rgba(0,0,0,0.08)` : "none",
        backgroundColor: secondary ? "transparent" : disabled ? S.soft : S.color,
        color: secondary ? S.textSec : "#fff",
        fontFamily: "'Outfit', sans-serif",
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.2s ease",
        letterSpacing: "0.01em",
        animation: `fadeUp 0.5s ease both`,
        animationDelay: `${delay}s`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function ScreenHeader({ label }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: S.color,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 28,
        animation: "fadeUp 0.4s ease both",
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: S.color,
        }}
      />
      {label}
    </div>
  );
}

function ProgressBar({ current, total, delay = 0 }) {
  return (
    <div
      style={{
        height: 3,
        backgroundColor: "rgba(0,0,0,0.06)",
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 32,
        animation: `fadeUp 0.4s ease both`,
        animationDelay: `${delay}s`,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${(current / total) * 100}%`,
          backgroundColor: S.color,
          borderRadius: 2,
          transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}
      />
    </div>
  );
}

// ============================================================
// SCREEN 1 — Arc Setup
// ============================================================
function ArcSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [arcName, setArcName] = useState("");
  const [arcFocus, setArcFocus] = useState(null);
  const inputRef = useRef(null);

  const focuses = [
    { id: "strength", label: "Get stronger", icon: "◆" },
    { id: "consistency", label: "Stay consistent", icon: "↗" },
    { id: "endurance", label: "Build endurance", icon: "»" },
    { id: "recovery", label: "Recover & rebuild", icon: "~" },
    { id: "explore", label: "Try new things", icon: "○" },
    { id: "custom", label: "Something else", icon: "+" },
  ];

  useEffect(() => {
    if (step === 2 && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [step]);

  return (
    <div>
      <ScreenHeader label="New Arc" />
      <ProgressBar current={step} total={2} />

      {step === 1 && (
        <div key="step1">
          <SerifTitle delay={0.1}>
            What's this season about for you?
          </SerifTitle>
          <p
            style={{
              fontSize: 14,
              color: S.textSec,
              lineHeight: 1.6,
              margin: "12px 0 28px",
              animation: "fadeUp 0.5s ease both",
              animationDelay: "0.2s",
            }}
          >
            Your Arc is the big picture — a direction for the season, not a rigid plan.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 36,
              animation: "fadeUp 0.5s ease both",
              animationDelay: "0.3s",
            }}
          >
            {focuses.map((f) => (
              <Pill
                key={f.id}
                label={f.label}
                icon={f.icon}
                selected={arcFocus === f.id}
                onClick={() => setArcFocus(f.id)}
              />
            ))}
          </div>

          <Btn onClick={() => setStep(2)} disabled={!arcFocus} delay={0.4}>
            Continue
          </Btn>
        </div>
      )}

      {step === 2 && (
        <div key="step2">
          <SerifTitle delay={0.1}>Name your Arc.</SerifTitle>
          <p
            style={{
              fontSize: 14,
              color: S.textSec,
              lineHeight: 1.6,
              margin: "12px 0 28px",
              animation: "fadeUp 0.5s ease both",
              animationDelay: "0.2s",
            }}
          >
            Give it a name you'll remember. Something short that captures the energy.
          </p>

          <div
            style={{
              animation: "fadeUp 0.5s ease both",
              animationDelay: "0.25s",
              marginBottom: 16,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={arcName}
              onChange={(e) => setArcName(e.target.value)}
              placeholder="e.g. Iron Winter, The Comeback, Rebuild..."
              maxLength={30}
              style={{
                width: "100%",
                padding: "16px 0",
                border: "none",
                borderBottom: `2px solid ${arcName ? S.color : "rgba(0,0,0,0.1)"}`,
                backgroundColor: "transparent",
                fontFamily: "'Newsreader', Georgia, serif",
                fontSize: 24,
                fontWeight: 300,
                color: S.text,
                outline: "none",
                transition: "border-color 0.3s ease",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                textAlign: "right",
                fontSize: 11,
                color: S.textFaint,
                marginTop: 6,
              }}
            >
              {arcName.length}/30
            </div>
          </div>

          {/* Suggestions */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 36,
              animation: "fadeUp 0.5s ease both",
              animationDelay: "0.35s",
            }}
          >
            {["Iron Winter", "The Comeback", "Quiet Strength", "Base Camp"].map(
              (name) => (
                <button
                  key={name}
                  onClick={() => setArcName(name)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: "1.5px solid rgba(0,0,0,0.06)",
                    backgroundColor: arcName === name ? `${S.color}0a` : "transparent",
                    color: S.textSec,
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {name}
                </button>
              )
            )}
          </div>

          <Btn onClick={() => onComplete({ arcName, arcFocus })} disabled={!arcName.trim()} delay={0.4}>
            Start this Arc
          </Btn>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SCREEN 2 — Sprint Planning
// ============================================================
function SprintPlanning({ arcName, sprintNumber, onComplete, isAI = false }) {
  const [selectedPlays, setSelectedPlays] = useState([]);

  const suggestedPlays = isAI
    ? [
        { id: "lift3", label: "Lift 3 times", icon: "◆", ai: true, reason: "You hit this every sprint — keep the streak" },
        { id: "walk_rest", label: "Walk on rest days", icon: "↗", ai: true, reason: "Your best weeks include active recovery" },
        { id: "mobility", label: "10 min mobility daily", icon: "~", ai: true, reason: "You've been checking in 'stiff' a lot lately" },
        { id: "outside", label: "Get outside twice", icon: "○", ai: true, reason: "New suggestion — you haven't tried this yet" },
      ]
    : [
        { id: "lift3", label: "Lift 3 times", icon: "◆" },
        { id: "walk_rest", label: "Walk on rest days", icon: "↗" },
        { id: "try_new", label: "Try something new", icon: "○" },
        { id: "stretch", label: "Stretch after lifting", icon: "~" },
        { id: "outside", label: "Get outside twice", icon: "↗" },
        { id: "run1", label: "Run once", icon: "»" },
      ];

  const togglePlay = (id) => {
    setSelectedPlays((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  return (
    <div>
      <ScreenHeader label={`${arcName} · Sprint ${sprintNumber}`} />

      <SerifTitle delay={0.1}>
        {isAI ? "Plays for your next sprint." : "Pick your plays."}
      </SerifTitle>
      <p
        style={{
          fontSize: 14,
          color: S.textSec,
          lineHeight: 1.6,
          margin: "12px 0 8px",
          animation: "fadeUp 0.5s ease both",
          animationDelay: "0.2s",
        }}
      >
        {isAI
          ? "Based on your last sprint, here's what might work."
          : "3 to 5 things you want to focus on for the next 2 weeks. Keep them simple."}
      </p>

      {isAI && (
        <div
          style={{
            fontSize: 11,
            color: S.accent,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 16,
            animation: "fadeUp 0.5s ease both",
            animationDelay: "0.25s",
          }}
        >
          ✦ AI suggested
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {suggestedPlays.map((play, i) => {
          const selected = selectedPlays.includes(play.id);
          return (
            <div
              key={play.id}
              onClick={() => togglePlay(play.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 14,
                border: selected ? `2px solid ${S.color}` : "2px solid rgba(0,0,0,0.05)",
                backgroundColor: selected ? `${S.color}08` : S.cardBg,
                cursor: "pointer",
                transition: "all 0.2s ease",
                animation: "fadeUp 0.5s ease both",
                animationDelay: `${0.3 + i * 0.07}s`,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  border: selected ? `2px solid ${S.color}` : "2px solid rgba(0,0,0,0.12)",
                  backgroundColor: selected ? S.color : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#fff",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                {selected && "✓"}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: selected ? S.text : S.textSec,
                  }}
                >
                  <span style={{ marginRight: 6, fontSize: 13 }}>{play.icon}</span>
                  {play.label}
                </div>
                {play.reason && (
                  <div style={{ fontSize: 12, color: S.textFaint, marginTop: 3, fontStyle: "italic" }}>
                    {play.reason}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: S.textFaint, textAlign: "center", marginBottom: 20 }}>
        {selectedPlays.length} of 3–5 plays selected
      </div>

      <Btn onClick={() => onComplete(selectedPlays)} disabled={selectedPlays.length < 3} delay={0.1}>
        Start Sprint {sprintNumber}
      </Btn>
    </div>
  );
}

// ============================================================
// SCREEN 3 — Active Sprint (Home Screen)
// ============================================================
function ActiveSprint({ arcName, sprintNumber, plays, onDebrief }) {
  const [checkedIn, setCheckedIn] = useState(false);
  const [intention, setIntention] = useState(null);
  const [feeling, setFeeling] = useState(null);

  const allPlays = [
    { id: "lift3", label: "Lift 3 times", progress: "2 of 3", pct: 66 },
    { id: "walk_rest", label: "Walk on rest days", progress: "1 of 2", pct: 50 },
    { id: "try_new", label: "Try something new", progress: "Done", pct: 100 },
  ];

  const intentions = [
    { id: "push", label: "Push it" },
    { id: "light", label: "Something light" },
    { id: "outside", label: "Get outside" },
    { id: "rest", label: "Rest day" },
  ];

  const feelings = [
    { id: "fresh", label: "Fresh" },
    { id: "tired", label: "Tired" },
    { id: "sore", label: "Sore" },
    { id: "good", label: "Good" },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
          animation: "fadeUp 0.4s ease both",
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: S.color }} />
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: S.color, fontWeight: 600 }}>
          Winter Arc · Sprint {sprintNumber} · Day 9
        </span>
      </div>

      <SerifTitle size={24} delay={0.1}>
        Afternoon. 45° and gray.
      </SerifTitle>

      {/* Streak dots */}
      <div style={{ display: "flex", gap: 5, margin: "20px 0", justifyContent: "center", animation: "fadeUp 0.5s ease both", animationDelay: "0.2s" }}>
        {Array.from({ length: 14 }, (_, i) => {
          const active = [0, 1, 3, 5, 6, 8, 10, 12].includes(i);
          return (
            <div
              key={i}
              style={{
                width: active ? 10 : 6,
                height: active ? 10 : 6,
                borderRadius: "50%",
                backgroundColor: active ? S.color : "rgba(0,0,0,0.07)",
              }}
            />
          );
        })}
      </div>

      {/* Daily Check-in */}
      {!checkedIn ? (
        <Card delay={0.3} style={{ marginBottom: 16 }}>
          <SerifTitle size={20}>What's today?</SerifTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {intentions.map((i) => (
              <Pill key={i.id} label={i.label} selected={intention === i.id} onClick={() => setIntention(i.id)} />
            ))}
          </div>

          {intention && (
            <div style={{ marginTop: 20, animation: "fadeUp 0.3s ease" }}>
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, color: S.text, marginBottom: 12 }}>
                How are you feeling?
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {feelings.map((f) => (
                  <Pill key={f.id} label={f.label} selected={feeling === f.id} onClick={() => setFeeling(f.id)} />
                ))}
              </div>
            </div>
          )}

          {intention && feeling && (
            <div style={{ marginTop: 20, animation: "fadeUp 0.3s ease" }}>
              <Btn onClick={() => setCheckedIn(true)}>Lock it in</Btn>
            </div>
          )}
        </Card>
      ) : (
        <Card delay={0} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, color: S.text, fontWeight: 500 }}>
              {intentions.find((i) => i.id === intention)?.label} · Feeling {feelings.find((f) => f.id === feeling)?.label.toLowerCase()}
            </div>
            <div style={{ fontSize: 12, color: S.textFaint }}>✓</div>
          </div>
        </Card>
      )}

      {/* Sprint plays tracker */}
      <Card delay={0.4} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <SectionLabel>Your Plays</SectionLabel>
          <span style={{ fontSize: 11, color: S.textFaint }}>Day 9 of 14</span>
        </div>

        {allPlays.map((play, i) => (
          <div
            key={play.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderBottom: i < allPlays.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: S.text }}>{play.label}</div>
              <div style={{ fontSize: 12, color: play.pct === 100 ? S.color : S.textFaint, marginTop: 2 }}>
                {play.progress}
              </div>
            </div>
            <div style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${play.pct}%`,
                  backgroundColor: play.pct === 100 ? S.color : S.accent,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
      </Card>

      {/* Recap card */}
      <Card delay={0.5} onClick={onDebrief} style={{ marginBottom: 16, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <SectionLabel>The Recap</SectionLabel>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 17, color: S.text }}>
              Iron Winter · 8 sessions so far
            </div>
          </div>
          <div style={{ fontSize: 18, color: S.textFaint }}>→</div>
        </div>
      </Card>

      {/* Log Movement button */}
      <div style={{ paddingTop: 8, animation: "fadeUp 0.5s ease both", animationDelay: "0.6s" }}>
        <Btn>Log Movement</Btn>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN 4 — Sprint Debrief
// ============================================================
function SprintDebrief({ arcName, sprintNumber, onPlanNext }) {
  const [showNext, setShowNext] = useState(false);

  const plays = [
    { label: "Lift 3 times", result: "3 of 3", hit: true },
    { label: "Walk on rest days", result: "2 of 3", hit: false },
    { label: "Try something new", result: "Tried yoga", hit: true },
    { label: "Stretch after lifting", result: "1 of 3", hit: false },
  ];

  return (
    <div>
      <ScreenHeader label={`${arcName} · Sprint ${sprintNumber} Debrief`} />

      <SerifTitle size={30} delay={0.1}>
        Sprint {sprintNumber} is in the books.
      </SerifTitle>

      <div
        style={{
          margin: "24px 0",
          display: "flex",
          gap: 12,
          animation: "fadeUp 0.5s ease both",
          animationDelay: "0.2s",
        }}
      >
        <div style={{ flex: 1, background: S.cardBg, borderRadius: 14, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontFamily: "'Newsreader', Georgia, serif", color: S.text }}>6</div>
          <div style={{ fontSize: 11, color: S.textFaint }}>sessions</div>
        </div>
        <div style={{ flex: 1, background: S.cardBg, borderRadius: 14, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontFamily: "'Newsreader', Georgia, serif", color: S.text }}>2/4</div>
          <div style={{ fontSize: 11, color: S.textFaint }}>plays hit</div>
        </div>
        <div style={{ flex: 1, background: S.cardBg, borderRadius: 14, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontFamily: "'Newsreader', Georgia, serif", color: S.text }}>Strong</div>
          <div style={{ fontSize: 11, color: S.textFaint }}>top feeling</div>
        </div>
      </div>

      {/* Play results */}
      <Card delay={0.3} style={{ marginBottom: 20 }}>
        <SectionLabel>Play Results</SectionLabel>
        {plays.map((play, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: i < plays.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
            }}
          >
            <div style={{ fontSize: 14, color: S.text, fontWeight: 500 }}>{play.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: play.hit ? S.color : S.textFaint }}>{play.result}</span>
              <span style={{ fontSize: 14 }}>{play.hit ? "✓" : "·"}</span>
            </div>
          </div>
        ))}
      </Card>

      {/* AI Analysis */}
      <Card delay={0.4} style={{ marginBottom: 28, borderLeft: `3px solid ${S.color}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: S.color, fontWeight: 600, letterSpacing: "0.04em" }}>✦ DEBRIEF</span>
        </div>
        <div
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 15,
            lineHeight: 1.65,
            color: S.text,
          }}
        >
          You nailed lifting — 3 for 3, and all of them felt strong. That's your groove right now.
          Walking on rest days slipped, but you tried yoga for the first time which is a win.
          Stretching only happened once — maybe that play needs to be simpler, like "stretch for 5 minutes"
          instead of tying it to lifting days.
          <br /><br />
          You checked in feeling "sore" 5 out of 14 days — more than last sprint.
          Your body might be adapting to the heavier lifting. Worth watching.
        </div>
      </Card>

      {!showNext ? (
        <Btn onClick={() => setShowNext(true)} delay={0.5}>
          Plan Sprint {sprintNumber + 1}
        </Btn>
      ) : (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          <SprintPlanning
            arcName={arcName}
            sprintNumber={sprintNumber + 1}
            isAI={true}
            onComplete={() => onPlanNext()}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP — Flow controller
// ============================================================
export default function App() {
  const [screen, setScreen] = useState("arc_setup");
  const [arcData, setArcData] = useState({ name: "", focus: "" });

  const screens = {
    arc_setup: "Set Your Arc",
    sprint_plan: "Plan Sprint",
    active: "Home Screen",
    debrief: "Sprint Debrief",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@400;500;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        input::placeholder { color: ${S.textFaint}; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: S.bg,
          fontFamily: "'Outfit', sans-serif",
          color: S.text,
          maxWidth: 430,
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* Screen navigation tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            padding: "12px 20px",
            overflowX: "auto",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            position: "sticky",
            top: 0,
            background: "rgba(238,241,244,0.9)",
            backdropFilter: "blur(12px)",
            zIndex: 10,
          }}
        >
          {Object.entries(screens).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScreen(key)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "none",
                backgroundColor: screen === key ? S.color : "transparent",
                color: screen === key ? "#fff" : S.textFaint,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: "28px 22px 40px" }}>
          {screen === "arc_setup" && (
            <ArcSetup
              onComplete={(data) => {
                setArcData({ name: data.arcName, focus: data.arcFocus });
                setScreen("sprint_plan");
              }}
            />
          )}

          {screen === "sprint_plan" && (
            <SprintPlanning
              arcName={arcData.name || "Iron Winter"}
              sprintNumber={1}
              onComplete={() => setScreen("active")}
            />
          )}

          {screen === "active" && (
            <ActiveSprint
              arcName={arcData.name || "Iron Winter"}
              sprintNumber={3}
              plays={[]}
              onDebrief={() => setScreen("debrief")}
            />
          )}

          {screen === "debrief" && (
            <SprintDebrief
              arcName={arcData.name || "Iron Winter"}
              sprintNumber={3}
              onPlanNext={() => setScreen("active")}
            />
          )}
        </div>
      </div>
    </>
  );
}
