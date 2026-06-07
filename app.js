const itemsBody = document.getElementById('items-body');
const addItemBtn = document.getElementById('add-item');
const form = document.getElementById('invoice-form');
const vatRateInput = document.getElementById('vatRate');

const sellerNameInput = document.getElementById('sellerName');
const sellerAddressInput = document.getElementById('sellerAddress');
const sellerSiretInput = document.getElementById('sellerSiret');
const sellerLogoInput = document.getElementById('sellerLogo');
const logoPreview = document.getElementById('logo-preview');
const removeLogoBtn = document.getElementById('remove-logo');

const SELLER_STORAGE_KEY = 'generateurFactures.seller';
let sellerLogoDataUrl = null;

function loadSellerInfo() {
  const saved = localStorage.getItem(SELLER_STORAGE_KEY);
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    sellerNameInput.value = data.name || '';
    sellerAddressInput.value = data.address || '';
    sellerSiretInput.value = data.siret || '';
    if (data.logo) {
      sellerLogoDataUrl = data.logo;
      showLogoPreview(data.logo);
    }
  } catch (e) {
    // données corrompues, on ignore
  }
}

function saveSellerInfo() {
  const data = {
    name: sellerNameInput.value,
    address: sellerAddressInput.value,
    siret: sellerSiretInput.value,
    logo: sellerLogoDataUrl,
  };
  localStorage.setItem(SELLER_STORAGE_KEY, JSON.stringify(data));
}

function showLogoPreview(dataUrl) {
  logoPreview.src = dataUrl;
  logoPreview.hidden = false;
  removeLogoBtn.hidden = false;
}

function hideLogoPreview() {
  logoPreview.hidden = true;
  logoPreview.removeAttribute('src');
  removeLogoBtn.hidden = true;
}

[sellerNameInput, sellerAddressInput, sellerSiretInput].forEach(input => {
  input.addEventListener('input', saveSellerInfo);
});

sellerLogoInput.addEventListener('change', () => {
  const file = sellerLogoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    sellerLogoDataUrl = reader.result;
    showLogoPreview(sellerLogoDataUrl);
    saveSellerInfo();
  };
  reader.readAsDataURL(file);
});

removeLogoBtn.addEventListener('click', () => {
  sellerLogoDataUrl = null;
  sellerLogoInput.value = '';
  hideLogoPreview();
  saveSellerInfo();
});

loadSellerInfo();

// --- Clients enregistrés ---

const clientNameInput = document.getElementById('clientName');
const clientAddressInput = document.getElementById('clientAddress');
const clientsListEl = document.getElementById('clients-list');

const CLIENTS_STORAGE_KEY = 'generateurFactures.clients';

function loadClients() {
  try {
    return JSON.parse(localStorage.getItem(CLIENTS_STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function renderClientsList() {
  const clients = loadClients();
  clientsListEl.innerHTML = clients.map(c => `<option value="${escapeHtml(c.name)}">`).join('');
}

function saveClient(name, address) {
  if (!name) return;
  const clients = loadClients();
  const existing = clients.find(c => c.name === name);
  if (existing) {
    existing.address = address;
  } else {
    clients.push({ name, address });
  }
  localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  renderClientsList();
}

clientNameInput.addEventListener('input', () => {
  const clients = loadClients();
  const match = clients.find(c => c.name === clientNameInput.value);
  if (match) {
    clientAddressInput.value = match.address || '';
  }
});

renderClientsList();

// --- Numérotation automatique ---

const docNumberInput = document.getElementById('docNumber');
const docTypeRadios = document.querySelectorAll('input[name="docType"]');

const COUNTERS_STORAGE_KEY = 'generateurFactures.counters';

function loadCounters() {
  try {
    return JSON.parse(localStorage.getItem(COUNTERS_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveCounters(counters) {
  localStorage.setItem(COUNTERS_STORAGE_KEY, JSON.stringify(counters));
}

function docTypePrefix(docType) {
  return docType === 'Facture' ? 'FAC' : 'DEV';
}

function suggestDocNumber() {
  const docType = document.querySelector('input[name="docType"]:checked').value;
  const counters = loadCounters();
  const next = (counters[docType] || 0) + 1;
  docNumberInput.value = `${docTypePrefix(docType)}-${String(next).padStart(4, '0')}`;
}

function incrementCounter(docType) {
  const counters = loadCounters();
  counters[docType] = (counters[docType] || 0) + 1;
  saveCounters(counters);
}

docTypeRadios.forEach(radio => {
  radio.addEventListener('change', suggestDocNumber);
});

suggestDocNumber();

// --- Historique des documents générés ---

const historyBody = document.getElementById('history-body');
const historyTable = document.getElementById('history-table');
const historyEmpty = document.getElementById('history-empty');
const clearHistoryBtn = document.getElementById('clear-history');

const HISTORY_STORAGE_KEY = 'generateurFactures.history';
const MAX_HISTORY_ENTRIES = 50;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    historyTable.classList.remove('has-rows');
    historyEmpty.hidden = false;
    historyBody.innerHTML = '';
    return;
  }
  historyTable.classList.add('has-rows');
  historyEmpty.hidden = true;
  historyBody.innerHTML = history.map(entry => `
    <tr>
      <td>${escapeHtml(entry.docType)}</td>
      <td>${escapeHtml(entry.docNumber)}</td>
      <td>${escapeHtml(formatDate(entry.docDate))}</td>
      <td>${escapeHtml(entry.clientName)}</td>
      <td>${entry.totalTTC.toFixed(2)} €</td>
    </tr>
  `).join('');
}

function addHistoryEntry(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.length = MAX_HISTORY_ENTRIES;
  }
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  renderHistory();
}

clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Effacer tout l\'historique des documents générés ?')) {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    renderHistory();
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

renderHistory();

function createItemRow() {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="item-desc" placeholder="Ex: Développement site web"></td>
    <td><input type="number" class="item-qty" value="1" min="0" step="0.01"></td>
    <td><input type="number" class="item-price" value="0" min="0" step="0.01"></td>
    <td><button type="button" class="remove-item">X</button></td>
  `;
  itemsBody.appendChild(row);
}

function removeItemRow(button) {
  const row = button.closest('tr');
  if (itemsBody.children.length > 1) {
    row.remove();
  }
  updateTotals();
}

function getItems() {
  return [...itemsBody.querySelectorAll('tr')].map(row => {
    const desc = row.querySelector('.item-desc').value.trim();
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    return { desc, qty, price, total: qty * price };
  });
}

function updateTotals() {
  const items = getItems();
  const totalHT = items.reduce((sum, item) => sum + item.total, 0);
  const vatRate = parseFloat(vatRateInput.value) || 0;
  const totalVAT = totalHT * (vatRate / 100);
  const totalTTC = totalHT + totalVAT;

  document.getElementById('totalHT').textContent = totalHT.toFixed(2);
  document.getElementById('totalVAT').textContent = totalVAT.toFixed(2);
  document.getElementById('totalTTC').textContent = totalTTC.toFixed(2);

  return { totalHT, totalVAT, totalTTC, vatRate };
}

itemsBody.addEventListener('input', updateTotals);
itemsBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-item')) {
    removeItemRow(e.target);
  }
});

addItemBtn.addEventListener('click', () => {
  createItemRow();
  updateTotals();
});

// Une première ligne par défaut
createItemRow();
updateTotals();

form.addEventListener('submit', (e) => {
  e.preventDefault();
  generatePDF();
});

function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// Calcule la taille du logo dans le PDF en respectant ses proportions,
// en le faisant tenir dans un cadre maximal de maxWidth x maxHeight (mm).
function fitInBox(naturalWidth, naturalHeight, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  return { width: naturalWidth * ratio, height: naturalHeight * ratio };
}

async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const docType = document.querySelector('input[name="docType"]:checked').value;
  const sellerName = document.getElementById('sellerName').value;
  const sellerAddress = document.getElementById('sellerAddress').value;
  const sellerSiret = document.getElementById('sellerSiret').value;
  const clientName = document.getElementById('clientName').value;
  const clientAddress = document.getElementById('clientAddress').value;
  const docNumber = document.getElementById('docNumber').value;
  const docDate = document.getElementById('docDate').value;

  const { totalHT, totalVAT, totalTTC, vatRate } = updateTotals();
  const items = getItems().filter(item => item.desc);

  let y = 20;
  const left = 15;

  // Logo (en haut à droite), redimensionné en conservant ses proportions
  if (sellerLogoDataUrl) {
    try {
      const dims = await getImageDimensions(sellerLogoDataUrl);
      if (dims) {
        const { width, height } = fitInBox(dims.width, dims.height, 45, 25);
        const format = sellerLogoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        const x = 195 - width;
        doc.addImage(sellerLogoDataUrl, format, x, 12, width, height, undefined, 'FAST');
      }
    } catch (e) {
      // image illisible, on l'ignore simplement
    }
  }

  // Titre
  doc.setFontSize(18);
  doc.text(`${docType} n° ${docNumber}`, left, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(`Date : ${formatDate(docDate)}`, left, y);
  y += 12;

  // Vendeur
  doc.setFontSize(12);
  doc.text('Émetteur', left, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(sellerName, left, y); y += 5;
  if (sellerAddress) { doc.text(sellerAddress, left, y); y += 5; }
  if (sellerSiret) { doc.text(`SIRET : ${sellerSiret}`, left, y); y += 5; }
  y += 6;

  // Client
  doc.setFontSize(12);
  doc.text('Client', left, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(clientName, left, y); y += 5;
  if (clientAddress) { doc.text(clientAddress, left, y); y += 5; }
  y += 10;

  // Tableau des prestations
  doc.setFontSize(11);
  doc.text('Description', left, y);
  doc.text('Qté', 110, y);
  doc.text('Prix unitaire', 130, y);
  doc.text('Total', 175, y);
  y += 4;
  doc.line(left, y, 195, y);
  y += 6;

  doc.setFontSize(10);
  items.forEach(item => {
    doc.text(item.desc, left, y);
    doc.text(String(item.qty), 110, y);
    doc.text(`${item.price.toFixed(2)} €`, 130, y);
    doc.text(`${item.total.toFixed(2)} €`, 175, y);
    y += 7;
  });

  y += 4;
  doc.line(left, y, 195, y);
  y += 8;

  // Totaux
  doc.setFontSize(10);
  doc.text(`Total HT : ${totalHT.toFixed(2)} €`, 140, y);
  y += 6;
  doc.text(`TVA (${vatRate}%) : ${totalVAT.toFixed(2)} €`, 140, y);
  y += 6;
  doc.setFontSize(12);
  doc.text(`Total TTC : ${totalTTC.toFixed(2)} €`, 140, y);

  if (vatRate === 0) {
    y += 12;
    doc.setFontSize(9);
    doc.text('TVA non applicable, art. 293 B du CGI.', left, y);
  }

  const filename = `${docType}_${docNumber || 'sans-numero'}.pdf`;
  doc.save(filename);

  // Mémorisation du client, du numéro suivant et ajout à l'historique
  saveClient(clientName, clientAddress);
  incrementCounter(docType);
  addHistoryEntry({ docType, docNumber, docDate, clientName, totalTTC });
  suggestDocNumber();
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
