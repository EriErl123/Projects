/**
 * DTR Mobile App - Personal Time Tracking
 * Simple single-user app with localStorage
 */

// ============ STORAGE KEY ============
const ENTRIES_STORAGE_KEY = 'dtr_entries_v1';
const CLOCK_STATE_KEY = 'dtr_clock_state_v1';

// ============ PAGINATION STATE ============
let currentPage = 1;
const DATES_PER_PAGE = 5; // Number of date groups to show per page

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
 * Render all entries with table layout and pagination
 */
function renderEntries() {
  const entries = loadEntries();
  const container = document.getElementById('entriesContainer');
  
  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-state">No entries yet. Add your first entry above!</p>';
    document.getElementById('paginationControls').style.display = 'none';
    return;
  }
  
  // Group entries by date
  const groupedEntries = {};
  entries.forEach(entry => {
    if (!groupedEntries[entry.date]) {
      groupedEntries[entry.date] = [];
    }
    groupedEntries[entry.date].push(entry);
  });
  
  // Sort dates (newest first)
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b) - new Date(a));
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedDates.length / DATES_PER_PAGE);
  const startIndex = (currentPage - 1) * DATES_PER_PAGE;
  const endIndex = startIndex + DATES_PER_PAGE;
  const datesToShow = sortedDates.slice(startIndex, endIndex);
  
  // Render entries for current page
  container.innerHTML = datesToShow.map(date => {
    const dateEntries = groupedEntries[date];
    const dateFormatted = new Date(date + 'T00:00').toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const totalDayMinutes = dateEntries.reduce((sum, e) => sum + e.duration, 0);
    const totalDayDisplay = formatDuration(totalDayMinutes);
    
    return `
      <div class="entry-group">
        <div class="entry-group-header">
          <span class="entry-group-date">${dateFormatted}</span>
          <span class="entry-group-total">Total: ${totalDayDisplay}</span>
        </div>
        <div class="entry-table">
          <div class="entry-table-header">
            <div class="entry-table-cell">Time In</div>
            <div class="entry-table-cell">Time Out</div>
            <div class="entry-table-cell">Duration</div>
            <div class="entry-table-cell">Action</div>
          </div>
          ${dateEntries.map((entry, index) => {
            const timeInDisplay = format12HourTime(entry.timeIn);
            const timeOutDisplay = format12HourTime(entry.timeOut);
            const durationDisplay = formatDuration(entry.duration);
            
            // Determine period based on actual time
            const [hours] = entry.timeIn.split(':').map(Number);
            let period;
            if (hours >= 5 && hours < 12) {
              period = 'Morning';
            } else if (hours >= 12 && hours < 17) {
              period = 'Afternoon';
            } else if (hours >= 17 && hours < 21) {
              period = 'Evening';
            } else {
              period = 'Night';
            }
            
            return `
              <div class="entry-table-row">
                <div class="entry-table-cell" data-label="Time In">
                  <span class="entry-period">${period}</span>
                  <span class="time-value">${timeInDisplay}</span>
                </div>
                <div class="entry-table-cell" data-label="Time Out">
                  <span class="time-value">${timeOutDisplay}</span>
                </div>
                <div class="entry-table-cell" data-label="Duration">
                  <span class="duration-value">${durationDisplay}</span>
                </div>
                <div class="entry-table-cell" data-label="Action">
                  <button class="btn btn-sm btn-danger" onclick="deleteEntry('${entry.id}')" title="Delete">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Render pagination controls
  renderPaginationControls(totalPages, sortedDates.length);
}

/**
 * Render pagination controls
 */
function renderPaginationControls(totalPages, totalDates) {
  const paginationContainer = document.getElementById('paginationControls');
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  const startDate = (currentPage - 1) * DATES_PER_PAGE + 1;
  const endDate = Math.min(currentPage * DATES_PER_PAGE, totalDates);
  
  let paginationHTML = `
    <div class="pagination-info">
      Showing ${startDate}-${endDate} of ${totalDates} dates
    </div>
    <div class="pagination-buttons">
      <button 
        class="btn btn-sm btn-secondary pagination-btn" 
        onclick="goToPage(1)" 
        ${currentPage === 1 ? 'disabled' : ''}
        title="First Page"
      >
        ⏮️
      </button>
      <button 
        class="btn btn-sm btn-secondary pagination-btn" 
        onclick="previousPage()" 
        ${currentPage === 1 ? 'disabled' : ''}
        title="Previous Page"
      >
        ◀️ Prev
      </button>
  `;
  
  // Generate page numbers
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  
  // Adjust start if we're near the end
  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }
  
  // Show first page and ellipsis if needed
  if (startPage > 1) {
    paginationHTML += `
      <button class="btn btn-sm btn-secondary pagination-btn page-number" onclick="goToPage(1)">1</button>
    `;
    if (startPage > 2) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
  }
  
  // Show page numbers
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button 
        class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'} pagination-btn page-number" 
        onclick="goToPage(${i})"
        ${i === currentPage ? 'disabled' : ''}
      >
        ${i}
      </button>
    `;
  }
  
  // Show last page and ellipsis if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
    paginationHTML += `
      <button class="btn btn-sm btn-secondary pagination-btn page-number" onclick="goToPage(${totalPages})">${totalPages}</button>
    `;
  }
  
  paginationHTML += `
      <button 
        class="btn btn-sm btn-secondary pagination-btn" 
        onclick="nextPage()" 
        ${currentPage === totalPages ? 'disabled' : ''}
        title="Next Page"
      >
        Next ▶️
      </button>
      <button 
        class="btn btn-sm btn-secondary pagination-btn" 
        onclick="goToPage(${totalPages})" 
        ${currentPage === totalPages ? 'disabled' : ''}
        title="Last Page"
      >
        ⏭️
      </button>
    </div>
  `;
  
  paginationContainer.innerHTML = paginationHTML;
}

/**
 * Go to specific page
 */
function goToPage(page) {
  const entries = loadEntries();
  const groupedEntries = {};
  entries.forEach(entry => {
    if (!groupedEntries[entry.date]) {
      groupedEntries[entry.date] = [];
    }
    groupedEntries[entry.date].push(entry);
  });
  const totalDates = Object.keys(groupedEntries).length;
  const totalPages = Math.ceil(totalDates / DATES_PER_PAGE);
  
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderEntries();
  
  // Scroll to entries section
  document.getElementById('entriesContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Go to next page
 */
function nextPage() {
  goToPage(currentPage + 1);
}

/**
 * Go to previous page
 */
function previousPage() {
  goToPage(currentPage - 1);
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

/**
 * Import from CSV
 */
function importCSV() {
  const fileInput = document.getElementById('csvFileInput');
  fileInput.click();
}

/**
 * Parse and import CSV file
 */
function parseCSVFile(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        showToast('CSV file is empty or invalid', 'error');
        return;
      }
      
      // Skip header line
      const dataLines = lines.slice(1);
      const importedEntries = [];
      const errors = [];
      
      dataLines.forEach((line, index) => {
        try {
          // Parse CSV line (handle quoted values)
          const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
          const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
          
          if (cleanValues.length < 3) {
            errors.push(`Line ${index + 2}: Insufficient data`);
            return;
          }
          
          const [dateStr, timeInStr, timeOutStr] = cleanValues;
          
          // Parse date (support multiple formats)
          const date = parseImportDate(dateStr);
          if (!date) {
            errors.push(`Line ${index + 2}: Invalid date format "${dateStr}"`);
            return;
          }
          
          // Parse times (support 12-hour and 24-hour formats)
          const timeIn = parseImportTime(timeInStr);
          const timeOut = parseImportTime(timeOutStr);
          
          if (!timeIn || !timeOut) {
            errors.push(`Line ${index + 2}: Invalid time format`);
            return;
          }
          
          const duration = minutesBetween(date, timeIn, timeOut);
          
          if (duration <= 0) {
            errors.push(`Line ${index + 2}: Invalid duration (time out must be after time in)`);
            return;
          }
          
          // Generate unique ID using timestamp and random component
          const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          importedEntries.push({
            id: uniqueId,
            date,
            timeIn,
            timeOut,
            duration,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          errors.push(`Line ${index + 2}: ${err.message}`);
        }
      });
      
      if (importedEntries.length === 0) {
        showToast('No valid entries found in CSV', 'error');
        if (errors.length > 0) {
          console.error('Import errors:', errors);
        }
        return;
      }
      
      // Show confirmation modal
      showModal(
        'Import CSV Data',
        `Found ${importedEntries.length} valid entries.${errors.length > 0 ? ` ${errors.length} entries had errors and were skipped.` : ''} Do you want to import these entries?`,
        () => {
          const currentEntries = loadEntries();
          const mergedEntries = [...currentEntries, ...importedEntries];
          saveEntries(mergedEntries);
          renderEntries();
          updateStats();
          updateLastSync();
          showToast(`Successfully imported ${importedEntries.length} entries`);
        },
        { confirmText: 'Import', cancelText: 'Cancel', isDangerous: false }
      );
      
    } catch (error) {
      console.error('CSV import error:', error);
      showToast('Error reading CSV file', 'error');
    }
  };
  
  reader.onerror = () => {
    showToast('Error reading file', 'error');
  };
  
  reader.readAsText(file);
}

/**
 * Parse date from CSV (supports multiple formats)
 */
function parseImportDate(dateStr) {
  // Try parsing different date formats
  let date = null;
  
  // Format: MM/DD/YYYY or M/D/YYYY
  const usFormat = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usFormat) {
    const [, month, day, year] = usFormat;
    date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Format: YYYY-MM-DD
  const isoFormat = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoFormat) {
    date = dateStr;
  }
  
  // Format: DD/MM/YYYY or D/M/YYYY
  const euroFormat = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (euroFormat && !usFormat) {
    const [, day, month, year] = euroFormat;
    // Assume European format if day > 12
    if (parseInt(day) > 12) {
      date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Validate date
  if (date && !isNaN(new Date(date).getTime())) {
    return date;
  }
  
  return null;
}

/**
 * Parse time from CSV (supports 12-hour and 24-hour formats)
 */
function parseImportTime(timeStr) {
  timeStr = timeStr.trim();
  
  // Format: HH:MM AM/PM or H:MM AM/PM
  const time12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (time12) {
    let [, hour, minute, period] = time12;
    hour = parseInt(hour);
    minute = parseInt(minute);
    
    if (period.toUpperCase() === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  // Format: HH:MM (24-hour)
  const time24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (time24) {
    const [, hour, minute] = time24;
    const h = parseInt(hour);
    const m = parseInt(minute);
    
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }
  
  return null;
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
    const clockInDate = new Date(state.timeIn);
    
    // Validate the date
    if (isNaN(clockInDate.getTime())) {
      // Invalid date - clear corrupted state
      saveClockState(null);
      clockInBtn.disabled = false;
      clockOutBtn.disabled = true;
      statusText.textContent = 'Ready to clock in';
      clockedInTime.textContent = '';
      return;
    }
    
    clockInBtn.disabled = true;
    clockOutBtn.disabled = false;
    statusText.textContent = 'Clocked in';
    
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
    // Use local date to avoid timezone issues
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${day}`;
    
    const state = {
      clockedIn: true,
      date: localDate,
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
    
    // Validate clock in date
    if (isNaN(clockInDate.getTime())) {
      showToast('Invalid clock in time. Please clock in again.', 'error');
      saveClockState(null);
      updateClockUI();
      return;
    }
    
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
    
    // Save entries - check for success before clearing clock state
    try {
      saveEntries(entries);
    } catch (saveError) {
      console.error('Failed to save entry:', saveError);
      showToast('Failed to save time entry', 'error');
      return;
    }
    
    // Clear clock state only after successful save
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
  document.getElementById('importCsvBtn').addEventListener('click', importCSV);
  document.getElementById('clearBtn').addEventListener('click', clearAll);
  
  // Initialize clock in/out buttons
  document.getElementById('clockInBtn').addEventListener('click', clockIn);
  document.getElementById('clockOutBtn').addEventListener('click', clockOut);
  
  // Initialize CSV file input handler
  document.getElementById('csvFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      parseCSVFile(file);
      // Reset file input
      e.target.value = '';
    }
  });
  
  // Set today's date
  document.getElementById('date').valueAsDate = new Date();
  
  // Initial render
  renderEntries();
  updateStats();
  updateLastSync();
  updateClockUI();
  setupDurationCalculation();
});
