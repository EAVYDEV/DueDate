const API_KEY = 'AIzaSyARDM11ksDx3uySey-OQBSHT7fMfoDJd1E';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
let currentLink = '';
let historyStack = [];
let historyIndex = -1;

function handleClientLoad() {
  console.log('Google API client library loaded');
  document.getElementById('loading-spinner').style.display = 'block';
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
    console.error('Error initializing gapi client:', error);
    alert('Failed to initialize Google API client. Please check the console for more details.');
    document.getElementById('loading-spinner').style.display = 'none';
  }
}

async function loadSheetData() {
  console.log('loadSheetData');
  document.getElementById('loading-spinner').style.display = 'block';
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: '1jsDYK8wIA6_UxZPNU8G8CNKfc-xBOcZeDSKcL5SC0bY',
      range: 'Fab Schedule!A2:K999',
    });
    displaySheetData(response.result.values);
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    alert('Failed to fetch data from Google Sheets. Please check the console for more details.');
    document.getElementById('loading-spinner').style.display = 'none';
  }
}

function displaySheetData(data) {
  document.getElementById('loading-spinner').style.display = 'none';
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
  let fabDueDate = parseDate(fabDue);
  const isPastDue = fabDueDate && fabDueDate < currentDate;
  const card = document.createElement('div');
  card.className = `project-card ${isPastDue ? 'red' : 'orange'}`;
  if (fabDueDate) card.setAttribute('data-date', fabDueDate.toISOString().split('T')[0]);
  if (qcReady && qcReady.toLowerCase() === 'yes') card.style.border = '10px solid rgba(255, 0, 0, 0.75)';
  card.innerHTML = generateCardHTML(orderNumber, name, fabDue, zone, scope, am, qcNotes, link, drawingsLink, qcReady);
  if (isValidUrl(link)) card.addEventListener('click', () => openLink(link));
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

function openLink(link) {
  if (isValidUrl(link)) {
    currentLink = link;
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(link);
    historyIndex++;
    document.getElementById('iframe-container').innerHTML = `<iframe src="${link}"></iframe>`;
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
    document.getElementById('iframe-container').innerHTML = `<iframe src="${historyStack[historyIndex]}"></iframe>`;
  }
}

function goForward() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    document.getElementById('iframe-container').innerHTML = `<iframe src="${historyStack[historyIndex]}"></iframe>`;
  }
}

function reloadPage() {
  document.getElementById('iframe-container').innerHTML = `<iframe src="${currentLink}"></iframe>`;
}

function goHome() {
  if (historyStack.length > 0) {
    historyIndex = 0;
    document.getElementById('iframe-container').innerHTML = `<iframe src="${historyStack[0]}"></iframe>`;
  }
}

function filterProjects() {
  const searchInput = document.getElementById('search-input').value.toLowerCase();
  const projectCards = document.getElementsByClassName('project-card');

  Array.from(projectCards).forEach(card => {
    const orderInfo = card.querySelector('.order-info').innerText.toLowerCase();
    if (orderInfo.includes(searchInput)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
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

document.addEventListener('DOMContentLoaded', () => {
  handleClientLoad();
  addTouchSupport();
  document.getElementById('search-input').addEventListener('input', filterProjects);
});
