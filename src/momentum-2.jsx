import { useState, useEffect } from "react";

const STORAGE_KEY = "momentum-data";

const DEFAULT_BOREDOM_LIST = [
  "Put on a podcast and walk around the block",
  "Make something to eat",
  "Text a friend something random",
  "Watch one YouTube video (set a timer)",
  "Cold water on your face",
  "Play a game for 15 minutes",
];

const MORNING_LEVELS = [
  { label: "Completely destroyed", action: "Sit up. Feet on floor. 10 seconds.", emoji: "💀" },
  { label: "Pretty bad", action: "Walk to kitchen. Drink water.", emoji: "😞" },
  { label: "Rough but functional", action: "5 minutes near a window or outside.", emoji: "😶" },
  { label: "Decent", action: "10 min walk or any movement.", emoji: "🙂" },
];

function getTodayKey() {
  const now = new Date();
  // Day doesn't roll over until 3am
  if (now.getHours() < 3) {
    now.setDate(now.getDate() - 1);
  }
  // Use local date, not UTC
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { days: {}, boredomList: DEFAULT_BOREDOM_LIST };
}

export default function App() {
  const [data, setData] = useState(getInitialData);
  const [view, setView] = useState("today"); // today | history | boredom | protocol
  const [todayLevel, setTodayLevel] = useState(null);
  const [editingBoredom, setEditingBoredom] = useState(false);
  const [newBoredomItem, setNewBoredomItem] = useState("");
  const [showProtocol, setShowProtocol] = useState(false);

  const today = getTodayKey();
  const todayData = data.days[today] || { anchor: false, business: false, avoided: false, note: "" };

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  function updateToday(patch) {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [today]: { ...todayData, ...patch }
      }
    }));
  }

  function score(d) {
    return (d.anchor ? 1 : 0) + (d.business ? 1 : 0) + (d.avoided ? 1 : 0);
  }

  function scoreColor(s) {
    if (s === 3) return "#a8e6b0";
    if (s === 2) return "#f0d080";
    if (s === 1) return "#f0a060";
    return "#888";
  }

  function scoreLabel(s) {
    if (s === 3) return "Great day";
    if (s === 2) return "Good day";
    if (s === 1) return "You showed up";
    return "Data, not failure";
  }

  const todayScore = score(todayData);

  // Check consecutive zeros
  const dayKeys = Object.keys(data.days).sort().slice(-7);
  const recentZeros = (() => {
    let count = 0;
    for (let i = dayKeys.length - 1; i >= 0; i--) {
      if (score(data.days[dayKeys[i]]) === 0) count++;
      else break;
    }
    return count;
  })();

  function addBoredomItem() {
    if (!newBoredomItem.trim()) return;
    setData(prev => ({ ...prev, boredomList: [...prev.boredomList, newBoredomItem.trim()] }));
    setNewBoredomItem("");
  }

  function removeBoredomItem(i) {
    setData(prev => ({ ...prev, boredomList: prev.boredomList.filter((_, idx) => idx !== i) }));
  }

  const history = Object.keys(data.days).sort().reverse().slice(0, 30);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e0e10",
      color: "#e8e4dc",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      maxWidth: 480,
      margin: "0 auto",
      padding: "0 0 80px 0",
    }}>
      {/* Header */}
      <div style={{ padding: "32px 24px 16px", borderBottom: "1px solid #222" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#555", textTransform: "uppercase", marginBottom: 6 }}>
          momentum
        </div>
        <div style={{ fontSize: 28, fontWeight: "normal", letterSpacing: -1, color: "#e8e4dc" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        {recentZeros >= 2 && (
          <div style={{
            marginTop: 12, padding: "8px 12px", background: "#2a1a1a", border: "1px solid #5a2a2a",
            borderRadius: 6, fontSize: 13, color: "#e08080"
          }}>
            ⚠ Two zeros in a row. Time for the Ruined Day Protocol.
            <span onClick={() => setView("protocol")} style={{ marginLeft: 8, textDecoration: "underline", cursor: "pointer" }}>
              Open it →
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", background: "#0e0e10" }}>
        {[["today", "Today"], ["history", "History"], ["boredom", "Boredom List"], ["protocol", "Protocol"]].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{
            flex: 1, padding: "12px 4px", background: "none", border: "none",
            borderBottom: view === key ? "2px solid #c8a96e" : "2px solid transparent",
            color: view === key ? "#c8a96e" : "#555", fontSize: 11, letterSpacing: 1,
            textTransform: "uppercase", cursor: "pointer", transition: "color 0.2s"
          }}>{label}</button>
        ))}
      </div>

      {/* TODAY VIEW */}
      {view === "today" && (
        <div style={{ padding: "24px 24px" }}>

          {/* Score */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 28, padding: "16px 20px",
            background: "#141414", borderRadius: 10, border: "1px solid #1e1e1e"
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Today's Score</div>
              <div style={{ fontSize: 13, color: scoreColor(todayScore) }}>{scoreLabel(todayScore)}</div>
            </div>
            <div style={{
              fontSize: 48, fontWeight: "bold", color: scoreColor(todayScore),
              fontFamily: "monospace", lineHeight: 1
            }}>
              {todayScore}<span style={{ fontSize: 20, color: "#333" }}>/3</span>
            </div>
          </div>

          {/* Morning Anchor */}
          <Section title="Morning Anchor" subtitle="Body moves before phone unlocks">
            {!todayData.anchor ? (
              <div>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>How do you feel right now?</div>
                {MORNING_LEVELS.map((level, i) => (
                  <button key={i} onClick={() => setTodayLevel(i)} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    marginBottom: 6, background: todayLevel === i ? "#1e1a10" : "#141414",
                    border: todayLevel === i ? "1px solid #c8a96e" : "1px solid #1e1e1e",
                    borderRadius: 7, color: "#e8e4dc", cursor: "pointer", fontSize: 13
                  }}>
                    <span style={{ marginRight: 8 }}>{level.emoji}</span>
                    <span style={{ color: "#888" }}>{level.label}</span>
                  </button>
                ))}
                {todayLevel !== null && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{
                      padding: "12px 16px", background: "#1a1a0e", border: "1px solid #3a3010",
                      borderRadius: 8, fontSize: 14, color: "#d4c87a", marginBottom: 12, lineHeight: 1.5
                    }}>
                      👉 {MORNING_LEVELS[todayLevel].action}
                    </div>
                    <CheckButton label="Done — mark anchor complete" onClick={() => { updateToday({ anchor: true }); setTodayLevel(null); }} />
                  </div>
                )}
              </div>
            ) : (
              <Completed label="Anchor complete ✓" onUndo={() => updateToday({ anchor: false })} />
            )}
          </Section>

          {/* Business Work */}
          <Section title="Business Work" subtitle="Even 20 minutes counts">
            {!todayData.business ? (
              <CheckButton label="Mark progress made today" onClick={() => updateToday({ business: true })} />
            ) : (
              <Completed label="Progress logged ✓" onUndo={() => updateToday({ business: false })} />
            )}
          </Section>

          {/* Avoided */}
          <Section title="Biggest Temptation" subtitle="Scrolling or substance — whichever felt hardest today">
            {!todayData.avoided ? (
              <CheckButton label="I avoided it today" onClick={() => updateToday({ avoided: true })} />
            ) : (
              <Completed label="Avoided ✓" onUndo={() => updateToday({ avoided: false })} />
            )}
          </Section>

          {/* Note */}
          <Section title="One Line" subtitle="Optional — what happened today?">
            <textarea
              value={todayData.note || ""}
              onChange={e => updateToday({ note: e.target.value })}
              placeholder="Anything worth noting..."
              style={{
                width: "100%", minHeight: 60, background: "#141414", border: "1px solid #1e1e1e",
                borderRadius: 8, color: "#e8e4dc", fontSize: 13, padding: "10px 12px",
                resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", outline: "none"
              }}
            />
          </Section>
        </div>
      )}

      {/* HISTORY VIEW */}
      {view === "history" && (
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 20 }}>
            Last 30 Days
          </div>
          {history.length === 0 && (
            <div style={{ color: "#444", fontSize: 14 }}>No history yet. Start today.</div>
          )}
          {history.map(key => {
            const d = data.days[key];
            const s = score(d);
            const date = new Date(key + "T12:00:00");
            return (
              <div key={key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", marginBottom: 6, background: "#141414",
                borderRadius: 8, border: "1px solid #1a1a1a"
              }}>
                <div>
                  <div style={{ fontSize: 13, color: "#e8e4dc" }}>
                    {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                    {[d.anchor && "anchor", d.business && "business", d.avoided && "avoided"].filter(Boolean).join(" · ") || "nothing logged"}
                  </div>
                  {d.note && <div style={{ fontSize: 11, color: "#666", marginTop: 2, fontStyle: "italic" }}>"{d.note}"</div>}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: "bold", color: scoreColor(s),
                  fontFamily: "monospace", minWidth: 32, textAlign: "right"
                }}>{s}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOREDOM LIST VIEW */}
      {view === "boredom" && (
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 8 }}>
            Boredom Redirects
          </div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 20, lineHeight: 1.6 }}>
            When the urge hits — open this list and pick one. Don't fight the urge. Redirect it.
          </div>
          {data.boredomList.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              padding: "12px 16px", marginBottom: 6, background: "#141414",
              borderRadius: 8, border: "1px solid #1a1a1a", gap: 12
            }}>
              <div style={{ fontSize: 13, color: "#e8e4dc", lineHeight: 1.5, flex: 1 }}>→ {item}</div>
              <button onClick={() => removeBoredomItem(i)} style={{
                background: "none", border: "none", color: "#3a3a3a", cursor: "pointer",
                fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0
              }}>×</button>
            </div>
          ))}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <input
              value={newBoredomItem}
              onChange={e => setNewBoredomItem(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addBoredomItem()}
              placeholder="Add your own redirect..."
              style={{
                flex: 1, background: "#141414", border: "1px solid #2a2a2a",
                borderRadius: 8, color: "#e8e4dc", fontSize: 13, padding: "10px 12px",
                fontFamily: "inherit", outline: "none"
              }}
            />
            <button onClick={addBoredomItem} style={{
              background: "#c8a96e", border: "none", borderRadius: 8, color: "#0e0e10",
              fontSize: 13, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit"
            }}>Add</button>
          </div>
        </div>
      )}

      {/* PROTOCOL VIEW */}
      {view === "protocol" && (
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 20 }}>
            Ruined Day Protocol
          </div>

          <div style={{
            padding: "16px 20px", background: "#141414", borderRadius: 10,
            border: "1px solid #2a2010", marginBottom: 16, lineHeight: 1.7
          }}>
            <div style={{ fontSize: 13, color: "#c8a96e", marginBottom: 8, letterSpacing: 1 }}>THE RULE</div>
            <div style={{ fontSize: 14, color: "#d4d0c8" }}>
              A ruined day ends at the <em>next action</em>, not at midnight.
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.7 }}>
            You've scrolled for 4 hours. Used something you didn't want to. Done nothing. It doesn't matter. The day isn't over because you failed — it ends when you do one thing.
          </div>

          <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>Do one of these right now:</div>
          {[
            "Stand up",
            "Drink a glass of water",
            "Step outside for 2 minutes",
            "Wash your face",
            "Text one person anything",
            "Open your business work — even just look at it",
          ].map((item, i) => (
            <div key={i} style={{
              padding: "11px 16px", marginBottom: 6, background: "#141414",
              borderRadius: 8, border: "1px solid #1e1e1e", fontSize: 13, color: "#e8e4dc"
            }}>
              {i + 1}. {item}
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <CheckButton label="Done one thing → Score this day a 1" onClick={() => {
              updateToday({ anchor: true });
              setView("today");
            }} />
          </div>

          <div style={{
            marginTop: 20, padding: "14px 16px", background: "#0a0a0a",
            borderRadius: 8, fontSize: 12, color: "#444", lineHeight: 1.7, fontStyle: "italic"
          }}>
            "Your brain predicted failure and protected you from the pain of trying. Every small action is evidence against that prediction. You're not building habits yet — you're building counter-evidence."
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, color: "#e8e4dc", letterSpacing: 0.3 }}>{title}</div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2, letterSpacing: 0.5 }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function CheckButton({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "12px 16px", background: "#141414",
      border: "1px solid #2a2a2a", borderRadius: 8, color: "#c8a96e",
      fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
      transition: "border-color 0.2s, background 0.2s"
    }}
      onMouseEnter={e => { e.target.style.borderColor = "#c8a96e"; e.target.style.background = "#1a1610"; }}
      onMouseLeave={e => { e.target.style.borderColor = "#2a2a2a"; e.target.style.background = "#141414"; }}
    >
      {label}
    </button>
  );
}

function Completed({ label, onUndo }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 13, color: "#6a9a72" }}>{label}</div>
      <button onClick={onUndo} style={{
        background: "none", border: "none", color: "#444", fontSize: 11,
        cursor: "pointer", textDecoration: "underline", fontFamily: "inherit"
      }}>undo</button>
    </div>
  );
}
