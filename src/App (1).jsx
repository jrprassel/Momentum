import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "momentum-data-v2";

const DEFAULT_BOREDOM_LIST = [
  "Put on a podcast and walk around the block",
  "Make something to eat",
  "Text a friend something random",
  "Watch one YouTube video (set a timer)",
  "Cold water on your face",
  "Play a game for 15 minutes",
];

function getTodayKey() {
  const now = new Date();
  const estOffset = -5 * 60;
  const utcMinutes = now.getTime() / 60000 + now.getTimezoneOffset();
  const estDate = new Date((utcMinutes + estOffset) * 60000);
  if (estDate.getHours() < 4) estDate.setDate(estDate.getDate() - 1);
  const year = estDate.getFullYear();
  const month = String(estDate.getMonth() + 1).padStart(2, "0");
  const day = String(estDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(dateKey) {
  const d = new Date(dateKey + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day;
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function getInitialData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { days: {}, boredomList: DEFAULT_BOREDOM_LIST, customHabits: [] };
}

const PROTOCOL_STEPS = [
  {
    id: "acknowledge",
    title: "Name It",
    instruction: "Say this out loud or in your head:",
    content: "\"I'm in shutdown mode. My brain is protecting me from pain. This feeling is temporary and will pass.\"",
    type: "read",
  },
  {
    id: "sigh",
    title: "Physiological Sigh × 3",
    instruction: "The single most effective acute stress reset in the research. Do it exactly:",
    steps: [
      "Inhale deeply through your nose — fill your lungs",
      "Without exhaling, take a second short inhale through your nose — top them off",
      "Exhale slowly and fully through your mouth — as long as possible",
    ],
    content: "Repeat 3 times. Your nervous system will begin to downregulate within seconds.",
    type: "breathing",
  },
  {
    id: "ground",
    title: "5-4-3-2-1 Grounding",
    instruction: "Look around and name these out loud if possible:",
    steps: [
      "5 things you can SEE",
      "4 things you can physically TOUCH right now",
      "3 things you can HEAR",
      "2 things you can SMELL",
      "1 thing you can TASTE",
    ],
    content: "This pulls your brain out of abstract dread and anchors it in the physical present.",
    type: "grounding",
  },
  {
    id: "move",
    title: "30 Seconds of Movement",
    instruction: "Pick one and do it right now:",
    steps: [
      "Stand up and shake out your hands and arms",
      "5 jumping jacks",
      "Walk to another room and back",
      "Splash cold water on your face",
    ],
    content: "Movement releases dopamine and breaks the physical freeze state.",
    duration: 30,
    type: "movement",
  },
  {
    id: "micro",
    title: "The Micro Task",
    instruction: "Don't think about the whole task. Just answer this one question:",
    content: "\"What is the single smallest physical action I could take toward what I need to do?\"\n\nOpen the file. Write one sentence. Send one message. That's it. Just the one thing.",
    type: "action",
  },
];

export default function App() {
  const [data, setData] = useState(getInitialData);
  const [view, setView] = useState("today");
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newBoredomItem, setNewBoredomItem] = useState("");
  const [protocolStep, setProtocolStep] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  const today = getTodayKey();
  const todayData = data.days[today] || { morning: null, habits: {}, note: "" };

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  useEffect(() => {
    if (timerActive && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && timerActive) {
      setTimerActive(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [timerActive, timer]);

  function updateToday(patch) {
    setData(prev => ({
      ...prev,
      days: { ...prev.days, [today]: { ...todayData, ...patch } }
    }));
  }

  function cheatDaysUsedThisWeek(habitId) {
    const weekStart = getWeekStart(today);
    return Object.keys(data.days).filter(key => {
      if (key < weekStart || key > today) return false;
      if (habitId === "morning") return data.days[key]?.morning === "cheat";
      return data.days[key]?.habits?.[habitId] === "cheat";
    }).length;
  }

  function getStreak(habitId) {
    const keys = Object.keys(data.days).sort().reverse();
    let streak = 0;
    for (const key of keys) {
      const val = habitId === "morning"
        ? data.days[key]?.morning
        : data.days[key]?.habits?.[habitId];
      if (val === "done" || val === "cheat") streak++;
      else if (key <= today) break;
    }
    return streak;
  }

  function addHabit() {
    if (!newHabitName.trim()) return;
    const id = "habit_" + Date.now();
    setData(prev => ({
      ...prev,
      customHabits: [...prev.customHabits, { id, name: newHabitName.trim() }]
    }));
    setNewHabitName("");
    setShowAddHabit(false);
  }

  function removeHabit(id) {
    setData(prev => ({ ...prev, customHabits: prev.customHabits.filter(h => h.id !== id) }));
  }

  function moveHabit(index, direction) {
    setData(prev => {
      const habits = [...prev.customHabits];
      const target = index + direction;
      if (target < 0 || target >= habits.length) return prev;
      [habits[index], habits[target]] = [habits[target], habits[index]];
      return { ...prev, customHabits: habits };
    });
  }

  function addBoredomItem() {
    if (!newBoredomItem.trim()) return;
    setData(prev => ({ ...prev, boredomList: [...prev.boredomList, newBoredomItem.trim()] }));
    setNewBoredomItem("");
  }

  function removeBoredomItem(i) {
    setData(prev => ({ ...prev, boredomList: prev.boredomList.filter((_, idx) => idx !== i) }));
  }

  const totalPossible = 1 + data.customHabits.length;

  function dayScore(d) {
    if (!d) return 0;
    return (
      (d.morning === "done" || d.morning === "cheat" ? 1 : 0) +
      data.customHabits.filter(h => d.habits?.[h.id] === "done" || d.habits?.[h.id] === "cheat").length
    );
  }

  const todayScore = dayScore(todayData);

  function scoreColor(s, total) {
    const pct = total === 0 ? 0 : s / total;
    if (pct === 1) return "#a8e6b0";
    if (pct >= 0.5) return "#f0d080";
    if (pct > 0) return "#f0a060";
    return "#888";
  }

  function scoreLabel(s, total) {
    const pct = total === 0 ? 0 : s / total;
    if (pct === 1) return "Perfect day";
    if (pct >= 0.5) return "Good day";
    if (pct > 0) return "You showed up";
    return "Data, not failure";
  }

  const dayKeys = Object.keys(data.days).sort().slice(-7);
  const recentZeros = (() => {
    let count = 0;
    for (let i = dayKeys.length - 1; i >= 0; i--) {
      if (dayScore(data.days[dayKeys[i]]) === 0) count++;
      else break;
    }
    return count;
  })();

  const history = Object.keys(data.days).sort().reverse().slice(0, 30);

  return (
    <div style={{
      minHeight: "100vh", background: "#0e0e10", color: "#e8e4dc",
      fontFamily: "'Georgia','Times New Roman',serif",
      maxWidth: 480, margin: "0 auto", padding: "0 0 80px 0",
    }}>

      {/* Header */}
      <div style={{ padding: "32px 24px 16px", borderBottom: "1px solid #222" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#555", textTransform: "uppercase", marginBottom: 6 }}>momentum</div>
        <div style={{ fontSize: 26, fontWeight: "normal", letterSpacing: -1 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        {recentZeros >= 2 && (
          <div onClick={() => { setView("interrupt"); setProtocolStep(null); }} style={{
            marginTop: 12, padding: "8px 12px", background: "#2a1a1a", border: "1px solid #5a2a2a",
            borderRadius: 6, fontSize: 13, color: "#e08080", cursor: "pointer"
          }}>
            ⚠ Two zeros in a row — tap to open Pattern Interrupt →
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", overflowX: "auto" }}>
        {[["today","Today"],["history","History"],["boredom","Boredom"],["interrupt","🧠 Reset"]].map(([key, label]) => (
          <button key={key} onClick={() => { setView(key); if (key === "interrupt") setProtocolStep(null); }} style={{
            flex: "0 0 auto", padding: "12px 14px", background: "none", border: "none",
            borderBottom: view === key ? "2px solid #c8a96e" : "2px solid transparent",
            color: view === key ? "#c8a96e" : "#555", fontSize: 11, letterSpacing: 1,
            textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap"
          }}>{label}</button>
        ))}
      </div>

      {/* TODAY */}
      {view === "today" && (
        <div style={{ padding: "24px" }}>
          {/* Score */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 28, padding: "16px 20px", background: "#141414", borderRadius: 10, border: "1px solid #1e1e1e"
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Today's Score</div>
              <div style={{ fontSize: 13, color: scoreColor(todayScore, totalPossible) }}>{scoreLabel(todayScore, totalPossible)}</div>
            </div>
            <div style={{ fontSize: 48, fontWeight: "bold", color: scoreColor(todayScore, totalPossible), fontFamily: "monospace", lineHeight: 1 }}>
              {todayScore}<span style={{ fontSize: 20, color: "#333" }}>/{totalPossible}</span>
            </div>
          </div>

          {/* Morning Routine */}
          <Section title="Morning Routine" subtitle="Outside · water · no browsing 30 min" streak={getStreak("morning")}>
            <HabitRow
              value={todayData.morning}
              onDone={() => updateToday({ morning: "done" })}
              onCheat={() => updateToday({ morning: "cheat" })}
              onUndo={() => updateToday({ morning: null })}
              cheatUsed={cheatDaysUsedThisWeek("morning") > 0}
            />
          </Section>

          {/* Custom Habits */}
          {data.customHabits.map(habit => (
            <Section key={habit.id} title={habit.name} subtitle="" streak={getStreak(habit.id)}>
              <HabitRow
                value={todayData.habits?.[habit.id]}
                onDone={() => updateToday({ habits: { ...todayData.habits, [habit.id]: "done" } })}
                onCheat={() => updateToday({ habits: { ...todayData.habits, [habit.id]: "cheat" } })}
                onUndo={() => updateToday({ habits: { ...todayData.habits, [habit.id]: null } })}
                cheatUsed={cheatDaysUsedThisWeek(habit.id) > 0}
              />
            </Section>
          ))}

          {/* Add habit */}
          {!showAddHabit ? (
            <button onClick={() => setShowAddHabit(true)} style={{
              width: "100%", padding: "10px", background: "none", border: "1px dashed #2a2a2a",
              borderRadius: 8, color: "#555", fontSize: 12, cursor: "pointer",
              fontFamily: "inherit", marginBottom: 24, letterSpacing: 1
            }}>+ ADD HABIT TO TRACK</button>
          ) : (
            <div style={{ marginBottom: 24, padding: "14px", background: "#141414", borderRadius: 8, border: "1px solid #2a2a2a" }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Name your habit</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input autoFocus value={newHabitName} onChange={e => setNewHabitName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addHabit()}
                  placeholder="e.g. No social media before noon"
                  style={{ flex: 1, background: "#0e0e10", border: "1px solid #2a2a2a", borderRadius: 6, color: "#e8e4dc", fontSize: 13, padding: "8px 10px", fontFamily: "inherit", outline: "none" }}
                />
                <button onClick={addHabit} style={{ background: "#c8a96e", border: "none", borderRadius: 6, color: "#0e0e10", fontSize: 12, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit" }}>Add</button>
                <button onClick={() => { setShowAddHabit(false); setNewHabitName(""); }} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 6, color: "#555", fontSize: 12, padding: "8px 10px", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
              </div>
            </div>
          )}

          {/* Manage habits */}
          {data.customHabits.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#333", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Manage Habits</div>
              {data.customHabits.map((h, i) => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1a1a1a", gap: 8 }}>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => moveHabit(i, -1)}
                      disabled={i === 0}
                      style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 4, color: i === 0 ? "#2a2a2a" : "#666", cursor: i === 0 ? "default" : "pointer", fontSize: 11, padding: "2px 6px", fontFamily: "inherit" }}>▲</button>
                    <button
                      onClick={() => moveHabit(i, 1)}
                      disabled={i === data.customHabits.length - 1}
                      style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 4, color: i === data.customHabits.length - 1 ? "#2a2a2a" : "#666", cursor: i === data.customHabits.length - 1 ? "default" : "pointer", fontSize: 11, padding: "2px 6px", fontFamily: "inherit" }}>▼</button>
                  </div>
                  <div style={{ fontSize: 13, color: "#888", flex: 1 }}>{h.name}</div>
                  <button onClick={() => removeHabit(h.id)} style={{ background: "none", border: "none", color: "#3a3a3a", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>Remove</button>
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          <Section title="One Line" subtitle="Optional — what happened today?">
            <textarea value={todayData.note || ""} onChange={e => updateToday({ note: e.target.value })}
              placeholder="Anything worth noting..."
              style={{ width: "100%", minHeight: 60, background: "#141414", border: "1px solid #1e1e1e", borderRadius: 8, color: "#e8e4dc", fontSize: 13, padding: "10px 12px", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
            />
          </Section>

          {/* Pattern interrupt CTA */}
          <button onClick={() => { setView("interrupt"); setProtocolStep(null); }} style={{
            width: "100%", padding: "14px", background: "#1a1010", border: "1px solid #3a2020",
            borderRadius: 8, color: "#e08060", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 8
          }}>
            🧠 Feeling stuck or overwhelmed? Open Pattern Interrupt
          </button>
        </div>
      )}

      {/* HISTORY */}
      {view === "history" && (
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 20 }}>Last 30 Days</div>
          {history.length === 0 && <div style={{ color: "#444", fontSize: 14 }}>No history yet. Start today.</div>}
          {history.map(key => {
            const d = data.days[key];
            const s = dayScore(d);
            const cheats = (d?.morning === "cheat" ? 1 : 0) + data.customHabits.filter(h => d?.habits?.[h.id] === "cheat").length;
            const date = new Date(key + "T12:00:00");
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", marginBottom: 6, background: "#141414", borderRadius: 8, border: "1px solid #1a1a1a" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#e8e4dc" }}>
                    {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                    {s > 0 ? `${s}/${totalPossible} habits` : "nothing logged"}
                    {cheats > 0 && <span style={{ color: "#b8922e", marginLeft: 6 }}>· {cheats} cheat{cheats > 1 ? "s" : ""}</span>}
                  </div>
                  {d?.note && <div style={{ fontSize: 11, color: "#666", marginTop: 2, fontStyle: "italic" }}>"{d.note}"</div>}
                </div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: scoreColor(s, totalPossible), fontFamily: "monospace", minWidth: 40, textAlign: "right" }}>
                  {s}<span style={{ fontSize: 14, color: "#333" }}>/{totalPossible}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOREDOM */}
      {view === "boredom" && (
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 8 }}>Boredom Redirects</div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 20, lineHeight: 1.6 }}>When the urge hits — open this and pick one. Don't fight the urge. Redirect it.</div>
          {data.boredomList.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "12px 16px", marginBottom: 6, background: "#141414", borderRadius: 8, border: "1px solid #1a1a1a", gap: 12 }}>
              <div style={{ fontSize: 13, color: "#e8e4dc", lineHeight: 1.5, flex: 1 }}>→ {item}</div>
              <button onClick={() => removeBoredomItem(i)} style={{ background: "none", border: "none", color: "#3a3a3a", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
            </div>
          ))}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <input value={newBoredomItem} onChange={e => setNewBoredomItem(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addBoredomItem()}
              placeholder="Add your own redirect..."
              style={{ flex: 1, background: "#141414", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e8e4dc", fontSize: 13, padding: "10px 12px", fontFamily: "inherit", outline: "none" }}
            />
            <button onClick={addBoredomItem} style={{ background: "#c8a96e", border: "none", borderRadius: 8, color: "#0e0e10", fontSize: 13, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit" }}>Add</button>
          </div>
        </div>
      )}

      {/* PATTERN INTERRUPT */}
      {view === "interrupt" && (
        <div style={{ padding: "24px" }}>
          {protocolStep === null && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 20 }}>Pattern Interrupt Protocol</div>
              <div style={{ padding: "16px 20px", background: "#141414", borderRadius: 10, border: "1px solid #2a1a10", marginBottom: 16, lineHeight: 1.8 }}>
                <div style={{ fontSize: 13, color: "#e08060", marginBottom: 8, letterSpacing: 1 }}>WHAT'S HAPPENING</div>
                <div style={{ fontSize: 13, color: "#d4d0c8" }}>Your brain went into shutdown mode. It's not laziness — it's a protection response. Your nervous system detected overwhelm and pulled the emergency brake.</div>
              </div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 20, lineHeight: 1.7 }}>
                This 5-step protocol takes about 4 minutes and is built from the most effective evidence-based interventions for acute stress and executive shutdown. Follow each step in order.
              </div>
              <button onClick={() => setProtocolStep(0)} style={{ width: "100%", padding: "16px", background: "#1a1208", border: "1px solid #c8a96e", borderRadius: 8, color: "#c8a96e", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                Begin Protocol →
              </button>
            </div>
          )}

          {typeof protocolStep === "number" && protocolStep < PROTOCOL_STEPS.length && (
            <ProtocolStep
              step={PROTOCOL_STEPS[protocolStep]}
              stepNumber={protocolStep + 1}
              total={PROTOCOL_STEPS.length}
              onNext={() => setProtocolStep(protocolStep + 1)}
              timer={timer}
              timerActive={timerActive}
              onStartTimer={(secs) => { setTimer(secs); setTimerActive(true); }}
            />
          )}

          {typeof protocolStep === "number" && protocolStep >= PROTOCOL_STEPS.length && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 20 }}>Protocol Complete</div>
              <div style={{ padding: "20px", background: "#0a1a0a", border: "1px solid #2a4a2a", borderRadius: 10, marginBottom: 20, lineHeight: 1.8 }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 14, color: "#a8e6b0" }}>You interrupted the pattern. Your nervous system has been reset.</div>
                <div style={{ fontSize: 13, color: "#688668", marginTop: 8 }}>Now do the one small action you identified. Just that. Nothing else.</div>
              </div>
              <button onClick={() => { setProtocolStep(null); setView("today"); }} style={{ width: "100%", padding: "14px", background: "#141414", border: "1px solid #2a2a2a", borderRadius: 8, color: "#c8a96e", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Back to Today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProtocolStep({ step, stepNumber, total, onNext, timer, timerActive, onStartTimer }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>Step {stepNumber} of {total}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < stepNumber ? "#c8a96e" : "#2a2a2a" }} />
          ))}
        </div>
      </div>
      <div style={{ fontSize: 20, color: "#e8e4dc", marginBottom: 6 }}>{step.title}</div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>{step.instruction}</div>
      {step.steps && (
        <div style={{ marginBottom: 16 }}>
          {step.steps.map((s, i) => (
            <div key={i} style={{ padding: "11px 16px", marginBottom: 6, background: "#141414", borderRadius: 8, border: "1px solid #1e1e1e", fontSize: 13, color: "#e8e4dc", display: "flex", gap: 10 }}>
              <span style={{ color: "#c8a96e", flexShrink: 0 }}>{i + 1}.</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "14px 16px", background: "#141414", borderRadius: 8, border: "1px solid #2a2010", fontSize: 13, color: "#d4c87a", marginBottom: 20, lineHeight: 1.7, whiteSpace: "pre-line" }}>
        {step.content}
      </div>
      {step.duration && (
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          {!timerActive && timer === 0 ? (
            <button onClick={() => onStartTimer(step.duration)} style={{ padding: "10px 24px", background: "#1a1a0a", border: "1px solid #c8a96e", borderRadius: 8, color: "#c8a96e", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Start {step.duration}s Timer
            </button>
          ) : (
            <div style={{ fontSize: 36, fontFamily: "monospace", color: timer > 0 ? "#c8a96e" : "#a8e6b0" }}>
              {timer > 0 ? timer : "✓ Done"}
            </div>
          )}
        </div>
      )}
      <button onClick={onNext} style={{ width: "100%", padding: "14px", background: "#1a1208", border: "1px solid #c8a96e", borderRadius: 8, color: "#c8a96e", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        {stepNumber === total ? "Complete Protocol ✓" : "Next Step →"}
      </button>
    </div>
  );
}

function HabitRow({ value, onDone, onCheat, onUndo, cheatUsed }) {
  if (value === "done") return <Completed label="Done ✓" onUndo={onUndo} />;
  if (value === "cheat") return <Completed label="Cheat day used 🟡" onUndo={onUndo} isCheat />;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={onDone} style={{ flex: 1, padding: "12px 16px", background: "#141414", border: "1px solid #2a2a2a", borderRadius: 8, color: "#c8a96e", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>✓ Done</button>
      {!cheatUsed ? (
        <button onClick={onCheat} style={{ padding: "12px 14px", background: "#141408", border: "1px solid #3a3010", borderRadius: 8, color: "#b8922e", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Use cheat day</button>
      ) : (
        <div style={{ fontSize: 11, color: "#444", alignSelf: "center", whiteSpace: "nowrap" }}>Cheat used this week</div>
      )}
    </div>
  );
}

function Section({ title, subtitle, streak, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, color: "#e8e4dc" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {streak > 0 && (
          <div style={{ fontSize: 11, color: "#c8a96e", background: "#1a1208", padding: "3px 8px", borderRadius: 20, border: "1px solid #3a2a10", whiteSpace: "nowrap" }}>
            🔥 {streak}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Completed({ label, onUndo, isCheat }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
      <div style={{ fontSize: 13, color: isCheat ? "#b8922e" : "#6a9a72" }}>{label}</div>
      <button onClick={onUndo} style={{ background: "none", border: "none", color: "#444", fontSize: 11, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>undo</button>
    </div>
  );
}
