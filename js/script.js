// ---------- Announcement carousel ----------
const messages = document.querySelectorAll('.announce-msg');
let announceIndex = 0;
let announceTimer;

function showAnnounce(i) {
  messages.forEach(m => m.classList.remove('is-active'));
  announceIndex = (i + messages.length) % messages.length;
  messages[announceIndex].classList.add('is-active');
}

function nextAnnounce() { showAnnounce(announceIndex + 1); }
function prevAnnounce() { showAnnounce(announceIndex - 1); }

function restartAnnounceTimer() {
  clearInterval(announceTimer);
  announceTimer = setInterval(nextAnnounce, 4000);
}

if (messages.length) {
  showAnnounce(0);
  restartAnnounceTimer();

  document.getElementById('announceNext').addEventListener('click', () => {
    nextAnnounce();
    restartAnnounceTimer();
  });
  document.getElementById('announcePrev').addEventListener('click', () => {
    prevAnnounce();
    restartAnnounceTimer();
  });
}

// ---------- Mobile nav toggle ----------
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

navToggle.addEventListener('click', () => {
  mainNav.classList.toggle('is-open');
  navToggle.classList.toggle('is-open');
  updateChrome();
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    // Fechar um painel muda a resposta de "há painel de papel aberto?", que é
    // uma das entradas do estado do chrome. Todo caminho que mexe nisso pede
    // um recálculo, senão o chrome fica congelado até a próxima rolagem.
    updateChrome();
  });
});

// ---------- Search panel ----------
const searchToggle = document.getElementById('searchToggle');
const searchPanel = document.getElementById('searchPanel');
const searchClose = document.getElementById('searchClose');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

function normalizeText(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function openSearch() {
  searchPanel.classList.add('is-open');
  searchInput.focus();
  updateChrome();   // ver nota no fechamento do menu mobile
}

function closeSearch() {
  searchPanel.classList.remove('is-open');
  searchInput.value = '';
  searchResults.innerHTML = '';
  updateChrome();
}

function findMatches(query) {
  const q = normalizeText(query);
  if (!q) return [];
  const matches = [];
  document.querySelectorAll('.product-card').forEach(card => {
    const name = card.querySelector('h3').textContent;
    const normalizedName = normalizeText(name);
    if (normalizedName.includes(q)) {
      matches.push({ card, name, price: card.querySelector('.price').textContent });
    }
  });
  return matches;
}

function goToProduct(card) {
  closeSearch();
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.remove('is-highlighted');
  void card.offsetWidth;
  card.classList.add('is-highlighted');
}

function runSearch(query) {
  searchResults.innerHTML = '';
  if (!normalizeText(query)) return;

  const matches = findMatches(query);

  if (matches.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'search-empty';
    empty.textContent = 'Nenhum produto encontrado.';
    searchResults.appendChild(empty);
    return;
  }

  matches.forEach(({ card, name, price }) => {
    const row = document.createElement('div');
    row.className = 'search-result-item';
    row.innerHTML = `<span class="name">${name}</span><span class="price">${price}</span>`;
    row.addEventListener('click', () => goToProduct(card));
    searchResults.appendChild(row);
  });
}

searchToggle.addEventListener('click', openSearch);
searchClose.addEventListener('click', closeSearch);
searchInput.addEventListener('input', (e) => runSearch(e.target.value));
searchInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const matches = findMatches(searchInput.value);
  if (matches.length > 0) goToProduct(matches[0].card);
});

// ---------- Cart drawer ----------
const cartToggle = document.getElementById('cartToggle');
const cartCount = cartToggle.querySelector('.cart-count');
const cartDrawer = document.getElementById('cartDrawer');
const cartDrawerClose = document.getElementById('cartDrawerClose');
const cartDrawerBody = document.getElementById('cartDrawerBody');
const cartDrawerCount = document.getElementById('cartDrawerCount');
const drawerBackdrop = document.getElementById('drawerBackdrop');

const cart = []; // populated by addToCart({ id, name, price, image, color, size })

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.textContent = totalItems;
  cartDrawerCount.textContent = `(${totalItems} ${totalItems === 1 ? 'item' : 'itens'})`;

  if (cart.length === 0) {
    cartDrawerBody.innerHTML = `
      <p class="cart-drawer__empty">Seu carrinho está vazio.</p>
      <div class="cart-drawer__quicklinks">
        <a href="#colecao" class="pill-link">COLEÇÃO ASPHALT</a>
        <a href="#street" class="pill-link">STREETWEAR RUNNER</a>
        <a href="#manada" class="pill-link">A MANADA</a>
      </div>`;
    return;
  }

  const itemsHtml = cart.map(item => `
    <div class="cart-item" data-line-id="${item.lineId}">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item__info">
        <h4>${item.name}</h4>
        <p>${formatBRL(item.price)} × ${item.qty} · Tam. ${item.size} · ${item.color}</p>
      </div>
      <button class="cart-item__remove" data-remove="${item.lineId}" aria-label="Remover ${item.name}">&times;</button>
    </div>
  `).join('');

  cartDrawerBody.innerHTML = `
    <div class="cart-drawer__items">${itemsHtml}</div>
    <div class="cart-drawer__footer">
      <div class="cart-drawer__total"><span>Total</span><strong>${formatBRL(cartTotal())}</strong></div>
      <button class="btn btn--solid cart-drawer__checkout" id="checkoutBtn">FINALIZAR COMPRA</button>
    </div>
  `;
}

function addToCart(product) {
  // Color used to be baked into product.id (one id per color); now one product
  // has several colors sharing an id, so the line must key on color too, or
  // "Cropped Branco/M" and "Cropped Preto/M" would collapse into one line.
  const lineId = `${product.id}__${product.color}__${product.size}`;
  const existing = cart.find(item => item.lineId === lineId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, lineId, qty: 1 });
  }
  renderCart();
}

function removeFromCart(lineId) {
  const index = cart.findIndex(item => item.lineId === lineId);
  if (index > -1) cart.splice(index, 1);
  renderCart();
}

// Event delegation: cart body is re-rendered via innerHTML, so listeners
// must live on the stable parent rather than the regenerated children.
cartDrawerBody.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) {
    removeFromCart(removeBtn.dataset.remove);
    return;
  }
  if (e.target.closest('#checkoutBtn')) {
    closeCart();
    openCheckout();
  }
});

function openCart() {
  cartDrawer.classList.add('is-open');
  drawerBackdrop.classList.add('is-open');
}

function closeCart() {
  cartDrawer.classList.remove('is-open');
  drawerBackdrop.classList.remove('is-open');
}

cartToggle.addEventListener('click', openCart);
cartDrawerClose.addEventListener('click', closeCart);
drawerBackdrop.addEventListener('click', closeCart);

renderCart();

// ---------- Product quick view ----------
const productBackdrop = document.getElementById('productBackdrop');
const productView = document.getElementById('productView');
const productViewClose = document.getElementById('productViewClose');
const productViewImage = document.getElementById('productViewImage');
const productViewName = document.getElementById('productViewName');
const productViewPrice = document.getElementById('productViewPrice');
const productViewSoldout = document.getElementById('productViewSoldout');
const productViewMedia = document.getElementById('productViewMedia');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');
const galleryDots = document.getElementById('galleryDots');
const productViewColors = document.getElementById('productViewColors');
const colorOptions = document.getElementById('colorOptions');
const productViewSizes = document.getElementById('productViewSizes');
const sizeOptions = document.getElementById('sizeOptions');
const productViewAdd = document.getElementById('productViewAdd');
const productViewAdded = document.getElementById('productViewAdded');

let currentProduct = null;
let selectedSize = 'M';
let galleryImages = [];
let galleryIndex = 0;

function renderGalleryImage() {
  productViewImage.src = galleryImages[galleryIndex];
  galleryDots.querySelectorAll('.gallery-dot').forEach((dot, i) => {
    dot.classList.toggle('is-active', i === galleryIndex);
  });
  if (lightbox && lightbox.classList.contains('is-open')) {
    lightboxImage.src = galleryImages[galleryIndex];
    lightboxImage.alt = productViewImage.alt;
    resetLightboxZoom();
  }
}

function setupGallery(images) {
  galleryImages = images;
  galleryIndex = 0;
  const hasMultiple = images.length > 1;
  galleryPrev.hidden = !hasMultiple;
  galleryNext.hidden = !hasMultiple;
  if (lightboxPrev) lightboxPrev.hidden = !hasMultiple;
  if (lightboxNext) lightboxNext.hidden = !hasMultiple;
  galleryDots.innerHTML = hasMultiple
    ? images.map(() => '<span class="gallery-dot"></span>').join('')
    : '';
  renderGalleryImage();
}

function showPrevImage() {
  if (galleryImages.length < 2) return;
  galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
  renderGalleryImage();
}

function showNextImage() {
  if (galleryImages.length < 2) return;
  galleryIndex = (galleryIndex + 1) % galleryImages.length;
  renderGalleryImage();
}

// Applies one color variant to the open quick view: swaps the gallery to that
// variant's own photos and updates the record used by "adicionar ao carrinho".
function selectColorVariant(index) {
  const variant = currentProduct.colors[index];
  currentProduct.colorIndex = index;
  currentProduct.color = variant.color;
  currentProduct.image = variant.images[0];
  setupGallery(variant.images);
  productViewImage.alt = `${currentProduct.name} ${variant.color}`;
}

function renderColorOptions(colors, disabled) {
  colorOptions.innerHTML = colors.map((variant, i) => `
    <button type="button" class="color-btn${i === 0 ? ' is-selected' : ''}" data-color-index="${i}">${variant.color}</button>
  `).join('');
  colorOptions.querySelectorAll('.color-btn').forEach(btn => { btn.disabled = disabled; });
}

function openProductView(card) {
  const isSoldOut = !!card.querySelector('.tag--sold');
  const colors = JSON.parse(card.dataset.colors);

  currentProduct = {
    id: card.dataset.id,
    name: card.querySelector('h3').textContent,
    price: Number(card.dataset.price),
    colors,
    soldOut: isSoldOut
  };

  productViewName.textContent = currentProduct.name;
  productViewPrice.textContent = formatBRL(currentProduct.price);
  productViewSoldout.hidden = !isSoldOut;
  productViewAdded.hidden = true;

  // One color only (e.g. Shorts esporte) — no color picker, same pattern as one-size.
  const hasColorChoice = colors.length > 1;
  productViewColors.hidden = !hasColorChoice;
  renderColorOptions(colors, isSoldOut);
  selectColorVariant(0);

  // Boné RUNNING is one-size — no size picker for it.
  const isOneSize = currentProduct.name.toLowerCase().startsWith('boné');
  productViewSizes.hidden = isOneSize;
  selectedSize = isOneSize ? 'Único' : 'M';
  sizeOptions.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.size === selectedSize);
    btn.disabled = isSoldOut;
  });

  productViewAdd.disabled = isSoldOut;
  productViewAdd.textContent = isSoldOut ? 'ESGOTADO' : 'ADICIONAR AO CARRINHO';

  productView.classList.add('is-open');
  productBackdrop.classList.add('is-open');
}

function closeProductView() {
  productView.classList.remove('is-open');
  productBackdrop.classList.remove('is-open');
}

document.querySelectorAll('.product-card[data-id]').forEach(card => {
  card.addEventListener('click', () => openProductView(card));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProductView(card);
    }
  });
});

galleryPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrevImage(); });
galleryNext.addEventListener('click', (e) => { e.stopPropagation(); showNextImage(); });

// Swipe support so the gallery also responds to a finger/pointer drag, not just the arrows.
let swipeStartX = null;
let wasSwipe = false;
productViewMedia.addEventListener('pointerdown', (e) => { swipeStartX = e.clientX; wasSwipe = false; });
productViewMedia.addEventListener('pointerup', (e) => {
  if (swipeStartX === null) return;
  const delta = e.clientX - swipeStartX;
  swipeStartX = null;
  if (Math.abs(delta) < 40) return;
  wasSwipe = true;
  if (delta < 0) showNextImage(); else showPrevImage();
});

// ---------- Lightbox: clicar na imagem do produto abre ela ampliada, com zoom e navegação ----------
const lightboxBackdrop = document.getElementById('lightboxBackdrop');
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxFrame = document.getElementById('lightboxFrame');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

const LIGHTBOX_ZOOM = 2.4;
let lbIsZoomed = false;
let lbPanX = 0, lbPanY = 0;
let lbDragging = false, lbDragMoved = false;
let lbDragStartX = 0, lbDragStartY = 0, lbDragStartPanX = 0, lbDragStartPanY = 0;

function applyLightboxTransform() {
  lightboxImage.style.transform = `translate(${lbPanX}px, ${lbPanY}px) scale(${lbIsZoomed ? LIGHTBOX_ZOOM : 1})`;
}

function resetLightboxZoom() {
  lbIsZoomed = false;
  lbPanX = 0;
  lbPanY = 0;
  lightboxFrame.classList.remove('is-zoomed');
  applyLightboxTransform();
}

function clampLightboxPan() {
  const maxX = (lightboxImage.clientWidth * (LIGHTBOX_ZOOM - 1)) / 2;
  const maxY = (lightboxImage.clientHeight * (LIGHTBOX_ZOOM - 1)) / 2;
  lbPanX = Math.max(-maxX, Math.min(maxX, lbPanX));
  lbPanY = Math.max(-maxY, Math.min(maxY, lbPanY));
}

function openLightbox() {
  if (!lightbox || !productViewImage.src) return;
  lightboxImage.src = productViewImage.src;
  lightboxImage.alt = productViewImage.alt;
  resetLightboxZoom();
  lightbox.classList.add('is-open');
  lightboxBackdrop.classList.add('is-open');
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightboxBackdrop.classList.remove('is-open');
  resetLightboxZoom();
}

if (lightbox) {
  productViewImage.addEventListener('click', () => {
    if (wasSwipe) { wasSwipe = false; return; }
    openLightbox();
  });

  lightboxImage.addEventListener('pointerdown', (e) => {
    lbDragging = true;
    lbDragMoved = false;
    lbDragStartX = e.clientX;
    lbDragStartY = e.clientY;
    lbDragStartPanX = lbPanX;
    lbDragStartPanY = lbPanY;
    lightboxImage.setPointerCapture(e.pointerId);
  });

  lightboxImage.addEventListener('pointermove', (e) => {
    if (!lbDragging) return;
    const dx = e.clientX - lbDragStartX;
    const dy = e.clientY - lbDragStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) lbDragMoved = true;
    if (!lbIsZoomed || !lbDragMoved) return;
    lbPanX = lbDragStartPanX + dx;
    lbPanY = lbDragStartPanY + dy;
    clampLightboxPan();
    lightboxImage.classList.add('is-dragging');
    applyLightboxTransform();
  });

  lightboxImage.addEventListener('pointerup', () => {
    lbDragging = false;
    lightboxImage.classList.remove('is-dragging');
    if (lbDragMoved) { lbDragMoved = false; return; }
    lbIsZoomed = !lbIsZoomed;
    lightboxFrame.classList.toggle('is-zoomed', lbIsZoomed);
    if (!lbIsZoomed) { lbPanX = 0; lbPanY = 0; }
    applyLightboxTransform();
  });

  lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrevImage(); });
  lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNextImage(); });
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxBackdrop.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target === lightboxFrame) closeLightbox();
  });
}

document.addEventListener('keydown', (e) => {
  if (!productView.classList.contains('is-open')) return;
  if (e.key === 'ArrowLeft') showPrevImage();
  else if (e.key === 'ArrowRight') showNextImage();
});

sizeOptions.addEventListener('click', (e) => {
  const btn = e.target.closest('.size-btn');
  if (!btn || btn.disabled) return;
  selectedSize = btn.dataset.size;
  sizeOptions.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('is-selected', b === btn));
});

colorOptions.addEventListener('click', (e) => {
  const btn = e.target.closest('.color-btn');
  if (!btn || btn.disabled) return;
  colorOptions.querySelectorAll('.color-btn').forEach(b => b.classList.toggle('is-selected', b === btn));
  selectColorVariant(Number(btn.dataset.colorIndex));
});

productViewAdd.addEventListener('click', () => {
  if (!currentProduct || currentProduct.soldOut) return;
  addToCart({
    id: currentProduct.id,
    name: currentProduct.name,
    price: currentProduct.price,
    image: currentProduct.image,
    color: currentProduct.color,
    size: selectedSize
  });
  closeProductView();
  openCart();
});

productViewClose.addEventListener('click', closeProductView);
productBackdrop.addEventListener('click', closeProductView);

// ---------- Checkout ----------
const checkoutBackdrop = document.getElementById('checkoutBackdrop');
const checkoutView = document.getElementById('checkoutView');
const checkoutClose = document.getElementById('checkoutClose');
const checkoutItems = document.getElementById('checkoutItems');
const checkoutTotal = document.getElementById('checkoutTotal');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutFormOriginalHTML = checkoutForm.innerHTML;

function renderCheckout() {
  checkoutItems.innerHTML = cart.map(item => `
    <div class="checkout-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="checkout-item__info">
        <h4>${item.name}</h4>
        <p>Tam. ${item.size} · Cor: ${item.color}</p>
        <p>${formatBRL(item.price)} × ${item.qty}</p>
      </div>
    </div>
  `).join('');
  checkoutTotal.textContent = formatBRL(cartTotal());
}

function populateInstallments() {
  const select = document.getElementById('installmentsSelect');
  if (!select) return;
  const total = cartTotal();
  const options = [];
  for (let n = 1; n <= 10; n++) {
    const perInstallment = formatBRL(total / n);
    options.push(`<option value="${n}">${n}x de ${perInstallment} sem juros</option>`);
  }
  select.innerHTML = options.join('');
}

function setPaymentMethod(method) {
  checkoutForm.querySelectorAll('.payment-tab').forEach(tab => {
    const isActive = tab.dataset.method === method;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  checkoutForm.querySelectorAll('[data-method-panel]').forEach(panel => {
    const isActive = panel.dataset.methodPanel === method;
    panel.hidden = !isActive;
    panel.querySelectorAll('input, select').forEach(field => {
      field.required = isActive && field.dataset.optional !== 'true';
      field.disabled = !isActive;
    });
  });
}

function openCheckout() {
  checkoutForm.innerHTML = checkoutFormOriginalHTML;
  renderCheckout();
  populateInstallments();
  setPaymentMethod('cartao');
  checkoutView.classList.add('is-open');
  checkoutBackdrop.classList.add('is-open');
}

function closeCheckout() {
  checkoutView.classList.remove('is-open');
  checkoutBackdrop.classList.remove('is-open');
}

checkoutClose.addEventListener('click', closeCheckout);
checkoutBackdrop.addEventListener('click', closeCheckout);

// The form's innerHTML is replaced wholesale on every open/submit (see
// openCheckout / the submit handler below), so listeners live on the
// persistent <form> element via delegation instead of on its children.
checkoutForm.addEventListener('click', (e) => {
  const tab = e.target.closest('.payment-tab');
  if (tab) setPaymentMethod(tab.dataset.method);

  if (e.target.closest('#pixCopyBtn')) {
    const pixInput = document.getElementById('pixCode');
    const btn = document.getElementById('pixCopyBtn');

    const confirmCopy = () => {
      const original = btn.textContent;
      btn.textContent = 'Copiado!';
      btn.classList.add('is-copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('is-copied');
      }, 1800);
    };

    // A Clipboard API é negada em contexto não seguro / sem permissão, e a
    // promise rejeitada virava erro não tratado no console. Cai para a seleção
    // + execCommand e, em último caso, deixa o texto selecionado para o usuário.
    const fallback = () => {
      pixInput.focus();
      pixInput.setSelectionRange(0, pixInput.value.length);
      try { document.execCommand('copy'); } catch (err) { /* seleção já feita */ }
      confirmCopy();
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pixInput.value).then(confirmCopy).catch(fallback);
    } else {
      fallback();
    }
  }
});

checkoutForm.addEventListener('input', (e) => {
  if (e.target.id === 'cardNumber') {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  }
  if (e.target.id === 'cardExpiry') {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(?=\d)/, '$1/');
  }
});

const PAYMENT_METHOD_LABELS = { cartao: 'cartão de crédito', pix: 'PIX', boleto: 'boleto' };

checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const activeTab = checkoutForm.querySelector('.payment-tab.is-active');
  const methodLabel = PAYMENT_METHOD_LABELS[activeTab ? activeTab.dataset.method : 'cartao'];

  checkoutForm.innerHTML = `
    <div class="checkout-form__success">
      <h3>Pedido de teste confirmado</h3>
      <p>Pagamento simulado via ${methodLabel} — nenhuma cobrança real foi processada, isso é um site de demonstração.</p>
    </div>
  `;
});

// ---------- Close open overlay with Escape ----------
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (lightbox.classList.contains('is-open')) closeLightbox();
  else if (checkoutView.classList.contains('is-open')) closeCheckout();
  else if (productView.classList.contains('is-open')) closeProductView();
  else if (cartDrawer.classList.contains('is-open')) closeCart();
  else if (searchPanel.classList.contains('is-open')) closeSearch();
  else if (newsletterModal.classList.contains('is-open')) closeNewsletterModal();
});

// ---------- Chrome fixo (announce-bar + header + scrim) ----------
// UM único bloco decide TUDO sobre o chrome: se ele está recolhido e se está
// no modo invertido. Antes eram dois listeners de scroll separados, cada um
// com sua própria conta — e eles divergiam numa faixa estreita de rolagem
// (header já em tinta preta enquanto a announce-bar ainda estava invertida).
// Agora existe uma decisão só, aplicada aos três elementos no mesmo quadro.
const header = document.getElementById('siteHeader');
const announceBar = document.querySelector('.announce-bar');
const chromeScrim = document.getElementById('chromeScrim');
const darkBands = document.querySelectorAll('.hero, .outdoor-hero');

// A altura do chrome NÃO é um número escrito à mão em lugar nenhum: é medida do
// que foi realmente renderizado (offsetHeight) e devolvida ao CSS. Quando a
// tipografia, a goteira ou o breakpoint mudam a altura, o recolhimento e o
// scrim acompanham sozinhos — não há valor para ficar desatualizado.
function syncChromeMetrics() {
  const announceH = announceBar ? announceBar.offsetHeight : 0;
  const headerH = header.offsetHeight;
  const total = Math.ceil(announceH + headerH);
  const root = document.documentElement;
  root.style.setProperty('--chrome-h', total + 'px');
  // +4px de folga: o estado escondido precisa ZERAR, não encostar em y=0.
  root.style.setProperty('--chrome-offset', (total + 4) + 'px');
}
syncChromeMetrics();
window.addEventListener('resize', syncChromeMetrics);
window.addEventListener('load', syncChromeMetrics);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(syncChromeMetrics).catch(() => {});
}

// FONTE ÚNICA DE VERDADE do modo invertido.
// A faixa avaliada é a UNIÃO da linha de texto da announce-bar com a linha de
// texto do header — do topo da tinta de cima até a base da tinta de baixo.
// Um só teste devolve um só booleano, e os três elementos recebem exatamente
// esse resultado. Como a banda escura precisa cobrir a faixa INTEIRA, o modo
// invertido liga um pouco depois e desliga um pouco antes: o erro cai sempre
// para o lado da superfície de papel, que é opaca e legível sobre qualquer
// mídia. Nunca mais é possível um dos dois se achar sobre mídia escura
// enquanto o outro se acha sobre papel.
function chromeInkBand() {
  const announceH = announceBar ? announceBar.offsetHeight : 0;
  const headerH = header.offsetHeight;
  // As duas barras são position:fixed com top conhecido, então a posição da
  // tinta no viewport é constante — não depende do scroll nem da matriz de
  // transform intermediária de header--hidden durante os 0.8s do deslize.
  return { top: 8, bottom: announceH + headerH - 20 };
}

function chromeIsOverDarkMedia() {
  const { top, bottom } = chromeInkBand();
  for (const band of darkBands) {
    const rect = band.getBoundingClientRect();
    if (rect.top <= top && rect.bottom >= bottom) return true;
  }
  return false;
}

// Histerese do recolhimento. Sem ela qualquer oscilação de 1px na rolagem
// (inércia de trackpad, ajuste de âncora, quique de fim de página) invertia a
// direção e o chrome saía e voltava no meio do deslize de 0.8s — o movimento
// lia como tremor, não como deslize. Só uma intenção de rolagem de 6px ou mais
// muda o estado, e o transform continua sendo interpolado pelo CSS.
const CHROME_SCROLL_HYSTERESIS = 6;
const CHROME_HIDE_FLOOR = 200;
let lastScroll = window.scrollY;
let chromeHidden = false;

function updateChrome() {
  const current = window.scrollY;
  const delta = current - lastScroll;
  // O painel de busca e o menu mobile são filhos fixed do header: recolher o
  // header enquanto um deles está aberto arrastaria o painel junto.
  const panelOpen = mainNav.classList.contains('is-open')
    || searchPanel.classList.contains('is-open');

  if (panelOpen || current <= CHROME_HIDE_FLOOR) {
    chromeHidden = false;
    lastScroll = current;
  } else if (delta > CHROME_SCROLL_HYSTERESIS) {
    chromeHidden = true;
    lastScroll = current;
  } else if (delta < -CHROME_SCROLL_HYSTERESIS) {
    chromeHidden = false;
    lastScroll = current;
  }

  const overDark = !panelOpen && chromeIsOverDarkMedia();

  // Um resultado, três elementos, no mesmo quadro. Nenhuma classe é lida de
  // volta do DOM para decidir a próxima: tudo sai das mesmas duas variáveis.
  header.classList.toggle('header--hidden', chromeHidden);
  header.classList.toggle('site-header--inverse', overDark);
  if (announceBar) {
    announceBar.classList.toggle('announce-bar--hidden', chromeHidden);
    announceBar.classList.toggle('announce-bar--inverse', overDark);
  }
  if (chromeScrim) {
    // O véu só existe onde existe tinta clara — e recolhe junto com o chrome.
    chromeScrim.classList.toggle('is-active', overDark);
    chromeScrim.classList.toggle('is-hidden', chromeHidden);
  }
}

// Nome antigo mantido como alias global: era a API que os validadores externos
// chamavam para forçar um recálculo síncrono.
window.syncHeaderSurface = updateChrome;

window.addEventListener('scroll', updateChrome, { passive: true });
window.addEventListener('resize', updateChrome);
navToggle.addEventListener('click', updateChrome);
searchToggle.addEventListener('click', updateChrome);
searchClose.addEventListener('click', updateChrome);
window.addEventListener('load', updateChrome);
updateChrome();

// ---------- Marca d'água da ferramenta de geração no vídeo do manifesto ----------
// O arquivo de vídeo é conteúdo protegido e não pode ser editado, então o canto
// inferior direito do FRAME é coberto por uma vinheta. Como a seção usa
// object-fit:cover, o recorte muda a cada largura (em 1:1 no mobile não há
// recorte nenhum e a marca aparece inteira; em desktop o corte vertical já a
// leva para fora). A posição é calculada a partir do mapeamento real do cover,
// e a máscara some sozinha quando o canto do vídeo já está fora da moldura.
const outdoorMask = document.getElementById('outdoorHeroMask');
const outdoorMedia = document.querySelector('.outdoor-hero-media');
const outdoorVideoEl = document.getElementById('outdoorHeroVideo');

function placeOutdoorMask() {
  if (!outdoorMask || !outdoorMedia || !outdoorVideoEl) return;
  const box = outdoorMedia.getBoundingClientRect();
  const vw = outdoorVideoEl.videoWidth || 960;
  const vh = outdoorVideoEl.videoHeight || 960;
  if (!box.width || !box.height) return;

  const scale = Math.max(box.width / vw, box.height / vh);   // object-fit: cover
  const rw = vw * scale, rh = vh * scale;
  const offX = (box.width - rw) / 2;                         // object-position: center
  const offY = (box.height - rh) / 2;

  // Caixa medida da marca no frame (960x960): x 769–934, y 908–939.
  const WM_LEFT = 760 / 960, WM_TOP = 900 / 960;

  // Vinheta ancorada no canto inferior direito do frame. 50% x 22% do vídeo
  // renderizado deixa o núcleo opaco (62% do raio da elipse) cobrindo a marca
  // com ~28px de folga, e o esmaecimento acontece bem fora dela.
  const w = rw * 0.50;
  const h = rh * 0.22;
  const left = offX + rw - w;
  const top = offY + rh - h;

  // Se o recorte do cover já jogou a marca inteira para fora da moldura
  // (o caso do desktop, onde o corte vertical come a base do frame), não há
  // nada a cobrir — e a vinheta não deve aparecer de graça.
  const wmTop = offY + rh * WM_TOP;
  const wmLeft = offX + rw * WM_LEFT;
  if (wmTop >= box.height || wmLeft >= box.width) {
    outdoorMask.hidden = true;
    return;
  }
  outdoorMask.hidden = false;
  outdoorMask.style.left = left + 'px';
  outdoorMask.style.top = top + 'px';
  outdoorMask.style.width = w + 'px';
  outdoorMask.style.height = h + 'px';
}

placeOutdoorMask();
window.addEventListener('resize', placeOutdoorMask);
window.addEventListener('load', placeOutdoorMask);
if (outdoorVideoEl) {
  outdoorVideoEl.addEventListener('loadedmetadata', placeOutdoorMask);
  outdoorVideoEl.addEventListener('loadeddata', placeOutdoorMask);
}

// ---------- Custom cursor over product images (desktop only) ----------
// Gated once at load, not via a live-updating listener: a static test site
// doesn't need to handle someone plugging in a mouse mid-session, and gating
// per-call would add complexity with no real payoff here.
const customCursor = document.getElementById('customCursor');
if (customCursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let cursorX = -999;
  let cursorY = -999;

  // Position updates every frame via rAF (no CSS transition on transform, so
  // it never lags behind the pointer); only the circle's scale — a separate
  // property on the inner element — eases in/out on the signature curve.
  function paintCursor() {
    customCursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    requestAnimationFrame(paintCursor);
  }
  requestAnimationFrame(paintCursor);
  document.addEventListener('pointermove', (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
  }, { passive: true });

  const cursorTargets = [
    ...document.querySelectorAll('.product-photo'),
    document.getElementById('productViewImage')
  ].filter(Boolean);

  cursorTargets.forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
      customCursor.classList.add('is-active');
    });
    el.addEventListener('pointerleave', () => {
      customCursor.classList.remove('is-active');
    });
  });
}

// ---------- Newsletter popup (aparece uma vez, depois de 4s) ----------
const newsletterBackdrop = document.getElementById('newsletterBackdrop');
const newsletterModal = document.getElementById('newsletterModal');
const newsletterModalClose = document.getElementById('newsletterModalClose');
const newsletterModalForm = document.getElementById('newsletterModalForm');
const newsletterModalSuccess = document.getElementById('newsletterModalSuccess');
const NEWSLETTER_KEY = 'kineNewsletterDismissed';

function openNewsletterModal() {
  if (!newsletterModal || !newsletterBackdrop) return;
  if (localStorage.getItem(NEWSLETTER_KEY)) return;
  // não empilha por cima de outro overlay já aberto
  const anyOpen = document.querySelector('.product-view.is-open, .checkout-view.is-open, .cart-drawer.is-open, .search-panel.is-open, .lightbox.is-open');
  if (anyOpen) return;
  newsletterModal.classList.add('is-open');
  newsletterBackdrop.classList.add('is-open');
}

function closeNewsletterModal() {
  if (!newsletterModal || !newsletterBackdrop) return;
  newsletterModal.classList.remove('is-open');
  newsletterBackdrop.classList.remove('is-open');
  try { localStorage.setItem(NEWSLETTER_KEY, '1'); } catch (e) {}
}

if (newsletterModal) {
  setTimeout(openNewsletterModal, 2000);
  newsletterModalClose.addEventListener('click', closeNewsletterModal);
  newsletterBackdrop.addEventListener('click', closeNewsletterModal);
  newsletterModalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    newsletterModalForm.hidden = true;
    newsletterModalSuccess.hidden = false;
    try { localStorage.setItem(NEWSLETTER_KEY, '1'); } catch (e) {}
  });
}
