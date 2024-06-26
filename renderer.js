// Google Sheets API configuration
const API_KEY = 'AIzaSyARDM11ksDx3uySey-OQBSHT7fMfoDJd1E'; // Replace with your new API key
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

let currentLink = '';
let historyStack = [];
let historyIndex = -1;

function handleClientLoad() {
  console.log('Google API client library loaded');
  document.getElementById('loading-spinner').style.display = 'block';
  gapi.load('client', initClient);
}

function initClient() {
  console.log('initClient');
  gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOCS,
  }).then(() => {
    console.log('gapi client initialized');
    loadSheetData();
  }).catch((error) => {
    console.error('Error initializing gapi client:', error);
    alert('Failed to initialize Google API client. Please check the console for more details.');
    document.getElementById('loading-spinner').style.display = 'none';
  });
}

function loadSheetData() {
  console.log('loadSheetData');
  document.getElementById('loading-spinner').style.display = 'block';
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: '1jsDYK8wIA6_UxZPNU8G8CNKfc-xBOcZeDSKcL5SC0bY',
    range: 'Fab Schedule!A2:K999', // Adjust the range to include the new columns
  }).then(response => {
    document.getElementById('loading-spinner').style.display = 'none';
    console.log('Data fetched from Google Sheets:', response);
    const data = response.result.values;
    const projectList = document.getElementById('project-list');
    const currentDate = new Date();

    // Clear existing cards
    projectList.innerHTML = '';

    if (!data || data.length === 0) {
      projectList.innerHTML = '<p>No data found in the spreadsheet.</p>';
      return;
    }

    const projectCards = [];

    data.forEach(row => {
      const orderNumber = row[0] || 'Empty';
      const name = row[1] || 'Empty';
      const fabDue = row[2] || 'Empty';
      const zone = row[3] || 'Empty';
      const scope = row[4] || 'Empty';
      const am = row[5] || 'Empty';
      const qcNotes = row[6] || 'No notes available';
      const link = row[7] || ''; // Get the link from column H
      const drawingsLink = row[8] || ''; // Get the Drawings link from column J
      const qcReady = row[9] || 'No'; // Get the QC Ready status from column K

      console.log(`QC Ready status for ${orderNumber}: ${qcReady}`);

      let fabDueDate;
      let isPastDue = false;
      try {
        fabDueDate = new Date(fabDue);
        if (isNaN(fabDueDate.getTime())) throw new Error('Invalid Date');
        isPastDue = fabDueDate < currentDate;
      } catch (e) {
        fabDueDate = 'Invalid date';
      }

      const card = document.createElement('div');
      card.className = 'project-card ' + (isPastDue ? 'red' : 'orange');
      if (fabDueDate !== 'Invalid date') {
        card.setAttribute('data-date', fabDueDate.toISOString().split('T')[0]);
      }
      if (qcReady.toLowerCase() === 'yes') {
        card.style.border = '10px solid rgba(255, 0, 0, 0.75)'; // 75% transparent red border
      }
      card.innerHTML = `
        <div class="order-info">${orderNumber} - ${name}</div>
        <div><b>Fab Due:</b> ${fabDue}</div>
        <div><b>Zone:</b> ${zone}</div>
        <div><b>Scope:</b> ${scope}</div>
        <div><b>AM:</b> ${am}</div>
        ${qcReady.toLowerCase() === 'yes' ? `<div><b>QC Notes:</b> ${qcNotes}</div>` : ''}
        ${isValidUrl(drawingsLink) ? `<div><a href="#" onclick="openLink('${drawingsLink}'); return false;">View Drawings</a></div>` : ''}
      `;
      if (isValidUrl(link)) {
        card.addEventListener('click', () => openLink(link)); // Add click event listener for main link
      } else {
        console.warn(`Invalid URL: ${link}`);
      }
      projectCards.push({ card, qcReady });
    });

    // Sort project cards by QC Ready status and Fab Due date
    projectCards.sort((a, b) => {
      if (a.qcReady.toLowerCase() === 'yes' && b.qcReady.toLowerCase() !== 'yes') {
        return -1;
      }
      if (a.qcReady.toLowerCase() !== 'yes' && b.qcReady.toLowerCase() === 'yes') {
        return 1;
      }
      const dateA = new Date(a.card.getAttribute('data-date'));
      const dateB = new Date(b.card.getAttribute('data-date'));
      return dateA - dateB;
    });

    projectCards.forEach(({ card }) => projectList.appendChild(card));

    // Initialize SortableJS
    Sortable.create(projectList, {
      animation: 150,
      ghostClass: 'blue-background-class'
    });
  }).catch((error) => {
    console.error('Error fetching data from Google Sheets:', error);
    alert('Failed to fetch data from Google Sheets. Please check the console for more details.');
    document.getElementById('loading-spinner').style.display = 'none';
  });
}

function openLink(link) {
  if (isValidUrl(link)) {
    try {
      const url = new URL(link);
      currentLink = link;
      historyStack = historyStack.slice(0, historyIndex + 1);
      historyStack.push(link);
      historyIndex++;
      const iframeContainer = document.getElementById('iframe-container');
      iframeContainer.innerHTML = `<iframe src="${link}"></iframe>`;
    } catch (e) {
      console.error('Invalid URL:', link);
      alert('The provided link is not a valid URL.');
    }
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function goBack() {
  if (historyIndex > 0) {
    historyIndex--;
    const iframeContainer = document.getElementById('iframe-container');
    iframeContainer.innerHTML = `<iframe src="${historyStack[historyIndex]}"></iframe>`;
  }
}

function goForward() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    const iframeContainer = document.getElementById('iframe-container');
    iframeContainer.innerHTML = `<iframe src="${historyStack[historyIndex]}"></iframe>`;
  }
}

function reloadPage() {
  const iframeContainer = document.getElementById('iframe-container');
  iframeContainer.innerHTML = `<iframe src="${currentLink}"></iframe>`;
}

function goHome() {
  if (historyStack.length > 0) {
    historyIndex = 0;
    const iframeContainer = document.getElementById('iframe-container');
    iframeContainer.innerHTML = `<iframe src="${historyStack[0]}"></iframe>`;
  }
}

document.addEventListener('DOMContentLoaded', handleClientLoad);
