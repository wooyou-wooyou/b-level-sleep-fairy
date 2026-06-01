import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Bell, Monitor, Smartphone, Gamepad2, Brain, Coffee, AlertTriangle, Type, MousePointer2, Zap } from "lucide-react";

// --- Types ---
type HomeworkLevel = "10min" | "hard" | "allnight" | "giveup";
type DistractionLevel = "none" | "1hour" | "3hours" | "doom";
type AlarmType = "11PM" | "2AM" | "MORNING" | null;

interface ResultData {
  sleepHours: number;
  message: string;
  status: "bad" | "meh" | "good";
}

// --- Constants ---
const HOMEWORK_HOURS: Record<HomeworkLevel, number> = {
  "10min": 0.2,
  "hard": 1.5,
  "allnight": 4.5,
  "giveup": 0,
};

const DISTRACTION_HOURS: Record<DistractionLevel, number> = {
  "none": 0,
  "1hour": 1,
  "3hours": 3,
  "doom": 6,
};

const TOTAL_AVAILABLE_HOURS = 9; // 10 PM to 7 AM

const MISSION_TEXT = "나는 알고리즘의 노예입니다. 지금 당장 릴스와 쇼츠를 끄겠습니다.";

// --- Components ---

const Stickman = ({ sleepHours, isShaking }: { sleepHours: number; isShaking?: boolean }) => {
  const darkCircleOpacity = sleepHours < 3 ? 0.8 : sleepHours < 6 ? 0.4 : 0.1;
  const isDead = sleepHours <= 1;

  return (
    <motion.div 
      animate={isShaking ? { x: [-2, 2, -2, 2, 0], y: [-2, 2, 2, -2, 0] } : {}}
      transition={{ repeat: Infinity, duration: 0.1 }}
      className="relative w-32 h-32 flex items-center justify-center bg-white border-2 border-black pixel-border"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="30" r="15" fill="none" stroke="black" strokeWidth="2" />
        {isDead ? (
          <>
            <path d="M42 28 L48 32 M48 28 L42 32" stroke="black" strokeWidth="2" />
            <path d="M52 28 L58 32 M58 28 L52 32" stroke="black" strokeWidth="2" />
          </>
        ) : (
          <>
            <circle cx="45" cy="28" r="2" fill="black" />
            <circle cx="55" cy="28" r="2" fill="black" />
          </>
        )}
        <path 
          d="M40 35 Q45 40 50 35 Q55 40 60 35" 
          fill="none" 
          stroke="purple" 
          strokeWidth="3" 
          opacity={darkCircleOpacity} 
        />
        <path 
          d={sleepHours < 3 ? "M40 40 Q50 35 60 40" : "M40 40 Q50 45 60 40"} 
          fill="none" 
          stroke="black" 
          strokeWidth="2" 
        />
        <line x1="50" y1="45" x2="50" y2="75" stroke="black" strokeWidth="2" />
        <line x1="50" y1="55" x2="30" y2="65" stroke="black" strokeWidth="2" />
        <line x1="50" y1="55" x2="70" y2="65" stroke="black" strokeWidth="2" />
        <line x1="50" y1="75" x2="35" y2="95" stroke="black" strokeWidth="2" />
        <line x1="50" y1="75" x2="65" y2="95" stroke="black" strokeWidth="2" />
      </svg>
      {isDead && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-1 font-bold animate-pulse">
          RIP
        </div>
      )}
    </motion.div>
  );
};

const Notification = ({ message, time }: { message: string; time: string; key?: React.Key }) => (
  <motion.div 
    initial={{ x: 300, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: 300, opacity: 0 }}
    className="win95-box w-64 mb-2 overflow-hidden"
  >
    <div className="win95-title-bar">
      <div className="flex items-center gap-1">
        <Bell size={12} />
        <span>System Alert</span>
      </div>
      <X size={12} className="cursor-pointer" />
    </div>
    <div className="p-2 text-xs font-mono">
      <div className="text-gray-600 mb-1">[{time}]</div>
      <div>{message}</div>
    </div>
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [homework, setHomework] = useState<HomeworkLevel>("10min");
  const [distraction, setDistraction] = useState<DistractionLevel>("none");
  const [result, setResult] = useState<ResultData | null>(null);
  const [notifications, setNotifications] = useState<{ id: number; msg: string; time: string }[]>([]);
  
  // Alarm States
  const [activeAlarm, setActiveAlarm] = useState<AlarmType>(null);
  const [missionProgress, setMissionProgress] = useState(0);
  const [typingInput, setTypingInput] = useState("");
  const [buttonPos, setButtonPos] = useState({ top: "50%", left: "50%" });
  const [isMissionSuccess, setIsMissionSuccess] = useState(false);
  
  const audioContext = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);

  // Sound Logic
  const startAlarmSound = useCallback((type: AlarmType) => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (oscillator.current) oscillator.current.stop();
    
    const ctx = audioContext.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "11PM") {
      // Human Theater style: Sad, slow beeps
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      // Simple modulation for "ddiro-ri"
      setInterval(() => {
        if (activeAlarm === "11PM") {
          osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.5);
        }
      }, 1000);
    } else if (type === "2AM") {
      // Siren style: High pitch, fast modulation
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      const sirenInterval = setInterval(() => {
        if (activeAlarm === "2AM") {
          osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
        } else {
          clearInterval(sirenInterval);
        }
      }, 200);
    } else if (type === "MORNING") {
      // Gymnastics: rhythmic beeps
      osc.type = "square";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      const gymInterval = setInterval(() => {
        if (activeAlarm === "MORNING") {
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          setTimeout(() => gain.gain.setValueAtTime(0, ctx.currentTime), 100);
        } else {
          clearInterval(gymInterval);
        }
      }, 250);
    }
    
    oscillator.current = osc;
  }, [activeAlarm]);

  const stopAlarmSound = useCallback(() => {
    if (oscillator.current) {
      oscillator.current.stop();
      oscillator.current = null;
    }
  }, []);

  // Alarm Triggering
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setNotifications(prev => [...prev, { id: 1, msg: "야, 릴스 끄라고 했다. 지금 자도 7시간밖에 못 자.", time: "23:00" }]);
      setActiveAlarm("11PM");
    }, 5000);
    
    const timer2 = setTimeout(() => {
      setNotifications(prev => [...prev, { id: 2, msg: "아직도 안 잠? 내일 1교시 체육임 ㅋㅋㅋ 멸망 수고", time: "02:00" }]);
      setActiveAlarm("2AM");
    }, 15000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    if (activeAlarm) {
      startAlarmSound(activeAlarm);
    } else {
      stopAlarmSound();
    }
  }, [activeAlarm, startAlarmSound, stopAlarmSound]);

  // Mission Handlers
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypingInput(val);
    if (val === MISSION_TEXT) {
      completeMission();
    }
  };

  const moveButton = () => {
    const top = Math.random() * 80 + 10 + "%";
    const left = Math.random() * 80 + 10 + "%";
    setButtonPos({ top, left });
  };

  const handleCatchButton = () => {
    setMissionProgress(prev => {
      const next = prev + 1;
      if (next >= 5) {
        completeMission();
      } else {
        moveButton();
      }
      return next;
    });
  };

  const handleShake = useCallback(() => {
    setMissionProgress(prev => {
      const next = prev + 1;
      if (next >= 30) {
        completeMission();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (activeAlarm === "MORNING") {
      let lastX: number | null = null;
      let lastY: number | null = null;
      let lastZ: number | null = null;
      const threshold = 15;

      const onMotion = (e: DeviceMotionEvent) => {
        const acc = e.accelerationIncludingGravity;
        if (!acc) return;

        const { x, y, z } = acc;
        if (x === null || y === null || z === null) return;

        if (lastX !== null) {
          const deltaX = Math.abs(x - lastX);
          const deltaY = Math.abs(y - lastY!);
          const deltaZ = Math.abs(z - lastZ!);

          if (deltaX + deltaY + deltaZ > threshold) {
            handleShake();
          }
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      };

      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        (DeviceMotionEvent as any).requestPermission()
          .then((permissionState: string) => {
            if (permissionState === "granted") {
              window.addEventListener("devicemotion", onMotion);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener("devicemotion", onMotion);
      }

      return () => window.removeEventListener("devicemotion", onMotion);
    }
  }, [activeAlarm, handleShake]);

  const completeMission = () => {
    setIsMissionSuccess(true);
    setActiveAlarm(null);
    setMissionProgress(0);
    setTypingInput("");
    setTimeout(() => setIsMissionSuccess(false), 3000);
  };

  const calculateSleep = () => {
    const hw = HOMEWORK_HOURS[homework];
    const dist = DISTRACTION_HOURS[distraction];
    const sleep = Math.max(0, TOTAL_AVAILABLE_HOURS - hw - dist);

    let status: "bad" | "meh" | "good" = "good";
    let message = "";

    if (sleep <= 2) {
      status = "bad";
      message = "삐빅- 내일 1교시 헤드뱅잉 확정 🤘 쌤한테 분필 맞기 딱 좋은 수면량입니다. 차라리 학교 가서 자는 건 어때요?";
    } else if (sleep <= 5) {
      status = "meh";
      message = "아슬아슬하게 지각은 면하겠지만, 내일 당신의 뇌는 로그아웃 상태일 겁니다. 몬스터/핫식스 미리 사두세요.";
    } else {
      status = "good";
      message = "수행평가를 던진 자의 평온함... 폼 미쳤다; 엄마의 등짝 스매싱 장전 소리가 들리는 건 기분 탓이겠죠?";
    }

    setResult({ sleepHours: Number(sleep.toFixed(1)), message, status });
    
    // Trigger morning alarm after calculation for demo
    setTimeout(() => setActiveAlarm("MORNING"), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden bg-[#008080]">
      {/* Background Decorations */}
      <div className="absolute top-10 left-10 opacity-20 pointer-events-none">
        <Monitor size={100} className="text-neon-green" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-20 pointer-events-none">
        <Gamepad2 size={100} className="text-neon-pink" />
      </div>

      {/* Notification Area */}
      <div className="fixed top-4 right-4 z-40">
        <AnimatePresence>
          {notifications.map(n => (
            <Notification key={n.id} message={n.msg} time={n.time} />
          ))}
        </AnimatePresence>
      </div>

      {/* Alarm Overlays */}
      <AnimatePresence>
        {activeAlarm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          >
            <div className="win95-box w-full max-w-sm overflow-hidden">
              <div className="win95-title-bar bg-red-700">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{activeAlarm === "11PM" ? "DOPAMINE_CRITICAL" : activeAlarm === "2AM" ? "SYSTEM_DESTRUCTION" : "WAKE_UP_OR_DIE"}</span>
                </div>
              </div>
              
              <div className="p-6 space-y-4 text-center">
                <div className="text-red-600 font-black animate-pulse text-xl">
                  {activeAlarm === "11PM" && "에헤이~ 조졌네 이거 (띠로리~)"}
                  {activeAlarm === "2AM" && "안 자냐!! 낼 1교시 체육이라고!!"}
                  {activeAlarm === "MORNING" && "일어나!!!! 등짝 스매싱 5초 전!!!!"}
                </div>

                {/* Mission 1: Typing */}
                {activeAlarm === "11PM" && (
                  <div className="space-y-4">
                    <div className="bg-white p-2 border-2 border-black text-xs font-mono text-left">
                      {MISSION_TEXT}
                    </div>
                    <input 
                      autoFocus
                      type="text"
                      value={typingInput}
                      onChange={handleTyping}
                      placeholder="위 문구를 똑같이 입력하세요..."
                      className="w-full p-2 border-2 border-black font-mono text-sm outline-none bg-gray-100"
                    />
                    <div className="text-[10px] text-gray-500 italic">오타 하나라도 나면 안 꺼짐 ㅋ</div>
                  </div>
                )}

                {/* Mission 2: Catch Button */}
                {activeAlarm === "2AM" && (
                  <div className="h-48 relative border-2 border-dashed border-gray-400 bg-gray-200 overflow-hidden">
                    <motion.button
                      animate={{ top: buttonPos.top, left: buttonPos.left }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      onMouseEnter={moveButton}
                      onClick={handleCatchButton}
                      className="win95-button absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-neon-pink text-white font-bold"
                    >
                      [이제 진짜 잘게요]
                    </motion.button>
                    <div className="absolute bottom-2 left-2 text-[10px] font-bold">
                      잡은 횟수: {missionProgress}/5
                    </div>
                  </div>
                )}

                {/* Mission 3: Shake */}
                {activeAlarm === "MORNING" && (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Stickman sleepHours={0} isShaking={true} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold">도파민 털어내기 게이지: {Math.round((missionProgress/30)*100)}%</div>
                      <div className="w-full h-4 bg-gray-300 border-2 border-black overflow-hidden">
                        <motion.div 
                          className="h-full bg-neon-green"
                          animate={{ width: `${(missionProgress/30)*100}%` }}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleShake}
                      className="win95-button w-full py-2 bg-neon-yellow font-bold"
                    >
                      미친듯이 흔들기 (또는 클릭)
                    </button>
                    <div className="text-[10px] text-gray-500 italic">30번 채워야 생존 가능</div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Popup */}
      <AnimatePresence>
        {isMissionSuccess && (
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            className="fixed z-[60] win95-box p-4 bg-neon-yellow border-4 border-black shadow-2xl"
          >
            <div className="text-xl font-black italic">휴, 쌤한테 털릴 뻔했네 ㅋ</div>
            <div className="text-xs mt-2">미션 성공. 생존을 축하한다.</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Window */}
      <motion.div 
        layout
        className="win95-box w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="win95-title-bar">
          <div className="flex items-center gap-2">
            <Brain size={16} />
            <span>Sleep_Fairy_v1.1.exe</span>
          </div>
          <div className="flex gap-1">
            <div className="win95-button !p-0 w-4 h-4 flex items-center justify-center text-[10px]">_</div>
            <div className="win95-button !p-0 w-4 h-4 flex items-center justify-center text-[10px]">□</div>
            <div className="win95-button !p-0 w-4 h-4 flex items-center justify-center text-[10px]">X</div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <header className="text-center space-y-2">
            <h1 className="text-xl font-bold bg-neon-yellow px-2 inline-block border border-black italic">
              오늘 몇 시간 잘 수 있을까? (feat. 도파민 중독자)
            </h1>
            <p className="text-xs text-gray-600">※ 팩폭 주의: 멘탈 약한 잼민이는 뒤로가기</p>
          </header>

          {!result ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Coffee size={14} /> 오늘 쌤이랑 학원에서 던져준 퀘스트(숙제)량은?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(HOMEWORK_HOURS) as HomeworkLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setHomework(level)}
                      className={`win95-button text-xs text-left ${homework === level ? "bg-win-blue text-white" : ""}`}
                    >
                      {level === "10min" && "[10분 컷 가능]"}
                      {level === "hard" && "[살짝 빡셈]"}
                      {level === "allnight" && "[이거 다하면 내일 해 뜸]"}
                      {level === "giveup" && "[아 걍 던질까]"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Smartphone size={14} /> 양심 챙기고, 릴스/쇼츠/게임에 바칠 시간은?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(DISTRACTION_HOURS) as DistractionLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDistraction(level)}
                      className={`win95-button text-xs text-left ${distraction === level ? "bg-win-blue text-white" : ""}`}
                    >
                      {level === "none" && "[폰 압수당함(0시간)]"}
                      {level === "1hour" && "[도파민 1시간만]"}
                      {level === "3hours" && "[알고리즘의 노예(3시간)]"}
                      {level === "doom" && "[오늘 밤샘 멸망전]"}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={calculateSleep}
                className="win95-button w-full py-3 font-bold text-lg bg-neon-green hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
              >
                내일의 나를 제물로 바치기 (클릭)
              </button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center"
            >
              <div className="flex justify-center">
                <Stickman sleepHours={result.sleepHours} />
              </div>

              <div className="space-y-2">
                <div className="text-3xl font-black font-mono">
                  예상 수면: <span className={result.status === "bad" ? "text-red-600 underline" : "text-blue-600"}>
                    {result.sleepHours}시간
                  </span>
                </div>
                <div className={`p-4 border-2 border-black font-bold text-sm leading-relaxed ${
                  result.status === "bad" ? "bg-red-100" : result.status === "meh" ? "bg-yellow-100" : "bg-green-100"
                }`}>
                  {result.message}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setResult(null)}
                  className="win95-button flex-1 py-2 font-bold"
                >
                  다시 계산하기
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="win95-button flex-1 py-2 font-bold bg-neon-pink text-white"
                >
                  현실 부정하기
                </button>
              </div>

              {result.status === "bad" && (
                <div className="flex items-center justify-center gap-2 text-red-600 animate-bounce">
                  <AlertTriangle size={16} />
                  <span className="text-[10px] font-bold">WARNING: SYSTEM OVERHEAT</span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div className="bg-win-bg border-t border-win-border-dark p-1 text-[10px] text-gray-600 flex justify-between">
          <span>Objects: 2 selected</span>
          <span>100% Dopamine Loaded</span>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="mt-8 text-white text-[10px] font-mono opacity-50">
        © 1995-2026 SLEEP_FAIRY_CORP. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
