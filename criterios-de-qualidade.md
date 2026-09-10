# Critérios de Qualidade — KINE

Mecanismos verificáveis extraídos da referência **monopo saigon**. Cada regra é checável olhando o resultado renderizado, sem ler código.

---

### 1. Zero cor cromática na interface
Todo texto, borda, ícone e preenchimento de UI é `#000000`, `#ffffff` ou um cinza neutro (`#181818`, `#636363`, `#6d6d6d`, `#808080`, `#9a9a9a`) — ou seja, R=G=B em qualquer pixel de interface.
A **única** cor da página vem de mídia (foto de produto, foto do hero, vídeo do Manifesto).
**Reprova se:** existir qualquer botão, tag, badge, link, borda ou fundo colorido — incluindo o verde-limão `#c8ff4d` do site antigo.

### 2. Raio salta de 0px para 75px, sem meio-termo
Botões e tags: `75px` (pill completa). Cards, imagens, inputs, painéis, modais: `0px`.
**Reprova se:** existir qualquer canto arredondado entre 1px e 74px em qualquer elemento.

### 3. Nenhuma sombra, nenhuma elevação
Superfícies se separam só por inversão de cor (faixa branca ↔ faixa preta) ou borda hairline de 1px.
**Reprova se:** existir `box-shadow` visível em card, botão, imagem, modal ou drawer.

### 4. Tipografia: poucos tamanhos, pesos leves no grande
Máximo de **4 tamanhos tipográficos por tela**, tirados da escala `{11, 12, 16, 18, 39, 45, 54, 78, 94, 225}px` (11px é reservado ao bloco de endereço/legal do rodapé).
Headline principal de cada seção ≥ 78px. Headline do Manifesto em **peso 300**.
**Reprova se:** houver peso 600+ em qualquer texto acima de 45px, ou mais de 4 tamanhos distintos na mesma tela.

### 5. Display trava as linhas
Qualquer texto com 78px ou mais usa `line-height` entre **0.70 e 0.80** — as linhas quase se tocam e o bloco lê como objeto tipográfico.
**Reprova se:** uma headline grande tiver linhas visivelmente soltas/espaçadas.

### 6. Ritmo espaçoso e assimétrico
Conteúdo contido em **1078px** centralizado; faixas de mídia rompem em full-bleed. Gap entre seções ≥ **46px**. Pelo menos **40% da primeira dobra é espaço vazio** (sem texto nem imagem).
Fora do hero, **nada é centralizado**: texto alinhado à esquerda, alternando lado a cada bloco. Produtos aparecem como linhas editoriais de largura total (imagem sangrando + título abaixo), **sem chrome de card** — sem fundo próprio, sem borda ao redor, sem padding de container.
**Reprova se:** o corpo da página for uma grade multi-coluna de cards com fundo/borda, ou se blocos de texto estiverem centralizados fora do hero.

### 7. Movimento paciente, nunca abrupto
Transições de `transform` e cor usam `cubic-bezier(0.19, 1, 0.22, 1)` com duração entre **0.8s e 1.25s**. Micro-transições de cor/opacidade podem usar `ease` em 0.4s.
**Reprova se:** algum hover ou reveal acontecer em menos de 0.4s, ou usar curva de "snap" (ease-in, linear rápido, bounce).
