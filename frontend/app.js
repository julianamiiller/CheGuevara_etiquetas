// ════════════════════════════════════════════════════════════
//  EtiqueHosp — app.js  v3 (Full-Stack + Persistence)
//  HM Dr. Ernesto Che Guevara — Cozinha
// ════════════════════════════════════════════════════════════

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── Constantes ───────────────────────────────────────────────
const MEALS = {
  desjejum: 'DESJEJUM',
  colacao:  'COLAÇÃO',
  almoco:   'ALMOÇO',
  lanche:   'LANCHE',
  jantar:   'JANTAR',
  ceia:     'CEIA',
};

const SECTOR_ICONS = ['🏥','🛏️','💊','🩺','🩻','🧪','❤️','🫁'];
const SECTOR_COLORS = [
  ['#bc202e','#ffebee'], // Vermelho Maricá com fundo suave
  ['#0f4c81','#e3f2fd'], // Azul Marinho com fundo suave
  ['#7c3aed','#f5f3ff'], // Violeta com fundo suave
  ['#d97706','#fffbeb'], // Dourado/Amber com fundo suave
  ['#059669','#ecfdf5'], // Verde com fundo suave
  ['#db2777','#fdf2f8'], // Rosa com fundo suave
  ['#0891b2','#ecfeff'], // Ciano com fundo suave
  ['#ea580c','#fff7ed'], // Laranja com fundo suave
];

// ── Estado global ────────────────────────────────────────────
const state = {
  sectors:    {},   // { sectorName: [patient, ...] }
  ward:       '',
  date:       '',
  activeMeal: 'almoco',
  logos: { hospital: '', marica: '' } // Base64 cache
};

let editingPatientRef = null; // { sectorName, patientIndex }

// ── DOM ──────────────────────────────────────────────────────
const uploadZone    = document.getElementById('uploadZone');
const pdfInput      = document.getElementById('pdfInput');
const btnSelectFile = document.getElementById('btnSelectFile');
const toast         = document.getElementById('toast');
const toastSpinner  = document.getElementById('toastSpinner');
const toastMsg      = document.getElementById('toastMsg');
const statsBar      = document.getElementById('statsBar');
const statSetores   = document.getElementById('statSetores');
const statPacientes = document.getElementById('statPacientes');
const statRefeicao  = document.getElementById('statRefeicao');
const dashboard     = document.getElementById('dashboard');
const btnPrintAll   = document.getElementById('btnPrintAll');
const dateInput     = document.getElementById('dateInput');
const mealPills     = document.querySelectorAll('.meal-pill');
const btnManual       = document.getElementById('btnManual');
const btnThemeToggle  = document.getElementById('btnThemeToggle');
const modalOverlay    = document.getElementById('modalOverlay');
const btnCloseModal   = document.getElementById('btnCloseModal');
const btnCancelModal  = document.getElementById('btnCancelModal');
const btnAddPatient   = document.getElementById('btnAddPatient');

// ── Tema escuro ──────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('etique-theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    btnThemeToggle.textContent = '☀️';
  }
})();

btnThemeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    btnThemeToggle.textContent = '🌙';
    localStorage.setItem('etique-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    btnThemeToggle.textContent = '☀️';
    localStorage.setItem('etique-theme', 'dark');
  }
});

// ── Init ─────────────────────────────────────────────────────
dateInput.value = new Date().toISOString().split('T')[0];
initApp();

async function initApp() {
  await fetchLogos();
  await loadPatientsFromServer();
  setupUppercaseInputs();
  setupDateMask();
}

function setupUppercaseInputs() {
  ['fSetor','fLeito','fDN','fNome','fDieta','fRestricoes','fHidrica'].forEach(id => {
    const inputElement = document.getElementById(id);
    if (inputElement) {
      inputElement.addEventListener('input', () => {
        inputElement.value = inputElement.value.toUpperCase();
      });
    }
  });
}

function setupDateMask() {
  const dnInput = document.getElementById('fDN');
  if (!dnInput) return;
  dnInput.maxLength = 10;
  dnInput.addEventListener('input', (e) => {
    // Strip everything that isn't a digit
    let digits = dnInput.value.replace(/\D/g, '');
    // Limit to 8 digits (DDMMAAAA)
    digits = digits.substring(0, 8);
    // Build formatted string with slashes
    let formatted = '';
    if (digits.length > 4) {
      formatted = digits.substring(0, 2) + '/' + digits.substring(2, 4) + '/' + digits.substring(4);
    } else if (digits.length > 2) {
      formatted = digits.substring(0, 2) + '/' + digits.substring(2);
    } else {
      formatted = digits;
    }
    dnInput.value = formatted.toUpperCase();
  });
}

// ── Obter logos Base64 do Servidor ───────────────────────────
async function fetchLogos() {
  try {
    const res = await fetch('/api/logos');
    const data = await res.json();
    state.logos = data;
    console.log('Logos Base64 carregados do backend!');
  } catch (err) {
    console.error('Erro ao carregar logos em Base64:', err);
  }
}

// ── Persistência com o Servidor ──────────────────────────────
async function loadPatientsFromServer() {
  showToast('⏳ Carregando pacientes do servidor...', true);
  try {
    const res = await fetch('/api/patients');
    const data = await res.json();
    if (data && Object.keys(data).length > 0) {
      state.sectors = data;
      statsBar.hidden = false;
      updateStats();
      renderDashboard();
      showToast('✅ Dados dos pacientes carregados.', false);
    } else {
      showToast('👋 Bem-vindo! Envie um PDF ou adicione manualmente.', false);
    }
  } catch (err) {
    console.error('Erro ao conectar ao backend:', err);
    showToast('⚠️ Modo Offline. Dados não serão salvos.', false);
  }
}

async function savePatientsToServer() {
  try {
    await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.sectors)
    });
  } catch (err) {
    console.error('Erro ao salvar dados no backend:', err);
  }
}

// ── Meal Pills ───────────────────────────────────────────────
mealPills.forEach(pill => {
  pill.addEventListener('click', () => {
    mealPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.activeMeal = pill.dataset.meal;
    statRefeicao.textContent = MEALS[state.activeMeal];
  });
});

// ── Drag & Drop ──────────────────────────────────────────────
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f?.type === 'application/pdf') handlePDF(f);
  else showToast('❌ Envie um arquivo PDF.', false);
});
btnSelectFile.addEventListener('click', () => pdfInput.click());
pdfInput.addEventListener('change', () => {
  if (pdfInput.files[0]) handlePDF(pdfInput.files[0]);
});

// ── Print All ────────────────────────────────────────────────
btnPrintAll.addEventListener('click', () => {
  const allPatients = Object.entries(state.sectors)
    .flatMap(([sector, pats]) =>
      pats.filter(p => p.selected !== false)
          .map(p => ({ ...p, _sector: sector }))
    );
  if (!allPatients.length) { alert('Nenhum paciente selecionado.'); return; }
  openPrintWindow(allPatients, state.activeMeal, getDisplayDate());
});

// ── Manual Modal ─────────────────────────────────────────────
btnManual.addEventListener('click', () => {
  editingPatientRef = null;
  document.querySelector('.modal-head h3').textContent = '➕ Adicionar Paciente';
  btnAddPatient.textContent = '✔ Adicionar';
  
  // Reset all inputs
  ['fSetor','fLeito','fNome','fDN','fDieta','fRestricoes','fHidrica']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('fAcompanhante').value = 'nao';
  document.getElementById('fConsumo').value = 'sim';
  document.getElementById('fPrecaucao').value = 'sim';
  document.getElementById('fDietaZero').value = 'nao';
  
  modalOverlay.hidden = false;
  updateLivePreview();
});
btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);
btnAddPatient.addEventListener('click', addManual);

// Update live preview when inputs change
['fSetor','fLeito','fNome','fDN','fDieta','fRestricoes','fHidrica'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateLivePreview);
});
['fDietaZero','fConsumo','fPrecaucao','fAcompanhante'].forEach(id => {
  document.getElementById(id).addEventListener('change', updateLivePreview);
});

function updateLivePreview() {
  const nome = document.getElementById('fNome').value.trim() || 'NOME DO PACIENTE';
  const setor = document.getElementById('fSetor').value.trim() || 'SETOR';
  let restricoes = document.getElementById('fRestricoes').value.trim();

  const temAcomp = document.getElementById('fAcompanhante').value === 'sim';
  const acompText = temAcomp ? 'ENVIAR PARA ACOMPANHANTE' : '';
  const hidrica = document.getElementById('fHidrica').value.trim();

  const temConsumo = document.getElementById('fConsumo').value === 'sim';
  const temPrecaucao = document.getElementById('fPrecaucao').value === 'sim';
  const temDietaZero = document.getElementById('fDietaZero').value === 'sim';

  if (temDietaZero) {
    restricoes = restricoes ? `ZERO (JEJUM) / ${restricoes}` : 'ZERO (JEJUM)';
  }

  const obsParts = [];
  if (acompText) obsParts.push(acompText);
  if (hidrica) {
    const formattedHidrica = hidrica.toUpperCase().includes('HÍDRICA') || hidrica.toUpperCase().includes('HIDRICA')
      ? hidrica : `RESTRIÇÃO HÍDRICA: ${hidrica}`;
    obsParts.push(formattedHidrica);
  }
  const observacaoCombined = obsParts.join(' / ');
  const dieta = document.getElementById('fDieta').value.trim();

  const tempPatient = {
    setor,
    leito: document.getElementById('fLeito').value.trim() || '00',
    nome,
    dn: document.getElementById('fDN').value.trim() || 'DD/MM/AAAA',
    dieta,
    dietaZero: temDietaZero,
    desjejum: restricoes,
    colacao: restricoes,
    almoco: restricoes,
    lanche: restricoes,
    jantar: restricoes,
    ceia: restricoes,
    observacao: observacaoCombined,
    consumoImediato: temConsumo,
    precaucaoContato: temPrecaucao
  };

  const mealKey = state.activeMeal;
  const labelHTML = buildLabelHTML(tempPatient, mealKey, MEALS[mealKey], getDisplayDate(), setor);
  document.getElementById('livePreviewContainer').innerHTML = labelHTML;
}

function closeModal() { modalOverlay.hidden = true; }

function openEditModal(sectorName, patientIndex, p) {
  editingPatientRef = { sectorName, patientIndex };
  document.querySelector('.modal-head h3').textContent = '✏️ Editar Paciente';
  btnAddPatient.textContent = '✔ Salvar Alterações';
  
  // Populate inputs
  document.getElementById('fSetor').value = p.setor || sectorName || '';
  document.getElementById('fLeito').value = p.leito || '';
  document.getElementById('fNome').value = p.nome || '';
  document.getElementById('fDN').value = p.dn || '';
  document.getElementById('fDieta').value = p.dieta || '';
  
  // Restrictions (use p.desjejum or almoco as fallback)
  let restricoesVal = p.desjejum || p.almoco || '';
  
  // Dieta Zero — detectar pela flag ou pela presença nas restrições
  const isZero = p.dietaZero || restricoesVal.toUpperCase().includes('ZERO (JEJUM)');
  document.getElementById('fDietaZero').value = isZero ? 'sim' : 'nao';
  
  // Limpar ZERO (JEJUM) do campo de restrições ao editar (já estará no select)
  if (isZero) {
    restricoesVal = restricoesVal
      .replace(/ZERO\s*\(JEJUM\)\s*\/\s*/gi, '')
      .replace(/\s*\/?\s*ZERO\s*\(JEJUM\)/gi, '')
      .trim();
  }
  document.getElementById('fRestricoes').value = restricoesVal;
  
  // Acompanhante
  const temAcomp = p.observacao && p.observacao.toUpperCase().includes('ACOMPANHANTE');
  document.getElementById('fAcompanhante').value = temAcomp ? 'sim' : 'nao';
  
  // Consumo Imediato
  document.getElementById('fConsumo').value = p.consumoImediato ? 'sim' : 'nao';
  
  // Precaução de Contato
  document.getElementById('fPrecaucao').value = p.precaucaoContato ? 'sim' : 'nao';
  
  // Restrição Hídrica
  let hidricaVal = '';
  if (p.observacao) {
    const match = p.observacao.match(/RESTRIÇÃO HÍDRICA:\s*([^/]+)/i) || p.observacao.match(/RESTRICAO HIDRICA:\s*([^/]+)/i);
    if (match) {
      hidricaVal = match[1].trim();
    } else if (p.observacao.toUpperCase().includes('RESTRIÇÃO HÍDRICA') || p.observacao.toUpperCase().includes('RESTRICAO HIDRICA')) {
      const parts = p.observacao.split(':');
      if (parts.length > 1) hidricaVal = parts[1].trim();
    } else {
      const parts = p.observacao.split('/').map(s => s.trim());
      const nonAcomp = parts.filter(s => !s.toUpperCase().includes('ACOMPANHANTE') && !s.toUpperCase().includes('CONSUMO') && !s.toUpperCase().includes('PRECAUÇÃO'));
      if (nonAcomp.length > 0) hidricaVal = nonAcomp[0];
    }
  }
  document.getElementById('fHidrica').value = hidricaVal;
  
  modalOverlay.hidden = false;
  updateLivePreview();
}

async function addManual() {
  const nome = document.getElementById('fNome').value.trim();
  if (!nome) { alert('Informe o nome do paciente.'); return; }

  const setor  = document.getElementById('fSetor').value.trim() || 'MANUAL';
  let restricoes = document.getElementById('fRestricoes').value.trim();

  // Obter acompanhante e hídrica
  const temAcomp = document.getElementById('fAcompanhante').value === 'sim';
  const acompText = temAcomp ? 'ENVIAR PARA ACOMPANHANTE' : '';
  const hidrica = document.getElementById('fHidrica').value.trim();

  // Obter consumo imediato, precaução de contato e dieta zero
  const temConsumo = document.getElementById('fConsumo').value === 'sim';
  const temPrecaucao = document.getElementById('fPrecaucao').value === 'sim';
  const temDietaZero = document.getElementById('fDietaZero').value === 'sim';

  // Se Dieta Zero = SIM, adiciona ZERO (JEJUM) nas restrições
  if (temDietaZero) {
    restricoes = restricoes
      ? `ZERO (JEJUM) / ${restricoes}`
      : 'ZERO (JEJUM)';
  }

  // Combina acompanhante e hídrica nas observações
  const obsParts = [];
  if (acompText) obsParts.push(acompText);
  if (hidrica) {
    const formattedHidrica = hidrica.toUpperCase().includes('HÍDRICA') || hidrica.toUpperCase().includes('HIDRICA')
      ? hidrica 
      : `RESTRIÇÃO HÍDRICA: ${hidrica}`;
    obsParts.push(formattedHidrica);
  }
  const observacaoCombined = obsParts.join(' / ');

  // Dieta — não é mais alterada pelo Dieta Zero
  const dieta = document.getElementById('fDieta').value.trim();

  const patientData = {
    setor,
    leito:      document.getElementById('fLeito').value.trim(),
    nome,
    dn:         document.getElementById('fDN').value.trim(),
    dieta,
    dietaZero:  temDietaZero,
    desjejum:   restricoes,
    colacao:    restricoes,
    almoco:     restricoes,
    lanche:     restricoes,
    jantar:     restricoes,
    ceia:       restricoes,
    observacao: observacaoCombined,
    consumoImediato: temConsumo,
    precaucaoContato: temPrecaucao,
    selected:   true,
  };

  if (editingPatientRef) {
    // Modo de Edição
    const { sectorName, patientIndex } = editingPatientRef;
    const oldSector = sectorName;
    
    // Obter o estado de seleção anterior para preservar
    const oldPatient = state.sectors[oldSector][patientIndex];
    patientData.selected = oldPatient.selected !== false;
    
    if (oldSector === setor) {
      // Mesmo setor: apenas substitui no array
      state.sectors[oldSector][patientIndex] = patientData;
    } else {
      // Setor alterado: remove do antigo e insere no novo
      state.sectors[oldSector].splice(patientIndex, 1);
      if (state.sectors[oldSector].length === 0) {
        delete state.sectors[oldSector];
      }
      if (!state.sectors[setor]) state.sectors[setor] = [];
      state.sectors[setor].push(patientData);
    }
    
    showToast(`✅ "${nome}" atualizado com sucesso.`, false);
  } else {
    // Modo de Adição
    if (!state.sectors[setor]) state.sectors[setor] = [];
    state.sectors[setor].push(patientData);
    showToast(`✅ "${nome}" adicionado ao setor ${setor}.`, false);
  }

  statsBar.hidden = false;
  updateStats();
  renderDashboard();
  closeModal();
  
  await savePatientsToServer();

  // Limpar campos
  ['fSetor','fLeito','fNome','fDN','fDieta','fRestricoes','fHidrica']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('fAcompanhante').value = 'nao';
  document.getElementById('fConsumo').value = 'sim';
  document.getElementById('fPrecaucao').value = 'sim';
  document.getElementById('fDietaZero').value = 'nao';
  
  editingPatientRef = null;
}

// ════════════════════════════════════════════════════════════
//  PDF PARSING
// ════════════════════════════════════════════════════════════
async function handlePDF(file) {
  showToast('⏳ Lendo o PDF…', true);

  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let items = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const vp   = page.getViewport({ scale: 1 });
      const tc   = await page.getTextContent();

      tc.items.forEach(item => {
        const txt = item.str.trim();
        if (!txt) return;
        items.push({
          text: txt,
          x: Math.round(item.transform[4]),
          y: Math.round(vp.height - item.transform[5]),
        });
      });
    }

    // Depuração: Enviar itens do PDF para o backend para análise estrutural
    try {
      await fetch('/api/debug-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });
    } catch (e) {
      console.warn('Erro ao enviar depuração do PDF:', e);
    }

    const result = parseMapa(items);
    state.sectors = result.sectors;
    state.ward    = result.ward;
    state.date    = result.date;

    if (state.date) {
      const parts = state.date.split('/');
      if (parts.length === 3)
        dateInput.value = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }

    const total = Object.values(state.sectors).reduce((s, a) => s + a.length, 0);

    if (total === 0) {
      showToast('⚠️ PDF sem texto legível (imagem). Use o cadastro Manual.', false);
      showScannedPDFWarningModal(file.name);
    } else {
      showToast(`✅ ${total} paciente(s) em ${Object.keys(state.sectors).length} setor(es).`, false);
      uploadZone.classList.add('done');
      uploadZone.querySelector('h2').textContent = `✅ ${file.name}`;
      uploadZone.querySelector('p').textContent   = `${total} pacientes · ${Object.keys(state.sectors).length} setores`;
      statsBar.hidden = false;
      updateStats();
      renderDashboard();
      await savePatientsToServer();
    }

  } catch (err) {
    console.error(err);
    showToast('❌ Erro ao ler PDF. Tente "✏️ Manual".', false);
  }
}

function toLines(items) {
  const sorted = [...items].sort((a,b) => a.y - b.y || a.x - b.x);
  const lines  = [];
  let cur = [], lastY = null;

  sorted.forEach(it => {
    if (lastY === null || Math.abs(it.y - lastY) <= 4) {
      cur.push(it);
      if (lastY === null) lastY = it.y;
    } else {
      if (cur.length) lines.push(cur.sort((a,b) => a.x - b.x));
      cur   = [it];
      lastY = it.y;
    }
  });
  if (cur.length) lines.push(cur.sort((a,b) => a.x - b.x));
  return lines;
}

function parseMapa(items) {
  const lines    = toLines(items);
  let ward  = '';
  let date  = '';
  let colMap     = {};
  let headerIdx  = -1;
  let sectors    = {};

  const COL = {
    setor:      ['SETOR'],
    leito:      ['LEITO'],
    nome:       ['NOME','BOLETIM'],
    dn:         ['DN'],
    dieta:      ['DIETA'],
    desjejum:   ['DESJEJUM','CAFÉ','CAFE'],
    colacao:    ['COLAÇÃO','COLACAO','COLAÇAO'],
    almoco:     ['ALMOÇO','ALMOCO'],
    lanche:     ['LANCHE'],
    jantar:     ['JANTAR'],
    ceia:       ['CEIA'],
    observacao: ['OBSERVA','ACOMPANHANTE'],
  };

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const txt = lines[i].map(it => it.text).join(' ').toUpperCase();
    if (txt.includes('MAPA') || txt.includes('COZINHA')) {
      const wm = txt.match(/CT[\s\w]*/i) || txt.match(/ENFER[\w\s]+/i);
      if (wm) ward = wm[0].trim().replace(/,.*$/, '').trim();
      const dm = txt.match(/\d{2}\/\d{2}\/\d{4}/);
      if (dm) date = dm[0];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const txt = lines[i].map(it => it.text.toUpperCase()).join(' ');
    if (txt.includes('LEITO') && txt.includes('DIETA')) {
      headerIdx = i;
      lines[i].forEach(it => {
        const up = it.text.toUpperCase();
        for (const [key, kws] of Object.entries(COL)) {
          if (kws.some(kw => up.includes(kw)) && !colMap[key]) {
            colMap[key] = { xMin: it.x, xMax: it.x + Math.max(it.width || 0, 50) };
          }
        }
      });
      break;
    }
  }

  if (headerIdx === -1) return { ward, date, sectors };

  const ordered = Object.entries(colMap).sort((a,b) => a[1].xMin - b[1].xMin);
  ordered.forEach(([k, col], idx) => {
    col.xMax = ordered[idx+1]?.[1].xMin ?? 9999;
  });

  const dataLines = lines.slice(headerIdx + 1);
  let buf = [];

  function flush(b) {
    if (!b.length) return;
    const p = buildPatient(b, colMap);
    if (p?.nome) {
      const sec = p.setor || ward || 'SETOR';
      if (!sectors[sec]) sectors[sec] = [];
      p.selected = true;
      sectors[sec].push(p);
    }
  }

  dataLines.forEach(line => {
    const hasLeito = line.some(it => {
      const lc = colMap.leito;
      return lc && it.x >= lc.xMin - 12 && it.x < lc.xMax && /^\d+$/.test(it.text);
    });
    if (hasLeito && buf.length) { flush(buf); buf = [line]; }
    else buf.push(line);
  });
  flush(buf);

  if (!Object.keys(sectors).length && ward) sectors[ward] = [];

  return { ward, date, sectors };
}

function buildPatient(lines, colMap) {
  const f = {};
  lines.forEach(line => {
    line.forEach(it => {
      for (const [key, col] of Object.entries(colMap)) {
        if (it.x >= col.xMin - 12 && it.x < col.xMax) {
          f[key] = f[key] ? f[key] + ' ' + it.text : it.text;
        }
      }
    });
  });
  if (!f.nome && !f.leito) return null;
  const clean = s => (s || '').trim();

  const obsText = clean(f.observacao).toUpperCase();
  const dietaText = clean(f.dieta).toUpperCase();
  const allText = obsText + ' ' + dietaText;

  const consumoImediato = allText.includes('CONSUMO IMEDIATO') || allText.includes('IMEDIATO');
  const precaucaoContato = allText.includes('PRECAUÇÃO') || allText.includes('PRECAUCAO') || allText.includes('CONTATO');

  return {
    setor:      clean(f.setor),
    leito:      clean(f.leito),
    nome:       clean(f.nome),
    dn:         clean(f.dn),
    dieta:      clean(f.dieta),
    desjejum:   clean(f.desjejum),
    colacao:    clean(f.colacao),
    almoco:     clean(f.almoco),
    lanche:     clean(f.lanche),
    jantar:     clean(f.jantar),
    ceia:       clean(f.ceia),
    observacao: clean(f.observacao),
    consumoImediato,
    precaucaoContato,
  };
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════
function updateStats() {
  const secs   = Object.keys(state.sectors).length;
  const total  = Object.values(state.sectors).reduce((s,a) => s + a.length, 0);
  statSetores.textContent  = secs;
  statPacientes.textContent = total;
  statRefeicao.textContent  = MEALS[state.activeMeal];
}

function renderDashboard() {
  dashboard.innerHTML = '';
  const entries = Object.entries(state.sectors);
  entries.forEach(([sec, patients], idx) => {
    const [color, bg] = SECTOR_COLORS[idx % SECTOR_COLORS.length];
    const icon  = SECTOR_ICONS[idx % SECTOR_ICONS.length];
    const card  = buildSectorCard(sec, patients, color, bg, icon, idx);
    dashboard.appendChild(card);
  });
}

function buildSectorCard(secName, patients, color, bg, icon, idx) {
  const card = document.createElement('div');
  card.className  = 'sector-card';
  card.style.animationDelay = `${idx * 0.07}s`;

  const selectedCount = () => patients.filter(p => p.selected !== false).length;

  function refreshFooter() {
    const sel = selectedCount();
    card.querySelector('.footer-sel-info').textContent =
      `${sel} de ${patients.length} selecionado(s)`;
  }

  card.innerHTML = `
    <div class="sector-head">
      <div class="sector-icon" style="background:${bg}; color:${color};">${icon}</div>
      <div class="sector-info">
        <div class="sector-name">${secName}</div>
        <div class="sector-count">${patients.length} paciente(s)</div>
      </div>
      <button class="btn-print-sector" data-sector="${secName}">🖨️ Imprimir Setor</button>
      <span class="sector-chevron">▼</span>
    </div>
    <div class="patient-list" id="plist-${idx}"></div>
    <div class="sector-footer">
      <span class="footer-sel-info">${patients.length} de ${patients.length} selecionado(s)</span>
      <div class="footer-actions">
        <button class="btn-sm" data-action="all" data-idx="${idx}">Todos</button>
        <button class="btn-sm" data-action="none" data-idx="${idx}">Nenhum</button>
        <button class="btn-sm btn-preview" data-action="preview" data-idx="${idx}">👁️ Visualizar</button>
      </div>
    </div>
  `;

  // Toggle abrir/fechar ao clicar no cabeçalho do setor
  const sectorHead = card.querySelector('.sector-head');
  sectorHead.addEventListener('click', (e) => {
    // Não toggle se clicou no botão de imprimir
    if (e.target.closest('.btn-print-sector')) return;
    card.classList.toggle('open');
  });

  const plist = card.querySelector(`#plist-${idx}`);
  patients.forEach((p, pi) => {
    const row = document.createElement('div');
    row.className = 'patient-row';
    if (p.selected === false) row.classList.add('deselected');
    row.dataset.pi = pi;
    row.innerHTML = `
      <div class="patient-check">✔</div>
      <div class="patient-bed">${p.leito || '—'}</div>
      <div class="patient-info">
        <div class="patient-name">${p.nome}</div>
        <div class="patient-diet">${p.dieta || '—'}</div>
      </div>
      <div class="patient-dn">${p.dn || ''}</div>
      <button class="btn-delete-patient" title="Apagar Paciente">🗑️</button>
      <button class="btn-edit-patient" title="Editar Paciente">✏️</button>
    `;
    row.addEventListener('click', async () => {
      p.selected = (p.selected === false) ? true : false;
      row.classList.toggle('deselected', p.selected === false);
      refreshFooter();
      await savePatientsToServer();
    });
    
    // Configurar o clique no botão de edição para abrir o modal sem alternar a seleção do paciente
    const btnEdit = row.querySelector('.btn-edit-patient');
    btnEdit.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(secName, pi, p);
    });

    const btnDelete = row.querySelector('.btn-delete-patient');
    btnDelete.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Tem certeza que deseja apagar o paciente ${p.nome}?`)) {
        state.sectors[secName].splice(pi, 1);
        if (state.sectors[secName].length === 0) delete state.sectors[secName];
        await savePatientsToServer();
        renderDashboard();
      }
    });
    
    plist.appendChild(row);
  });

  card.querySelector('.btn-print-sector').addEventListener('click', () => {
    const toprint = patients.filter(p => p.selected !== false)
                            .map(p => ({ ...p, _sector: secName }));
    if (!toprint.length) { alert('Nenhum paciente selecionado neste setor.'); return; }
    openPrintWindow(toprint, state.activeMeal, getDisplayDate());
  });

  card.querySelector('[data-action="all"]').addEventListener('click', async () => {
    patients.forEach(p => p.selected = true);
    plist.querySelectorAll('.patient-row').forEach(r => r.classList.remove('deselected'));
    refreshFooter();
    await savePatientsToServer();
  });
  card.querySelector('[data-action="none"]').addEventListener('click', async () => {
    patients.forEach(p => p.selected = false);
    plist.querySelectorAll('.patient-row').forEach(r => r.classList.add('deselected'));
    refreshFooter();
    await savePatientsToServer();
  });

  card.querySelector('[data-action="preview"]').addEventListener('click', () => {
    const selected = patients.filter(p => p.selected !== false);
    if (!selected.length) { alert('Nenhum paciente selecionado para visualizar.'); return; }
    openLabelPreview(selected, secName);
  });

  refreshFooter();
  return card;
}

// ════════════════════════════════════════════════════════════
//  IMPRESSÃO — abre janela com suporte 100% robusto a Base64
// ════════════════════════════════════════════════════════════
function openPrintWindow(patients, mealKey, date) {
  const mealLabel = MEALS[mealKey];
  const labelsHTML = patients.map(p => buildLabelHTML(p, mealKey, mealLabel, date, p._sector || p.setor)).join('');

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Etiquetas — ${mealLabel} — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; font-family: Arial, sans-serif; }

    .page-header {
      padding: 6mm 8mm 4mm;
      border-bottom: 1px solid #ccc;
      display: flex;
      justify-content: space-between;
      align-items: center;
      print-color-adjust: exact;
    }
    .page-header .ph-title { font-size: 13px; font-weight: bold; color: #333; }
    .page-header .ph-sub   { font-size: 11px; color: #666; }
    .btn-print {
      background: #c0392b; color: white; border: none;
      padding: 8px 20px; border-radius: 6px;
      font-size: 13px; font-weight: bold; cursor: pointer;
    }

    .labels-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      padding: 6mm 8mm;
    }

    .label {
      border: 1.5px solid #000;
      border-radius: 0;
      overflow: hidden;
      display: grid;
      grid-template-columns: 62% 38%;
      min-height: 55mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .label-left {
      padding: 10px 12px;
      border-right: 1.5px solid #000;
    }

    .logos {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 12px;
    }
    .logos img {
      height: 38px;
      max-height: 38px;
      object-fit: contain;
      display: inline-block;
    }

    .lbl-meal {
      font-size: 12px;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
      margin-top: 6px;
      line-height: 1.2;
    }
    .lbl-ward {
      font-size: 12px;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
      margin-bottom: 12px;
      line-height: 1.2;
    }

    .fields {
      font-size: 11px;
      font-weight: bold;
      color: #000;
      line-height: 1.5;
      text-transform: uppercase;
    }

    .label-right {
      display: flex;
      flex-direction: column;
      background: #fff;
      padding: 0;
      height: 100%;
    }

    @media print {
      .page-header .btn-print { display: none; }
      body { margin: 0; }
      .labels-grid { padding: 4mm; gap: 3mm; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div>
      <div class="ph-title">🖨️ ${mealLabel} — ${date}</div>
      <div class="ph-sub">${patients.length} etiqueta(s) — HM Dr. Ernesto Che Guevara</div>
    </div>
    <button class="btn-print" onclick="window.print()">Imprimir</button>
  </div>
  <div class="labels-grid">${labelsHTML}</div>
</body>
</html>`);
  win.document.close();
}

function buildLabelHTML(p, mealKey, mealLabel, date, sector) {
  const restrict = (p[mealKey] || '').trim();
  const qLeito = p.leito || '—';

  // Caminho de fallback local caso o servidor não esteja disponível (modo offline / file:///)
  const logoHosp = state.logos.hospital || 'logo_hospital.png';
  const logoMarica = state.logos.marica || 'logo_marica.png';

  // Blocos organizados por hierarquia
  const topBlocks = [];    // Consumo Imediato / Precaução de Contato
  const midBlocks = [];    // Restrição Hídrica, Restrições alimentares, outras obs
  const botBlocks = [];    // Acompanhante (sempre no final)

  // 1. Consumo Imediato (TOPO — sempre presente em todas as etiquetas)
  topBlocks.push('CONSUMO IMEDIATO');

  // 2. Precaução de Contato (TOPO)
  if (p.precaucaoContato || (p.observacao && (p.observacao.toUpperCase().includes('PRECAUÇÃO') || p.observacao.toUpperCase().includes('PRECAUCAO') || p.observacao.toUpperCase().includes('CONTATO')))) {
    topBlocks.push('PRECAUÇÃO DE CONTATO');
  }

  // 3. Restrição Hídrica (MEIO)
  if (p.observacao) {
    const obsUpper = p.observacao.toUpperCase();
    if (obsUpper.includes('RESTRIÇÃO HÍDRICA') || obsUpper.includes('RESTRICAO HIDRICA') || obsUpper.includes('HÍDRICA') || obsUpper.includes('HIDRICA')) {
      const parts = p.observacao.split('/');
      const hPart = parts.find(pt => pt.toUpperCase().includes('HÍDRICA') || pt.toUpperCase().includes('HIDRICA'));
      if (hPart) {
        midBlocks.push(hPart.trim().toUpperCase().replace(':', ''));
      } else {
        midBlocks.push('RESTRIÇÃO HÍDRICA');
      }
    }
  }

  // 4. Restrições Alimentares da refeição (MEIO)
  if (restrict) {
    midBlocks.push(restrict.toUpperCase());
  }

  // 5. Outras observações genéricas residuais (MEIO)
  if (p.observacao) {
    const cleanObsParts = p.observacao.split('/')
      .map(s => s.trim().toUpperCase())
      .filter(s => {
        return !s.includes('CONSUMO IMEDIATO') &&
               !s.includes('IMEDIATO') &&
               !s.includes('PRECAUÇÃO') &&
               !s.includes('PRECAUCAO') &&
               !s.includes('ACOMPANHANTE') &&
               !s.includes('HÍDRICA') &&
               !s.includes('HIDRICA') &&
               !s.includes('CONTATO');
      });
    if (cleanObsParts.length > 0) {
      midBlocks.push(cleanObsParts.join(' / '));
    }
  }

  // 6. Acompanhante (SEMPRE NO FINAL)
  if (p.observacao && p.observacao.toUpperCase().includes('ACOMPANHANTE')) {
    botBlocks.push('ENVIAR PARA ACOMPANHANTE');
  }

  // Juntar todos os blocos na ordem correta
  const allBlocks = [...topBlocks, ...midBlocks, ...botBlocks];

  // Renderizar coluna da direita — sem espaços em branco
  let rightColumnHTML = '';
  if (allBlocks.length > 0) {
    rightColumnHTML = allBlocks.map((text) => {
      if (text === 'CONSUMO IMEDIATO') {
        return `
          <div style="padding: 6px 8px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 900; font-size: 11px; line-height: 1.3; color: #000;">
            <span>${text}</span>
          </div>
        `;
      }
      if (text.includes('ZERO')) {
        return `
          <div style="padding: 8px 8px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 900; font-size: 18px; line-height: 1.3; color: #000;">
            <span style="text-decoration: underline;">${text}</span>
          </div>
        `;
      }
      return `
        <div style="padding: 8px 8px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 900; font-size: 13px; line-height: 1.3; color: #000;">
          <span style="text-decoration: underline;">${text}</span>
        </div>
      `;
    }).join('');
  }

  return `
<div class="label">
  <div class="label-left">
    <div class="logos">
      ${logoHosp ? `<img src="${logoHosp}" alt="Hospital Municipal">` : ''}
      ${logoMarica ? `<img src="${logoMarica}" alt="Prefeitura de Maricá">` : ''}
    </div>
    <div class="lbl-meal">${mealLabel}</div>
    <div class="lbl-ward">${sector || '—'}</div>
    <div class="fields">
      <div>DATA: ${date}</div>
      <div>QUARTO/LEITO: ${qLeito.toUpperCase()}</div>
      <div>NOME: ${p.nome.toUpperCase()}</div>
      <div>DN: ${p.dn || '—'}</div>
      <div>TIPO DE DIETA: ${p.dieta ? p.dieta.toUpperCase() : '—'}</div>
    </div>
  </div>
  <div class="label-right" style="justify-content: flex-start;">
    ${rightColumnHTML}
  </div>
</div>`;
}

// ── Pré-visualização de Etiqueta ─────────────────────────────
const previewOverlay  = document.getElementById('previewOverlay');
const previewContent  = document.getElementById('previewContent');

document.getElementById('btnClosePreview').addEventListener('click', () => previewOverlay.hidden = true);
document.getElementById('btnClosePreview2').addEventListener('click', () => previewOverlay.hidden = true);
previewOverlay.addEventListener('click', (e) => {
  if (e.target === previewOverlay) previewOverlay.hidden = true;
});

function openLabelPreview(patients, sectorName) {
  const mealKey = state.activeMeal;
  const mealLabel = MEALS[mealKey];
  const date = getDisplayDate();
  const arr = Array.isArray(patients) ? patients : [patients];
  const labelsHTML = arr.map(p => buildLabelHTML(p, mealKey, mealLabel, date, sectorName)).join('');
  previewContent.innerHTML = `<div class="preview-grid">${labelsHTML}</div>`;
  previewOverlay.hidden = false;
}

// ── Helpers ──────────────────────────────────────────────────
function getDisplayDate() {
  const v = dateInput.value;
  return v ? v.split('-').reverse().join('/') : state.date || '—';
}

function showToast(msg, loading) {
  toast.hidden = false;
  toastMsg.textContent = msg;
  toastSpinner.classList.toggle('hide', !loading);
}

function showScannedPDFWarningModal(fileName) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pdfWarningOverlay';
  overlay.style.zIndex = '300';
  
  overlay.innerHTML = `
    <div class="modal" style="max-width: 580px; border-color: var(--blue);">
      <div class="modal-head" style="border-bottom: 1px solid var(--border);">
        <h3 style="color: var(--gold); display: flex; align-items: center; gap: 8px;">
          ⚠️ PDF em formato de Imagem
        </h3>
        <button class="modal-x" onclick="document.getElementById('pdfWarningOverlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px; font-size: 13.5px; line-height: 1.6; color: var(--text1); padding: 24px; max-height: 80vh; overflow-y: auto;">
        <p>O arquivo <strong>"${fileName}"</strong> foi carregado com sucesso, mas o sistema identificou que ele é um <strong>PDF de Imagem (Escaneado ou Apenas Foto)</strong>.</p>
        
        <p><strong>Por que isso acontece?</strong></p>
        <p style="background: var(--bg); padding: 12px; border-radius: var(--r-sm); border: 1px solid var(--border); color: var(--text2); font-size: 12.5px;">
          Quando o mapa é escaneado ou gerado como imagem/foto, as letras não são selecionáveis. O computador não consegue extrair as letras digitadas de forma automática pois não há texto codificado nele.
        </p>

        <p><strong>Como resolver facilmente?</strong></p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <span style="font-size: 18px;">📄</span>
            <span><strong>Como exportar um PDF legível:</strong> Se você gera o mapa a partir do Excel, Word ou Google Sheets, clique em <strong>Salvar Como -> PDF</strong> (PDF com texto selecionável). Assim, a leitura será 100% automática!</span>
          </div>
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <span style="font-size: 18px;">✏️</span>
            <span><strong>Usar o Modo Manual:</strong> Como alternativa rápida, você pode clicar no botão <strong>"✏️ Manual"</strong> no topo direito para cadastrar os pacientes do setor diretamente na tela em poucos segundos!</span>
          </div>
        </div>
      </div>
      <div class="modal-foot" style="border-top: 1px solid var(--border);">
        <button class="btn-add" style="background: var(--blue); color: white;" onclick="document.getElementById('pdfWarningOverlay').remove()">Entendido</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}
