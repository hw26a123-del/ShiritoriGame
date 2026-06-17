import { useState, useEffect, useRef, FormEvent } from "react";
import { Play, RotateCcw, Award, Clock, ArrowRight, BookOpen, AlertCircle, HelpCircle } from "lucide-react";
import { START_WORDS_3_LETTERS, COMMON_WORDS_LOCAL } from "./words";

// TypeScript definition for game state
type GameStatus = "start" | "playing" | "gameover";

export default function App() {
  // Game states
  const [status, setStatus] = useState<GameStatus>("start");
  const [score, setScore] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("bakusoku_high_score");
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [currentWord, setCurrentWord] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [maxTimer, setMaxTimer] = useState<number>(30);

  // Interaction feedback states
  const [shouldShake, setShouldShake] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSystemThinking, setIsSystemThinking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // DOM Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Sync high score with localStorage
  const updateHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        localStorage.setItem("bakusoku_high_score", newScore.toString());
      } catch (err) {
        console.error("Failed to save high score:", err);
      }
    }
  };

  // Helper: Get base Hiragana for dakuten/handakuten leniency
  const getBaseHiragana = (char: string): string => {
    const mapping: { [key: string]: string } = {
      "が": "か", "ぎ": "き", "ぐ": "く", "げ": "け", "ご": "こ",
      "ざ": "さ", "じ": "し", "ず": "す", "ぜ": "せ", "ぞ": "そ",
      "だ": "た", "ぢ": "ち", "づ": "つ", "で": "て", "ど": "と",
      "ば": "は", "び": "ひ", "ぶ": "ふ", "べ": "へ", "ぼ": "ほ",
      "ぱ": "は", "ぴ": "ひ", "ぷ": "ふ", "ぺ": "へ", "ぽ": "ほ",
      "ゔ": "う",
    };
    return mapping[char] || char;
  };

  // Helper: Normalize last character or first character for siriitori check
  const getNormalizedChar = (word: string, isLast: boolean): string => {
    if (!word) return "";
    let char = "";

    if (isLast) {
      const lastIdx = word.length - 1;
      char = word[lastIdx];
      // 長音（ー）の処理: 1つ手前の文字にする
      if (char === "ー" && word.length > 1) {
        char = word[lastIdx - 1];
      }
    } else {
      char = word[0];
    }

    // 小書き文字（ゃ、ゅ、ょ、っ、等）は大文字に変換
    const smallToBig: { [key: string]: string } = {
      "ゃ": "や", "ゅ": "ゆ", "ょ": "よ", "っ": "つ",
      "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お",
      "ゎ": "わ"
    };

    return smallToBig[char] || char;
  };

  // Check connection between preceding word and next word
  const checkConnection = (prev: string, next: string): boolean => {
    const lastChar = getNormalizedChar(prev, true);
    const firstChar = getNormalizedChar(next, false);

    if (!lastChar || !firstChar) return false;

    // 濁音・半濁音の緩和（一方向ルール：全く同じか、あるいは前の語尾を清音化したものが次の語頭と等しければOK）
    return lastChar === firstChar || getBaseHiragana(lastChar) === firstChar;
  };

  // Handle errors: Shake input text, clear text, and show message
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShouldShake(true);
    setInputText("");
    setTimeout(() => {
      setShouldShake(false);
    }, 400);

    // Re-focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Client-side fallback check using Wikipedia Opensearch
  const checkWikipediaFallback = async (word: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `https://ja.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&search=${encodeURIComponent(word)}&limit=3`
      );
      if (!res.ok) return false;
      const data = await res.json();
      // data[1] contains list of matches.
      return data && Array.isArray(data[1]) && data[1].length > 0;
    } catch {
      return false;
    }
  };

  // Game action: Start the game (or Restart)
  const startGame = () => {
    // Choose starting word (3 letters, not ending with 'ん')
    const validStartWords = START_WORDS_3_LETTERS.filter(word => !word.endsWith("ん"));
    const randomIdx = Math.floor(Math.random() * validStartWords.length);
    const startWord = validStartWords[randomIdx];

    setScore(0);
    setFinalScore(0);
    setMaxTimer(30);
    setTimeLeft(30);
    setCurrentWord(startWord);
    setInputText("");
    setHistory([startWord]);
    setUsedWords(new Set([startWord]));
    setErrorMessage("");
    setStatus("playing");

    // Focus input on next tick
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  // Game over trigger
  const triggerGameOver = () => {
    setStatus("gameover");
    setFinalScore((prev) => {
      updateHighScore(prev);
      return prev;
    });
  };

  // Process system response turn in game loop
  const processSystemTurn = (playerWord: string, currentScore: number, currentMaxTimer: number, currentUsedWords: Set<string>) => {
    setIsSystemThinking(true);
    setErrorMessage("");

    setTimeout(() => {
      // Create list of all candidates from dictionary & start words
      const allCandidates = Array.from(new Set([
        ...Array.from(COMMON_WORDS_LOCAL),
        ...START_WORDS_3_LETTERS
      ]));

      // Clean filter:
      // 1. Connection is verified successfully (one-way dakuten leniency is applied)
      // 2. Not used yet (includes both player and systems entries)
      // 3. Does not end with 'ん'
      const validCandidates = allCandidates.filter(word => {
        return checkConnection(playerWord, word) && !currentUsedWords.has(word) && !word.endsWith("ん");
      });

      if (validCandidates.length === 0) {
        // System cannot think of anything: system forfeits, player wins
        setErrorMessage("システムが言葉を思いつけません！システムが降参しました！");
        setIsSystemThinking(false);
        setFinalScore(currentScore);
        updateHighScore(currentScore);
        setStatus("gameover");
        return;
      }

      // Pick a random compliant answer word
      const randomIdx = Math.floor(Math.random() * validCandidates.length);
      const systemWord = validCandidates[randomIdx];

      setHistory((prev) => [...prev, systemWord]);
      setUsedWords((prev) => {
        const updated = new Set(prev);
        updated.add(systemWord);
        return updated;
      });

      // Decrease max timer for next player turn (decrement by 1, absolute minimum 5s)
      const nextMax = Math.max(5, currentMaxTimer - 1);
      setMaxTimer(nextMax);
      setTimeLeft(nextMax);

      setCurrentWord(systemWord);
      setIsSystemThinking(false);
    }, 1000); // 1.0 second realistic delay for dynamic gameplay
  };

  // Submit word action triggered on pressing Enter
  const handleWordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status !== "playing" || isChecking || isSystemThinking) return;

    const input = inputText.trim();

    // 1. ひらがな・空白チェック
    if (!input) {
      triggerError("単語を入力してください");
      return;
    }

    if (!/^[ぁ-んー]+$/.test(input)) {
      triggerError("ひらがなのみで入力してください");
      return;
    }

    // 2. しりとり接続チェック
    if (!checkConnection(currentWord, input)) {
      const targetStart = getNormalizedChar(currentWord, true);
      const targetHint = getBaseHiragana(targetStart);
      triggerError(`「${targetStart}」（または「${targetHint}」）から始まる言葉を入力してください`);
      return;
    }

    // 3. 重複チェック
    if (usedWords.has(input)) {
      triggerError("一度使った単語は使えません");
      return;
    }

    setIsChecking(true);
    setErrorMessage("");

    // 4. 辞書判定
    let isValid = COMMON_WORDS_LOCAL.has(input) || START_WORDS_3_LETTERS.includes(input);

    if (!isValid) {
      try {
        // Try server Jisho proxy first
        const response = await fetch(`/api/check-word?word=${encodeURIComponent(input)}`);
        if (response.ok) {
          const resData = await response.json();
          if (resData.valid !== null) {
            isValid = resData.valid;
          } else {
            isValid = await checkWikipediaFallback(input);
          }
        } else {
          isValid = await checkWikipediaFallback(input);
        }
      } catch (err) {
        console.error("Server API check failed, trying fallback:", err);
        isValid = await checkWikipediaFallback(input);
      }
    }

    setIsChecking(false);

    if (!isValid) {
      triggerError("辞書にない単語です");
      return;
    }

    // 5. 「ん」で終わる場合のゲームオーバー判定
    if (input.endsWith("ん")) {
      const newScore = score + 100;
      setScore(newScore);
      setFinalScore(newScore);
      setHistory((prev) => [...prev, input]);
      updateHighScore(newScore);
      setStatus("gameover");
      return;
    }

    // 接続成功時の状態アップデート (プレイヤーの入力接続成功)
    const newScore = score + 100;
    setScore(newScore);
    setFinalScore(newScore);
    setHistory((prev) => [...prev, input]);
    const updatedUsed = new Set<string>(usedWords);
    updatedUsed.add(input);
    setUsedWords(updatedUsed);

    setCurrentWord(input);
    setInputText("");

    // Autoscroll history
    setTimeout(() => {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    // AI/System Turn triggered
    processSystemTurn(input, newScore, maxTimer, updatedUsed);
  };

  // Timer Effect
  useEffect(() => {
    if (status !== "playing" || isSystemThinking) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          triggerGameOver();
          return 0;
        }
        return Math.round((prev - 0.1) * 10) / 10;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [status, maxTimer, currentWord, isSystemThinking]);

  // Keep input focused automatically
  useEffect(() => {
    if (status === "playing" && !isSystemThinking && inputRef.current) {
      inputRef.current.focus();
    }
  }, [status, isChecking, isSystemThinking]);

  // Derive visual helpers
  const nextTargetChar = getNormalizedChar(currentWord, true);
  const baseTargetChar = getBaseHiragana(nextTargetChar);
  const timerRatio = Math.max(0, Math.min(100, (timeLeft / maxTimer) * 100));
  const isTimeLow = timeLeft < 5;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. Header (Always styled nicely for current state) */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span id="header_title" className="font-bold tracking-wider text-slate-200 font-mono">
            爆速しりとり
          </span>
        </div>
        
        {status === "playing" && (
          <div className="flex items-center gap-6">
            {/* Score in Upper Left of header bar */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-indigo-500/20 shadow-sm" id="score_box">
              <Award className="w-4.5 h-4.5 text-yellow-400" />
              <span className="text-xs text-slate-400 tracking-wider">SCORE:</span>
              <span className="font-mono font-bold text-slate-100">{score}</span>
            </div>

            {/* Timer in Upper Right of header bar */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors duration-300 ${
              isTimeLow 
                ? "bg-rose-950/40 border-rose-500 text-rose-300 animate-pulse-fast" 
                : "bg-slate-800 border-indigo-500/20 text-indigo-300"
            }`} id="timer_box">
              <Clock className="w-4.5 h-4.5" />
              <span className="text-xs tracking-wider">LIMIT:</span>
              <span className="font-mono font-bold text-lg min-w-[3.5rem] text-right">
                {timeLeft.toFixed(1)}s
              </span>
            </div>
          </div>
        )}
      </header>

      {/* 2. Main Canvas Grid */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-8 flex flex-col justify-center items-center">
        
        {/* START SCREEN STATUS */}
        {status === "start" && (
          <div className="w-full flex flex-col items-center justify-center space-y-12 py-10" id="start_screen">
            {/* Title Section (Upper Center of Screen) */}
            <div className="text-center space-y-3">
              <h1 id="app_title" className="text-5xl font-black tracking-tight text-white drop-shadow-md">
                爆速しりとり
              </h1>
              <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                制限時間30秒からスタート！しりとりを重ねるごとに制限時間が短くなる過酷なしりとりアクション。
              </p>
            </div>

            {/* Center Area holding Start Button and High Score */}
            <div className="w-full max-w-sm bg-slate-800/40 border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-6">
              <button
                onClick={startGame}
                id="btn_start"
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 active:scale-98 text-white font-bold tracking-widest text-lg transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current group-hover:translate-x-0.5 transition-transform" />
                ゲームを開始する
              </button>

              <div className="flex flex-col items-center justify-center space-y-1" id="high_score_display">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">
                  Personal Best Record
                </span>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Award className="w-5 h-5 animate-bounce" />
                  <span className="text-xl font-bold font-mono text-slate-200">{highScore}点</span>
                </div>
              </div>
            </div>

            {/* Simple Help Info */}
            <div className="text-xs text-slate-500 bg-slate-800/10 rounded-lg p-4 border border-slate-800/50 max-w-xs text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 font-semibold mb-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>しりとりの特別ルール</span>
              </div>
              <p>・濁音から清音はOK、逆はNG (例：ご ➔ こあら ⭕ / こ ➔ ごりら ❌)</p>
              <p>・語尾の「ー」は1文字前を参照します。(例：びー ➔ び)</p>
              <p>・「ゃ/ゅ/ょ/っ」などの小文字は大文字として判定</p>
              <p className="text-rose-400/90 font-medium">※最後が「ん」で終わった場合は即ゲームオーバー！</p>
            </div>
          </div>
        )}

        {/* PLAYING SCREEN STATUS */}
        {status === "playing" && (
          <div className="w-full flex flex-col justify-between items-center space-y-8" id="play_canvas">
            
            {/* Top area display - Current active word & initial word trail */}
            <div className="w-full text-center space-y-4" id="upper_target_word_section">
              {/* Connected previous word indicator */}
              <div className="flex items-center justify-center flex-wrap gap-1.5 text-xs text-slate-500 max-h-16 overflow-y-auto px-4 py-2 bg-slate-950/20 border border-slate-800/30 rounded-xl w-full">
                {history.slice(-3, -1).map((word, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="font-mono px-2 py-0.5 bg-slate-800/40 border border-slate-800 rounded">{word}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                  </div>
                ))}
                <span className="text-slate-400 font-semibold">現在</span>
              </div>

              {/* Displaying main connecting word */}
              <div className="relative inline-block px-10 py-5 bg-gradient-to-b from-slate-800 to-slate-800/60 border border-indigo-500/30 rounded-2xl shadow-xl min-w-xs">
                <span className="absolute top-2 left-3 text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
                  Current Target
                </span>
                
                {/* Highlighted text. Mark last letter vividly */}
                <div className="text-4xl font-extrabold text-white tracking-widest font-serif flex items-center justify-center gap-0.5 select-none pt-2">
                  <span>{currentWord.slice(0, currentWord.endsWith("ー") ? -2 : -1)}</span>
                  {currentWord.endsWith("ー") ? (
                    <>
                      <span className="text-indigo-400 border-b-3 border-indigo-400">{currentWord[currentWord.length - 2]}</span>
                      <span className="text-slate-500">{currentWord[currentWord.length - 1]}</span>
                    </>
                  ) : (
                    <span className="text-indigo-400 border-b-3 border-indigo-400">{currentWord[currentWord.length - 1]}</span>
                  )}
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  次の頭文字：
                  <span className="font-bold text-indigo-300 text-sm px-1.5 py-0.5 bg-indigo-950/50 border border-indigo-500/20 rounded ml-1 animate-pulse">
                    「{nextTargetChar}」
                  </span>
                  {nextTargetChar !== baseTargetChar && (
                    <span className="text-[10px] text-slate-500 ml-1">
                      (または「{baseTargetChar}」)
                    </span>
                  )}
                  {" "}から
                </div>
              </div>
            </div>

            {/* Middle portion: Typing Input text field */}
            <div className="w-full" id="middle_input_section">
              <form onSubmit={handleWordSubmit} className="space-y-3">
                {/* Active turn visual details */}
                <div className="flex justify-between items-center text-xs px-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    {isSystemThinking ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                        ● システムのターン (思考中...)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ● プレイヤーのターン (入力してください)
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-[10px]">重複単語はNG</span>
                </div>

                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isChecking || isSystemThinking}
                    id="player_input_field"
                    placeholder={
                      isSystemThinking 
                        ? "システムがしりとりワードを考え中です..." 
                        : isChecking 
                          ? "辞書照合中..." 
                          : "ここに「ひらがな」で入力してEnter..."
                    }
                    className={`w-full py-4 pl-5 pr-20 text-lg font-medium text-white placeholder-slate-500 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                      isSystemThinking ? "opacity-60 cursor-not-allowed" : ""
                    } ${
                      shouldShake ? "animate-shake border-rose-500 ring-2 ring-rose-500/20 text-rose-300 bg-rose-950/20" : ""
                    } text-center`}
                    autoComplete="off"
                    autoFocus
                  />
                  
                  {/* Status Indicator inside Input Box */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                    {isChecking || isSystemThinking ? (
                      <div className="flex items-center gap-1.5">
                        {isSystemThinking && <span className="text-[9px] text-indigo-400 font-mono animate-pulse hidden sm:inline">THINKING</span>}
                        {isChecking && <span className="text-[9px] text-emerald-400 font-mono animate-pulse hidden sm:inline">CHECKING</span>}
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-400 border-t-transparent" id="loading_spinner" />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 font-mono select-none hidden sm:inline border border-slate-800 px-1.5 py-0.5 rounded">
                        Enter
                      </span>
                    )}
                  </div>
                </div>

                {/* Feedback Messages */}
                {errorMessage && (
                  <div className="flex items-center gap-1.5 justify-center text-xs text-rose-400 font-medium px-4 py-2 bg-rose-950/20 border border-rose-500/10 rounded-lg animate-pulse" id="error_balloon">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                
                {!errorMessage && !isChecking && !isSystemThinking && (
                  <div className="text-[11px] text-slate-500 text-center tracking-wide" id="normal_hint">
                    ※ひらがな以外（カタカナやスペース等）を入力すると、自動でリセットされます
                  </div>
                )}
              </form>
            </div>

            {/* Informative connection parameters showing remaining rounds speed */}
            <div className="text-center text-xs text-slate-500" id="round_speed_parameters_indicator">
              <span>今回の最大タイマー: </span>
              <span className="font-mono text-slate-300 font-semibold">{maxTimer}秒</span>
              {maxTimer > 5 ? (
                <span className="text-indigo-400 font-mono text-[10px] ml-1">
                  (次回:{maxTimer - 1}s)
                </span>
              ) : (
                <span className="text-amber-500 text-[10px] ml-1 font-bold">
                  (極限スピード!! 最小5s)
                </span>
              )}
            </div>
          </div>
        )}

        {/* GAMEOVER SCREEN STATUS */}
        {status === "gameover" && (
          <div className="w-full flex flex-col items-center justify-center space-y-10 py-8" id="game_over_screen">
            
            {/* Vertical Stack: 1. Restart, 2. Final Score, 3. High Score */}
            <div className="w-full max-w-sm bg-slate-800/40 border border-slate-800 rounded-2xl p-8 shadow-xl text-center flex flex-col items-center justify-center space-y-6">
              
              {/* 1. リスタートボタン */}
              <button
                onClick={startGame}
                id="btn_restart"
                className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold tracking-widest text-lg transition-all duration-200 shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                もう一度挑戦する
              </button>

              {/* 2. 最終スコア */}
              <div className="flex flex-col items-center justify-center py-2" id="final_score_display">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">
                  Final Score
                </span>
                <span className="text-4xl font-black font-mono text-indigo-400 mt-1">
                  {finalScore}点
                </span>
                {finalScore === highScore && finalScore > 0 && (
                  <span className="text-[10px] text-amber-400 font-extrabold tracking-widest animate-pulse border border-amber-500/30 px-2 py-0.5 rounded-full bg-amber-500/5 mt-1.5">
                    🎉 NEW RECORD! 🎉
                  </span>
                )}
              </div>

              {/* 3. 最高スコア */}
              <div className="flex flex-col items-center justify-center border-t border-slate-800 pt-4 w-full" id="final_high_score_display">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest font-mono">
                  Personal High Score
                </span>
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold mt-1">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="font-mono text-base">{highScore}点</span>
                </div>
              </div>

            </div>

            {/* Simple Match History summary */}
            {history.length > 1 && (
              <div className="w-full max-w-md bg-slate-950/30 border border-slate-800/40 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 text-center">今回の単語履歴（{history.length - 1}語接続）</h3>
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500 max-h-24 overflow-y-auto px-1 py-1">
                  {history.map((word, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className={`font-mono px-2 py-0.5 border rounded ${
                        idx === history.length - 1 
                          ? "bg-rose-950/40 border-rose-500 text-rose-300"
                          : idx === 0
                            ? "bg-slate-800/85 border-indigo-500/20 text-slate-400"
                            : "bg-slate-800/40 border-slate-800 text-slate-300"
                      }`}>{word}</span>
                      {idx < history.length - 1 && <span className="text-[10px] text-slate-700">➔</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* 3. Timer bottom progress bar (Only while playing status) */}
      <footer className="w-full h-2.5 bg-slate-950 relative overflow-hidden" id="bottom_progress_status_bar">
        {status === "playing" && (
          <div
            className={`h-full transition-all duration-100 ease-out ${
              isTimeLow 
                ? "bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]" 
                : "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.25)]"
            }`}
            style={{ width: `${timerRatio}%` }}
          />
        )}
      </footer>

    </div>
  );
}
