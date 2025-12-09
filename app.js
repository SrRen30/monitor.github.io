// === Config de backend PHP (ruta relativa desde /frontend)
const API_BASE   = '../backend';
const SAVE_URL   = API_BASE + '/save_reading.php';
const LIST_URL   = API_BASE + '/get_readings.php';
const EXPORT_URL = API_BASE + '/export_csv.php';

// ===== Elementos base
const startBtn  = document.getElementById('start');
const stopBtn   = document.getElementById('stop');
const exportBtn = document.getElementById('export');
const autoSave  = document.getElementById('auto-save');

// Modo
const modeSim    = document.getElementById('mode-sim');
const modeSerial = document.getElementById('mode-serial');
const simCtrls   = document.getElementById('sim-controls');
const serialCtrls= document.getElementById('serial-controls');
const connectBtn = document.getElementById('connect-serial');
const baudSelect = document.getElementById('baud');

// Simulación
const targetInput = document.getElementById('target');
const rateInput   = document.getElementById('rate');
const noiseInput  = document.getElementById('noise');
const applyBtn    = document.getElementById('apply');

// Estado
let port = null;
let reader = null;
let isRunning = false;
let timer = null;
let lastTick = null;
let startTime = null;

const sections = { s1: 0, s2: 0, s3: 0, s4: 0 };
let target = 55, rate = 2, noise = 0.2;

// ===== Gráfico
const history = { time: [], s1: [], s2: [], s3: [], s4: [] };
const ctx = document.getElementById('chart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: history.time,
    datasets: [
      { label:'Sección 1', data: history.s1, borderColor:'#FF6B6B', tension:0.25, pointRadius:0 },
      { label:'Sección 2', data: history.s2, borderColor:'#4ECDC4', tension:0.25, pointRadius:0 },
      { label:'Sección 3', data: history.s3, borderColor:'#FFD93D', tension:0.25, pointRadius:0 },
      { label:'Sección 4', data: history.s4, borderColor:'#95E1D3', tension:0.25, pointRadius:0 },
    ]
  },
  options: {
    animation:false,
    responsive:true,
    scales:{ x:{ title:{display:true, text:'Tiempo (s)'} }, y:{ min:0, max:100 } }
  }
});

// ===== Helpers UI
const tempEls = {
  s1: document.querySelector('#s1 .temp'),
  s2: document.querySelector('#s2 .temp'),
  s3: document.querySelector('#s3 .temp'),
  s4: document.querySelector('#s4 .temp'),
};
const sectionEls = {
  s1: document.getElementById('s1'),
  s2: document.getElementById('s2'),
  s3: document.getElementById('s3'),
  s4: document.getElementById('s4'),
};

function tempColor(t){
  if(t < 10) return '#2980B9';
  if(t < 20) return '#3498DB';
  if(t < 30) return '#2ECC71';
  if(t < 40) return '#F1C40F';
  if(t < 50) return '#E67E22';
  if(t < 60) return '#E74C3C';
  return '#C0392B';
}

function updateCards(){
  ['s1','s2','s3','s4'].forEach(k=>{
    const v = sections[k];
    tempEls[k].innerText = v.toFixed(1)+'°C';
    sectionEls[k].style.background = tempColor(v);
    sectionEls[k].style.transform = `scale(${1 + Math.min(v,60)/600})`;
  });
}

async function pushReading(obj){
  const t = ((Date.now()-startTime)/1000).toFixed(0);
  history.time.push(t);
  history.s1.push(obj.s1); history.s2.push(obj.s2);
  history.s3.push(obj.s3); history.s4.push(obj.s4);
  if(history.time.length>600){ history.time.shift(); history.s1.shift(); history.s2.shift(); history.s3.shift(); history.s4.shift(); }
  chart.update('none');

  const tbody = document.querySelector('#table tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${new Date().toLocaleTimeString()}</td>
                  <td>${obj.s1.toFixed(2)}</td><td>${obj.s2.toFixed(2)}</td>
                  <td>${obj.s3.toFixed(2)}</td><td>${obj.s4.toFixed(2)}</td>`;
  tbody.prepend(tr);
  while(tbody.children.length>10) tbody.removeChild(tbody.lastChild);

  if(!autoSave.checked) return;

  try{
    const res = await fetch(SAVE_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        timestamp: new Date().toISOString().slice(0,19).replace('T',' '),
        s1: obj.s1, s2: obj.s2, s3: obj.s3, s4: obj.s4
      })
    });
    if(!res.ok){
      console.warn('save_reading.php respondió', res.status, await res.text());
    }
  }catch(e){
    console.error('Error guardando:', e);
  }
}

// ===== Modo UI
function refreshModeUI(){
  const sim = modeSim.checked;
  simCtrls.classList.toggle('hidden', !sim);
  serialCtrls.classList.toggle('hidden', sim);
  connectBtn.classList.toggle('hidden', sim);
}
modeSim.addEventListener('change', refreshModeUI);
modeSerial.addEventListener('change', refreshModeUI);
refreshModeUI();

// ===== Simulación
applyBtn.addEventListener('click', ()=>{
  target = parseFloat(targetInput.value) || target;
  rate   = Math.max(parseFloat(rateInput.value) || rate, 0.05);
  noise  = Math.max(parseFloat(noiseInput.value) || noise, 0);
});
function simStep(dt){
  ['s1','s2','s3','s4'].forEach(k=>{
    const diff = target - sections[k];
    const step = Math.sign(diff)*Math.min(Math.abs(diff), rate*dt);
    const n = noise>0 ? (Math.random()*2-1)*noise : 0;
    sections[k] = Math.max(0, Math.min(100, sections[k]+step+n));
  });
}

// ===== Serial
connectBtn.addEventListener('click', async ()=>{
  if(!('serial' in navigator)){
    return alert('Web Serial no disponible. Usa Chrome/Edge y HTTPS o localhost.');
  }
  try{
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: parseInt(baudSelect.value) });
    connectBtn.textContent = 'Serial conectado';
    connectBtn.disabled = true;
  }catch(e){ alert('No se pudo abrir el puerto: '+e.message); }
});

async function readFromPort(){
  try{
    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();
    let buffer = '';
    while(isRunning){
      const {value,done} = await reader.read();
      if(done) break;
      buffer += value;
      const lines = buffer.split('\n'); buffer = lines.pop();
      for(const line of lines){
        const parsed = parseLine(line);
        if(parsed){
          Object.assign(sections, parsed);
          updateCards();
          await pushReading({...sections});
        }
      }
    }
  }catch(e){ alert('Error serial: '+e.message); }
}
function parseLine(line){
  line = line.trim();
  try{ const j = JSON.parse(line); if(j.s1!==undefined) return {s1:+j.s1,s2:+j.s2,s3:+j.s3,s4:+j.s4}; }catch(_){}
  const m1 = line.match(/S1[:=]\s*([\d.]+)/i);
  if(m1){
    const s1 = +m1[1];
    const s2 = +(line.match(/S2[:=]\s*([\d.]+)/i)||[,,sections.s2])[1];
    const s3 = +(line.match(/S3[:=]\s*([\d.]+)/i)||[,,sections.s3])[1];
    const s4 = +(line.match(/S4[:=]\s*([\d.]+)/i)||[,,sections.s4])[1];
    return { s1:isNaN(s1)?sections.s1:s1, s2:isNaN(s2)?sections.s2:s2,
             s3:isNaN(s3)?sections.s3:s3, s4:isNaN(s4)?sections.s4:s4 };
  }
  const m2 = line.match(/Seccion(\d)\[(\d+(\.\d+)?)\]/i);
  if(m2){
    const idx = +m2[1], val = +m2[2];
    const obj = {...sections}; obj['s'+idx]=val; return obj;
  }
  return null;
}

// ===== Iniciar / Detener
startBtn.addEventListener('click', ()=>{
  if(isRunning) return;
  isRunning = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  startTime = Date.now();
  lastTick = Date.now();

  history.time.length=history.s1.length=history.s2.length=history.s3.length=history.s4.length=0;
  ['s1','s2','s3','s4'].forEach(k=>sections[k]=20+Math.random()*2);
  updateCards();
  pushReading({...sections});

  if(modeSim.checked){
    timer = setInterval(async ()=>{
      const now = Date.now();
      const dt = Math.min((now-lastTick)/1000, 1.0); lastTick = now;
      simStep(dt);
      updateCards();
      await pushReading({...sections});
    }, 200);
  }else{
    if(port){ readFromPort(); }
    else{ alert('Conecta el puerto serial primero.'); stopBtn.click(); }
  }
});

stopBtn.addEventListener('click', ()=>{
  isRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  clearInterval(timer);
  if(reader){ reader.cancel().catch(()=>{}); reader=null; }
  if(port){ port.close().catch(()=>{}); connectBtn.disabled=false; connectBtn.textContent='Conectar Serial'; }
});

// ===== Exportación
exportBtn.addEventListener('click', ()=> { window.location.href = EXPORT_URL; });
