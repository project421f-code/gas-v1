function initApp() {
  // Set user info
  var avatar = document.getElementById('user-avatar');
  var name = document.getElementById('user-name');
  var role = document.getElementById('user-role');
  if (avatar && APP.user) avatar.textContent = (APP.user.nama || 'U')[0].toUpperCase();
  if (name && APP.user) name.textContent = APP.user.nama || 'User';
  if (role && APP.user) role.textContent = (APP.user.role || 'Staff') + ' \u2022 ' + (APP.user.tim || '-');

  // Show layout
  var layout = document.getElementById('app-layout');
  if (layout) layout.classList.add('show');

  // Load default page
  showPage('dashboard');

  // Load open ticket badge
  loadOpenTicketBadge();
}

// ════════════════════════════════════════════════════════════
// PAGE ROUTER
// ════════════════════════════════════════════════════════════
function showPage(page, el) {
  APP.currentPage = page;

  // Close mobile sheet
  closeMobileSheet();

  // Update active nav (sidebar)
  var navs = document.querySelectorAll('.nav-item');
  for (var i = 0; i < navs.length; i++) navs[i].classList.remove('active');
  if (el) el.classList.add('active');

  // Update active bottom nav
  updateBottomNav(page);

  var content = document.getElementById('main-content');
  if (!content) return;

  switch(page) {
    case 'dashboard': renderDashboard(content); break;
    case 'assets': renderAssets(content); break;
    case 'survey': renderSurvey(content); break;
    case 'inbox': renderInbox(content); break;
    case 'guests': renderGuests(content); break;
    case 'maintenance': renderMaintenance(content); break;
    case 'patrol': renderPatrol(content); break;
    case 'housekeeping': renderHousekeeping(content); break;
    case 'users': renderUsers(content); break;
    case 'mastersla': renderMasterSLA(content); break;
    case 'kpimnt': renderKPIMnt(content); break;
    case 'kpisec': renderKPISec(content); break;
    case 'kpihk': renderKPIHK(content); break;
    case 'checkpoints': renderCheckpoints(content); break;
    case 'schedules': renderSchedules(content); break;
    case 'booking': renderBooking(content); break;
    case 'assetlist': renderAssetList(content); break;
    case 'checklist': renderChecklist(content); break;
    case 'audit': renderAudit(content); break;
    case 'gc': renderGeneralCleaning(content); break;
    case 'masterkos': renderMasterKos(content); break;
    case 'masterkamar': renderMasterKamar(content); break;
    case 'guestbooking': renderGuestBooking(content); break;
    case 'roomstatus': renderRoomStatus(content); break;
    case 'surveyconfig': renderSurveyConfig(content); break;
    case 'settings': renderSettings(content); break;
    case 'inspection': renderAssets(content); break;
    default: renderDashboard(content);
  }
}

// ════════════════════════════════════════════════════════════
// MOBILE NAV — Functions
// ════════════════════════════════════════════════════════════
function navigateToPage(page) {
  // Map bottom nav pages to sidebar nav items
  var navMap = {
    'dashboard': 0, 'maintenance': 1, 'mastersla': 2, 'kpimnt': 3, 'survey': 4,
    'patrol': 5, 'inspection': 6, 'kpisec': 7, 'checkpoints': 8, 'schedules': 9,
    'assets': 10, 'booking': 11, 'assetlist': 12,
    'housekeeping': 13, 'checklist': 14, 'audit': 15, 'gc': 16, 'kpihk': 17,
    'guests': 18, 'inbox': 19, 'masterkos': 20, 'masterkamar': 21,
    'guestbooking': 22, 'roomstatus': 23,
    'users': 24, 'surveyconfig': 25, 'settings': 26
  };
  var idx = navMap[page];
  var navs = document.querySelectorAll('.nav-item');
  var el = (idx !== undefined && navs[idx]) ? navs[idx] : null;
  closeMobileSheet();
  showPage(page, el);
}

function updateBottomNav(page) {
  var items = document.querySelectorAll('#bottom-nav .bnav-item');
  items.forEach(function(item) {
    item.classList.toggle('active', item.getAttribute('data-page') === page);
  });
}

function toggleMobileMenu() {
  var sheet = document.getElementById('mobile-menu-sheet');
  var overlay = document.getElementById('mobile-menu-overlay');
  var isOpen = sheet.classList.contains('show');
  if (!isOpen) {
    var grid = document.getElementById('mobile-sheet-grid');
    if (grid && grid.children.length === 0) generateMobileMenu();
  }
  sheet.classList.toggle('show');
  overlay.classList.toggle('show');
}

function closeMobileSheet() {
  var sheet = document.getElementById('mobile-menu-sheet');
  var overlay = document.getElementById('mobile-menu-overlay');
  if (sheet) sheet.classList.remove('show');
  if (overlay) overlay.classList.remove('show');
}

function generateMobileMenu() {
  var allMenus = [
    { page: 'dashboard', icon: '🏠', label: 'Dashboard', roles: null },
    { page: 'maintenance', icon: '🔧', label: 'Tiket', roles: null },
    { page: 'patrol', icon: '🛡️', label: 'Patroli', roles: null },
    { page: 'assets', icon: '📋', label: 'Aset', roles: null },
    { page: 'survey', icon: '⭐', label: 'Survey', roles: null },
    { page: 'inbox', icon: '📥', label: 'Pesanan', roles: null },
    { page: 'guests', icon: '🏘️', label: 'Tamu Kos', roles: null },
    { page: 'housekeeping', icon: '🧹', label: 'Housekeep', roles: null },
    { page: 'checklist', icon: '✅', label: 'Checklist', roles: null },
    { page: 'booking', icon: '📅', label: 'Booking', roles: null },
    { page: 'kpimnt', icon: '📈', label: 'KPI Mnt', roles: ['Admin'] },
    { page: 'kpisec', icon: '📈', label: 'KPI Sec', roles: ['Admin'] },
    { page: 'kpihk', icon: '📈', label: 'KPI HK', roles: ['Admin'] },
    { page: 'checkpoints', icon: '📍', label: 'Checkpoint', roles: ['Admin'] },
    { page: 'schedules', icon: '📋', label: 'Jadwal', roles: ['Admin'] },
    { page: 'assetlist', icon: '🏷️', label: 'Master Aset', roles: ['Admin'] },
    { page: 'audit', icon: '🔍', label: 'Audit', roles: ['Admin'] },
    { page: 'gc', icon: '🧹', label: 'Gen Clean', roles: null },
    { page: 'masterkos', icon: '🏘️', label: 'Master Kos', roles: ['Admin'] },
    { page: 'masterkamar', icon: '🚪', label: 'Master Kamar', roles: ['Admin'] },
    { page: 'guestbooking', icon: '📋', label: 'Guest Book', roles: ['Admin'] },
    { page: 'roomstatus', icon: '🔄', label: 'R.Status', roles: ['Admin'] },
    { page: 'surveyconfig', icon: '📋', label: 'Konfig Survey', roles: ['Admin'] },
    { page: 'users', icon: '👥', label: 'Users', roles: ['Admin'] },
    { page: 'mastersla', icon: '⏱️', label: 'SLA', roles: ['Admin'] },
    { page: 'settings', icon: '⚙️', label: 'Settings', roles: ['Admin'] }
  ];
  var userRole = APP.user ? APP.user.role : null;
  var grid = document.getElementById('mobile-sheet-grid');
  if (!grid) return;
  allMenus.forEach(function(m) {
    if (m.roles && userRole && m.roles.indexOf(userRole) === -1) return;
    var btn = document.createElement('button');
    btn.className = 'mobile-sheet-item';
    btn.innerHTML = '<span class="ms-icon">' + m.icon + '</span>' + m.label;
    btn.onclick = function() { navigateToPage(m.page); };
    grid.appendChild(btn);
  });

  // Add separator + dark mode + logout at bottom
  var sep = document.createElement('div');
  sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.06);margin:12px 0 8px';
  grid.parentNode.appendChild(sep);

  var bottomRow = document.createElement('div');
  bottomRow.style.cssText = 'display:flex;gap:8px;margin-top:4px';

  // Dark mode toggle
  var dmBtn = document.createElement('button');
  dmBtn.className = 'mobile-sheet-item';
  dmBtn.style.cssText = 'flex:1;flex-direction:row;justify-content:center;padding:12px 8px';
  dmBtn.innerHTML = '<span class="ms-icon" id="ms-dark-icon">' + (APP.darkMode ? '\u2600\uFE0F' : '\uD83C\uDF19') + '</span><span id="ms-dark-label">' + (APP.darkMode ? 'Mode Terang' : 'Mode Gelap') + '</span>';
  dmBtn.onclick = function() { toggleDarkMode(); closeMobileSheet(); };
  bottomRow.appendChild(dmBtn);

  // Logout
  var loBtn = document.createElement('button');
  loBtn.className = 'mobile-sheet-item';
  loBtn.style.cssText = 'flex:1;flex-direction:row;justify-content:center;padding:12px 8px;color:#ef4444';
  loBtn.innerHTML = '<span class="ms-icon">\uD83D\uDEAA</span>Logout';
  loBtn.onclick = function() { closeMobileSheet(); doLogout(); };
  bottomRow.appendChild(loBtn);

  grid.parentNode.appendChild(bottomRow);
}

// ════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ════════════════════════════════════════════════════════════
