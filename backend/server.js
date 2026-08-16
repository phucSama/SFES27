const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_DIR = path.join(__dirname, '../frontend');
const DATA_DIR = path.resolve(__dirname, '../data');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

const SUBJECTS = [
  { key: 'chem', name: 'Hoá học', description: 'Mô phỏng phản ứng kim loại với axit và bazơ.' },
  { key: 'phys', name: 'Vật lý', description: 'Mô phỏng mặt phẳng nghiêng và ma sát.' },
  { key: 'bio', name: 'Sinh học', description: 'Quan sát tế bào thực vật và động vật.' },
  { key: 'math', name: 'Toán học', description: 'Không gian để mở rộng mô phỏng toán học.' },
  { key: 'review', name: 'Ôn tập', description: 'Hệ thống ôn tập lặp lại ngắt quãng.' }
];

const ROOM_PROMPTS = {
  chem: 'Bạn là trợ lý thí nghiệm Hoá học cho học sinh. Giải thích hiện tượng ngắn gọn, đúng bản chất, ưu tiên an toàn, dùng tiếng Việt dễ hiểu.',
  phys: 'Bạn là trợ lý Vật lý cho học sinh. Giải thích trực quan, liên hệ công thức khi cần, dùng tiếng Việt ngắn gọn và dễ hiểu.',
  bio: 'Bạn là trợ lý Sinh học cho học sinh. Giải thích rõ chức năng bào quan, so sánh cấu trúc bằng tiếng Việt dễ hiểu.',
  math: 'Bạn là trợ lý Toán học cho học sinh. Trình bày từng bước, dễ hiểu, ưu tiên trực giác trước công thức.',
  review: 'Bạn là trợ lý ôn tập. Hãy hỏi đáp ngắn gọn, củng cố kiến thức, giải thích đáp án sai bằng tiếng Việt dễ hiểu.'
};

app.use(cors());
app.use(express.json({ limit: '1mb' }));

ensureDataFile();

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'sfes-lab-api'
    }
  });
});

app.get('/api/subjects', (req, res) => {
  res.json({
    success: true,
    data: SUBJECTS
  });
});

app.get('/api/progress/:userId', (req, res) => {
  const db = readProgress();
  const userId = req.params.userId;
  const data = db[userId] || defaultProgress();

  res.json({
    success: true,
    data
  });
});

app.put('/api/progress/:userId', (req, res) => {
  const userId = req.params.userId;
  const payload = req.body || {};
  const db = readProgress();

  db[userId] = {
    ...defaultProgress(),
    ...db[userId],
    ...payload,
    updatedAt: new Date().toISOString()
  };

  writeProgress(db);

  res.json({
    success: true,
    data: db[userId]
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { room = 'chem', message, history = [] } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Thiếu nội dung message.'
      });
    }

    const normalizedHistory = Array.isArray(history)
      ? history
          .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
          .slice(-12)
      : [];

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({
        success: true,
        data: {
          reply: buildMockReply(room, message)
        }
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: ROOM_PROMPTS[room] || ROOM_PROMPTS.chem,
        messages: normalizedHistory.length
          ? normalizedHistory
          : [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.error?.message || 'Không gọi được Anthropic API.'
      });
    }

    const reply = Array.isArray(data.content)
      ? data.content.map((block) => block?.text || '').join('\n').trim()
      : '';

    res.json({
      success: true,
      data: {
        reply: reply || 'Mình chưa nhận được câu trả lời rõ ràng từ mô hình.'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi máy chủ nội bộ.'
    });
  }
});

app.use(express.static(FRONTEND_DIR));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SFES Lab API is running at http://localhost:${PORT}`);
});

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(PROGRESS_FILE)) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

function readProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch (error) {
    return {};
  }
}

function writeProgress(data) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function defaultProgress() {
  return {
    streak: 0,
    longestStreak: 0,
    points: 0,
    state: {},
    updatedAt: null
  };
}

function buildMockReply(room, message) {
  const roomName = SUBJECTS.find((item) => item.key === room)?.name || 'mô phỏng';
  return [
    `Hiện backend API đã hoạt động cho phòng ${roomName}.`,
    `Bạn vừa hỏi: "${message}".`,
    'Hiện máy chủ đang trả lời bằng chế độ mock vì chưa cấu hình `ANTHROPIC_API_KEY` trong file `.env`.'
  ].join(' ');
}
