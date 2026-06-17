import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper function to convert Katakana to Hiragana
  function toHiragana(str: string): string {
    return str.replace(/[\u30a1-\u30f6]/g, (match) => {
      const chr = match.charCodeAt(0) - 0x60;
      return String.fromCharCode(chr);
    });
  }

  // Base Romaji/Hiragana normalization function to strip dakuten/handakuten
  function normalizeKana(str: string): string {
    return str.normalize("NFD").replace(/[\u3099\u309a]/g, "");
  }

  // API endpoint to check if a word is in the dictionary via Jisho API
  app.get("/api/check-word", async (req, res) => {
    const { word } = req.query;
    if (!word || typeof word !== "string") {
      res.status(400).json({ valid: false, error: "Word parameter is required" });
      return;
    }

    const searchWord = word.trim();
    const searchWordHiragana = toHiragana(searchWord);

    try {
      // Fetch from Jisho API (pre-registration free API)
      const response = await fetch(
        `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(searchWord)}`
      );

      if (!response.ok) {
        throw new Error(`Jisho API returned status ${response.status}`);
      }

      const json = (await response.json()) as any;
      if (!json || !Array.isArray(json.data)) {
        res.json({ valid: false });
        return;
      }

      // Check if there is any entry whose reading matches our hiragana search word
      const hasMatch = json.data.some((entry: any) => {
        if (!entry.japanese || !Array.isArray(entry.japanese)) return false;
        return entry.japanese.some((jp: any) => {
          const reading = jp.reading ? toHiragana(jp.reading) : "";
          const wordForm = jp.word ? toHiragana(jp.word) : "";
          return reading === searchWordHiragana || wordForm === searchWordHiragana;
        });
      });

      res.json({ valid: hasMatch });
    } catch (err: any) {
      console.error("Error accessing dictionary API:", err);
      // If the external API fails (timeout, rate limit), we return a fallback response so client can handle it gracefully.
      res.json({ valid: null, error: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
