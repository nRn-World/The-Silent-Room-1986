import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// background music file URLs (Vite will copy these into the build)
const menuAudioUrl = new URL('../../Sounds/menu.mp3', import.meta.url).href;
function chapterAudioUrl(id: number) {
  return new URL(`../../Sounds/${id}.mp3`, import.meta.url).href;
}
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Zap, Droplets, Sun, Unlock, 
  AlertTriangle, BookOpen, Flame, Snowflake, Ghost, EyeOff, 
  Search, Fingerprint, Skull, MapPin, User
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import confetti from 'canvas-confetti';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types & Constants ---

type Language = 'en' | 'sv' | 'tr';

type KeywordEffectType = 'rain' | 'water' | 'blood' | 'red' | 'police' | 'thunder' | 'fire' | 'ghost' | 'cold' | 'heat' | 'wind' | 'dark';

export type ManifestationType = 'rain' | 'light' | 'heavy' | 'wall' | 'tangle' | 'open' | 'heat' | 'cold' | 'ghost' | 'fire' | 'gravity' | 'shield' | 'time' | 'blood' | 'mirror';

interface Manifestation {
  id: string;
  type: ManifestationType;
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

interface Enemy {
  id: string;
  type: 'standard' | 'heavy' | 'censor' | 'infiltrator';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  state: 'marching' | 'stunned' | 'retreating';
  shielded?: boolean;
}

interface Upgrades {
  oiledKeys: number;
  magicRibbon: number;
  soundProofing: number;
}

interface Chapter {
  id: number;
  title: string;
  text: string;
  goal: string;
  manifestationWords: Record<string, ManifestationType>;
  isBoss?: boolean;
}

const KEYWORD_EFFECTS: Record<KeywordEffectType, string[]> = {
  rain: ['rain', 'regn', 'yagmur', 'drizzle'],
  water: ['water', 'vatten', 'su', 'ocean', 'river', 'flood', 'wave'],
  blood: ['blood', 'blod', 'kan'],
  red: ['red', 'rod', 'kirmizi', 'scarlet', 'crimson'],
  police: ['police', 'polis', 'polisbil', 'siren', 'cop'],
  thunder: ['thunder', 'storm', 'blixt', 'aska', 'firtina', 'yildirim'],
  fire: ['fire', 'eld', 'ates', 'burn', 'flame'],
  ghost: ['ghost', 'spoke', 'hayalet', 'spirit', 'shadow'],
  cold: ['cold', 'kall', 'soguk', 'ice', 'frost', 'snow'],
  heat: ['heat', 'hot', 'varm', 'sicak', 'lava'],
  wind: ['wind', 'vind', 'ruzgar', 'gust', 'hurricane'],
  dark: ['dark', 'morker', 'karanlik', 'night', 'blackout'],
};

const KEYWORD_COOLDOWN_MS = 1400;

const normalizeForMatch = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');

const TRANSLATIONS: Record<Language, { ui: Record<string, string>, chapters: Chapter[] }> = {
  en: {
    ui: {
      points: "Revolution Points",
      accuracy: "Accuracy",
      progress: "Case Progress",
      initialize: "Start Investigation",
      upgrades: "Upgrades",
      restart: "Restart Case",
      next: "Next Chapter",
      victory: "Case Closed",
      gameover: "Investigation Terminated",
      typewriterMods: "Typewriter Modifications",
      return: "Return to Case",
      maxed: "Maxed",
      upgrade: "Upgrade",
      chapter: "Chapter",
      forbidden: "Classified File",
      audio: "Audio",
      active: "Active",
      initAudio: "Click to enable",
      langName: "English",
      detective: "Detective",
      truth: "The Truth",
      wrongGuess: "The Wrong Man",
    },
    chapters: [
      {
        id: 1,
        title: "The Body",
        goal: "Investigate the crime scene.",
        text: "The rain washes the blood from the pavement. I found the body in room 402. It was cold, like the silence of the city.",
        manifestationWords: { "rain": "rain", "blood": "blood", "body": "ghost", "cold": "cold" }
      },
      {
        id: 2,
        title: "The Clue",
        goal: "Find the missing evidence.",
        text: "I need more light to see the ribbon. There is a strange smell in the air. A key was left behind in the dark.",
        manifestationWords: { "light": "light", "key": "open", "dark": "ghost", "smell": "tangle" }
      },
      {
        id: 3,
        title: "The Witness",
        goal: "Interrogate the neighbor.",
        text: "The neighbor is like a ghost. She saw a shadow on the wall. We need to talk about what happened that night.",
        manifestationWords: { "ghost": "ghost", "shadow": "wall", "wall": "wall", "talk": "time" }
      },
      {
        id: 4,
        title: "The Pursuit",
        goal: "Chase the suspect.",
        text: "He is fast, moving through the street. Every wall is a barrier. The city is a maze of ink and steel.",
        manifestationWords: { "fast": "time", "street": "gravity", "wall": "wall", "ink": "rain" }
      },
      {
        id: 5,
        title: "The Wrong Man",
        goal: "Corner the suspect.",
        text: "The fire burns in his eyes. I will lock the door. This trap is set for the landlord. He must be the killer.",
        manifestationWords: { "fire": "fire", "lock": "shield", "trap": "tangle", "killer": "heavy" }
      },
      {
        id: 6,
        title: "The Verdict",
        goal: "Face the ultimate truth.",
        text: "The truth is hidden in the mirror. This is the end of the story. The ink reveals my own face. I was the one.",
        manifestationWords: { "truth": "light", "mirror": "shield", "end": "gravity", "ink": "rain" }
      }
    ]
  },
  sv: {
    ui: {
      points: "Revolutionspoäng",
      accuracy: "Träffsäkerhet",
      progress: "Fallframsteg",
      initialize: "Starta Utredning",
      upgrades: "Uppgraderingar",
      restart: "Starta om fallet",
      next: "Nästa kapitel",
      victory: "Fallet Avslutat",
      gameover: "Utredning Avbruten",
      typewriterMods: "Skrivmaskinsmodifieringar",
      return: "Återgå till fallet",
      maxed: "Maxad",
      upgrade: "Uppgradera",
      chapter: "Kapitel",
      forbidden: "Klassificerad fil",
      audio: "Ljud",
      active: "Aktivt",
      initAudio: "Klicka för att aktivera",
      langName: "Svenska",
      detective: "Detektiv",
      truth: "Sanningen",
      wrongGuess: "Fel Man",
    },
    chapters: [
      {
        id: 1,
        title: "Kroppen",
        goal: "Undersök brottsplatsen.",
        text: "Regnet tvättar blodet från trottoaren. Jag hittade kroppen i rum 402. Den var kall, som stadens tystnad.",
        manifestationWords: { "regn": "rain", "blod": "blood", "kropp": "ghost", "kall": "cold" }
      },
      {
        id: 2,
        title: "Ledtråden",
        goal: "Hitta det saknade beviset.",
        text: "Jag behöver mer ljus för att se bandet. Det finns en konstig lukt i luften. En nyckel lämnades kvar i mörkret.",
        manifestationWords: { "ljus": "light", "nyckel": "open", "mörker": "ghost", "lukt": "tangle" }
      },
      {
        id: 3,
        title: "Vittnet",
        goal: "Förhör grannen.",
        text: "Grannen är som ett spöke. Hon såg en skugga på väggen. Vi måste prata om vad som hände den natten.",
        manifestationWords: { "spöke": "ghost", "skugga": "wall", "vägg": "wall", "prata": "time" }
      },
      {
        id: 4,
        title: "Jakten",
        goal: "Jaga den misstänkte.",
        text: "Han är snabb, rör sig genom gatan. Varje vägg är ett hinder. Staden är en labyrint av bläck och stål.",
        manifestationWords: { "snabb": "time", "gata": "gravity", "vägg": "wall", "bläck": "rain" }
      },
      {
        id: 5,
        title: "Fel Man",
        goal: "Hörna den misstänkte.",
        text: "Elden brinner i hans ögon. Jag ska låsa dörren. Denna fälla är satt för hyresvärden. Han måste vara mördaren.",
        manifestationWords: { "eld": "fire", "lås": "shield", "fälla": "tangle", "mördare": "heavy" }
      },
      {
        id: 6,
        title: "Domen",
        goal: "Möt den ultimata sanningen.",
        text: "Sanningen är gömd i spegeln. Detta är slutet på historien. Bläcket avslöjar mitt eget ansikte. Det var jag.",
        manifestationWords: { "sanning": "light", "spegel": "shield", "slut": "gravity", "bläck": "rain" }
      }
    ]
  },
  tr: {
    ui: {
      points: "Devrim Puanları",
      accuracy: "Doğruluk",
      progress: "Vaka İlerlemesi",
      initialize: "Soruşturmayı Başlat",
      upgrades: "Geliştirmeler",
      restart: "Vakayı Yeniden Başlat",
      next: "Sonraki Bölüm",
      victory: "Vaka Çözüldü",
      gameover: "Soruşturma Sonlandırıldı",
      typewriterMods: "Daktilo Modifikasyonları",
      return: "Vakaya Dön",
      maxed: "Maksimum",
      upgrade: "Geliştir",
      chapter: "Bölüm",
      forbidden: "Gizli Dosya",
      audio: "Ses",
      active: "Aktif",
      initAudio: "Etkinleştirmek için tıkla",
      langName: "Türkçe",
      detective: "Dedektif",
      truth: "Gerçek",
      wrongGuess: "Yanlış Adam",
    },
    chapters: [
      {
        id: 1,
        title: "Ceset",
        goal: "Olay yerini incele.",
        text: "Yağmur kaldırımdaki kanı yıkıyor. Cesedi 402 numaralı odada buldum. Şehrin sessizliği gibi soğuktu.",
        manifestationWords: { "yağmur": "rain", "kan": "blood", "ceset": "ghost", "soğuk": "cold" }
      },
      {
        id: 2,
        title: "İpucu",
        goal: "Eksik kanıtı bul.",
        text: "Şeridi görmek için daha fazla ışığa ihtiyacım var. Havada garip bir koku var. Karanlıkta bir anahtar bırakılmış.",
        manifestationWords: { "ışık": "light", "anahtar": "open", "karanlık": "ghost", "koku": "tangle" }
      },
      {
        id: 3,
        title: "Tanık",
        goal: "Komşuyu sorgula.",
        text: "Komşu bir hayalet gibi. Duvarda bir gölge gördü. O gece neler olduğu hakkında konuşmamız lazım.",
        manifestationWords: { "hayalet": "ghost", "gölge": "wall", "duvar": "wall", "konuş": "time" }
      },
      {
        id: 4,
        title: "Takip",
        goal: "Şüpheliyi kovala.",
        text: "Hızlı, sokakta ilerliyor. Her duvar bir engel. Şehir bir mürekkep ve çelik labirenti.",
        manifestationWords: { "hızlı": "time", "sokak": "gravity", "duvar": "wall", "mürekkep": "rain" }
      },
      {
        id: 5,
        title: "Yanlış Adam",
        goal: "Şüpheliyi köşeye sıkıştır.",
        text: "Gözlerinde ateş yanıyor. Kapıyı kilitleyeceğim. Bu tuzak ev sahibi için kuruldu. Katil o olmalı.",
        manifestationWords: { "ateş": "fire", "kilit": "shield", "tuzak": "tangle", "katil": "heavy" }
      },
      {
        id: 6,
        title: "Karar",
        goal: "Nihai gerçekle yüzleş.",
        text: "Gerçek aynada gizli. Bu hikayenin sonu. Mürekkep kendi yüzümü ortaya çıkarıyor. O bendim.",
        manifestationWords: { "gerçek": "light", "ayna": "shield", "son": "gravity", "mürekkep": "rain" }
      }
    ]
  }
};

// --- Components ---

const CRTOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    <div className="absolute inset-0 animate-pulse bg-white/5 opacity-10" />
    <div className="scanline" />
  </div>
);

const GlitchEffect = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active && (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0, 0.3, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, repeat: Infinity }}
        className="fixed inset-0 z-40 bg-red-500/10 pointer-events-none mix-blend-overlay"
      />
    )}
  </AnimatePresence>
);

export default function Game() {
  const [lang, setLang] = useState<Language>('en');
  const [chapterIndex, setChapterIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [gameState, setGameState] = useState<'narrative' | 'playing' | 'gameover' | 'victory' | 'upgrading'>('narrative');
  const [shake, setShake] = useState(0);
  const [isHeavy, setIsHeavy] = useState(false);
  const [isCold, setIsCold] = useState(false);
  const [isHeat, setIsHeat] = useState(false);
  const [isGravity, setIsGravity] = useState(false);
  const [isShielded, setIsShielded] = useState(false);
  const [isTimeSlowed, setIsTimeSlowed] = useState(false);
  const [isRaining, setIsRaining] = useState(false);
  const [isWaterPulse, setIsWaterPulse] = useState(false);
  const [isPoliceAlert, setIsPoliceAlert] = useState(false);
  const [bloodFlash, setBloodFlash] = useState(false);
  const [redFlash, setRedFlash] = useState(false);
  const [stormFlash, setStormFlash] = useState(false);
  const [darkFlash, setDarkFlash] = useState(false);
  const [ghostFog, setGhostFog] = useState(false);
  const [windRush, setWindRush] = useState(false);
  const [revolutionPoints, setRevolutionPoints] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrades>({
    oiledKeys: 0,
    magicRibbon: 0,
    soundProofing: 0
  });
  const typingInputRef = useRef<HTMLInputElement>(null);
  const manifestationTriggeredRef = useRef(false);
  const lastKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const KEY_DEBOUNCE_MS = 80;
  const isTypingRef = useRef(false);

  const t = TRANSLATIONS[lang];
  const chapter = t.chapters[chapterIndex];
  const level = chapterIndex + 1;
  const rank = useMemo(() => Math.max(1, 1 + Math.floor((revolutionPoints + chapterIndex * 180) / 700)), [revolutionPoints, chapterIndex]);

  // Audio Logic
  const audioCtxRef = useRef<AudioContext | null>(null);
  // HTMLAudioElement reference used for looping background music
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const keywordCooldownRef = useRef<Record<KeywordEffectType, number>>({
    rain: 0,
    water: 0,
    blood: 0,
    red: 0,
    police: 0,
    thunder: 0,
    fire: 0,
    ghost: 0,
    cold: 0,
    heat: 0,
    wind: 0,
    dark: 0,
  });

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // manage background music when the state changes
  useEffect(() => {
    if (!bgAudioRef.current) {
      bgAudioRef.current = new Audio();
      bgAudioRef.current.loop = true;
    }
    const audioEl = bgAudioRef.current;
    if (gameState === 'narrative') {
      audioEl.src = menuAudioUrl;
      initAudio();
      audioEl.play().catch(() => {});
    } else if (gameState === 'playing') {
      audioEl.src = chapterAudioUrl(chapter.id);
      initAudio();
      audioEl.play().catch(() => {});
    } else {
      // pause on other screens (upgrading, gameover, victory)
      audioEl.pause();
    }
  }, [gameState, chapter.id, initAudio]);

  // listen for first user interaction to unlock autoplay restrictions
  useEffect(() => {
    const onFirstClick = () => {
      initAudio();
      bgAudioRef.current?.play().catch(() => {});
      document.removeEventListener('click', onFirstClick);
    };
    document.addEventListener('click', onFirstClick, { once: true });
    return () => document.removeEventListener('click', onFirstClick);
  }, [initAudio]);

  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  const playSound = useCallback((type: 'click' | 'bell' | 'backspace' | 'glitch' | 'siren' | 'thunder') => {
    const ctx = initAudio();
    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150 + Math.random() * 50, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'bell') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'backspace') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'glitch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(20, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'siren') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(980, now + 0.8);
      osc.frequency.linearRampToValueAtTime(620, now + 1.6);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.6);
    } else if (type === 'thunder') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    }
  }, [initAudio]);

  // Handle Manifestations
  const pulseState = (setter: React.Dispatch<React.SetStateAction<boolean>>, duration: number) => {
    setter(true);
    setTimeout(() => setter(false), duration);
  };

  const triggerManifestation = useCallback((type: ManifestationType) => {
    const id = Math.random().toString(36).slice(2, 11);
    const newManifestation: Manifestation = {
      id,
      type,
      x: Math.random() * 80 + 10,
      y: Math.random() * 50 + 10,
      startTime: Date.now(),
      duration: 5000 + (upgrades.magicRibbon * 2000),
    };
    setManifestations(prev => [...prev, newManifestation]);
    setShake(15);
    setTimeout(() => setShake(0), 150);

    if (type === 'light') {
      setEnemies(prev => prev.map(e => ({ ...e, state: 'stunned' })));
      setTimeout(() => setEnemies(prev => prev.map(e => ({ ...e, state: 'marching' }))), 3000);
    }
    if (type === 'rain') {
      pulseState(setIsRaining, 2500);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: ['#60a5fa'] });
    }
    if (type === 'fire') {
      pulseState(setIsHeat, 2200);
      setEnemies(prev => prev.map(e => ({ ...e, health: e.health - 100 })));
    }
    if (type === 'blood') {
      pulseState(setBloodFlash, 1800);
      setEnemies(prev => prev.map(e => ({ ...e, health: e.health - 130 })));
    }
    if (type === 'cold') {
      setIsCold(true);
      setTimeout(() => setIsCold(false), 4000);
    }
    if (type === 'wall') {
      setEnemies(prev => prev.map(e => ({ ...e, x: Math.max(0, e.x - 20) })));
    }
    if (type === 'time') {
      setIsTimeSlowed(true);
      setTimeout(() => setIsTimeSlowed(false), 5000);
    }
    if (type === 'gravity') {
      setIsGravity(true);
      setTimeout(() => setIsGravity(false), 3000);
    }
    if (type === 'shield') {
      setIsShielded(true);
      setTimeout(() => setIsShielded(false), 5000);
    }
    if (type === 'heavy') {
      pulseState(setIsHeavy, 1500);
    }
    if (type === 'heat') {
      pulseState(setIsHeat, 1600);
    }
    if (type === 'mirror') {
      pulseState(setDarkFlash, 1800);
    }
  }, [upgrades.magicRibbon]);

  const triggerKeywordEffect = useCallback((effect: KeywordEffectType) => {
    if (effect === 'rain') triggerManifestation('rain');
    if (effect === 'water') {
      pulseState(setIsWaterPulse, 1500);
      triggerManifestation('rain');
    }
    if (effect === 'blood') triggerManifestation('blood');
    if (effect === 'red') pulseState(setRedFlash, 1400);
    if (effect === 'police') {
      pulseState(setIsPoliceAlert, 2200);
      playSound('siren');
    }
    if (effect === 'thunder') {
      pulseState(setStormFlash, 1200);
      playSound('thunder');
    }
    if (effect === 'fire') triggerManifestation('fire');
    if (effect === 'ghost') {
      pulseState(setGhostFog, 1800);
      triggerManifestation('ghost');
    }
    if (effect === 'cold') triggerManifestation('cold');
    if (effect === 'heat') triggerManifestation('heat');
    if (effect === 'wind') pulseState(setWindRush, 1500);
    if (effect === 'dark') pulseState(setDarkFlash, 1800);
  }, [playSound, triggerManifestation]);

  // Typing Logic – en enda window-lyssnare (ref så att vi aldrig får dubbel registrering)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    if (e.repeat) return;
    if (isTypingRef.current) return;
    
    const isFromInput = (e.target as HTMLElement)?.getAttribute?.('data-testid') === 'typing-input';
    if (isFromInput) e.preventDefault();

    if (e.key === 'Backspace') {
      const now = Date.now();
      if (now - lastKeyRef.current.time < KEY_DEBOUNCE_MS && lastKeyRef.current.key === 'Backspace') return;
      lastKeyRef.current = { key: 'Backspace', time: now };
      playSound('backspace');
      setTypedText(prev => prev.slice(0, -1));
      return;
    }

    if (e.key.length === 1) {
      const now = Date.now();
      if (now - lastKeyRef.current.time < KEY_DEBOUNCE_MS && lastKeyRef.current.key === e.key) return;
      lastKeyRef.current = { key: e.key, time: now };

      isTypingRef.current = true;
      setTimeout(() => { isTypingRef.current = false; }, 50);
      
      playSound('click');
      manifestationTriggeredRef.current = false;
      const char = e.key;
      setTypedText(prev => {
        const next = prev + char;
        const normalized = normalizeForMatch(next);

        Object.entries(chapter.manifestationWords).forEach(([word, type]) => {
          if (normalized.endsWith(normalizeForMatch(word))) {
            manifestationTriggeredRef.current = true;
            triggerManifestation(type);
          }
        });

        (Object.keys(KEYWORD_EFFECTS) as KeywordEffectType[]).forEach((effect) => {
          const match = KEYWORD_EFFECTS[effect].some(word => normalized.endsWith(normalizeForMatch(word)));
          const now = Date.now();
          if (match && now - keywordCooldownRef.current[effect] > KEYWORD_COOLDOWN_MS) {
            keywordCooldownRef.current[effect] = now;
            manifestationTriggeredRef.current = true;
            triggerKeywordEffect(effect);
          }
        });

        return next;
      });
    }
  }, [gameState, chapter, triggerManifestation, triggerKeywordEffect, playSound, lang]);

  const handleKeyDownRef = useRef(handleKeyDown);
  handleKeyDownRef.current = handleKeyDown;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      handleKeyDownRef.current(e);
      // Om tangenten kom från vår typing-input: stoppa så den inte når input/bubblar (undviker dubbel bokstav)
      if ((e.target as HTMLElement)?.getAttribute?.('data-testid') === 'typing-input') {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    // Capture-fas: vi hanterar FÖRE eventet når input, så bara en hantering
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // Fokus på input INTE – det orsakade dubbla bokstäver. E2E kan själva fokusera input vid behov.

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setManifestations(prev => prev.filter(m => Date.now() - m.startTime < m.duration));

      // Move enemies
      setEnemies(prev => {
        const next = prev.map(e => {
          if (e.state === 'stunned') return e;
          let moveSpeed = e.speed;
          if (isTimeSlowed) moveSpeed *= 0.3;
          if (isHeavy) moveSpeed *= 0.88;
          
          // Censor Effect: Deletes text if close
          if (e.type === 'censor' && e.x > 78 && Math.random() < 0.04) {
            setTypedText(t => t.slice(0, -1));
            playSound('glitch');
          }

          return { ...e, x: e.x + moveSpeed };
        }).filter(e => e.health > 0);
        
        if (!isShielded && next.some(e => e.x > 85)) {
          setGameState('gameover');
        }
        
        return next;
      });

      // Spawn enemies with progressive level/rank scaling
      const chapterFactor = 1 + (chapterIndex * 0.28);
      const rankFactor = 1 + ((rank - 1) * 0.1);
      const spawnRate = Math.min(0.085, 0.0025 * chapterFactor * rankFactor * (1 - upgrades.soundProofing * 0.12));
      const maxEnemies = 5 + chapterIndex * 2 + Math.floor(rank / 2);
      if (enemiesRef.current.length < maxEnemies && Math.random() < spawnRate) {
        const typeRoll = Math.random();
        let type: Enemy['type'] = 'standard';
        let health = 62 + chapterIndex * 16 + rank * 5;
        let speed = 0.06 + chapterIndex * 0.017 + rank * 0.006 + Math.random() * 0.05;

        // Introduce enemy types progressively
        const activeCensors = enemiesRef.current.filter(e => e.type === 'censor').length;
        if (level >= 5 && typeRoll > 0.84 && activeCensors < 2) {
          type = 'censor';
          speed = 0.07 + (chapterIndex * 0.01);
          health = 110 + chapterIndex * 12 + rank * 8;
        } else if (level >= 3 && typeRoll > 0.66) {
          type = 'infiltrator';
          speed = 0.1 + chapterIndex * 0.018 + rank * 0.004;
        } else if (level >= 4 && typeRoll > 0.52) {
          type = 'heavy';
          health = 170 + chapterIndex * 20 + rank * 14;
          speed = 0.05 + chapterIndex * 0.008;
        }

        setEnemies(prev => [...prev, {
          id: Math.random().toString(),
          type,
          x: 0,
          y: Math.random() * 60 + 20,
          health,
          maxHealth: health,
          speed,
          state: 'marching'
        }]);
      }

      // Check for victory – only when the player has typed every character and none are wrong
      if (typedText.length >= chapter.text.length) {
        const allCorrect = typedText.split('').every((ch, idx) => ch === chapter.text[idx]);
        if (allCorrect) {
          setGameState('victory');
          setRevolutionPoints(prev => prev + (chapter.id * 120) + (rank * 20));
          playSound('bell');
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [gameState, typedText, chapter, chapterIndex, level, rank, isHeavy, isTimeSlowed, isShielded, upgrades.soundProofing, playSound]);

  const buyUpgrade = (key: keyof Upgrades) => {
    const cost = (upgrades[key] + 1) * 150;
    if (revolutionPoints >= cost && upgrades[key] < 3) {
      setRevolutionPoints(prev => prev - cost);
      setUpgrades(prev => ({ ...prev, [key]: prev[key] + 1 }));
    }
  };

  const startChapter = () => {
    initAudio();
    setTypedText("");
    setManifestations([]);
    setEnemies([]);
    setGameState('playing');
    setIsHeavy(false);
    setIsCold(false);
    setIsHeat(false);
    setIsGravity(false);
    setIsShielded(false);
    setIsTimeSlowed(false);
    setIsRaining(false);
    setIsWaterPulse(false);
    setIsPoliceAlert(false);
    setBloodFlash(false);
    setRedFlash(false);
    setStormFlash(false);
    setDarkFlash(false);
    setGhostFog(false);
    setWindRush(false);
  };

  return (
    <div className={cn(
      "relative min-h-screen w-full bg-[#0a0a0a] text-[#c0c0c0] font-mono overflow-hidden selection:bg-[#f27d26] selection:text-black transition-all duration-1000",
      isCold && "bg-blue-950/20",
      isHeat && "bg-orange-950/20"
    )}>
      <CRTOverlay />
      <GlitchEffect active={enemies.some(e => e.type === 'censor' && e.x > 70)} />

      {isRaining && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden opacity-40">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-14 w-[2px] bg-gradient-to-b from-sky-200/0 to-sky-300 animate-[rain_1s_linear_infinite]"
              style={{ left: `${(i * 7) % 100}%`, top: `${(i * 11) % 100}%`, animationDelay: `${(i % 10) * 0.08}s` }}
            />
          ))}
        </div>
      )}
      {isPoliceAlert && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-y-0 left-[-35%] w-1/3 bg-blue-500/20 animate-[policeMove_2s_linear_forwards]" />
          <div className="absolute inset-y-0 right-[-35%] w-1/3 bg-red-500/20 animate-[policeMoveReverse_2s_linear_forwards]" />
          <div className="absolute bottom-12 left-0 text-5xl animate-[drive_2s_linear_forwards]">🚓</div>
          <div className="absolute bottom-20 left-[-8rem] text-5xl animate-[drive_2.1s_linear_forwards]">🚔</div>
        </div>
      )}
      {bloodFlash && <div className="pointer-events-none fixed inset-0 z-40 bg-red-900/45 animate-pulse" />}
      {redFlash && <div className="pointer-events-none fixed inset-0 z-40 bg-red-500/20" />}
      {stormFlash && <div className="pointer-events-none fixed inset-0 z-40 bg-white/35 animate-pulse" />}
      {darkFlash && <div className="pointer-events-none fixed inset-0 z-40 bg-black/45" />}
      {ghostFog && <div className="pointer-events-none fixed inset-0 z-40 bg-slate-200/10 backdrop-blur-sm" />}
      {windRush && <div className="pointer-events-none fixed inset-0 z-40 bg-cyan-200/10" />}
      {isWaterPulse && <div className="pointer-events-none fixed inset-0 z-40 bg-sky-500/20" />}
      
      {/* Background Room Layer */}
      <div 
        className={cn(
          "absolute inset-0 transition-transform duration-100",
          isGravity && "animate-bounce"
        )}
        style={{ transform: `translate(${Math.random() * shake}px, ${Math.random() * shake}px)` }}
      >
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/detective/1920/1080?blur=10')] bg-cover opacity-10" />
        
        {/* Manifestations */}
        <AnimatePresence>
          {manifestations.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1, y: isGravity ? -200 : 0 }}
              exit={{ opacity: 0, scale: 2 }}
              className="absolute pointer-events-none"
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
            >
              <div className="relative">
                <div className="absolute inset-0 blur-xl bg-white/5 rounded-full" />
                {m.type === 'rain' && <Droplets className="text-blue-400 w-12 h-12 animate-bounce" />}
                {m.type === 'light' && <Sun className="text-yellow-200 w-24 h-24 animate-pulse blur-sm" />}
                {m.type === 'ghost' && <Ghost className="text-white/40 w-20 h-20 animate-pulse" />}
                {m.type === 'fire' && <Flame className="text-red-500 w-20 h-20 animate-bounce" />}
                {m.type === 'blood' && <Flame className="text-red-700 w-20 h-20 animate-pulse" />}
                {m.type === 'heat' && <Flame className="text-orange-300 w-20 h-20 animate-pulse" />}
                {m.type === 'mirror' && <div className="w-12 h-20 border-2 border-white/40 bg-white/10 rounded" />}
                {m.type === 'wall' && <div className="w-6 h-40 bg-gray-800 border-2 border-gray-600 rounded" />}
                {m.type === 'cold' && <Snowflake className="text-blue-200 w-16 h-16 animate-spin-slow" />}
                {m.type === 'shield' && <div className="w-32 h-32 border-4 border-blue-400/30 rounded-full animate-pulse" />}
                {m.type === 'open' && <Unlock className="text-amber-400 w-12 h-12" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Enemies */}
        {enemies.map(e => (
          <motion.div
            key={e.id}
            data-testid="enemy"
            className="absolute flex flex-col items-center z-20"
            style={{ left: `${e.x}%`, top: `${e.y}%` }}
            animate={{ y: isGravity ? -300 : 0 }}
          >
            <div className={cn(
              "p-2 bg-red-900/40 border border-red-500/50 rounded text-red-500 shadow-lg",
              e.state === 'stunned' && "animate-pulse brightness-150",
              e.type === 'censor' && "bg-blue-900/40 border-blue-500 text-blue-500",
              e.type === 'infiltrator' && "bg-purple-900/40 border-purple-500 text-purple-500",
              e.type === 'heavy' && "bg-gray-900/80 border-gray-400 text-gray-400 scale-125"
            )}>
              {e.type === 'standard' && <AlertTriangle className="w-6 h-6" />}
              {e.type === 'censor' && <EyeOff className="w-6 h-6" />}
              {e.type === 'infiltrator' && <Fingerprint className="w-6 h-6" />}
              {e.type === 'heavy' && <Shield className="w-8 h-8" />}
            </div>
            <div className="w-full h-1 bg-gray-800 mt-1 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${(e.health / e.maxHealth) * 100}%` }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* UI Layer */}
      <div className={cn(
        "relative z-30 flex flex-col h-screen p-8 max-w-5xl mx-auto transition-all duration-500",
        isHeavy && "scale-95 blur-[0.5px] brightness-75",
        isShielded && "ring-8 ring-blue-400/20 rounded-3xl"
      )}>
        {/* Header */}
        <div className="flex justify-between items-start mb-12 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#f27d26] rounded flex items-center justify-center text-black">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-display tracking-tighter text-[#f27d26] uppercase italic leading-none">
                The Silent Room 1986
              </h1>
              <p className="text-[10px] opacity-50 uppercase tracking-[0.3em] mt-2 font-bold">
                {t.ui.chapter} {chapter.id}: {chapter.title} // {t.ui.forbidden}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {(['en', 'sv', 'tr'] as Language[]).map(l => (
                <button 
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "px-2 py-1 text-[10px] border rounded transition-all",
                    lang === l ? "bg-[#f27d26] text-black border-[#f27d26]" : "border-white/20 hover:border-white/50"
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="text-right">
              <div className="text-[10px] opacity-50 uppercase font-bold tracking-widest">{t.ui.points}: {revolutionPoints}</div>
              <div className="text-[10px] opacity-50 uppercase font-bold tracking-widest">LEVEL {level} // RANK {rank}</div>
              <div className="text-[8px] opacity-30 uppercase font-bold tracking-widest mt-1">
                {t.ui.audio}: {audioCtxRef.current?.state === 'running' ? t.ui.active : t.ui.initAudio}
              </div>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col justify-center">
          {gameState === 'narrative' && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/90 p-10 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl mx-auto"
              data-testid="game-menu"
            >
              <div className="flex items-center gap-4 mb-8" data-testid="chapter-goal">
                <BookOpen className="w-10 h-10 text-[#f27d26]" aria-hidden />
                <div>
                  <span className="text-[10px] uppercase opacity-70 block mb-1">Chapter Goal</span>
                  <h2 className="text-2xl font-display uppercase italic text-white">{chapter.goal}</h2>
                </div>
              </div>
              <p className="text-xl leading-relaxed opacity-80 mb-10 font-light narrative text" data-testid="narrative-text">
                {chapter.id === 1 ? (lang === 'sv' ? "Staden sover, men brottet vilar aldrig. Din skrivmaskin är ditt enda vittne." : lang === 'tr' ? "Şehir uyuyor ama suç asla dinlenmez. Daktilon senin tek tanığın." : "The city sleeps, but crime never rests. Your typewriter is your only witness.") : (lang === 'sv' ? "Sanningen kommer fram, bokstav för bokstav." : lang === 'tr' ? "Gerçek ortaya çıkıyor, harf harf." : "The truth emerges, letter by letter.")}
                <span className="block mt-4 text-[#f27d26] font-bold italic">
                  "{lang === 'sv' ? "Bläcket ljuger aldrig." : lang === 'tr' ? "Mürekkep asla yalan söylemez." : "The ink never lies."}"
                </span>
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={startChapter}
                  className="group relative flex-1 px-8 py-5 bg-[#f27d26] text-black font-black uppercase tracking-[0.2em] overflow-hidden rounded-lg hover:bg-white transition-all"
                  data-testid="start-investigation"
                >
                  <span className="relative z-10">{t.ui.initialize}</span>
                  <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
                <button 
                  onClick={() => chapterIndex > 0 && setGameState('upgrading')}
                  disabled={chapterIndex === 0}
                  className="px-8 py-5 bg-white/10 text-white font-black uppercase tracking-[0.2em] rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="upgrades-button"
                  aria-label={t.ui.upgrades}
                >
                  {t.ui.upgrades}
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'upgrading' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-black/95 p-10 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl max-w-3xl mx-auto w-full"
              data-testid="upgrade-shop"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-display uppercase italic text-[#f27d26]">{t.ui.typewriterMods}</h2>
                <div className="text-xl font-bold">{t.ui.points}: {revolutionPoints}</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                  { id: 'oiledKeys', name: 'Oiled Keys', icon: Zap },
                  { id: 'magicRibbon', name: 'Magic Ribbon', icon: Flame },
                  { id: 'soundProofing', name: 'Sound Proofing', icon: Shield },
                ].map((u) => {
                  const level = upgrades[u.id as keyof Upgrades];
                  const cost = (level + 1) * 150;
                  return (
                    <div key={u.id} className="p-6 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center text-center">
                      <u.icon className="w-10 h-10 text-[#f27d26] mb-4" aria-hidden />
                      <h3 className="text-lg font-bold mb-2">{u.name}</h3>
                      <div className="flex gap-1 mb-6">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={cn("w-4 h-1 rounded", i <= level ? "bg-[#f27d26]" : "bg-white/10")} />
                        ))}
                      </div>
                      <button 
                        onClick={() => buyUpgrade(u.id as keyof Upgrades)}
                        disabled={revolutionPoints < cost || level >= 3}
                        className="w-full py-2 bg-white/10 rounded font-bold text-xs uppercase hover:bg-[#f27d26] hover:text-black disabled:opacity-30 transition-all"
                      >
                        {level >= 3 ? t.ui.maxed : `${t.ui.upgrade} (${cost})`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => setGameState('narrative')}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-lg hover:bg-[#f27d26] transition-all"
                data-testid="return-to-case"
              >
                {t.ui.return}
              </button>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <div className="space-y-12">
              {/* Ingen dold input under spel – orsakade dubbla bokstäver. E2E kan använda document.body + keyboard. */}
              {/* Target Text Display */}
              <div className="text-3xl leading-[1.6] font-medium max-w-4xl mx-auto" data-testid="story-text">
                {chapter.text.split('').map((char, i) => {
                  let color = "text-white/10";
                  let decoration = "";
                  
                  // Scramble effect from Infiltrators
                  let displayChar = char;
                  const infiltrators = enemies.filter(e => e.type === 'infiltrator' && e.x > 50).length;
                  if (i > typedText.length && Math.random() < infiltrators * 0.05) {
                    displayChar = String.fromCharCode(33 + Math.floor(Math.random() * 94));
                  }

                  if (i < typedText.length) {
                    if (typedText[i] === char) {
                      color = "text-[#f27d26] drop-shadow-[0_0_8px_rgba(242,125,38,0.5)]";
                    } else {
                      color = "text-red-500 bg-red-500/20";
                      decoration = "underline decoration-red-500";
                    }
                  }
                  return (
                    <span key={i} className={cn(
                      "transition-all duration-200",
                      color, 
                      decoration,
                      i === typedText.length && "bg-white/20 animate-pulse border-l-2 border-[#f27d26]"
                    )}>
                      {displayChar}
                    </span>
                  );
                })}
              </div>

              {/* Typing Feedback */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#f27d26] to-amber-500 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                <div className="relative h-32 bg-black/60 border border-white/10 p-6 rounded-lg flex items-center justify-center overflow-hidden">
                  <div className="text-5xl font-black tracking-[0.3em] text-white/5 uppercase select-none">
                    {typedText.slice(-12) || "INVESTIGATING"}
                    <span className="animate-pulse text-[#f27d26]">_</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {gameState === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-950/90 p-12 border-4 border-red-500 text-center rounded-2xl shadow-2xl max-w-2xl mx-auto"
              data-testid="game-over-modal"
              role="dialog"
              aria-label="Game Over"
            >
              <Skull className="w-24 h-24 text-red-500 mx-auto mb-6 animate-bounce" aria-hidden />
              <span className="sr-only">Game Over</span>
              <h2 className="text-5xl font-display uppercase italic tracking-tighter mb-4 text-white">{t.ui.gameover}</h2>
              <p className="text-xl mb-10 opacity-80">{lang === 'sv' ? "Du kom för nära sanningen. Fallet är stängt för alltid." : lang === 'tr' ? "Gerçeğe çok yaklaştın. Vaka sonsuza dek kapandı." : "You got too close to the truth. The case is closed forever."}</p>
              <button 
                onClick={startChapter}
                className="w-full px-8 py-5 bg-red-500 text-white font-black uppercase tracking-widest hover:bg-white hover:text-red-500 transition-all rounded-lg"
                data-testid="restart-case"
              >
                {t.ui.restart}
              </button>
            </motion.div>
          )}

          {gameState === 'victory' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-950/90 p-12 border-4 border-green-500 text-center rounded-2xl shadow-2xl max-w-2xl mx-auto"
              data-testid="victory-screen"
              role="dialog"
              aria-label="Victory"
            >
              <Fingerprint className="w-24 h-24 text-green-500 mx-auto mb-6 animate-pulse" aria-hidden />
              <h2 className="text-5xl font-display uppercase italic tracking-tighter mb-4 text-white">
                <span data-testid="victory-heading">Victory</span> — {t.ui.victory}
              </h2>
              <p className="text-xl mb-10 opacity-80">
                {chapter.id === 5 ? t.ui.wrongGuess : chapter.id === 6 ? t.ui.truth : t.ui.progress}
              </p>
              <button 
                onClick={() => {
                  if (chapterIndex < t.chapters.length - 1) {
                    setChapterIndex(prev => prev + 1);
                    setGameState('narrative');
                  } else {
                    setChapterIndex(0);
                    setGameState('narrative');
                  }
                }}
                className="w-full px-8 py-5 bg-green-500 text-white font-black uppercase tracking-widest hover:bg-white hover:text-green-500 transition-all rounded-lg"
                data-testid="next-chapter"
              >
                {chapterIndex < t.chapters.length - 1 ? t.ui.next : t.ui.restart}
              </button>
            </motion.div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-12 grid grid-cols-4 gap-8 border-t border-white/10 pt-8">
          <div className="space-y-2">
            <div className="text-[10px] uppercase opacity-50 font-bold tracking-widest">{t.ui.detective}</div>
            <div className="text-3xl font-display italic text-[#f27d26] flex items-center gap-2">
              <User className="w-6 h-6" /> {lang.toUpperCase()}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] uppercase opacity-50 font-bold tracking-widest">{t.ui.accuracy}</div>
            <div className="text-3xl font-display italic text-white">98%</div>
          </div>
          <div className="col-span-2 space-y-2">
            <div className="flex justify-between items-end">
              <div className="text-[10px] uppercase opacity-50 font-bold tracking-widest">{t.ui.progress}</div>
              <div className="text-[10px] font-bold text-[#f27d26]">
                {Math.round((typedText.length / chapter.text.length) * 100)}%
              </div>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10" data-testid="progress-bar">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#f27d26] to-amber-400" 
                initial={{ width: 0 }}
                animate={{ width: `${(typedText.length / chapter.text.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 50 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ambient Visuals */}
      <div className="fixed bottom-6 right-8 flex items-center gap-6 opacity-20 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          <span className="text-[10px] uppercase font-bold tracking-widest">Room 402 // 1986</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3" />
          <span className="text-[10px] uppercase font-bold tracking-widest">Evidence: Secured</span>
        </div>
      </div>
    </div>
  );
}


