// Gera a narração linha a linha com voz neural da Microsoft (Edge TTS, cliente msedge-tts),
// salvando o áudio e os tempos de cada palavra.
// Uso:     node gerar-voz.mjs <voz> <pasta-saida> <rate> <falas.txt>
// Exemplo: node gerar-voz.mjs pt-BR-AntonioNeural saida "+8%" exemplo/falas.txt
// Saída:   saida/f1/audio.mp3 + saida/f1/metadata.json (WordBoundary), uma pasta por linha do arquivo.
// Se o serviço limitar (erro 429), tenta de novo com espera crescente; linhas já geradas são puladas.
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { readFileSync, mkdirSync, existsSync } from "node:fs";

const [voz, saida, rate, arqFalas] = process.argv.slice(2);
if (!arqFalas) {
  console.log("Uso: node gerar-voz.mjs <voz> <pasta-saida> <rate> <falas.txt>");
  process.exit(1);
}
const falas = readFileSync(arqFalas, "utf8").split(/\r?\n/).filter(Boolean);
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

for (let i = 0; i < falas.length; i++) {
  const dir = `${saida}/f${i + 1}`;
  if (existsSync(`${dir}/audio.mp3`)) { console.log(`f${i + 1} já existe`); continue; }
  mkdirSync(dir, { recursive: true });
  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voz, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
      await tts.toFile(dir, falas[i], { rate });
      tts.close();
      console.log(`f${i + 1} ok`);
      break;
    } catch (e) {
      console.log(`f${i + 1} tentativa ${tentativa} falhou: ${e?.message || e?.statusCode || e}`);
      await espera(8000 * tentativa);
    }
  }
  await espera(4000);
}
