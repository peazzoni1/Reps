import { useState, useEffect, useRef } from "react";

const SEASONS = {
  spring: {
    name: "Spring",
    theme: "Growth",
    color: "#4a7c59",
    accent: "#8fbc8f",
    bg: "linear-gradient(165deg, #f0f7f0 0%, #e8f5e0 30%, #d4edda 100%)",
    cardBg: "rgba(255,255,255,0.7)",
    text: "#2d4a35",
    textSecondary: "#5a7d62",
    prompt: "What new movement wants to find you today?",
    philosophy: "A season for trying, exploring, beginning again.",
  },
  summer: {
    name: "Summer",
    theme: "Peak",
    color: "#c4652e",
    accent: "#e8a87c",
    bg: "linear-gradient(165deg, #fef9f0 0%, #fdf0e0 30%, #fce4c8 100%)",
    cardBg: "rgba(255,255,255,0.65)",
    text: "#4a2f1a",
    textSecondary: "#8a6240",
    prompt: "Your body is ready. What calls to you?",
    philosophy: "A season of strength, consistency, and fire.",
  },
  autumn: {
    name: "Autumn",
    theme: "Harvest",
    color: "#8b5e3c",
    accent: "#c4956a",
    bg: "linear-gradient(165deg, #faf6f0 0%, #f0e8dc 30%, #e8dcc8 100%)",
    cardBg: "rgba(255,255,255,0.6)",
    text: "#3d2e1e",
    textSecondary: "#7a6248",
    prompt: "What did your body teach you this week?",
    philosophy: "A season to reflect, gather, and appreciate the work.",
  },
  winter: {
    name: "Winter",
    theme: "Rest",
    color: "#5a6d7a",
    accent: "#8fa3b0",
    bg: "linear-gradient(165deg, #f2f4f6 0%, #e4e8ec 30%, #d6dce2 100%)",
    cardBg: "rgba(255,255,255,0.55)",
    text: "#2a3540",
    textSecondary: "#5e7080",
    prompt: "Gentle movement is still movement.",
    philosophy: "A season for rest, recovery, and quiet strength.",
  },
};

const MOVEMENT_TYPES = [
  { id: "lifted", label: "Lifted", icon: "◆" },
  { id: "walked", label: "Walked", icon: "↗" },
  { id: "ran", label: "Ran", icon: "»" },
  { id: "stretched", label: "Stretched", icon: "~" },
  { id: "played", label: "Played", icon: "○" },
  { id: "moved", label: "Moved", icon: "∿" },
];

const FEELINGS = [
  { id: "strong", label: "Strong" },
  { id: "alive", label: "Alive" },
  { id: "peaceful", label: "Peaceful" },
  { id: "heavy", label: "Heavy" },
  { id: "grinding", label: "Grinding" },
  { id: "easy", label: "Easy" },
  { id: "rough", label: "Rough" },
];

const RECENT_SESSIONS = [
  { id: 1, type: "lifted", feeling: "strong", label: "Chest & Back", daysAgo: 0, note: null },
  { id: 2, type: "walked", feeling: "peaceful", label: "Evening walk", daysAgo: 1, note: null },
  { id: 3, type: "lifted", feeling: "grinding", label: "Leg Day", daysAgo: 2, note: "Felt heavy but pushed through" },
  { id: 4, type: "stretched", feeling: "peaceful", label: "Morning stretch", daysAgo: 3, note: null },
  { id: 5, type: "ran", feeling: "alive", label: "Trail run", daysAgo: 5, note: null },
];

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

function getDayLabel(daysAgo) {
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return `${daysAgo} days ago`;
}

function getMovementIcon(typeId) {
  return MOVEMENT_TYPES.find((m) => m.id === typeId)?.icon || "·";
}

// Seasonal particle background
function SeasonalBackground({ season }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];

    function resize() {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    }
    resize();

    const particleConfigs = {
      spring: { count: 20, color: "rgba(74, 124, 89, 0.12)", size: [2, 5], speed: 0.3, drift: true },
      summer: { count: 15, color: "rgba(196, 101, 46, 0.08)", size: [3, 7], speed: 0.15, drift: false },
      autumn: { count: 18, color: "rgba(139, 94, 60, 0.1)", size: [2, 6], speed: 0.5, drift: true },
      winter: { count: 12, color: "rgba(90, 109, 122, 0.08)", size: [1, 4], speed: 0.2, drift: false },
    };

    const config = particleConfigs[season];
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    particles = Array.from({ length: config.count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: config.size[0] + Math.random() * (config.size[1] - config.size[0]),
      speedY: config.speed * (0.5 + Math.random()),
      speedX: config.drift ? (Math.random() - 0.5) * 0.3 : 0,
      opacity: 0.3 + Math.random() * 0.7,
    }));

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = config.color;
        ctx.beginPath();
        if (season === "autumn") {
          // leaf-like shapes
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, Math.PI / 4, 0, Math.PI * 2);
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }
        ctx.fill();

        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.y * 0.01) * 0.2;

        if (p.y > h + 10) {
          p.y = -10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [season]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

// Streak visualization — a row of dots representing the last 14 days
function StreakRow({ sessions, seasonColor }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const daysAgo = 13 - i;
    const session = sessions.find((s) => s.daysAgo === daysAgo);
    return { daysAgo, session };
  });

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
      {days.map((d, i) => (
        <div
          key={i}
          style={{
            width: d.session ? 10 : 6,
            height: d.session ? 10 : 6,
            borderRadius: "50%",
            backgroundColor: d.session ? seasonColor : "rgba(0,0,0,0.08)",
            transition: "all 0.3s ease",
            opacity: d.daysAgo === 0 && !d.session ? 0.4 : 1,
          }}
          title={d.session ? `${d.session.label} — ${d.session.feeling}` : ""}
        />
      ))}
    </div>
  );
}

// Contextual insight component
function ContextualInsight({ season }) {
  const insights = {
    spring: {
      weather: "54°F and clear",
      observation: "You've moved 3 of the last 5 days. Your walks always feel peaceful — good day for one.",
    },
    summer: {
      weather: "82°F and sunny",
      observation: "This is your strongest month historically. You haven't missed a week since June.",
    },
    autumn: {
      weather: "48°F, partly cloudy",
      observation: "Your last 4 sessions felt 'strong' or 'alive.' Something is clicking.",
    },
    winter: {
      weather: "32°F, overcast",
      observation: "You've been consistent with gentle movement this week. That's exactly right for this season.",
    },
  };

  const insight = insights[season];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        animation: "fadeUp 0.8s ease both",
        animationDelay: "0.6s",
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: "0.05em", opacity: 0.5 }}>{insight.weather}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.75, fontStyle: "italic" }}>
        {insight.observation}
      </div>
    </div>
  );
}

// Quick log sheet
function QuickLog({ season, onClose, onSave }) {
  const s = SEASONS[season];
  const [selectedType, setSelectedType] = useState(null);
  const [selectedFeeling, setSelectedFeeling] = useState(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }}
      />
      <div
        style={{
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 40px",
          animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(0,0,0,0.12)",
            margin: "0 auto 24px",
          }}
        />

        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, color: s.text, marginBottom: 24 }}>
          What did you do?
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
          {MOVEMENT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              style={{
                padding: "10px 18px",
                borderRadius: 20,
                border: selectedType === type.id ? `2px solid ${s.color}` : "2px solid rgba(0,0,0,0.08)",
                backgroundColor: selectedType === type.id ? `${s.color}10` : "transparent",
                color: selectedType === type.id ? s.color : s.textSecondary,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ marginRight: 6 }}>{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>

        {selectedType && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div
              style={{
                fontFamily: "'Newsreader', Georgia, serif",
                fontSize: 22,
                color: s.text,
                marginBottom: 16,
              }}
            >
              How did it feel?
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
              {FEELINGS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFeeling(f.id)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 20,
                    border:
                      selectedFeeling === f.id ? `2px solid ${s.color}` : "2px solid rgba(0,0,0,0.08)",
                    backgroundColor: selectedFeeling === f.id ? `${s.color}10` : "transparent",
                    color: selectedFeeling === f.id ? s.color : s.textSecondary,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {!showNote ? (
              <button
                onClick={() => setShowNote(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: s.textSecondary,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  cursor: "pointer",
                  opacity: 0.5,
                  padding: 0,
                  marginBottom: 24,
                }}
              >
                + Add a note
              </button>
            ) : (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything you want to remember..."
                autoFocus
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  resize: "none",
                  height: 80,
                  marginBottom: 24,
                  outline: "none",
                  color: s.text,
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        )}

        {selectedType && selectedFeeling && (
          <button
            onClick={() => {
              onSave({ type: selectedType, feeling: selectedFeeling, note });
              onClose();
            }}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 16,
              border: "none",
              backgroundColor: s.color,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              animation: "fadeUp 0.3s ease",
              letterSpacing: "0.01em",
            }}
          >
            Log it
          </button>
        )}
      </div>
    </div>
  );
}

// Session card in recent history
function SessionCard({ session, season }) {
  const s = SEASONS[season];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        borderBottom: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${s.color}12`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          color: s.color,
          flexShrink: 0,
        }}
      >
        {getMovementIcon(session.type)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: s.text }}>{session.label}</div>
        <div style={{ fontSize: 12, color: s.textSecondary, marginTop: 2 }}>
          {session.feeling} · {getDayLabel(session.daysAgo)}
        </div>
      </div>
    </div>
  );
}

// Story view - seasonal retrospective
function StoryView({ season, onClose }) {
  const s = SEASONS[season];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: s.bg,
        animation: "fadeIn 0.3s ease",
        overflowY: "auto",
        padding: "60px 24px 40px",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          background: "rgba(0,0,0,0.05)",
          border: "none",
          borderRadius: 20,
          width: 36,
          height: 36,
          fontSize: 18,
          cursor: "pointer",
          color: s.text,
          zIndex: 101,
        }}
      >
        ×
      </button>

      <div style={{ animation: "fadeUp 0.6s ease both" }}>
        <div
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 14,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: s.color,
            marginBottom: 12,
          }}
        >
          Your {s.name}
        </div>
        <div
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 32,
            color: s.text,
            lineHeight: 1.2,
            marginBottom: 32,
          }}
        >
          A Season of {s.theme}
        </div>
      </div>

      <div style={{ animation: "fadeUp 0.6s ease both", animationDelay: "0.2s" }}>
        <div
          style={{
            fontSize: 48,
            fontFamily: "'Newsreader', Georgia, serif",
            color: s.color,
            marginBottom: 4,
          }}
        >
          23
        </div>
        <div style={{ fontSize: 14, color: s.textSecondary, marginBottom: 32 }}>
          sessions this season
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 32,
          animation: "fadeUp 0.6s ease both",
          animationDelay: "0.3s",
        }}
      >
        {[
          { label: "Most common", value: "Lifted", sub: "14 sessions" },
          { label: "Longest streak", value: "8 days", sub: "Jan 12-19" },
          { label: "Most felt", value: "Strong", sub: "9 times" },
          { label: "Favorite day", value: "Tuesday", sub: "You never miss it" },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              background: s.cardBg,
              borderRadius: 14,
              padding: 16,
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontSize: 11, color: s.textSecondary, marginBottom: 6, letterSpacing: "0.03em" }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 20, fontFamily: "'Newsreader', Georgia, serif", color: s.text }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: s.textSecondary, marginTop: 4 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: s.cardBg,
          borderRadius: 16,
          padding: 20,
          backdropFilter: "blur(10px)",
          animation: "fadeUp 0.6s ease both",
          animationDelay: "0.5s",
        }}
      >
        <div style={{ fontSize: 11, color: s.textSecondary, marginBottom: 10, letterSpacing: "0.03em" }}>
          Pattern
        </div>
        <div
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 16,
            lineHeight: 1.6,
            color: s.text,
            fontStyle: "italic",
          }}
        >
          Your walks always feel peaceful. Your lifting sessions in the morning feel stronger than
          evening ones. You tend to take rest days after sessions that feel "grinding." Your body knows
          what it needs.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentSeason] = useState(getCurrentSeason());
  const [showLog, setShowLog] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [sessions, setSessions] = useState(RECENT_SESSIONS);
  const s = SEASONS[currentSeason];

  const handleSave = (entry) => {
    const type = MOVEMENT_TYPES.find((m) => m.id === entry.type);
    setSessions((prev) => [
      { id: Date.now(), type: entry.type, feeling: entry.feeling, label: type?.label || "Session", daysAgo: 0, note: entry.note },
      ...prev,
    ]);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@400;500;600&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }

        .log-btn:active { transform: scale(0.96); }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: s.bg,
          fontFamily: "'DM Sans', sans-serif",
          color: s.text,
          position: "relative",
          overflow: "hidden",
          maxWidth: 430,
          margin: "0 auto",
        }}
      >
        <SeasonalBackground season={currentSeason} />

        <div style={{ position: "relative", zIndex: 1, padding: "56px 24px 120px" }}>
          {/* Season indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 32,
              animation: "fadeUp 0.6s ease both",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: s.color,
                animation: "breathe 3s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: 12,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: s.color,
                fontWeight: 500,
              }}
            >
              {s.name} · {s.theme}
            </span>
          </div>

          {/* Main prompt */}
          <div
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: 28,
              lineHeight: 1.3,
              fontWeight: 300,
              color: s.text,
              marginBottom: 12,
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.15s",
              maxWidth: 300,
            }}
          >
            {s.prompt}
          </div>

          {/* Philosophy line */}
          <div
            style={{
              fontSize: 13,
              color: s.textSecondary,
              marginBottom: 32,
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.3s",
              fontStyle: "italic",
            }}
          >
            {s.philosophy}
          </div>

          {/* Streak */}
          <div
            style={{
              marginBottom: 32,
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.45s",
            }}
          >
            <StreakRow sessions={sessions} seasonColor={s.color} />
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: s.textSecondary,
                marginTop: 8,
                opacity: 0.5,
              }}
            >
              last 14 days
            </div>
          </div>

          {/* Contextual insight */}
          <div
            style={{
              background: s.cardBg,
              borderRadius: 16,
              padding: 18,
              marginBottom: 32,
              backdropFilter: "blur(10px)",
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.55s",
            }}
          >
            <ContextualInsight season={currentSeason} />
          </div>

          {/* Your story button */}
          <button
            onClick={() => setShowStory(true)}
            style={{
              width: "100%",
              background: s.cardBg,
              borderRadius: 16,
              padding: 18,
              marginBottom: 28,
              backdropFilter: "blur(10px)",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.65s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: s.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  Your Story
                </div>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 17, color: s.text }}>
                  23 sessions this {s.name.toLowerCase()}
                </div>
              </div>
              <div style={{ fontSize: 20, color: s.textSecondary, opacity: 0.4 }}>→</div>
            </div>
          </button>

          {/* Recent sessions */}
          <div style={{ animation: "fadeUp 0.6s ease both", animationDelay: "0.75s" }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: s.textSecondary,
                marginBottom: 12,
              }}
            >
              Recent
            </div>
            {sessions.slice(0, 5).map((session) => (
              <SessionCard key={session.id} session={session} season={currentSeason} />
            ))}
          </div>
        </div>

        {/* Log button */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 430,
            padding: "16px 24px 36px",
            background: `linear-gradient(transparent, ${currentSeason === "winter" ? "#e4e8ec" : currentSeason === "autumn" ? "#e8dcc8" : currentSeason === "summer" ? "#fce4c8" : "#d4edda"})`,
            zIndex: 50,
          }}
        >
          <button
            className="log-btn"
            onClick={() => setShowLog(true)}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 16,
              border: "none",
              backgroundColor: s.color,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              transition: "transform 0.15s ease",
              letterSpacing: "0.01em",
              boxShadow: `0 4px 20px ${s.color}30`,
            }}
          >
            Log Movement
          </button>
        </div>
      </div>

      {showLog && <QuickLog season={currentSeason} onClose={() => setShowLog(false)} onSave={handleSave} />}
      {showStory && <StoryView season={currentSeason} onClose={() => setShowStory(false)} />}
    </>
  );
}
