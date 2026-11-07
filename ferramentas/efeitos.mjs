// Efeitos sonoros discretos, sintetizados (sem arquivos de terceiros): sopro, pop, clique, tecla, tique e sino.
// Uso: node efeitos.mjs <config.json> <saida.wav>
//   config.json: { "duracao": 30, "eventos": [ ["sopro", 0.1, 0.5, 0.12], ["pop", 0.3, 0.2, 620], ["clique", 2.8], ["tique", 3.0], ["sino", 0.5] ] }
//   Cada evento: [tipo, segundo, ...parâmetros opcionais]. Saída mono, 44,1 kHz, 16 bits.
//   Parâmetros: pop(ganho, freq) · clique(ganho) · tecla(ganho) · sopro(duração, ganho) · sino(ganho) · tique(ganho, freq)
import { readFileSync, writeFileSync } from "node:fs";

const [arqConfig, saida] = process.argv.slice(2);
if (!saida) {
  console.log("Uso: node efeitos.mjs <config.json> <saida.wav>");
  process.exit(1);
}
const { duracao, eventos } = JSON.parse(readFileSync(arqConfig, "utf8"));
const SR = 44100, x = new Float32Array(Math.round(SR * duracao));
let s = 7;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
const add = (t, n, f) => { const i0 = Math.round(t * SR); for (let i = 0; i < n && i0 + i < x.length; i++) x[i0 + i] += f(i / SR); };

const tipos = {
  pop: (t, g = 0.22, f0 = 760) => add(t, SR * 0.12, (u) => g * Math.sin(2 * Math.PI * (f0 * u + 900 * u * u)) * Math.exp(-u * 38)),
  clique: (t, g = 0.16) => add(t, SR * 0.04, (u) => g * (rnd() * Math.exp(-u * 500) + 0.6 * Math.sin(2 * Math.PI * 2300 * u) * Math.exp(-u * 160))),
  tecla: (t, g = 0.07) => add(t, SR * 0.03, (u) => g * rnd() * Math.exp(-u * 260)),
  sopro: (t, d = 0.4, g = 0.1) => {
    let a = 0, b = 0;
    add(t, SR * d, (u) => { const k = u / d, env = Math.sin(Math.PI * k) ** 2, c = 0.04 + 0.18 * k; a += c * (rnd() - a); b += 0.5 * (a - b); return g * env * (a - b) * 6; });
  },
  sino: (t, g = 0.12) => [1046.5, 1568, 2093].forEach((f, j) => add(t + j * 0.07, SR * 1.2, (u) => (g / (j + 1)) * Math.sin(2 * Math.PI * f * u) * Math.exp(-u * 3.2))),
  tique: (t, g = 0.05, f = 1900) => add(t, SR * 0.05, (u) => g * Math.sin(2 * Math.PI * f * u) * Math.exp(-u * 90)),
};
for (const [tipo, t, ...p] of eventos) {
  if (!tipos[tipo]) throw new Error(`tipo de efeito desconhecido: ${tipo}`);
  tipos[tipo](t, ...p);
}

const pcm = Buffer.alloc(44 + x.length * 2);
pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + x.length * 2, 4); pcm.write("WAVEfmt ", 8); pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
pcm.write("data", 36); pcm.writeUInt32LE(x.length * 2, 40);
x.forEach((v, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
writeFileSync(saida, pcm);
console.log("ok", (x.length / SR).toFixed(1), "s");
