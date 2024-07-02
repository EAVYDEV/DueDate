const API_KEY = 'AIzaSyARDM11ksDx3uySey-OQBSHT7fMfoDJd1E';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
let currentLink = '';
let historyStack = [];
let historyIndex = -1;
let activeCard = null;

function handleClientLoad() {
  console.log('Google API client library loaded');
  toggleLoadingSpinner(true);
  gapi.load('client', initClient);
}

async function initClient() {
  try {
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: DISCOVERY_DOCS,
    });
    console.log('gapi client initialized');
    loadSheetData();
  } catch (error) {
    handleError('Failed to initialize Google API client', error);
  }
}

async function loadSheetData() {
  console.log('loadSheetData');
  toggleLoadingSpinner(true);
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: '1jsDYK8wIA6_UxZPNU8G8CNKfc-xBOcZeDSKcL5SC0bY',
      range: 'Fab Schedule!A2:K999',
    });
    displaySheetData(response.result.values);
  } catch (error) {
    handleError('Failed to fetch data from Google Sheets', error);
  }
}

function displaySheetData(data) {
  toggleLoadingSpinner(false);
  const projectList = document.getElementById('project-list');
  const currentDate = new Date();
  projectList.innerHTML = '';

  if (!data || data.length === 0) {
    projectList.innerHTML = '<p>No data found in the spreadsheet.</p>';
    return;
  }

  const projectCards = data.map(row => createProjectCard(row, currentDate));
  projectCards.sort((a, b) => sortProjectCards(a, b));
  projectCards.forEach(card => projectList.appendChild(card.card));
  initializeSortable(projectList);
}

function createProjectCard(row, currentDate) {
  const [orderNumber, name, fabDue, zone, scope, am, qcNotes, link, drawingsLink, qcReady] = row;
  const fabDueDate = parseDate(fabDue);
  const isAfterCurrentDate = fabDueDate && fabDueDate > currentDate;
  const card = document.createElement('div');
  card.className = `project-card ${isAfterCurrentDate ? 'red' : 'yellow'}`;
  if (fabDueDate) card.setAttribute('data-date', fabDueDate.toISOString().split('T')[0]);
  if (qcReady && qcReady.toLowerCase() === 'yes') card.style.border = '10px solid rgba(255, 0, 0, 0.75)';
  card.innerHTML = generateCardHTML(orderNumber, name, fabDue, zone, scope, am, qcNotes, link, drawingsLink, qcReady);
  if (isValidUrl(link)) card.addEventListener('click', () => openLink(link, card));
  return { card, qcReady };
}

function parseDate(dateString) {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

function generateCardHTML(orderNumber, name, fabDue, zone, scope, am, qcNotes, link, drawingsLink, qcReady) {
  return `
    <div class="order-info">${orderNumber} - ${name}</div>
    <div><b>Fab Due:</b> ${fabDue}</div>
    <div><b>Zone:</b> ${zone}</div>
    <div><b>Scope:</b> ${scope}</div>
    <div><b>AM:</b> ${am}</div>
    ${qcReady && qcReady.toLowerCase() === 'yes' ? `<div><b>QC Notes:</b> ${qcNotes}</div>` : ''}
    ${isValidUrl(drawingsLink) ? `<div><a href="#" onclick="openLink('${drawingsLink}'); return false;">View Drawings</a></div>` : ''}
  `;
}

function sortProjectCards(a, b) {
  if (a.qcReady && a.qcReady.toLowerCase() === 'yes' && (!b.qcReady || b.qcReady.toLowerCase() !== 'yes')) return -1;
  if (b.qcReady && b.qcReady.toLowerCase() === 'yes' && (!a.qcReady || a.qcReady.toLowerCase() !== 'yes')) return 1;
  return new Date(a.card.getAttribute('data-date')) - new Date(b.card.getAttribute('data-date'));
}

function initializeSortable(projectList) {
  Sortable.create(projectList, {
    animation: 150,
    ghostClass: 'blue-background-class'
  });
}

function openLink(link, card) {
  console.log(`Opening link: ${link}`);
  if (isValidUrl(link)) {
    currentLink = link;
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(link);
    historyIndex++;
    const iframeContainer = document.getElementById('iframe-container');
    iframeContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = link;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-top-navigation-by-user-activation';
    iframeContainer.appendChild(iframe);

    // Highlight the active card
    if (activeCard) {
      activeCard.classList.remove('active');
    }
    activeCard = card;
    activeCard.classList.add('active');
  } else {
    alert('Invalid URL. Please enter a valid URL in the settings.');
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

function goBack() {
  if (historyIndex > 0) {
    historyIndex--;
    openLink(historyStack[historyIndex], activeCard);
  }
}

function goForward() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    openLink(historyStack[historyIndex], activeCard);
  }
}

function reloadPage() {
  openLink(currentLink, activeCard);
}

function goHome() {
  if (historyStack.length > 0) {
    historyIndex = 0;
    openLink(historyStack[0], activeCard);
  }
}

function filterProjects() {
  const searchInput = document.getElementById('search-input').value.toLowerCase();
  const projectCards = document.getElementsByClassName('project-card');

  Array.from(projectCards).forEach(card => {
    const orderInfo = card.querySelector('.order-info').innerText.toLowerCase();
    card.style.display = orderInfo.includes(searchInput) ? '' : 'none';
  });
}

function addTouchSupport() {
  const hammer = new Hammer(document.body);
  hammer.on('swipeleft', goBack);
  hammer.on('swiperight', goForward);

  const projectCards = document.getElementsByClassName('project-card');
  Array.from(projectCards).forEach(card => {
    card.addEventListener('touchstart', handleTouchStart, false);
    card.addEventListener('touchend', handleTouchEnd, false);
  });
}

let touchStartX = null;
function handleTouchStart(evt) {
  const firstTouch = evt.touches[0];
  touchStartX = firstTouch.clientX;
}

function handleTouchEnd(evt) {
  if (!touchStartX) {
    return;
  }

  const touchEndX = evt.changedTouches[0].clientX;
  const touchDiff = touchStartX - touchEndX;

  if (Math.abs(touchDiff) > 50) {
    if (touchDiff > 0) {
      goBack();
    } else {
      goForward();
    }
  }
  touchStartX = null;
}

function goToSettings() {
  document.getElementById('settings-page').classList.remove('hidden');
  document.getElementById('main-content').classList.add('hidden');
  const savedUrl = localStorage.getItem('qcUrl');
  if (savedUrl) {
    document.getElementById('qc-url-input').value = savedUrl;
  }
}

function saveSettings() {
  const qcUrlInput = document.getElementById('qc-url-input').value;
  if (isValidUrl(qcUrlInput)) {
    localStorage.setItem('qcUrl', qcUrlInput);
    alert('Settings saved.');
    returnToMain();
  } else {
    alert('Please enter a valid URL.');
  }
}

function returnToMain() {
  document.getElementById('settings-page').classList.add('hidden');
  document.getElementById('main-content').classList.remove('hidden');
}

function goToAddQC() {
  const qcUrl = localStorage.getItem('qcUrl');
  if (qcUrl && isValidUrl(qcUrl)) {
    openLink(qcUrl);
  } else {
    alert('Please set a valid QC URL in the settings.');
  }
}

function toggleLoadingSpinner(show) {
  document.getElementById('loading-spinner').style.display = show ? 'block' : 'none';
}

function handleError(message, error) {
  console.error(message, error);
  alert(`${message}. Please check the console for more details.`);
  toggleLoadingSpinner(false);
}

document.addEventListener('DOMContentLoaded', () => {
  handleClientLoad();
  addTouchSupport();
  document.getElementById('search-input').addEventListener('input', filterProjects);
});
