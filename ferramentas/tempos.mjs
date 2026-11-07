// Linha do tempo da narração: clipes de voz, legendas (pelos tempos das palavras) e tempos das palavras-chave.
// Uso: node tempos.mjs <pasta-voz> <config.json>
//   pasta-voz: f1.wav, f1.palavras.json (o metadata.json do gerar-voz.mjs), ... e env.json (do medir.mjs --envelope)
//   config.json: { "falas": [ { "id": "f1", "inicio": 4.9, "legendas": ["trecho 1", "trecho 2"] } ], "chaves": ["palavra"] }
//     "inicio"   = segundo do vídeo final em que a voz começa
//     "legendas" = a fala dividida em trechos de até ~65 caracteres
//     "chaves"   = palavras (como aparecem no texto, com a pontuação) cujo tempo você quer para os destaques
// Saída: <pasta-voz>/linha.json e, no terminal, os <audio> para o index.html, as legendas e os tempos das palavras-chave.
import { readFileSync, writeFileSync } from "node:fs";

const [dir, arqConfig] = process.argv.slice(2);
if (!arqConfig) {
  console.log("Uso: node tempos.mjs <pasta-voz> <config.json>");
  process.exit(1);
}
const env = JSON.parse(readFileSync(`${dir}/env.json`, "utf8"));
const { falas, chaves = [] } = JSON.parse(readFileSync(arqConfig, "utf8"));
const clipes = [], legendas = [], achadas = [];

for (const { id, inicio: voz, legendas: textos } of falas) {
  const { ini, fim } = env[`${id}.wav`];
  const meta = JSON.parse(readFileSync(`${dir}/${id}.palavras.json`, "utf8")).Metadata
    .filter((m) => m.Type === "WordBoundary")
    .map((m) => ({ w: m.Data.text.Text, t: m.Data.Offset / 1e7 }));
  const v = (t) => +(voz + t - ini).toFixed(2);
  clipes.push({ id, inicio: +(voz - 0.06).toFixed(2), corte: +(ini - 0.06).toFixed(2), dur: +(fim - ini + 0.3).toFixed(2), fim: v(fim) });
  const palavras = textos.join(" ").split(/\s+/);
  let k = 0;
  textos.forEach((txt) => {
    const n = txt.split(/\s+/).filter((x) => /[\wÀ-ú]/.test(x)).length;
    legendas.push({ txt, a: +(v(meta[Math.min(k, meta.length - 1)].t) - 0.05).toFixed(2) });
    k += n;
  });
  legendas[legendas.length - 1].fimFala = +(v(fim) + 0.3).toFixed(2);
  meta.forEach((m, i) => {
    const w = palavras[i] || m.w;
    if (chaves.includes(w) || chaves.includes(m.w)) achadas.push(`${id} ${w} ${v(m.t)}`);
  });
}
for (let i = 0; i < legendas.length; i++) legendas[i].b = legendas[i].fimFala ?? legendas[i + 1].a;
writeFileSync(`${dir}/linha.json`, JSON.stringify({ clipes, legendas }, null, 1));

console.log("<!-- index.html -->");
clipes.forEach((c, i) => console.log(`<audio id="fala-${i + 1}" class="clip" src="assets/voz/${c.id}.wav" data-start="${c.inicio}" data-duration="${c.dur}" data-media-start="${c.corte}" data-track-index="${7 + (i % 2)}" data-volume="1.4"></audio>`));
console.log("\n<!-- compositions/legendas.html -->");
legendas.forEach((l, i) => console.log(`<div id="lg${i + 1}" class="lg clip" data-start="${l.a}" data-duration="${(l.b - l.a).toFixed(2)}" data-track-index="0"><span data-layout-allow-occlusion>${l.txt}</span></div>`));
console.log(`const L = [${legendas.map((l) => l.a).join(", ")}];`);
console.log("\n<!-- palavras-chave (tempo no vídeo final; dentro de uma cena, subtraia o início da cena) -->");
console.log(achadas.join("\n"));
