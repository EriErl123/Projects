/**
 * DTR Mobile App - Personal Time Tracking
 * Simple single-user app with localStorage
 */

// ============ STORAGE KEY ============
const ENTRIES_STORAGE_KEY = 'dtr_entries_v1';
const CLOCK_STATE_KEY = 'dtr_clock_state_v1';

// ============ MODAL FUNCTIONS ============

/**
 * Show professional modal dialog
 */
function showModal(title, message, onConfirm, options = {}) {
  const {
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDangerous = false
  } = options;

  const modal = document.getElementById('confirmModal');
  const modalOverlay = modal.querySelector('.modal-overlay');
  const modalTitle = modal.querySelector('#modalTitle');
  const modalMessage = modal.querySelector('#modalMessage');
  const modalConfirmBtn = modal.querySelector('#modalConfirmBtn');
  const modalCancelBtn = modal.querySelector('#modalCancelBtn');
  const modalCloseBtn = modal.querySelector('#modalCloseBtn');

  // Set content
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalConfirmBtn.textContent = confirmText;
  modalCancelBtn.textContent = cancelText;

  // Set button colors
  if (isDangerous) {
    modalConfirmBtn.className = 'btn btn-danger';
  } else {
    modalConfirmBtn.className = 'btn btn-primary';
  }
  modalCancelBtn.className = 'btn btn-secondary';

  // Show modal
  modal.removeAttribute('hidden');

  // Handle confirm
  const confirmHandler = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    closeModal();
  };

  // Handle cancel
  const cancelHandler = () => {
    closeModal();
  };

  // Handle overlay click
  const overlayHandler = (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  };

  // Clean up previous handlers
  modalConfirmBtn.onclick = confirmHandler;
  modalCancelBtn.onclick = cancelHandler;
  modalCloseBtn.onclick = cancelHandler;
  modalOverlay.onclick = overlayHandler;

  // Handle escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

/**
 * Close the modal
 */
function closeModal() {
  const modal = document.getElementById('confirmModal');
  modal.setAttribute('hidden', '');
}

// ============ UTILITY FUNCTIONS ============

/**
 * Calculate minutes between two times
 */
function minutesBetween(dateStr, inTime, outTime) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h1, mm1] = inTime.split(':').map(Number);
  const [h2, mm2] = outTime.split(':').map(Number);
  
  let inDate = new Date(y, m - 1, d, h1, mm1);
  let outDate = new Date(y, m - 1, d, h2, mm2);
  
  if (outDate < inDate) {
    outDate.setDate(outDate.getDate() + 1);
  }
  
  return Math.round((outDate - inDate) / 60000);
}

/**
 * Format minutes to hours and minutes
 */
function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/**
 * Format minutes to decimal hours
 */
function formatHours(mins) {
  return (mins / 60).toFixed(1);
}

/**
 * Convert 24hr time to 12hr AM/PM format
 */
function format12HourTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// ============ DATA MANAGEMENT ============

/**
 * Load clock state
 */
function loadClockState() {
  try {
    const data = localStorage.getItem(CLOCK_STATE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Load clock state error:', error);
    return null;
  }
}

/**
 * Save clock state
 */
function saveClockState(state) {
  try {
    if (state === null) {
      localStorage.removeItem(CLOCK_STATE_KEY);
    } else {
      localStorage.setItem(CLOCK_STATE_KEY, JSON.stringify(state));
    }
  } catch (error) {
    console.error('Save clock state error:', error);
  }
}

/**
 * Load all entries
 */
function loadEntries() {
  try {
    const data = localStorage.getItem(ENTRIES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Load entries error:', error);
    return [];
  }
}

/**
 * Save all entries
 */
function saveEntries(entries) {
  try {
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Save entries error:', error);
    showToast('Failed to save entries', 'error');
  }
}

/**
 * Add new entry
 */
function addEntry(e) {
  e.preventDefault();
  
  try {
    const date = document.getElementById('date').value;
    const timeIn = document.getElementById('timeIn').value;
    const timeOut = document.getElementById('timeOut').value;
    
    if (!date || !timeIn || !timeOut) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    const entries = loadEntries();
    const id = Date.now().toString();
    const duration = minutesBetween(date, timeIn, timeOut);
    
    entries.push({
      id,
      date,
      timeIn,
      timeOut,
      duration,
      createdAt: new Date().toISOString()
    });
    
    saveEntries(entries);
    renderEntries();
    updateStats();
    updateLastSync();
    document.getElementById('entryForm').reset();
    document.getElementById('date').valueAsDate = new Date();
    showToast('Entry added successfully');
  } catch (error) {
    console.error('Add entry error:', error);
    showToast('Error adding entry', 'error');
  }
}

/**
 * Delete entry with modal confirmation
 */
function deleteEntry(entryId) {
  try {
    showModal(
      'Delete Entry',
      'Are you sure you want to delete this time entry? This action cannot be undone.',
      () => {
        const entries = loadEntries();
        const index = entries.findIndex(e => e.id === entryId);
        
        if (index === -1) {
          showToast('Entry not found', 'error');
          return;
        }
        
        entries.splice(index, 1);
        saveEntries(entries);
        renderEntries();
        updateStats();
        showToast('Entry deleted successfully');
      },
      { confirmText: 'Delete', cancelText: 'Keep Entry', isDangerous: true }
    );
  } catch (error) {
    console.error('Delete entry error:', error);
    showToast('Error deleting entry', 'error');
  }
}

/**
 * Clear all entries with confirmation
 */
function clearAll() {
  showModal(
    'Clear All Entries',
    'Are you sure you want to delete ALL entries? This cannot be undone.',
    () => {
      try {
        saveEntries([]);
        renderEntries();
        updateStats();
        showToast('All entries cleared');
      } catch (error) {
        console.error('Clear entries error:', error);
        showToast('Error clearing entries', 'error');
      }
    },
    { confirmText: 'Delete All', cancelText: 'Cancel', isDangerous: true }
  );
}

// ============ UI RENDERING ============

/**
 * Render all entries
 */
function renderEntries() {
  const entries = loadEntries();
  const container = document.getElementById('entriesContainer');
  
  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-state">No entries yet. Add your first entry above!</p>';
    return;
  }
  
  container.innerHTML = entries
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(entry => {
      const date = new Date(entry.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeInDisplay = format12HourTime(entry.timeIn);
      const timeOutDisplay = format12HourTime(entry.timeOut);
      const durationDisplay = formatDuration(entry.duration);
      
      return `
        <div class="entry">
          <div class="entry-date">${date}</div>
          <div class="entry-times">
            <div class="entry-time">
              <span class="entry-label">In:</span>
              <span>${timeInDisplay}</span>
            </div>
            <div class="entry-time">
              <span class="entry-label">Out:</span>
              <span>${timeOutDisplay}</span>
            </div>
          </div>
          <div class="entry-duration">${durationDisplay}</div>
          <button class="btn btn-sm btn-danger" onclick="deleteEntry('${entry.id}')">🗑️ Delete</button>
        </div>
      `;
    })
    .join('');
}

/**
 * Update statistics
 */
function updateStats() {
  const entries = loadEntries();
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
  const totalHours = formatHours(totalMinutes);
  const avgDaily = entries.length > 0 ? formatHours(totalMinutes / entries.length) : '0.0';
  
  document.getElementById('totalHours').textContent = `${totalHours}h`;
  document.getElementById('totalEntries').textContent = entries.length;
  document.getElementById('avgDaily').textContent = `${avgDaily}h`;
}

/**
 * Update last sync time
 */
function updateLastSync() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  document.getElementById('lastSync').textContent = timeStr;
}

/**
 * Setup time display updates
 */
function setupDurationCalculation() {
  const timeInInput = document.getElementById('timeIn');
  const timeOutInput = document.getElementById('timeOut');
  const dateInput = document.getElementById('date');
  const durationInput = document.getElementById('duration');
  
  const updateDisplay = () => {
    const timeIn = timeInInput.value;
    const timeOut = timeOutInput.value;
    const date = dateInput.value;
    
    if (timeIn && timeOut && date) {
      const minutes = minutesBetween(date, timeIn, timeOut);
      durationInput.value = formatDuration(minutes);
    } else {
      durationInput.value = '';
    }
    
    // Update time displays
    document.getElementById('timeInDisplay').textContent = format12HourTime(timeIn);
    document.getElementById('timeOutDisplay').textContent = format12HourTime(timeOut);
  };
  
  timeInInput.addEventListener('change', updateDisplay);
  timeOutInput.addEventListener('change', updateDisplay);
  dateInput.addEventListener('change', updateDisplay);
}

// ============ REPORT FUNCTIONS ============

/**
 * Generate and display report
 */
function generateReport() {
  const entries = loadEntries();
  
  if (entries.length === 0) {
    showToast('No entries to report', 'error');
    return;
  }
  
  const reportTable = document.getElementById('reportTable');
  const tbody = reportTable.querySelector('tbody');
  
  tbody.innerHTML = entries
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(entry => `
      <tr>
        <td>${new Date(entry.date + 'T00:00').toLocaleDateString()}</td>
        <td>${format12HourTime(entry.timeIn)}</td>
        <td>${format12HourTime(entry.timeOut)}</td>
        <td>${formatDuration(entry.duration)}</td>
      </tr>
    `)
    .join('');
  
  document.getElementById('reportCard').removeAttribute('hidden');
  document.getElementById('printBtn').removeAttribute('hidden');
  showToast('Report generated');
}

/**
 * Print report
 */
function printReport() {
  window.print();
}

/**
 * Export to CSV
 */
function exportCSV() {
  const entries = loadEntries();
  
  if (entries.length === 0) {
    showToast('No entries to export', 'error');
    return;
  }
  
  const headers = ['Date', 'Time In', 'Time Out', 'Duration (hours)'];
  const rows = entries.map(e => [
    new Date(e.date + 'T00:00').toLocaleDateString(),
    format12HourTime(e.timeIn),
    format12HourTime(e.timeOut),
    formatHours(e.duration)
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dtr_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  showToast('CSV exported successfully');
}

// ============ CLOCK IN/OUT FUNCTIONS ============

/**
 * Update clock UI based on state
 */
function updateClockUI() {
  const state = loadClockState();
  const clockInBtn = document.getElementById('clockInBtn');
  const clockOutBtn = document.getElementById('clockOutBtn');
  const statusText = document.querySelector('.status-text');
  const clockedInTime = document.getElementById('clockedInTime');
  
  if (state && state.clockedIn) {
    // User is clocked in
    clockInBtn.disabled = true;
    clockOutBtn.disabled = false;
    statusText.textContent = 'Clocked in';
    
    const clockInDate = new Date(state.timeIn);
    const timeStr = clockInDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = clockInDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    clockedInTime.textContent = `${dateStr} at ${timeStr}`;
  } else {
    // User is not clocked in
    clockInBtn.disabled = false;
    clockOutBtn.disabled = true;
    statusText.textContent = 'Ready to clock in';
    clockedInTime.textContent = '';
  }
}

/**
 * Handle clock in
 */
function clockIn() {
  try {
    const now = new Date();
    const state = {
      clockedIn: true,
      date: now.toISOString().split('T')[0],
      timeIn: now.toISOString()
    };
    
    saveClockState(state);
    updateClockUI();
    showToast('Clocked in successfully');
  } catch (error) {
    console.error('Clock in error:', error);
    showToast('Error clocking in', 'error');
  }
}

/**
 * Handle clock out
 */
function clockOut() {
  try {
    const state = loadClockState();
    
    if (!state || !state.clockedIn) {
      showToast('You must clock in first', 'error');
      return;
    }
    
    const now = new Date();
    const clockInDate = new Date(state.timeIn);
    
    // Format times for entry
    const date = state.date;
    const timeIn = clockInDate.toTimeString().slice(0, 5); // HH:MM format
    const timeOut = now.toTimeString().slice(0, 5); // HH:MM format
    
    // Calculate duration
    const duration = minutesBetween(date, timeIn, timeOut);
    
    // Add entry
    const entries = loadEntries();
    const id = Date.now().toString();
    
    entries.push({
      id,
      date,
      timeIn,
      timeOut,
      duration,
      createdAt: new Date().toISOString()
    });
    
    saveEntries(entries);
    
    // Clear clock state
    saveClockState(null);
    
    // Update UI
    renderEntries();
    updateStats();
    updateLastSync();
    updateClockUI();
    
    showToast('Clocked out successfully');
  } catch (error) {
    console.error('Clock out error:', error);
    showToast('Error clocking out', 'error');
  }
}

// ============ INITIALIZATION ============

window.addEventListener('load', () => {
  // Initialize form
  document.getElementById('entryForm').addEventListener('submit', addEntry);
  document.getElementById('generateBtn').addEventListener('click', generateReport);
  document.getElementById('printBtn').addEventListener('click', printReport);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('clearBtn').addEventListener('click', clearAll);
  
  // Initialize clock in/out buttons
  document.getElementById('clockInBtn').addEventListener('click', clockIn);
  document.getElementById('clockOutBtn').addEventListener('click', clockOut);
  
  // Set today's date
  document.getElementById('date').valueAsDate = new Date();
  
  // Initial render
  renderEntries();
  updateStats();
  updateLastSync();
  updateClockUI();
  setupDurationCalculation();
});
