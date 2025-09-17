// server.js
const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.json());
app.use(express.static('public')); // serve frontend (index.html)

// rota para sempre carregar index.html no "/"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Storage com nome único
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(9).toString('hex');
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${id}__${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // limite 200MB
});

// endpoint para upload single
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
  const filename = req.file.filename;
  const downloadUrl = `${req.protocol}://${req.get('host')}/files/${encodeURIComponent(filename)}`;
  res.json({ ok: true, downloadUrl, filename });
});

// servir arquivo como download direto
app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) return res.status(404).send('Arquivo não encontrado');

  const parts = filename.split('__');
  const originalName = parts.slice(1).join('__') || filename;

  res.download(filePath, originalName, (err) => {
    if (err) {
      console.error('Erro ao enviar arquivo:', err);
      if (!res.headersSent) res.status(500).send('Erro no servidor');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
