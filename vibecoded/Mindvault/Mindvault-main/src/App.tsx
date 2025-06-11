import React, { useState, useRef, useEffect } from 'react';
import Sentiment from 'sentiment';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { addDays, format, subDays, isSameDay } from 'date-fns';

interface Thought {
  text: string;
  timestamp: string;
  mood: string;
  color: string;
  uid?: string;
  reflection?: string;
  id?: string; // for Firestore
}

const MOOD_MAP: Record<string, { icon: string; color: string; label: string; gradient: string }> = {
  joy: { icon: '😊', color: '#FFF9C4', label: 'Joy', gradient: 'linear-gradient(135deg, #FFF9C4 0%, #FFE082 33%, #FFD600 66%, #FF9800 100%)' },
  sadness: { icon: '😢', color: '#BBDEFB', label: 'Sadness', gradient: 'linear-gradient(135deg, #BBDEFB 0%, #90CAF9 33%, #536DFE 66%, #283593 100%)' },
  anger: { icon: '😠', color: '#FFCDD2', label: 'Anger', gradient: 'linear-gradient(135deg, #FFCDD2 0%, #FF8A65 33%, #D32F2F 66%, #B71C1C 100%)' },
  neutral: { icon: '😐', color: '#ECECEC', label: 'Neutral', gradient: 'linear-gradient(135deg, #ECECEC 0%, #B0BEC5 33%, #90A4AE 66%, #CFD8DC 100%)' },
  anxiety: { icon: '😨', color: '#B39DDB', label: 'Anxiety', gradient: 'linear-gradient(135deg, #B39DDB 0%, #9575CD 33%, #7E57C2 66%, #311B92 100%)' },
  love: { icon: '❤️', color: '#FFD6E0', label: 'Love', gradient: 'linear-gradient(135deg, #FFD6E0 0%, #FFB6C1 33%, #FF4081 66%, #C51162 100%)' },
  surprise: { icon: '😲', color: '#FFF3CD', label: 'Surprise', gradient: 'linear-gradient(135deg, #FFF3CD 0%, #FFE082 33%, #FFD600 66%, #FFEB3B 100%)' },
  gratitude: { icon: '🙏', color: '#E0F7FA', label: 'Gratitude', gradient: 'linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 33%, #4DD0E1 66%, #0097A7 100%)' },
  hope: { icon: '🌱', color: '#C8E6C9', label: 'Hope', gradient: 'linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 33%, #388E3C 66%, #00C853 100%)' },
  pride: { icon: '🏅', color: '#FFD700', label: 'Pride', gradient: 'linear-gradient(135deg, #FFD700 0%, #FFF9C4 33%, #FFA000 66%, #FF6F00 100%)' },
  confusion: { icon: '😕', color: '#E1BEE7', label: 'Confusion', gradient: 'linear-gradient(135deg, #E1BEE7 0%, #B39DDB 33%, #90A4AE 66%, #7986CB 100%)' },
  boredom: { icon: '🥱', color: '#F5F5F5', label: 'Boredom', gradient: 'linear-gradient(135deg, #F5F5F5 0%, #B0BEC5 33%, #78909C 66%, #757575 100%)' },
  inspiration: { icon: '💡', color: '#FFF9C4', label: 'Inspiration', gradient: 'linear-gradient(135deg, #FFF9C4 0%, #B2FF59 33%, #00E676 66%, #00B8D4 100%)' },
  relief: { icon: '😌', color: '#B2DFDB', label: 'Relief', gradient: 'linear-gradient(135deg, #B2DFDB 0%, #E0F2F1 33%, #4DB6AC 66%, #00897B 100%)' },
  guilt: { icon: '😔', color: '#FFE0B2', label: 'Guilt', gradient: 'linear-gradient(135deg, #FFE0B2 0%, #FFCCBC 33%, #FF7043 66%, #BF360C 100%)' },
  shame: { icon: '😳', color: '#FFECB3', label: 'Shame', gradient: 'linear-gradient(135deg, #FFECB3 0%, #FFAB91 33%, #FF7043 66%, #D84315 100%)' },
  disgust: { icon: '🤢', color: '#DCEDC8', label: 'Disgust', gradient: 'linear-gradient(135deg, #DCEDC8 0%, #AED581 33%, #689F38 66%, #33691E 100%)' },
};

const sentiment = new Sentiment();

// Simple AI-like keyword-based emotion classifier
function detectMood(text: string): keyof typeof MOOD_MAP {
  const lower = text.toLowerCase();
  // Map greetings to joy
  if (/\b(happy|joy|delighted|excited|glad|cheerful|pleased|hello|hi|hey|greetings)\b/.test(lower)) return 'joy';
  if (/\b(thank|grateful|gratitude|appreciate)\b/.test(lower)) return 'gratitude';
  if (/\b(love|loved|loving|adore|dear|sweetheart|romantic)\b/.test(lower)) return 'love';
  if (/\b(surprise|shocked|amazed|astonished|wow)\b/.test(lower)) return 'surprise';
  if (/\b(angry|anger|furious|mad|rage|annoyed|irritated)\b/.test(lower)) return 'anger';
  if (/\b(sad|down|depressed|cry|unhappy|tear|miserable)\b/.test(lower)) return 'sadness';
  if (/\b(anxious|anxiety|nervous|worried|afraid|scared|panic)\b/.test(lower)) return 'anxiety';
  if (/\b(hope|hopeful|optimistic|bright future)\b/.test(lower)) return 'hope';
  if (/\b(proud|pride|accomplished|achievement|victory|triumph)\b/.test(lower)) return 'pride';
  if (/\b(confused|confusing|uncertain|lost|puzzled|perplexed)\b/.test(lower)) return 'confusion';
  if (/\b(bored|boring|uninterested|dull|tedious)\b/.test(lower)) return 'boredom';
  if (/\b(inspired|inspiration|motivated|creative|inventive)\b/.test(lower)) return 'inspiration';
  if (/\b(relieved|relief|at ease|unburdened)\b/.test(lower)) return 'relief';
  if (/\b(guilty|guilt|remorse|regret)\b/.test(lower)) return 'guilt';
  if (/\b(shame|ashamed|embarrassed|humiliated)\b/.test(lower)) return 'shame';
  if (/\b(disgust|disgusted|gross|revolted|nauseated)\b/.test(lower)) return 'disgust';
  // Fallback to sentiment score
  const { score } = sentiment.analyze(text);
  if (score > 2) return 'joy';
  if (score < -2) return 'sadness';
  if (score < 0) return 'anxiety';
  if (score > 0) return 'neutral';
  return 'neutral';
}

const getGradient = (mood: keyof typeof MOOD_MAP) => MOOD_MAP[mood]?.gradient || MOOD_MAP['neutral'].gradient;

const EMOJI_BURST_COUNT = 5;

// Add mood explanations
const MOOD_EXPLANATIONS: Record<string, string> = {
  joy: 'Feeling happy, cheerful, or delighted.',
  sadness: 'Feeling down, blue, or unhappy.',
  anger: 'Feeling mad, frustrated, or annoyed.',
  neutral: 'Feeling calm or neutral.',
  anxiety: 'Feeling nervous, worried, or tense.',
  love: 'Feeling affectionate or loving.',
  surprise: 'Feeling surprised or amazed.',
  gratitude: 'Feeling thankful or appreciative.',
  hope: 'Feeling hopeful or optimistic.',
  pride: 'Feeling proud or accomplished.',
  confusion: 'Feeling uncertain or puzzled.',
  boredom: 'Feeling uninterested or bored.',
  inspiration: 'Feeling inspired or creative.',
  relief: 'Feeling relieved or at ease.',
  guilt: 'Feeling guilty or remorseful.',
  shame: 'Feeling ashamed or embarrassed.',
  disgust: 'Feeling disgusted or grossed out.'
};

const MOOD_ORDER = [
  'joy', 'love', 'gratitude', 'hope', 'pride', 'inspiration', 'relief',
  'surprise', 'neutral', 'boredom', 'confusion', 'anxiety', 'sadness', 'guilt', 'shame', 'disgust', 'anger'
];

function getMoodStats(thoughts: Thought[]) {
  if (!thoughts.length) return { mostCommon: '', streak: 0, avgMood: '', moodCounts: {} };
  const moodCounts: Record<string, number> = {};
  let streak = 1, maxStreak = 1, lastMood = thoughts[0].mood, mostCommon = thoughts[0].mood;
  let maxCount = 0, sum = 0;
  thoughts.forEach((t, i) => {
    moodCounts[t.mood] = (moodCounts[t.mood] || 0) + 1;
    if (i > 0) {
      if (t.mood === lastMood) streak++;
      else streak = 1;
      if (streak > maxStreak) maxStreak = streak;
      lastMood = t.mood;
    }
    if (moodCounts[t.mood] > maxCount) {
      maxCount = moodCounts[t.mood];
      mostCommon = t.mood;
    }
    sum += MOOD_ORDER.indexOf(t.mood) >= 0 ? MOOD_ORDER.indexOf(t.mood) : 7;
  });
  const avgMoodIdx = Math.round(sum / thoughts.length);
  return {
    mostCommon,
    streak: maxStreak,
    avgMood: MOOD_ORDER[avgMoodIdx] || 'neutral',
    moodCounts
  };
}

function getMoodChartData(thoughts: Thought[]) {
  // Group by day
  const byDay: Record<string, { date: string, mood: string }> = {};
  thoughts.forEach(t => {
    const day = t.timestamp.slice(0, 10);
    if (!byDay[day]) byDay[day] = { date: day, mood: t.mood };
    // Use the first mood of the day (or could use last, or most common)
  });
  return Object.values(byDay).reverse().map(d => ({
    ...d,
    moodIdx: MOOD_ORDER.indexOf(d.mood) >= 0 ? MOOD_ORDER.indexOf(d.mood) : 7
  }));
}

function getCalendarData(thoughts: Thought[], days = 90) {
  const today = new Date();
  const start = subDays(today, days - 1);
  const calendar: { date: Date; mood: string; count: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    // Find all thoughts for this day
    const dayThoughts = thoughts.filter(t => isSameDay(new Date(t.timestamp), date));
    // Find dominant mood
    let mood = 'neutral';
    let count = 0;
    if (dayThoughts.length) {
      const moodCounts: Record<string, number> = {};
      dayThoughts.forEach(t => { moodCounts[t.mood] = (moodCounts[t.mood] || 0) + 1; });
      mood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];
      count = dayThoughts.length;
    }
    calendar.push({ date, mood, count });
  }
  return calendar;
}

const App: React.FC = () => {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [emojiBurst, setEmojiBurst] = useState<{icon: string, key: number, angle: number, distance: number}[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPopKey = useRef(0);
  const [liveMoodBadge, setLiveMoodBadge] = useState<{mood: string, key: number}>({ mood: 'neutral', key: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [reflectionModal, setReflectionModal] = useState<{open: boolean, thought: Thought | null}>({ open: false, thought: null });
  const [reflectionInput, setReflectionInput] = useState('');

  // Real-time mood detection for background gradient
  const liveMood = detectMood(input);
  const liveGradient = getGradient(liveMood);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Load thoughts from Firestore or localStorage
  useEffect(() => {
    if (user) {
      setLoading(true);
      const fetchThoughts = async () => {
        const q = query(
          collection(db, 'thoughts'),
          where('uid', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        const data: Thought[] = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Thought));
        setThoughts(data);
        setLoading(false);
      };
      fetchThoughts();
    } else {
      // fallback to localStorage
      const stored = localStorage.getItem('mindvault-thoughts');
      if (stored) setThoughts(JSON.parse(stored));
    }
  }, [user]);

  // Save to localStorage on change if not signed in
  useEffect(() => {
    if (!user) {
      localStorage.setItem('mindvault-thoughts', JSON.stringify(thoughts));
    }
  }, [thoughts, user]);

  // Clean up emoji burst after animation
  useEffect(() => {
    if (emojiBurst.length > 0) {
      const timeout = setTimeout(() => setEmojiBurst([]), 900);
      return () => clearTimeout(timeout);
    }
  }, [emojiBurst]);

  // Update live mood badge on input change
  useEffect(() => {
    setLiveMoodBadge((prev) => {
      if (prev.mood !== liveMood) {
        return { mood: liveMood, key: prev.key + 1 };
      }
      return prev;
    });
  }, [liveMood]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() === '') return;
      const mood = detectMood(input.trim());
      const color = MOOD_MAP[mood]?.color || MOOD_MAP['neutral'].color;
      const newThought: Thought = {
        text: input.trim(),
        timestamp: new Date().toISOString(),
        mood,
        color,
        ...(user ? { uid: user.uid } : {})
      };
      setThoughts([newThought, ...thoughts]);
      setInput('');
      // Trigger emoji burst
      emojiPopKey.current += 1;
      const burst = Array.from({ length: EMOJI_BURST_COUNT }).map((_, i) => {
        const angle = 60 + i * (60 / (EMOJI_BURST_COUNT - 1)) - 30; // spread -30deg to +30deg
        const distance = 80 + Math.random() * 30; // px
        return { icon: MOOD_MAP[mood].icon, key: emojiPopKey.current * 100 + i, angle, distance };
      });
      setEmojiBurst(burst);
      // Save to Firestore if signed in
      if (user) {
        try {
          await addDoc(collection(db, 'thoughts'), newThought);
        } catch (err) {
          // Optionally show error
        }
      }
    }
  };

  const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      // Optionally show error
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setThoughts([]);
    } catch (err) {
      // Optionally show error
    }
  };

  const filteredThoughts = filter === 'all' ? thoughts : thoughts.filter(t => t.mood === filter);

  const exportJSON = () => {
    const dataStr = JSON.stringify(thoughts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindvault-entries.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTXT = () => {
    const dataStr = thoughts.map(t => `${t.timestamp} [${MOOD_MAP[t.mood]?.label || t.mood}]:\n${t.text}\n`).join('\n---\n');
    const blob = new Blob([dataStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindvault-entries.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Mood glow color
  const badgeGlow = {
    joy: 'shadow-yellow-300',
    sadness: 'shadow-blue-300',
    anger: 'shadow-red-300',
    neutral: 'shadow-gray-300',
    anxiety: 'shadow-purple-300',
    love: 'shadow-pink-300',
    surprise: 'shadow-yellow-200',
    gratitude: 'shadow-cyan-200',
    hope: 'shadow-green-300',
    pride: 'shadow-yellow-400',
    confusion: 'shadow-purple-200',
    boredom: 'shadow-gray-400',
    inspiration: 'shadow-green-200',
    relief: 'shadow-teal-200',
    guilt: 'shadow-orange-200',
    shame: 'shadow-orange-300',
    disgust: 'shadow-lime-300',
  }[liveMood];

  // Open reflection modal
  const openReflection = (thought: Thought) => {
    setReflectionInput(thought.reflection || '');
    setReflectionModal({ open: true, thought });
  };

  // Save reflection
  const saveReflection = async () => {
    if (!reflectionModal.thought) return;
    const updatedThought = { ...reflectionModal.thought, reflection: reflectionInput };
    // Update in state
    setThoughts(thoughts => thoughts.map(t =>
      t.timestamp === updatedThought.timestamp ? { ...t, reflection: reflectionInput } : t
    ));
    // Update in Firestore if signed in
    if (user && updatedThought.id) {
      try {
        await updateDoc(doc(db, 'thoughts', updatedThought.id), { reflection: reflectionInput });
      } catch (err) {}
    } else {
      // Update in localStorage
      localStorage.setItem('mindvault-thoughts', JSON.stringify(
        thoughts.map(t =>
          t.timestamp === updatedThought.timestamp ? { ...t, reflection: reflectionInput } : t
        )
      ));
    }
    setReflectionModal({ open: false, thought: null });
    setReflectionInput('');
  };

  // Mood analytics
  const moodStats = getMoodStats(thoughts);
  const moodChartData = getMoodChartData(thoughts);

  // Calendar heatmap data
  const calendarData = getCalendarData(thoughts, 90);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500">
      {/* 3D Animated Gradient Overlay */}
      <style>{`
        @keyframes gradientMove3D {
          0% { background-position: 0% 50%, 100% 50%; }
          25% { background-position: 50% 100%, 50% 0%; }
          50% { background-position: 100% 50%, 0% 50%; }
          75% { background-position: 50% 0%, 50% 100%; }
          100% { background-position: 0% 50%, 100% 50%; }
        }
        .gradient-3d-bg::before {
          content: '';
          position: fixed;
          z-index: 0;
          top: 0; left: 0; right: 0; bottom: 0;
          width: 100vw; height: 100vh;
          pointer-events: none;
          background: ${liveGradient}, radial-gradient(circle at 80% 20%, #fff6, transparent 70%);
          background-blend-mode: lighten, screen;
          background-size: 800% 800%, 120% 120%;
          animation: gradientMove3D 12s ease-in-out infinite;
          filter: blur(16px) saturate(1.2);
          opacity: 0.85;
          transition: background 0.8s cubic-bezier(.4,0,.2,1);
        }
        .emoji-burst {
          position: absolute;
          left: 50%;
          top: 140px;
          pointer-events: none;
          z-index: 30;
        }
        .emoji-burst-anim {
          position: absolute;
          left: 0; top: 0;
          font-size: 2.5rem;
          opacity: 0;
          animation: emojiBurstAnim 0.9s cubic-bezier(.4,0,.2,1) forwards;
        }
        @keyframes emojiBurstAnim {
          0% { opacity: 0; transform: scale(0.5) translate(0, 0); }
          20% { opacity: 1; transform: scale(1.2) translate(0, 0); }
          60% { opacity: 1; }
          100% { opacity: 0; transform: scale(0.7) translate(var(--burst-x), var(--burst-y)); }
        }
      `}</style>
      <div className="gradient-3d-bg absolute inset-0" aria-hidden="true" />
      {/* Emoji Burst Reaction */}
      {emojiBurst.length > 0 && (
        <div className="emoji-burst">
          {emojiBurst.map(({ icon, key, angle, distance }) => {
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = -Math.sin((angle * Math.PI) / 180) * distance;
            return (
              <span
                key={key}
                className="emoji-burst-anim"
                style={{
                  '--burst-x': `${x}px`,
                  '--burst-y': `${y}px`,
                } as React.CSSProperties}
              >
                {icon}
              </span>
            );
          })}
        </div>
      )}
      {/* Live Mood Badge with Glow, Pulse, and Tooltip */}
      <div className="absolute left-1/2 top-24 z-20 flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
        <span
          key={liveMoodBadge.key}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold animate-mood-bounce bg-white/80 text-lg relative cursor-pointer ${badgeGlow} animate-mood-pulse`}
          style={{ minWidth: 90, boxShadow: '0 0 16px 4px var(--tw-shadow-color)', transition: 'background 0.3s' }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="text-2xl" aria-label={liveMood}>{MOOD_MAP[liveMood].icon}</span>
          <span className="capitalize text-gray-700">{MOOD_MAP[liveMood].label}</span>
          {/* Tooltip */}
          {showTooltip && (
            <span className="absolute left-1/2 top-full mt-2 w-max max-w-xs px-3 py-2 bg-white/90 text-gray-700 text-sm rounded-lg shadow-lg border border-gray-200 z-50" style={{ transform: 'translateX(-50%)' }}>
              {MOOD_EXPLANATIONS[liveMood]}
            </span>
          )}
        </span>
      </div>
      <style>{`
        @keyframes mood-bounce {
          0% { transform: scale(0.8); opacity: 0.7; }
          40% { transform: scale(1.15); opacity: 1; }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-mood-bounce {
          animation: mood-bounce 0.5s;
        }
        @keyframes mood-pulse {
          0%, 100% { box-shadow: 0 0 16px 4px var(--tw-shadow-color); }
          50% { box-shadow: 0 0 32px 12px var(--tw-shadow-color); }
        }
        .animate-mood-pulse {
          animation: mood-pulse 1.5s infinite;
        }
      `}</style>
      {/* Floating Privacy Badge */}
      <div className="absolute top-6 right-8 z-10 flex items-center bg-white/80 rounded-full px-4 py-2 shadow-md text-sm font-medium">
        <span className="mr-2">🔒</span> Your thoughts are private
      </div>
      {/* Google Sign-In UI */}
      <div className="absolute top-6 left-8 z-10 flex items-center gap-4">
        {!user ? (
          <button onClick={handleSignIn} className="bg-white/80 hover:bg-white text-gray-800 px-4 py-2 rounded-lg shadow font-semibold transition">Sign in with Google</button>
        ) : (
          <>
            <span className="text-white/90 font-medium">{user.displayName || user.email}</span>
            <button onClick={handleSignOut} className="bg-white/80 hover:bg-white text-gray-800 px-4 py-2 rounded-lg shadow font-semibold transition">Sign out</button>
          </>
        )}
      </div>
      {/* Main journaling area */}
      <div className="w-full max-w-xl flex flex-col items-center mt-24 mb-8 z-10">
        <textarea
          ref={textareaRef}
          className="w-full min-h-[120px] max-h-60 p-6 rounded-2xl shadow-lg bg-white/80 focus:outline-none focus:ring-2 focus:ring-purple-300 text-lg resize-none transition-all duration-300"
          placeholder="What's on your mind? Start journaling..."
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={5}
        />
        <div className="flex w-full justify-between mt-4">
          <select
            className="rounded-lg px-3 py-2 bg-white/80 border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            value={filter}
            onChange={handleFilter}
          >
            <option value="all">All Moods</option>
            {Object.entries(MOOD_MAP).map(([key, val]) => (
              <option key={key} value={key}>{val.icon} {val.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={exportJSON} className="bg-blue-400 hover:bg-blue-500 text-white px-3 py-2 rounded-lg shadow transition">Export JSON</button>
            <button onClick={exportTXT} className="bg-purple-400 hover:bg-purple-500 text-white px-3 py-2 rounded-lg shadow transition">Export TXT</button>
          </div>
        </div>
      </div>
      {/* Mood Analytics */}
      {thoughts.length > 1 && (
        <div className="w-full max-w-xl mt-8 mb-4 z-10 bg-white/80 rounded-2xl shadow p-4 animate-fade-in">
          <div className="flex flex-wrap gap-6 items-center justify-between mb-4">
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500">Most Common Mood</span>
              <span className="text-2xl" aria-label={moodStats.mostCommon}>{MOOD_MAP[moodStats.mostCommon]?.icon || '😐'}</span>
              <span className="text-sm text-gray-700">{MOOD_MAP[moodStats.mostCommon]?.label || 'Neutral'}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500">Longest Streak</span>
              <span className="text-lg font-bold text-purple-700">{moodStats.streak}</span>
              <span className="text-sm text-gray-700">days</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500">Average Mood</span>
              <span className="text-2xl" aria-label={moodStats.avgMood}>{MOOD_MAP[moodStats.avgMood]?.icon || '😐'}</span>
              <span className="text-sm text-gray-700">{MOOD_MAP[moodStats.avgMood]?.label || 'Neutral'}</span>
            </div>
          </div>
          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moodChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis dataKey="moodIdx" domain={[0, MOOD_ORDER.length - 1]} tick={false} />
                <Tooltip formatter={(_, __, props) => MOOD_MAP[props.payload.mood]?.label || 'Neutral'} labelFormatter={d => `Date: ${d}`} />
                <Line type="monotone" dataKey="moodIdx" stroke="#8B5CF6" strokeWidth={3} dot={false} isAnimationActive={true} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {/* Calendar Heatmap */}
      {thoughts.length > 0 && (
        <div className="w-full max-w-xl mt-8 mb-4 z-10 bg-white/80 rounded-2xl shadow p-4 animate-fade-in">
          <div className="mb-2 text-sm font-semibold text-gray-700">Mood Calendar (last 90 days)</div>
          <div className="grid grid-cols-13 gap-1">
            {/* Weekday labels */}
            <div></div>
            {[...Array(13).keys()].map(i => (
              <div key={i} className="text-xs text-center text-gray-400">{i % 2 === 0 ? format(addDays(calendarData[0].date, i), 'EEE')[0] : ''}</div>
            ))}
            {/* Calendar squares */}
            {[...Array(7).keys()].map(week => (
              <React.Fragment key={week}>
                <div className="text-xs text-gray-400 text-right pr-1 pt-1" style={{ gridRow: week + 2, gridColumn: 1 }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][week]}
                </div>
                {[...Array(13).keys()].map(day => {
                  const idx = week + day * 7;
                  if (idx >= calendarData.length) return <div key={day} />;
                  const d = calendarData[idx];
                  const color = MOOD_MAP[d.mood]?.color || '#ECECEC';
                  return (
                    <div
                      key={day}
                      className="w-5 h-5 rounded cursor-pointer border border-white/40 hover:scale-110 transition relative group"
                      style={{ background: color, gridRow: week + 2, gridColumn: day + 2 }}
                      title={format(d.date, 'MMM d, yyyy') + (d.count ? `: ${MOOD_MAP[d.mood]?.label || d.mood}` : ': No entry')}
                    >
                      {d.count > 0 && (
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs opacity-60 group-hover:opacity-100">
                          {MOOD_MAP[d.mood]?.icon}
                        </span>
                      )}
                      {/* Tooltip */}
                      <span className="hidden group-hover:block absolute left-1/2 top-full mt-1 px-2 py-1 bg-white text-gray-700 text-xs rounded shadow z-50 whitespace-nowrap" style={{ transform: 'translateX(-50%)' }}>
                        {format(d.date, 'MMM d, yyyy')}<br />
                        {d.count > 0 ? `${MOOD_MAP[d.mood]?.icon} ${MOOD_MAP[d.mood]?.label}` : 'No entry'}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      {/* Reflection Modal */}
      {reflectionModal.open && reflectionModal.thought && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setReflectionModal({ open: false, thought: null })}
              aria-label="Close"
            >
              ×
            </button>
            <div className="mb-4">
              <div className="flex items-center gap-2 text-2xl mb-2">
                <span>{MOOD_MAP[reflectionModal.thought.mood]?.icon}</span>
                <span className="text-lg font-semibold">{MOOD_MAP[reflectionModal.thought.mood]?.label}</span>
              </div>
              <div className="text-gray-700 whitespace-pre-line mb-2">{reflectionModal.thought.text}</div>
              <div className="text-xs text-gray-400 mb-2">{new Date(reflectionModal.thought.timestamp).toLocaleString()}</div>
            </div>
            <textarea
              className="w-full min-h-[80px] p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 mb-4"
              placeholder="Add your reflection or follow-up note..."
              value={reflectionInput}
              onChange={e => setReflectionInput(e.target.value)}
            />
            <button
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg shadow font-semibold transition w-full"
              onClick={saveReflection}
            >
              Save Reflection
            </button>
          </div>
        </div>
      )}
      {/* Thoughts Feed */}
      <div className="w-full max-w-xl flex-1 overflow-y-auto space-y-4 pb-12 z-10">
        {filteredThoughts.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">Your thoughts will appear here...</div>
        ) : (
          filteredThoughts.map((thought, idx) => {
            const mood = MOOD_MAP[thought.mood] || MOOD_MAP['neutral'];
            return (
              <div
                key={thought.timestamp + idx}
                className="rounded-2xl shadow-md flex items-center px-6 py-4 fade-in cursor-pointer hover:scale-[1.02] transition"
                style={{ background: mood.color }}
                onClick={() => openReflection(thought)}
                title="Click to reflect"
              >
                <span className="text-2xl mr-4" aria-label={thought.mood}>{mood.icon}</span>
                <div className="flex-1">
                  <div className="text-base text-gray-800 whitespace-pre-line">{thought.text}</div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(thought.timestamp).toLocaleString()}</div>
                  {thought.reflection && (
                    <div className="mt-2 px-3 py-2 bg-purple-50 border-l-4 border-purple-300 rounded text-purple-800 text-sm animate-fade-in">
                      <span className="font-semibold">Reflection:</span> {thought.reflection}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.3s; }
      `}</style>
    </div>
  );
};

export default App;
