# Modelo de vídeo · padrão "central de comando"

Modelo do **layout e do tipo de vídeo** usado em vídeos institucionais de sistemas: uma gravação de tela emoldurada sobre um fundo de "central de comando", com narração neural, legendas, títulos por etapa, destaques que acendem na palavra falada, abertura e encerramento com a marca.

Este repositório tem só o **padrão**. Não há gravações, narrações, marcas nem dados reais: tudo o que aparece é exemplo para trocar.

Feito com [HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP renderizado em MP4).

## O que tem aqui

```
modelo/                     projeto HyperFrames de exemplo (30 s)
  index.html                composição raiz: blocos e tempos
  compositions/
    central.html            fundo animado "central de comando" (parede curva de telas, piso em grade, partículas)
    abertura.html           0–4,5 s: cartão com a marca, título e subtítulo
    cena.html               a cena: moldura com a gravação, etapas, câmera, foco, clique, destaques, cartão-resumo
    encerramento.html       últimos 6,2 s: marca, frase e instituição
    legendas.html           legendas da narração
  assets/
    exemplo/                imagens de exemplo (SVG): marca, painéis da parede, tela de sistema
    fonts/Jost.woff2        fonte Jost (SIL Open Font License, ver OFL.txt)
ferramentas/                scripts Node para narração, tempos e efeitos
  gerar-voz.mjs             narração com voz neural (Edge TTS), com tempos de cada palavra
  medir.mjs                 mede início e fim da voz em cada WAV (gera env.json)
  tempos.mjs                monta clipes de voz, legendas e tempos das palavras-chave
  efeitos.mjs               efeitos sonoros sintetizados (sopro, pop, clique, tique, sino)
  exemplo/                  arquivos de exemplo para cada script
```

## Ver e renderizar o modelo

Precisa de Node 18+ e FFmpeg.

```bash
cd modelo
npx --yes hyperframes@0.8.192 check                       # valida
npx --yes hyperframes@0.8.192 snapshot --at 2,8,15,20,27  # quadros para conferir
npx --yes hyperframes@0.8.192 render -q delivery -o ../modelo.mp4
```

## O padrão em números

| Elemento | Especificação |
|---|---|
| Vídeo | 1920×1080, 30 fps |
| Estrutura | abertura 0–4,5 s · cena(s) · encerramento 6,2 s; fundo e legendas cobrem tudo |
| Moldura da gravação | x 160, y 92, 1600×828, cantos 16 px, borda `#4fd1ff`; a gravação entra a 1920×994 com escala 1600/1920 |
| Selo de título | topo à esquerda (x 160, y 14, altura 64): faixa colorida + texto 34 px. Variantes: "Etapa N de M" (`#ffb020`) ou "Marca · seção" (`#4fd1ff`) |
| Barra de etapas | topo à direita: círculos numerados; atual em laranja, concluídas em verde (`#1f8a5b`) |
| Destaques | base da moldura (x 30, bottom 26): itens que passam de 25% para 100% de opacidade no tempo da palavra falada |
| Foco e clique | retângulo laranja com o resto da tela escurecido; anel que se expande no clique |
| Legendas | Jost 40 px, fundo escuro, sublinhado `#4fd1ff`, faixa y 930–1030, até ~65 caracteres por trecho |
| Cores | fundo `#060b18`–`#10204a`, ciano `#4fd1ff`, laranja `#ffb020`, verde `#34d399`, texto `#e6f0ff` |
| Áudio | voz com volume 1.4, trilha 0.8, efeitos 1.0; mira em cerca de −16 a −18 LUFS |

## Passo a passo para um vídeo novo

1. **Copie a pasta `modelo/`** e troque as imagens de `assets/exemplo/` (marca e painéis da parede) pelas suas.
2. **Prepare a gravação.** Se ela tiver legendas embutidas ou a barra do navegador, recorte com FFmpeg para 1920×994:
   ```bash
   ffmpeg -i gravacao.mp4 -vf "crop=1920:994:0:0,fps=30" -an -c:v libx264 -crf 18 -pix_fmt yuv420p assets/trechos/gravacao.mp4
   ```
   (para tirar a barra do navegador, ajuste o último número do crop, por exemplo `crop=1920:872:0:88`.)
   Em `compositions/cena.html`, troque o `<img id="mc-midia">` pelo `<video>` indicado no comentário.
3. **Escreva a narração** em um `falas.txt` (uma fala por linha) e gere a voz:
   ```bash
   cd ferramentas && npm install
   node gerar-voz.mjs pt-BR-AntonioNeural saida "+8%" falas.txt
   ```
   Converta cada `saida/fN/audio.mp3` para WAV em `modelo/assets/voz/fN.wav` (`ffmpeg -i audio.mp3 -ar 48000 -ac 1 fN.wav`) e copie `metadata.json` como `fN.palavras.json`.
4. **Meça e monte a linha do tempo:**
   ```bash
   node medir.mjs ../modelo/assets/voz/f1.wav ../modelo/assets/voz/f2.wav --envelope ../modelo/assets/voz/env.json
   node tempos.mjs ../modelo/assets/voz exemplo/tempos.json
   ```
   O `tempos.mjs` imprime os `<audio>` para o `index.html`, as `<div>` de legenda e os tempos das palavras-chave para os destaques.
5. **Ajuste a cena:** tempos das etapas (`ETAPAS`), câmera (`cam(x, y, zoom)` em coordenadas da gravação), focos, cliques e `destaque(id, início, fim, [tempos dos itens])`. Dentro da cena, os tempos são locais: subtraia o início da cena (4,5 s no modelo).
6. **Efeitos e trilha:** `node efeitos.mjs exemplo/efeitos.json ../modelo/assets/efeitos.wav` e uma trilha sua em `assets/musica.wav`; descomente os `<audio>` no `index.html`.
7. **Durações:** atualize `data-duration` no `index.html`, as tomadas e o canvas em `central.html`, e o início do encerramento.
8. Rode `check`, confira quadros com `snapshot` e renderize.

## Licenças

- Código e imagens de exemplo deste repositório: uso livre.
- Fonte Jost: SIL Open Font License 1.1 (`modelo/assets/fonts/OFL.txt`).
- A voz neural é gerada pelo serviço Edge TTS da Microsoft; verifique os termos de uso antes de publicar os áudios.
