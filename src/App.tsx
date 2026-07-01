import { useState, useEffect, useRef, FormEvent } from "react";
import { Play, RotateCcw, Award, Clock, ArrowRight, BookOpen, AlertCircle, HelpCircle } from "lucide-react";
import { START_WORDS_3_LETTERS, COMMON_WORDS_LOCAL } from "./words";

// Romaji to Hiragana conversion mapping (supports multiple spellings and small letters)
const ROMAJI_TO_HIRAGANA_MAP: { [key: string]: string } = {
  // 4 letters (contracted sounds)
  "shya": "しゃ", "shyu": "しゅ", "shyo": "しょ",
  "chya": "ちゃ", "chyu": "ちゅ", "chyo": "ちょ",
  "jya": "じゃ", "jyu": "じゅ", "jyo": "じょ",

  // 3 letters
  "sha": "しゃ", "shu": "しゅ", "she": "しぇ", "sho": "しょ",
  "chi": "ち", "cha": "ちゃ", "chu": "ちゅ", "che": "ちぇ", "cho": "ちょ",
  "tsu": "つ", "tsa": "つぁ", "tsi": "つぃ", "tse": "つぇ", "tso": "つぉ",
  "shi": "し",
  "kya": "きゃ", "kyu": "きゅ", "kye": "きぇ", "kyo": "きょ",
  "gya": "ぎゃ", "gyu": "ぎゅ", "gye": "ぎぇ", "gyo": "ぎょ",
  "sya": "しゃ", "syu": "しゅ", "sye": "しぇ", "syo": "しょ",
  "zya": "じゃ", "zyu": "じゅ", "zye": "じぇ", "zyo": "じょ",
  "tya": "ちゃ", "tyu": "ちゅ", "tye": "ちぇ", "tyo": "ちょ",
  "dya": "ぢゃ", "dyu": "ぢゅ", "dye": "ぢぇ", "dyo": "ぢょ",
  "bya": "びゃ", "byu": "びゅ", "bye": "びぇ", "byo": "びょ",
  "pya": "ぴゃ", "pyu": "ぴゅ", "pye": "ぴぇ", "pyo": "ぴょ",
  "mya": "みゃ", "myu": "みゅ", "mye": "みぇ", "myo": "みょ",
  "rya": "りゃ", "ryu": "りゅ", "rye": "りぇ", "ryo": "りょ",
  "nya": "にゃ", "nyu": "にゅ", "nye": "にぇ", "nyo": "にょ",
  "hya": "ひゃ", "hyu": "ひゅ", "hye": "ひぇ", "hyo": "ひょ",
  "xtu": "っ", "ltu": "っ",
  "xya": "ゃ", "xyu": "ゅ", "xyo": "ょ",
  "lya": "ゃ", "lyu": "ゅ", "lyo": "ょ",
  "xka": "ヵ", "xke": "ヶ",
  "xwa": "ゎ", "lwa": "ゎ",
  "wha": "うぁ", "whi": "うぃ", "whe": "うぇ", "who": "うぉ",

  // 2 letters
  "ka": "か", "ki": "ki" === "ki" ? "き" : "き", "ku": "く", "ke": "け", "ko": "こ",
  "sa": "さ", "si": "し", "su": "す", "se": "せ", "so": "そ",
  "ta": "た", "ti": "ち", "tu": "つ", "te": "て", "to": "と",
  "na": "な", "ni": "に", "nu": "ぬ", "ne": "ね", "no": "の",
  "ha": "は", "hi": "ひ", "hu": "ふ", "he": "へ", "ho": "ほ",
  "ma": "ま", "mi": "み", "mu": "む", "me": "め", "mo": "も",
  "ya": "や", "yu": "ゆ", "yo": "よ",
  "ra": "ら", "ri": "り", "ru": "る", "re": "れ", "ro": "ろ",
  "wa": "わ", "wo": "を", "nn": "ん", "xn": "ん",
  "ga": "が", "gi": "ぎ", "gu": "ぐ", "ge": "げ", "go": "ご",
  "za": "ざ", "zi": "じ", "zu": "ず", "ze": "ぜ", "zo": "ぞ",
  "da": "だ", "di": "ぢ", "du": "づ", "de": "で", "do": "ど",
  "ba": "ば", "bi": "び", "bu": "ぶ", "be": "べ", "bo": "ぼ",
  "pa": "ぱ", "pi": "ぴ", "pu": "ぷ", "pe": "ぺ", "po": "ぽ",
  "fa": "ふぁ", "fi": "ふぃ", "fu": "ふ", "fe": "ふぇ", "fo": "ふぉ",
  "ja": "じゃ", "ji": "じ", "ju": "じゅ", "je": "じぇ", "jo": "じょ",
  "va": "ゔぁ", "vi": "ゔぃ", "vu": "ゔ", "ve": "ゔぇ", "vo": "ゔぉ",
  "xa": "ぁ", "xi": "ぃ", "xu": "ぅ", "xe": "ぇ", "xo": "ぉ",
  "la": "ぁ", "li": "ぃ", "lu": "ぅ", "le": "ぇ", "lo": "ぉ",
  "wy": "ゐ",

  // 1 letter
  "a": "あ", "i": "い", "u": "う", "e": "え", "o": "お",
  "n": "ん", "-": "ー",
};

// Hiragana to standard Romaji conversion mapping
const HIRAGANA_TO_ROMAJI_MAP: { [key: string]: string } = {
  "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
  "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
  "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
  "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
  "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
  "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
  "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
  "や": "ya", "ゆ": "yu", "よ": "yo",
  "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
  "わ": "wa", "を": "wo", "ん": "n", "ー": "-",
  "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
  "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
  "だ": "da", "ぢ": "di", "づ": "du", "で": "de", "ど": "do",
  "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
  "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
  "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
  "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
  "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
  "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
  "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
  "ぢゃ": "dya", "ぢゅ": "dyu", "ぢょ": "dyo",
  "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
  "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
  "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
  "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
  "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
  "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
  "ぁ": "xa", "ぃ": "xi", "ぅ": "xu", "ぇ": "xe", "ぉ": "xo",
  "ゃ": "xya", "ゅ": "xyu", "ょ": "xyo", "っ": "xtu",
};

// Romaji to Hiragana conversion function (greedy search)
function romajiToHiragana(text: string): string {
  let result = "";
  let i = 0;
  const str = text.toLowerCase();

  while (i < str.length) {
    // Check for consecutive double consonants (e.g. "kk" -> "っ", "tt" -> "っ")
    // Skip checking if it's 'n' (handled by nn or single n) or vowels
    if (
      i + 1 < str.length &&
      str[i] === str[i + 1] &&
      !"aeioun-".includes(str[i])
    ) {
      result += "っ";
      i += 1;
      continue;
    }

    // 4-letter match
    if (i + 4 <= str.length) {
      const four = str.slice(i, i + 4);
      if (ROMAJI_TO_HIRAGANA_MAP[four]) {
        result += ROMAJI_TO_HIRAGANA_MAP[four];
        i += 4;
        continue;
      }
    }
    // 3-letter match
    if (i + 3 <= str.length) {
      const three = str.slice(i, i + 3);
      if (ROMAJI_TO_HIRAGANA_MAP[three]) {
        result += ROMAJI_TO_HIRAGANA_MAP[three];
        i += 3;
        continue;
      }
    }
    // 2-letter match
    if (i + 2 <= str.length) {
      const two = str.slice(i, i + 2);
      if (ROMAJI_TO_HIRAGANA_MAP[two]) {
        result += ROMAJI_TO_HIRAGANA_MAP[two];
        i += 2;
        continue;
      }
    }
    // 1-letter match
    const one = str[i];
    if (ROMAJI_TO_HIRAGANA_MAP[one]) {
      // Check for consecutive double consonants (e.g. "tta" -> "っ" + "ta")
      if (
        i + 1 < str.length &&
        one === str[i + 1] &&
        one !== "n" &&
        one !== "a" &&
        one !== "i" &&
        one !== "u" &&
        one !== "e" &&
        one !== "o" &&
        one !== "-"
      ) {
        result += "っ";
        i += 1;
        continue;
      }
      result += ROMAJI_TO_HIRAGANA_MAP[one];
      i += 1;
      continue;
    }

    // Pass through unmapped characters
    result += one;
    i += 1;
  }
  return result;
}

interface RomajiToken {
  hiragana: string;
  romaji: string;
  isTarget: boolean;
}

// Split Hiragana to Romaji tokens with correct red target identification
function splitHiraganaToRomajiTokens(word: string): RomajiToken[] {
  if (!word) return [];

  const tokens: { hiragana: string; romaji: string }[] = [];
  let i = 0;

  while (i < word.length) {
    const char = word[i];
    const nextChar = i + 1 < word.length ? word[i + 1] : "";

    // 2-character check (contracted sounds like きゃ, しゅ)
    if (nextChar && "ゃゅょぁぃぅぇぉ".includes(nextChar)) {
      const combo = char + nextChar;
      const romaji = HIRAGANA_TO_ROMAJI_MAP[combo] || combo;
      tokens.push({ hiragana: combo, romaji });
      i += 2;
      continue;
    }

    // 1-character check for "っ"
    if (char === "っ") {
      if (nextChar) {
        const nextNextChar = i + 2 < word.length ? word[i + 2] : "";
        let nextCombo = nextChar;
        if (nextNextChar && "ゃゅょぁぃぅぇぉ".includes(nextNextChar)) {
          nextCombo = nextChar + nextNextChar;
        }
        const nextRomaji = HIRAGANA_TO_ROMAJI_MAP[nextCombo] || "";
        if (nextRomaji && nextRomaji.length > 0) {
          const firstConsonant = nextRomaji[0];
          if (!"aeiou-".includes(firstConsonant)) {
            tokens.push({ hiragana: "っ", romaji: firstConsonant });
            i += 1;
            continue;
          }
        }
      }
      tokens.push({ hiragana: "っ", romaji: "xtu" });
      i += 1;
      continue;
    }

    const romaji = HIRAGANA_TO_ROMAJI_MAP[char] || char;
    tokens.push({ hiragana: char, romaji });
    i += 1;
  }

  // Find the shiritiori target index
  // If the word ends with 'ー', the target is the second to last token
  // Otherwise, the target is the last token
  let targetIdx = tokens.length - 1;
  if (tokens.length > 1 && tokens[tokens.length - 1].hiragana === "ー") {
    targetIdx = tokens.length - 2;
  }

  return tokens.map((token, idx) => ({
    ...token,
    isTarget: idx === targetIdx,
  }));
}

// TypeScript definition for game state
type GameStatus = "start" | "playing" | "gameover";

export default function App() {
  // Game states
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [status, setStatus] = useState<GameStatus>("start");

  // Detect mobile environment (smartphones and tablets, PCs are permitted)
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(!!(isMobileUA || isTouch));
  }, []);

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
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [maxTimer, setMaxTimer] = useState<number>(10);

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

  // Helper: Check if input romaji prefix matches target romaji, considering equivalent spellings (e.g. fu/hu, shi/si, tsu/tu)
  const matchRomajiPrefix = (input: string, target: string): boolean => {
    if (input.startsWith(target)) return true;

    // Mapping of equivalent spellings
    const equivalents: { [key: string]: string[] } = {
      "fu": ["fu", "hu"],
      "hu": ["fu", "hu"],
      "shi": ["shi", "si"],
      "si": ["shi", "si"],
      "chi": ["chi", "ti"],
      "ti": ["chi", "ti"],
      "tsu": ["tsu", "tu"],
      "tu": ["tsu", "tu"],
      "ji": ["ji", "zi"],
      "zi": ["ji", "zi"],
      "sha": ["sha", "sya"],
      "sya": ["sha", "sya"],
      "shu": ["shu", "syu"],
      "syu": ["shu", "syu"],
      "sho": ["sho", "syo"],
      "syo": ["sho", "syo"],
      "cha": ["cha", "tya"],
      "tya": ["cha", "tya"],
      "chu": ["chu", "tyu"],
      "tyu": ["chu", "tyu"],
      "cho": ["cho", "tyo"],
      "tyo": ["cho", "tyo"],
      "ja": ["ja", "zya"],
      "zya": ["ja", "zya"],
      "ju": ["ju", "zyu"],
      "zyu": ["ju", "zyu"],
      "jo": ["jo", "zyo"],
      "zyo": ["jo", "zyo"],
    };

    const list = equivalents[target];
    if (list) {
      for (const eq of list) {
        if (input.startsWith(eq)) {
          return true;
        }
      }
    }

    return false;
  };

  // Check connection between preceding word and next word
  const checkConnection = (prev: string, nextInputRomaji: string, nextInputHiragana: string): boolean => {
    // 1. Romaji token-based connection (resolves "kisha" sha -> "shatyou" shatyou mismatch)
    if (nextInputRomaji) {
      const prevTokens = splitHiraganaToRomajiTokens(prev);
      const prevTargetToken = prevTokens.find(t => t.isTarget);
      if (prevTargetToken) {
        const targetRomaji = prevTargetToken.romaji; // e.g. "sha", "go", "ko"
        
        // Check if player's romaji starts with the target romaji
        if (matchRomajiPrefix(nextInputRomaji, targetRomaji)) {
          return true;
        }
        
        // Dakuten/Handakuten leniency (e.g. "go" -> "ko")
        const lastChar = prevTargetToken.hiragana; // e.g. "ご"
        const baseChar = getBaseHiragana(lastChar); // e.g. "こ"
        if (lastChar !== baseChar) {
          const baseTokens = splitHiraganaToRomajiTokens(baseChar);
          const baseRomaji = baseTokens[0]?.romaji || "";
          if (baseRomaji && matchRomajiPrefix(nextInputRomaji, baseRomaji)) {
            return true;
          }
        }
        
        // If romaji input is provided but doesn't match above, return false
        return false;
      }
    }

    // 2. Traditional Hiragana-based verification (for system AI choices or fallback)
    const lastChar = getNormalizedChar(prev, true);
    const firstChar = getNormalizedChar(nextInputHiragana, false);

    if (!lastChar || !firstChar) return false;

    // Leniency one-way rules
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
    setMaxTimer(10);
    setTimeLeft(10);
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
        return checkConnection(playerWord, "", word) && !currentUsedWords.has(word) && !word.endsWith("ん");
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

    const input = inputText.trim().toLowerCase();

    // 1. 空白チェックおよびローマ字・ハイフンのみチェック
    if (!input) {
      triggerError("単語を入力してください");
      return;
    }

    if (!/^[a-z-]+$/.test(input)) {
      triggerError("小文字のローマ字のみで入力してください");
      return;
    }

    // ローマ字をひらがなに変換
    const inputHiragana = romajiToHiragana(input);

    // 2. しりとり接続チェック
    if (!checkConnection(currentWord, input, inputHiragana)) {
      const tokens = splitHiraganaToRomajiTokens(currentWord);
      const targetToken = tokens.find(t => t.isTarget);
      const targetRomaji = targetToken ? targetToken.romaji : "";

      if (targetRomaji) {
        // 濁音・半濁音緩和のヒントも考慮
        const targetStart = getNormalizedChar(currentWord, true);
        const targetHint = getBaseHiragana(targetStart);
        if (targetStart !== targetHint) {
          const hintToken = splitHiraganaToRomajiTokens(targetHint);
          const hintRomaji = hintToken[0]?.romaji || "";
          triggerError(`「${targetRomaji}」（または「${hintRomaji}」）から始まる言葉をローマ字で入力してください`);
        } else {
          triggerError(`「${targetRomaji}」から始まる言葉をローマ字で入力してください`);
        }
      } else {
        const targetStart = getNormalizedChar(currentWord, true);
        const targetHint = getBaseHiragana(targetStart);
        triggerError(`「${targetStart}」（または「${targetHint}」）から始まる言葉をローマ字で入力してください`);
      }
      return;
    }

    // 3. 重複チェック
    if (usedWords.has(inputHiragana)) {
      triggerError("一度使った単語は使えません");
      return;
    }

    setIsChecking(true);
    setErrorMessage("");

    // 4. 辞書判定
    let isValid = COMMON_WORDS_LOCAL.has(inputHiragana) || START_WORDS_3_LETTERS.includes(inputHiragana);

    if (!isValid) {
      try {
        // Try server Jisho proxy first
        const response = await fetch(`/api/check-word?word=${encodeURIComponent(inputHiragana)}`);
        if (response.ok) {
          const resData = await response.json();
          if (resData.valid !== null) {
            isValid = resData.valid;
          } else {
            isValid = await checkWikipediaFallback(inputHiragana);
          }
        } else {
          isValid = await checkWikipediaFallback(inputHiragana);
        }
      } catch (err) {
        console.error("Server API check failed, trying fallback:", err);
        isValid = await checkWikipediaFallback(inputHiragana);
      }
    }

    setIsChecking(false);

    if (!isValid) {
      triggerError("辞書にない単語です");
      return;
    }

    // 5. 「ん」で終わる場合のゲームオーバー判定
    if (inputHiragana.endsWith("ん")) {
      const newScore = score + 100;
      setScore(newScore);
      setFinalScore(newScore);
      setHistory((prev) => [...prev, inputHiragana]);
      updateHighScore(newScore);
      setStatus("gameover");
      return;
    }

    // 接続成功時の状態アップデート (プレイヤーの入力接続成功)
    const newScore = score + 100;
    setScore(newScore);
    setFinalScore(newScore);
    setHistory((prev) => [...prev, inputHiragana]);
    const updatedUsed = new Set<string>(usedWords);
    updatedUsed.add(inputHiragana);
    setUsedWords(updatedUsed);

    setCurrentWord(inputHiragana);
    setInputText("");

    // Autoscroll history
    setTimeout(() => {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    // AI/System Turn triggered
    processSystemTurn(inputHiragana, newScore, maxTimer, updatedUsed);
  };

  // Timer Effect
  useEffect(() => {
    if (status !== "playing" || isSystemThinking || isChecking) return;

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
  }, [status, maxTimer, currentWord, isSystemThinking, isChecking]);

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

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-6 py-12 text-center font-sans">
        <div className="max-w-md w-full bg-slate-800/40 border border-rose-500/30 rounded-2xl p-8 shadow-xl space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 mb-2">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">PC専用ゲームです</h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            このゲームはタイピング入力を使用するため、スマートフォンやタブレットなどのモバイル環境には対応していません。<br />
            PC（デスクトップ）環境からアクセスしてください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. Header (Always styled nicely for current state) */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 shrink-0">
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
      <main className={`flex-1 w-full mx-auto px-4 py-8 flex flex-col justify-center items-center transition-all duration-300 ${
        status === "start" ? "max-w-4xl" : "max-w-lg"
      }`}>
        
        {/* START SCREEN STATUS */}
        {status === "start" && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center py-6" id="start_screen">
            {/* Left Column: Title Section, Start Button, and High Score */}
            <div className="flex flex-col items-center justify-center space-y-8 text-center">
              {/* Title Section (Upper Center of Screen) */}
              <div className="space-y-3">
                <h1 id="app_title" className="text-5xl font-black tracking-tight text-white drop-shadow-md">
                  爆速しりとり
                </h1>
                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                  制限時間10秒からスタート！<br />しりとりを重ねるごとに制限時間が短くなる。
                </p>
              </div>

              {/* Center Area holding Start Button and High Score */}
              <div className="w-full max-w-sm bg-slate-800/40 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
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
            </div>

            {/* Right Column: Help Info Card */}
            <div className="flex justify-center items-center">
              <div className="text-sm text-slate-300 bg-slate-800/40 border border-slate-800 rounded-2xl p-8 shadow-xl w-full max-w-md space-y-5">
                <div className="flex items-center justify-center gap-1.5 text-indigo-400 font-semibold mb-4 text-base">
                  <HelpCircle className="w-5 h-5" />
                  <span>しりとりの特別ルール</span>
                </div>
                <div className="space-y-3.5 text-slate-300 leading-relaxed">
                  <p>・入力は「小文字のローマ字のみ」で行います</p>
                  <p>・最新の単語の「最後の赤字ローマ字」から繋げます</p>
                  <p>・複数の綴り（si/shi、xtu/ltuなど）すべてを許可</p>
                  <div className="border border-dashed border-rose-500/50 bg-rose-950/20 rounded-lg p-2.5 text-rose-400 font-semibold my-1">
                    ・濁音から清音はOK、逆はNG (例：go ➔ koara ⭕ / ko ➔ go ❌)
                  </div>
                  <p>・語尾の「ー」は1文字前を参照します。(例：rubi- ➔ bi)</p>
                  <p className="text-rose-400 font-semibold">※最後が「ん（n）」で終わった場合は即ゲームオーバー！</p>
                </div>
              </div>
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
                    <span className="font-mono px-2 py-0.5 bg-slate-800/40 border border-slate-800 rounded">
                      {word} ({splitHiraganaToRomajiTokens(word).map(t => t.romaji).join("")})
                    </span>
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
                
                {/* Current Hiragana word */}
                <div className="text-4xl font-extrabold text-white tracking-widest font-sans flex items-center justify-center gap-0.5 select-none pt-2">
                  <span>{currentWord}</span>
                </div>

                {/* Sub-Romaji display with highlighted red shiritiori target */}
                <div className="mt-2 text-base flex items-center justify-center gap-1 tracking-wider font-mono select-none" id="romaji_word_representation">
                  {splitHiraganaToRomajiTokens(currentWord).map((token, idx) => (
                    <span
                      key={idx}
                      className={token.isTarget 
                        ? "text-rose-500 font-extrabold border-b-2 border-rose-500/70 px-0.5 scale-110" 
                        : "text-slate-400 font-medium opacity-85"
                      }
                    >
                      {token.romaji}
                    </span>
                  ))}
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  次の頭文字：
                  {(() => {
                    const tokens = splitHiraganaToRomajiTokens(currentWord);
                    const targetToken = tokens.find(t => t.isTarget);
                    const targetRomaji = targetToken ? targetToken.romaji : "";
                    
                    const nextTargetStart = getNormalizedChar(currentWord, true);
                    const nextTargetHint = getBaseHiragana(nextTargetStart);
                    
                    if (targetRomaji) {
                      const isLeniencyApplicable = nextTargetStart !== nextTargetHint;
                      let hintRomaji = "";
                      if (isLeniencyApplicable) {
                        const hintToken = splitHiraganaToRomajiTokens(nextTargetHint);
                        hintRomaji = hintToken[0]?.romaji || "";
                      }
                      
                      return (
                        <>
                          <span className="font-bold text-rose-400 text-sm px-1.5 py-0.5 bg-rose-950/50 border border-rose-500/20 rounded ml-1 animate-pulse font-mono font-bold">
                            「{targetRomaji}」
                          </span>
                          {isLeniencyApplicable && hintRomaji && (
                            <span className="text-[10px] text-slate-500 ml-1 font-mono">
                              (または「{hintRomaji}」)
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 ml-1">
                            ({nextTargetChar})
                          </span>
                        </>
                      );
                    }
                    
                    return (
                      <span className="font-bold text-indigo-300 text-sm px-1.5 py-0.5 bg-indigo-950/50 border border-indigo-500/20 rounded ml-1 animate-pulse">
                        「{nextTargetChar}」
                      </span>
                    );
                  })()}
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
                    onChange={(e) => setInputText(e.target.value.toLowerCase().replace(/[^a-z-]/g, ""))}
                    disabled={isChecking || isSystemThinking}
                    id="player_input_field"
                    placeholder={
                      isSystemThinking 
                        ? "システムがしりとりワードを考え中です..." 
                        : isChecking 
                          ? "辞書照合中..." 
                          : "ここに「ローマ字（小文字）」で入力してEnter..."
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
                    ※小文字のローマ字とハイフン以外の文字は入力できません
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
                      }`}>
                        {word} ({splitHiraganaToRomajiTokens(word).map(t => t.romaji).join("")})
                      </span>
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
      <footer className="w-full h-2.5 bg-slate-950 relative overflow-hidden shrink-0" id="bottom_progress_status_bar">
        {status === "playing" && (
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${
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
