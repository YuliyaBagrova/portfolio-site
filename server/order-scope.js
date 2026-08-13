const DEMO_SHARED_SCOPE = 'demo:shared';

function parseOrderScopeQuery(query = {}) {
  const clientScope = String(query.client_scope || '').trim();
  const isDemo = String(query.is_demo || '0') === '1';
  const email = String(query.email || '').trim().toLowerCase();
  const siteUserId = Number.parseInt(String(query.site_user_id || ''), 10);
  const siteUserIdValid = Number.isInteger(siteUserId) && siteUserId > 0 ? siteUserId : null;

  return { clientScope, isDemo, email, siteUserId: siteUserIdValid };
}

function parseOrderScopeBody(body = {}) {
  const clientScope = String(body.client_scope || '').trim();
  const isDemo = body.is_demo === true
    || body.is_demo === 1
    || String(body.is_demo || '0') === '1';
  const siteUserId = Number.parseInt(String(body.site_user_id || ''), 10);
  const siteUserIdValid = Number.isInteger(siteUserId) && siteUserId > 0 ? siteUserId : null;

  return {
    clientScope: isDemo ? (clientScope || DEMO_SHARED_SCOPE) : clientScope,
    isDemo,
    siteUserId: isDemo ? null : siteUserIdValid
  };
}

function isRegisteredScope(clientScope) {
  return clientScope.startsWith('user:') || clientScope.startsWith('user-email:');
}

function isDemoScope(clientScope) {
  return clientScope === DEMO_SHARED_SCOPE || clientScope.startsWith('demo:');
}

function getRegisteredUserId(clientScope) {
  if (!clientScope.startsWith('user:')) return null;
  const userId = Number.parseInt(clientScope.slice(5), 10);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function isDemoOrderRecord(order) {
  if (!order) return false;
  if (Number(order.is_demo) === 1 || order.is_demo === true) return true;

  if (order.site_user_id == null || order.site_user_id === '') {
    return true;
  }

  const email = String(order.email || '').trim().toLowerCase();
  if (email.endsWith('@portfolio.local')) return true;

  const scope = String(order.client_scope || '').trim();
  if (scope.startsWith('demo:')) return true;

  return false;
}

function belongsToRegisteredScope(order, scope) {
  if (!order || !scope?.clientScope || !isRegisteredScope(scope.clientScope)) return false;
  if (isDemoOrderRecord(order)) return false;
  if (Number(order.is_demo) === 1) return false;

  const userId = getRegisteredUserId(scope.clientScope);
  if (userId && Number(order.site_user_id) === userId) return true;
  if (order.client_scope === scope.clientScope) return true;

  return false;
}

function buildSiteOrdersWhere(scope) {
  if (!scope.clientScope) {
    return { clause: '1 = 0', params: [] };
  }

  if (isRegisteredScope(scope.clientScope)) {
    const userId = getRegisteredUserId(scope.clientScope);

    if (userId) {
      return {
        clause: 'is_demo = 0 AND (site_user_id = ? OR client_scope = ?)',
        params: [userId, scope.clientScope]
      };
    }

    return {
      clause: 'is_demo = 0 AND client_scope = ?',
      params: [scope.clientScope]
    };
  }

  if (isDemoScope(scope.clientScope)) {
    return {
      clause: 'is_demo = 1',
      params: []
    };
  }

  return {
    clause: 'client_scope = ?',
    params: [scope.clientScope]
  };
}

function filterOrdersForScope(orders, scope) {
  const list = Array.isArray(orders) ? orders : [];

  if (!scope?.clientScope) return [];

  if (isRegisteredScope(scope.clientScope)) {
    return list.filter((order) => belongsToRegisteredScope(order, scope));
  }

  if (isDemoScope(scope.clientScope)) {
    return list.filter((order) => isDemoOrderRecord(order));
  }

  return list.filter((order) => order.client_scope === scope.clientScope);
}

module.exports = {
  DEMO_SHARED_SCOPE,
  parseOrderScopeQuery,
  parseOrderScopeBody,
  buildSiteOrdersWhere,
  isDemoOrderRecord,
  belongsToRegisteredScope,
  filterOrdersForScope
};
