const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Caminhos de dados
const DATA_DIR = path.join(__dirname, 'data');
const PATIENTS_FILE = path.join(DATA_DIR, 'patients.json');

// Garantir que a pasta de dados e o arquivo JSON existam
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PATIENTS_FILE)) {
  fs.writeFileSync(PATIENTS_FILE, '{}', 'utf8');
}

// Carregar logos e converter para Base64 no startup para eficiência
let cachedLogos = { hospital: '', marica: '' };
try {
  const pathHosp = path.join(__dirname, 'logo_hospital.png');
  const pathMarica = path.join(__dirname, 'logo_marica.png');

  if (fs.existsSync(pathHosp)) {
    const data = fs.readFileSync(pathHosp);
    cachedLogos.hospital = `data:image/png;base64,${data.toString('base64')}`;
  }
  if (fs.existsSync(pathMarica)) {
    const data = fs.readFileSync(pathMarica);
    cachedLogos.marica = `data:image/png;base64,${data.toString('base64')}`;
  }
  console.log('✅ Logos oficiais carregados e convertidos para Base64 com sucesso!');
} catch (err) {
  console.error('❌ Erro ao converter logos para Base64:', err);
}

// ── Rotas API ────────────────────────────────────────────────

// Obter todos os pacientes salvos
app.get('/api/patients', (req, res) => {
  try {
    const data = fs.readFileSync(PATIENTS_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Erro ao ler pacientes:', err);
    res.status(500).json({ error: 'Erro ao carregar os dados dos pacientes.' });
  }
});

// Salvar pacientes
app.post('/api/patients', (req, res) => {
  try {
    fs.writeFileSync(PATIENTS_FILE, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true, message: 'Dados salvos com sucesso!' });
  } catch (err) {
    console.error('Erro ao salvar pacientes:', err);
    res.status(500).json({ error: 'Erro ao persistir os dados dos pacientes.' });
  }
});

// Obter as logomarcas em Base64
app.get('/api/logos', (req, res) => {
  res.json(cachedLogos);
});

// Depuração: Salvar itens extraídos do PDF
app.post('/api/debug-pdf', (req, res) => {
  try {
    fs.writeFileSync(path.join(__dirname, 'debug_pdf_items.json'), JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir os arquivos estáticos do Frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota padrão para servir o index.html em qualquer navegação indefinida
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` 🏥 ETIQUEHOSP RODANDO EM: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
