// ════════════════════════════════════════════════════════════
// SUPABASE CLIENT — Direct REST API via fetch() (no CDN needed)
// ════════════════════════════════════════════════════════════
var SUPABASE_URL = 'https://ytoopikqfmiomgfzhoem.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0b29waWtxZm1pb21nZnpob2VtIiwicm9sZSEiOiJhbm9uIiwiaWF0IjoxNzg0NjQ3ODM4LCJleHAiOjIxMDAyMjM4Mzh9.64f5RJm2eVGmYd2PlIM125brirxNP0eG-YfX8NT-pls';

var supabaseReady = true;
var _supabaseAccessToken = null;

// ── Helper: build auth headers ──
function _supabaseHeaders() {
  var h = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  if (_supabaseAccessToken) {
    h['Authorization'] = 'Bearer ' + _supabaseAccessToken;
  }
  return h;
}

// ── Auth: Sign In ──
async function _supabaseSignIn(email, password) {
  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await res.json();
    if (res.ok && data.access_token) {
      _supabaseAccessToken = data.access_token;
      // Store session in localStorage for persistence
      try {
        localStorage.setItem('ga_supabase_session', JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000
        }));
      } catch(e) { /* localStorage may be full */ }
      return { data: { session: { user: data.user, access_token: data.access_token } }, error: null };
    }
    return { data: null, error: { message: data.error_description || data.msg || data.error || 'Login failed' } };
  } catch(e) {
    return { data: null, error: { message: e.message || 'Network error' } };
  }
}

// ── Auth: Get Session ──
async function _supabaseGetSession() {
  // First try stored session
  try {
    var stored = localStorage.getItem('ga_supabase_session');
    if (stored) {
      var session = JSON.parse(stored);
      if (session.access_token && session.expires_at > Date.now()) {
        _supabaseAccessToken = session.access_token;
        return { data: { session: { user: session.user, access_token: session.access_token } } };
      }
    }
  } catch(e) { /* ignore */ }

  // Try to get session from URL hash (PKCE flow)
  var hash = window.location.hash;
  if (hash) {
    var params = new URLSearchParams(hash.substring(1));
    var token = params.get('access_token');
    if (token) {
      _supabaseAccessToken = token;
      // Decode JWT to get user info
      try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        var user = { email: payload.email, id: payload.sub, aud: payload.aud };
        return { data: { session: { user: user, access_token: token } } };
      } catch(e) { /* ignore */ }
    }
  }

  return { data: { session: null } };
}

// ── Auth: Sign Out ──
async function _supabaseSignOut() {
  _supabaseAccessToken = null;
  try {
    localStorage.removeItem('ga_supabase_session');
  } catch(e) { /* ignore */ }
  // Attempt server-side signout (ignore if fails)
  try {
    await fetch(SUPABASE_URL + '/auth/v1/logout', {
      method: 'POST',
      headers: _supabaseHeaders()
    });
  } catch(e) { /* ignore */ }
  return { error: null };
}

// ── Query Builder — chained methods ──
function _createQuery(tableName) {
  var filters = [];
  var orderBy = null;
  var orderAsc = true;
  var limitVal = null;
  var selectStr = '*';
  var singleMode = false;
  var countMode = null;

  var q = {
    // SELECT
    select: function(cols) {
      selectStr = cols || '*';
      return q;
    },
    // FILTERS
    eq: function(col, val) {
      filters.push(col + '=eq.' + encodeURIComponent(val));
      return q;
    },
    neq: function(col, val) {
      filters.push(col + '=neq.' + encodeURIComponent(val));
      return q;
    },
    gt: function(col, val) {
      filters.push(col + '=gt.' + encodeURIComponent(val));
      return q;
    },
    gte: function(col, val) {
      filters.push(col + '=gte.' + encodeURIComponent(val));
      return q;
    },
    lt: function(col, val) {
      filters.push(col + '=lt.' + encodeURIComponent(val));
      return q;
    },
    lte: function(col, val) {
      filters.push(col + '=lte.' + encodeURIComponent(val));
      return q;
    },
    like: function(col, val) {
      filters.push(col + '=like.' + encodeURIComponent(val));
      return q;
    },
    ilike: function(col, val) {
      filters.push(col + '=ilike.' + encodeURIComponent(val));
      return q;
    },
    is: function(col, val) {
      filters.push(col + '=is.' + encodeURIComponent(val));
      return q;
    },
    in: function(col, vals) {
      filters.push(col + '=in.(' + vals.map(function(v) { return encodeURIComponent(v); }).join(',') + ')');
      return q;
    },
    contains: function(col, val) {
      if (Array.isArray(val)) {
        filters.push(col + '=cs.{}' + encodeURIComponent(val.join(',')) + '');
      } else if (typeof val === 'object') {
        filters.push(col + '=cs.' + encodeURIComponent(JSON.stringify(val)));
      } else {
        filters.push(col + '=cs.' + encodeURIComponent(val));
      }
      return q;
    },
    not: function(col, op, val) {
      filters.push(col + '=not.' + op + '.' + encodeURIComponent(val));
      return q;
    },
    // ORDER
    order: function(col, opts) {
      orderBy = col;
      orderAsc = opts && opts.ascending !== undefined ? opts.ascending : true;
      return q;
    },
    // LIMIT
    limit: function(n) {
      limitVal = n;
      return q;
    },
    // SINGLE
    single: function() {
      singleMode = true;
      return q;
    },
    // COUNT (head mode)
    count: function(mode) {
      countMode = mode || 'exact';
      return q;
    },
    // EXECUTE SELECT
    then: function(resolve, reject) {
      return _executeQuery('GET').then(resolve).catch(reject);
    },
    // INSERT
    insert: async function(data) {
      var url = SUPABASE_URL + '/rest/v1/' + tableName + '?select=' + encodeURIComponent(selectStr);
      try {
        var res = await fetch(url, {
          method: 'POST',
          headers: Object.assign({}, _supabaseHeaders(), { 'Prefer': 'return=representation' }),
          body: JSON.stringify(data)
        });
        var result = await res.json();
        if (!res.ok) return { data: null, error: { message: result.message || result.details || 'Insert failed', details: result } };
        return { data: Array.isArray(result) ? result : [result], error: null };
      } catch(e) {
        return { data: null, error: { message: e.message || 'Network error' } };
      }
    },
    // UPSERT
    upsert: async function(data) {
      var url = SUPABASE_URL + '/rest/v1/' + tableName + '?select=' + encodeURIComponent(selectStr);
      try {
        var res = await fetch(url, {
          method: 'POST',
          headers: Object.assign({}, _supabaseHeaders(), { 'Prefer': 'resolution=merge-duplicates,return=representation' }),
          body: JSON.stringify(data)
        });
        var result = await res.json();
        if (!res.ok) return { data: null, error: { message: result.message || result.details || 'Upsert failed', details: result } };
        return { data: Array.isArray(result) ? result : [result], error: null };
      } catch(e) {
        return { data: null, error: { message: e.message || 'Network error' } };
      }
    },
    // UPDATE
    update: async function(data) {
      var url = SUPABASE_URL + '/rest/v1/' + tableName + '?' + filters.join('&') + '&select=' + encodeURIComponent(selectStr);
      try {
        var res = await fetch(url, {
          method: 'PATCH',
          headers: Object.assign({}, _supabaseHeaders(), { 'Prefer': 'return=representation' }),
          body: JSON.stringify(data)
        });
        var result = await res.json();
        if (!res.ok) return { data: null, error: { message: result.message || result.details || 'Update failed', details: result } };
        return { data: Array.isArray(result) ? result : [result], error: null };
      } catch(e) {
        return { data: null, error: { message: e.message || 'Network error' } };
      }
    },
    // DELETE
    delete: async function(opts) {
      var url = SUPABASE_URL + '/rest/v1/' + tableName + '?' + filters.join('&');
      try {
        var res = await fetch(url, { method: 'DELETE', headers: _supabaseHeaders() });
        if (!res.ok) {
          var errData = await res.json().catch(function() { return {}; });
          return { data: null, error: { message: errData.message || 'Delete failed', details: errData } };
        }
        return { data: null, error: null };
      } catch(e) {
        return { data: null, error: { message: e.message || 'Network error' } };
      }
    }
  };

  // Internal: execute GET query
  async function _executeQuery(method) {
    var params = [];
    params.push('select=' + encodeURIComponent(selectStr));
    filters.forEach(function(f) { params.push(f); });
    if (orderBy) params.push('order=' + encodeURIComponent(orderBy) + (orderAsc ? '.asc' : '.desc'));
    if (limitVal) params.push('limit=' + limitVal);
    if (countMode) params.push('count=' + countMode);

    var url = SUPABASE_URL + '/rest/v1/' + tableName + '?' + params.join('&');
    try {
      var res = await fetch(url, {
        method: method,
        headers: _supabaseHeaders()
      });
      var text = await res.text();
      var result = text ? JSON.parse(text) : null;
      if (!res.ok) return { data: null, error: { message: result && result.message || result && result.details || 'Query failed', details: result } };

      if (countMode && res.headers.get('content-range')) {
        var range = res.headers.get('content-range').split('/');
        var count = parseInt(range[1], 10);
        return { data: result, count: count, error: null };
      }
      if (singleMode) {
        if (!result || result.length === 0) return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
        if (result.length > 1) return { data: null, error: { message: 'Multiple rows returned', code: 'PGRST116' } };
        return { data: result[0], error: null };
      }
      return { data: result || [], error: null };
    } catch(e) {
      return { data: null, error: { message: e.message || 'Network error' } };
    }
  }

  return q;
}

// ════════════════════════════════════════════════════════════
// PUBLIC INTERFACE
// ════════════════════════════════════════════════════════════
var supabase = {
  // Auth
  auth: {
    signInWithPassword: function(opts) {
      return _supabaseSignIn(opts.email, opts.password);
    },
    getSession: function() {
      return _supabaseGetSession();
    },
    signOut: function() {
      return _supabaseSignOut();
    }
  },
  // Query builder
  from: function(tableName) {
    return _createQuery(tableName);
  }
};

// ════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════
var APP = { user: null, currentPage: 'dashboard', charts: {}, surveyTab: 'garating' };
