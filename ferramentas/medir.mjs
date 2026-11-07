// Mede, para cada WAV (PCM 16 bits mono): trecho com voz, tom médio (F0 por autocorrelação) e envelope.
// Uso: node medir.mjs arquivo1.wav [arquivo2.wav ...] [--envelope saida.json]
import { readFileSync, writeFileSync } from "node:fs";

function lerWav(caminho) {
  const b = readFileSync(caminho);
  let p = 12, sr = 0, dados = null;
  while (p < b.length) {
    const id = b.toString("ascii", p, p + 4), tam = b.readUInt32LE(p + 4);
    if (id === "fmt ") sr = b.readUInt32LE(p + 12);
    if (id === "data") dados = b.subarray(p + 8, p + 8 + tam);
    p += 8 + tam + (tam % 2);
  }
  const n = dados.length / 2, x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = dados.readInt16LE(i * 2) / 32768;
  return { sr, x };
}

function envelope(x, sr, porSeg = 100) {
  const w = Math.round(sr / porSeg), e = [];
  for (let i = 0; i < x.length; i += w) {
    let s = 0; const m = Math.min(i + w, x.length);
    for (let j = i; j < m; j++) s += x[j] * x[j];
    e.push(Math.sqrt(s / (m - i)));
  }
  return e;
}

function f0(x, sr) { // mediana do F0 em janelas com voz
  const w = Math.round(sr * 0.04), passo = Math.round(sr * 0.01), lo = Math.round(sr / 300), hi = Math.round(sr / 60), fs = [];
  for (let i = 0; i + w + hi < x.length; i += passo) {
    let en = 0; for (let j = 0; j < w; j++) en += x[i + j] ** 2;
    if (Math.sqrt(en / w) < 0.03) continue;
    let melhor = 0, lag = 0;
    for (let L = lo; L <= hi; L++) {
      let c = 0, a = 0, b2 = 0;
      for (let j = 0; j < w; j++) { c += x[i + j] * x[i + j + L]; a += x[i + j] ** 2; b2 += x[i + j + L] ** 2; }
      const r = c / Math.sqrt(a * b2 + 1e-9);
      if (r > melhor) { melhor = r; lag = L; }
    }
    if (melhor > 0.6) fs.push(sr / lag);
  }
  fs.sort((a, b) => a - b);
  return fs.length ? fs[Math.floor(fs.length / 2)] : 0;
}

const args = process.argv.slice(2), iEnv = args.indexOf("--envelope");
const saidaEnv = iEnv >= 0 ? args.splice(iEnv, 2)[1] : null;
const todos = {};
for (const arq of args) {
  const { sr, x } = lerWav(arq), e = envelope(x, sr), max = Math.max(...e);
  let ini = e.findIndex((v) => v > max * 0.06), fim = e.length - 1;
  while (fim > 0 && e[fim] < max * 0.06) fim--;
  console.log(`${arq.split(/[\\/]/).pop()}: total ${(x.length / sr).toFixed(2)} s, voz ${(ini / 100).toFixed(2)}–${(fim / 100).toFixed(2)} s (${((fim - ini) / 100).toFixed(2)} s), tom ${f0(x, sr).toFixed(0)} Hz`);
  todos[arq.split(/[\\/]/).pop()] = { ini: ini / 100, fim: fim / 100, env: e.map((v) => Math.round((1000 * v) / max)) };
}
if (saidaEnv) writeFileSync(saidaEnv, JSON.stringify(todos));
