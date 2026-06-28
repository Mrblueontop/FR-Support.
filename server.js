const express = require("express");
const Pusher = require("pusher");

const app = express();
app.use(express.json());

// ======================
// PUSHER CONFIG
// ======================
const pusher = new Pusher({
  appId: "2171554",
  key: "61f5177ad0d54392b67a",
  secret: "1e3086ad4418c74ae423", // ⚠️ rotate this key
  cluster: "us2",
  useTLS: true
});

// ======================
// SIMPLE IN-MEMORY STORAGE
// ======================
const sessions = {};
// structure:
// sessions[sessionId] = { messages: [], response: null }

// ======================
// CREATE / REGISTER SESSION (optional use)
// ======================
app.post("/start", (req, res) => {
  const { sessionId } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      messages: [],
      response: null
    };
  }

  res.json({ ok: true });
});

// ======================
// ROBLOX → SEND MESSAGE
// ======================
app.post("/send", (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).send("Missing data");
  }

  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      messages: [],
      response: null
    };
  }

  sessions[sessionId].messages.push({
    from: "player",
    message,
    time: Date.now()
  });

  // push to terminal via Pusher
  pusher.trigger("support-channel", "message", {
    sessionId,
    message
  });

  res.send("ok");
});

// ======================
// MAC TERMINAL → REPLY
// ======================
app.post("/reply", (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      messages: [],
      response: null
    };
  }

  sessions[sessionId].messages.push({
    from: "support",
    message,
    time: Date.now()
  });

  sessions[sessionId].response = message;

  // push back to Roblox
  pusher.trigger("support-channel", "reply", {
    sessionId,
    message
  });

  res.send("ok");
});

// ======================
// ROBLOX POLL RESPONSE
// ======================
app.get("/get", (req, res) => {
  const { id } = req.query;

  if (!id || !sessions[id]) {
    return res.json(null);
  }

  res.json({
    sessionId: id,
    response: sessions[id].response,
    messages: sessions[id].messages
  });
});

// ======================
// CLEAR RESPONSE (prevents spam repeats)
// ======================
app.post("/clear", (req, res) => {
  const { sessionId } = req.body;

  if (sessions[sessionId]) {
    sessions[sessionId].response = null;
  }

  res.send("ok");
});

// ======================
// START SERVER (RAILWAY SAFE)
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Support server running on port", PORT);
});
