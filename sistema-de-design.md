# Sistema de Design — KINE

Derivado da referência **monopo saigon** (https://styles.refero.design/style/3e52dd36-6ab1-48c6-bc40-47ef6d33abc2).

> Liquid iridescence behind editorial silence — a monochrome editorial gallery floating on molten light.

**Tema:** light (canvas branco dominante)

Disciplina monocromática radical: preto e branco puros com cinzas finíssimos, envolvendo tipografia enorme que respira em canvases full-bleed. O contraste-assinatura vive entre a contenção editorial austera (cantos 0px em navegação e links, whitespace generoso, ritmo de 4px) e um único gesto expressivo — botões pill de raio 75px. Ambientes de hero usam atmosferas cromáticas fluidas, mas a interface **nunca** pega cor.

---

## Tokens — Cores

| Nome | Valor | Token | Papel |
|------|-------|-------|-------|
| Obsidian | `#000000` | `--color-obsidian` | Texto primário, traços SVG, preenchimentos de overlay |
| Paper | `#ffffff` | `--color-paper` | Canvas primário; texto claro sobre superfícies escuras. **Não** promover a cor de CTA primário |
| Inkstone | `#181818` | `--color-inkstone` | Corpo de texto do rodapé e headings secundários |
| Felt Gray | `#6d6d6d` | `--color-felt-gray` | Texto auxiliar mudo, blocos de endereço, texto legal |
| Slate Pill | `#636363` | `--color-slate-pill` | Fundo de botão neutro preenchido — o único fill sólido de ação |
| Ash Mist | `#9a9a9a` | `--color-ash-mist` | Neutro médio para superfícies desabilitadas/baixo contraste |
| Pewter | `#808080` | `--color-pewter` | Neutro médio secundário para hover/estados mudos |
| Iridescent Fade | `linear-gradient(90deg, rgb(160,224,171), rgb(255,172,46) 50%, rgb(165,45,37))` | `--gradient-iridescent-fade` | Acento cromático **apenas** dentro do wash do hero — nunca em controles de interface |

**Referência rápida de cor**
- texto primário: `#000000`
- texto mudo: `#6d6d6d`
- fundo: `#ffffff`
- seção inversa / overlay escuro: `#000000`
- borda (superfície clara): `#000000`
- borda (superfície escura): `rgba(255,255,255,0.3)`
- accent: **nenhum** — a única cor cromática é o gradiente iridescente do hero, que é mídia, não UI
- ação primária: sem cor de CTA distinta

---

## Tokens — Tipografia

### Roobert (primária) — `--font-roobert`
- **Substituto:** Inter ou Söhne
- **Pesos:** 300, 400, 600
- **Tamanhos:** 11, 12, 16, 18, 29, 30, 39, 45, 54, 78, 94, 225px
- **Line height:** 0.70–2.34 (apertado 0.70–0.76 em display; generoso 1.58 em corpo)
- **Papel:** todo texto de interface, navegação, headlines, corpo, listas e rodapés

### Raleway (display de exceção) — `--font-raleway`
- **Substituto:** Montserrat ou Jost
- **Pesos:** 400 · **Tamanhos:** 54px · **Line height:** 1.39
- **Papel:** contextos específicos de heading, como contraponto — aparece com parcimônia

### system-ui — `--font-system-ui`
- **Pesos:** 400 · **Tamanhos:** 9px, 16px · **Line height:** 1.15–1.32
- **Papel:** micro labels de UI, letras miúdas

### Escala tipográfica (Minor Third 1.2, base 15px)

| Papel | Tamanho | Line Height | Token |
|-------|---------|-------------|-------|
| caption | 12px | 1.19 | `--text-caption` |
| body-sm | 16px | 1.15 | `--text-body-sm` |
| body | 18px | 1.21 | `--text-body` |
| subheading | 39px | 1.19 | `--text-subheading` |
| subheading-lg | 45px | 1.15 | `--text-subheading-lg` |
| heading-sm | 54px | 1.39 | `--text-heading-sm` |
| heading | 78px | 1.1 | `--text-heading` |
| heading-lg | 94px | 0.76 | `--text-heading-lg` |
| display | 225px | 1.25 | `--text-display` |

---

## Tokens — Espaçamento e Forma

**Unidade base:** 4px · **Densidade:** spacious

**Escala:** 8, 12, 28, 40, 48, 64, 68, 152px

**Layout**
- Largura máxima da página: **1078px**
- Section gap: **46px**
- Card padding: **34px**
- Element gap: **14px**

**Border radius**

| Elemento | Valor |
|----------|-------|
| tags | 75px |
| buttons | 75px |
| cards | 0px |
| images | 0px |
| inputs | 0px |

---

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|-----------|
| 1 | Paper | `#ffffff` | Canvas primário — a maioria das seções fica em branco puro |
| 2 | Slate Pill | `#636363` | Superfície de botão preenchido |
| 3 | Obsidian | `#000000` | Overlay escuro e seção inversa — faixas full-bleed escuras |
| 4 | Ash Mist | `#9a9a9a` | Camada média silenciosa para painéis internos |

**Elevação:** o sistema evita sombra deliberadamente. Superfícies se distinguem por inversão de cor (faixas branco↔preto) e bordas hairline de 1px, nunca por sombras empilhadas.

---

## Componentes

- **Ghost Pill Button (superfície escura):** fundo transparente, borda 1px `rgba(255,255,255,0.3)`, texto `#ffffff`, radius 75px, padding 11px/33px, 16px peso 400.
- **Ghost Pill Button (superfície clara):** fundo transparente, borda 1px `#000000`, texto `#000000`, radius 75px, padding 11px/33px, 16px peso 400. Sem fill no hover — animar opacidade da borda e letter-spacing com `cubic-bezier(0.19,1,0.22,1)` em 0.8s.
- **Filled Neutral Pill:** fundo `rgba(55,55,55,0.78)`, texto `#ffffff`, borda 1px `#ffffff`, radius 75px. Único fill sólido — usado com parcimônia, nunca para CTA de marketing.
- **Underline-Free Text Link:** sem fundo, sem borda, radius 0px, 12–16px peso 400, sem sublinhado.
- **Hero Display Headline:** branco sobre mídia escura, **peso 300**, sem subhead e sem CTA — uma frase só.
  > **Correção de especificação (rodada 2).** O DESIGN.md extraído declara "225px peso 400" para este componente, mas a medição do screenshot real da referência contradiz o token: lá o headline do hero é **leve** e ocupa cerca de **28% da largura e 4% da altura** da dobra, flutuando sobre mídia intocada — razão haste/altura-de-caixa ≈ 0,088, contra 0,121 de um peso 400. O valor 225px provavelmente foi extraído de outra página do site, não do hero. Vale a evidência visual: **peso 300**, em degrau que não passe de ~94px em desktop, e a mídia é que domina a dobra. O passo 225px continua existindo na escala, mas não é usado no hero.
- **Section Heading (whisper):** 78px peso **300**, line-height 1.10. Anti-convenção proposital: sussurra, não grita.
- **Section Heading (anchor):** 94px peso 400, line-height **0.76** — linhas quase se tocam, bloco tipográfico como objeto de arte.
- **Project Card / List Row:** fundo transparente, radius 0px, sem sombra. Imagem sangra na largura do container; título abaixo em 16–18px peso 400. **Sem chrome de card** — o card é conteúdo, não container.
- **Top Navigation Bar:** header fixo transparente de 66px. Wordmark à esquerda (16px peso 400), menu à direita (11–12px peso 400). Sem fill de fundo.
- **Rotating Scroll Indicator:** badge circular SVG com texto seguindo a circunferência, girando em tempo lento, canto inferior esquerdo.
- **Footer Address Block:** 11px peso 400, line-height 1.36, cor `#6d6d6d`, margens de 8px entre linhas.

---

## Layout

Contido em max-width 1078px, centralizado, com seções escuras full-bleed rompendo o container. Hero full-viewport: headline monumental centralizada sobre mídia, navegação mínima flutuando no topo, badge girando no canto inferior esquerdo. Seções do corpo seguem ritmo editorial espaçoso — gaps de 46px, alternando faixas brancas e escuras (preto com tipo branco). Arranjo **assimétrico**: alternâncias texto-esquerda/imagem-direita e imagem-esquerda/texto-direita dominam, sem pilhas centralizadas fora do hero. Grades de card aparecem como **listas de coluna única**, não grids multi-coluna. Rodapé é um bloco compacto de colunas com copy de 11px.

---

## Movimento

Curva assinatura `cubic-bezier(0.19, 1, 0.22, 1)` aplicada a transform, cor e opacidade em **0.8s e 1.25s**. Micro-transições de cor/opacidade usam `ease` em 0.4s. Transforms dominam sobre animação posicional — elementos deslizam, nunca saltam. Nada deve parecer abrupto.

---

## Do

- Display headlines em 225px peso 400 devem dominar o viewport — nunca amontoar subheads ou CTAs junto.
- Radius 75px **exclusivamente** em botões e tags — todo o resto (cards, imagens, inputs) em 0px.
- Reservar cor para **um** backdrop iridescente por página — todo texto, borda e fill de interface estritamente em preto/branco/cinza.
- Peso 300 em 78px para headlines de manifesto/atmosféricas — nunca acima de peso 400 nessa escala.
- Line-height 0.70–0.76 em tamanhos de display acima de 78px.
- `cubic-bezier(0.19,1,0.22,1)` com duração 0.8–1.25s em transform e cor.
- Links de texto em radius 0px, sem sublinhado.

## Don't

- Nunca introduzir cor cromática na UI — preto, branco e cinza são a paleta de interface.
- Nunca usar box-shadow ou elevação — superfícies planas e bordas hairline de 1px.
- Nunca usar border-radius entre 1px e 74px — o sistema salta de 0px para pill 75px.
- Nunca usar pesos bold/heavy (600+) acima de 45px.
- Nunca centralizar corpo de texto em listas e descrições — alinhar à esquerda, gaps de 8–14px.
- Nunca aplicar gradiente em botões, badges ou controles de UI.
- Nunca usar Raleway para corpo ou navegação.
- Nunca encher o canvas de imagens — o sistema é dominado por texto.

---

## Adaptações obrigatórias para a KINE (conteúdo protegido)

Estas são as únicas divergências permitidas em relação à referência, e existem porque o conteúdo abaixo é intocável por decisão do cliente:

1. **Densidade de imagem.** A referência prega "um único gesto visual por página". A KINE precisa manter: imagem do hero (`assets/hero-join-the-movement.jpg`), vídeo do Manifesto (`assets/outdoor-manifesto.mp4` + poster) e 7 fotos de produto (`assets/products/*.jpg`). **Adaptação:** o hero é o gesto visual principal; o vídeo do Manifesto é a segunda faixa full-bleed escura; as fotos de produto entram como *project list rows* (imagem sangrando, sem chrome, radius 0px), com longos trechos tipográficos silenciosos entre elas para preservar o ritmo editorial.
2. **Conteúdo dos produtos** (nome, preço, cor, foto) não pode ser alterado — só reestilizado e reposicionado.
3. **Marca:** o wordmark é **KINE** (substitui TEMPO em todo o site).
4. Toda regra de cor, tipografia, raio, espaçamento e movimento acima vale **sem exceção** — inclusive a proibição do verde-limão `#c8ff4d` e da fonte Anton, que saem do sistema.
5. **Grade de produto em duas colunas.** A seção "Layout" acima (linha "Grades de card aparecem como **listas de coluna única**, não grids multi-coluna") descreve a referência original, mas foi substituída por decisão do cliente após comparar o resultado com a página real de referência: a lista de coluna única lia como "vão vazio gigante" entre produtos na tela do cliente, mesmo depois de reduzir gap e imagem. A partir desta rodada, `.product-grid` usa CSS Grid nativo de duas colunas reais (`grid-template-columns: 1fr 1fr; column-gap: 64px`), com a coluna direita deslocada 120px pra baixo (`.product-col--right { margin-top: 120px }`) pra preservar o mosaico assimétrico em vez de virar grade alinhada. Em ≤860px as duas colunas colapsam pra uma só e o deslocamento zera. Sem chrome de card, sem sombra, sem radius fora de 0/75px — só a contagem de colunas muda.
