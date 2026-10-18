// Auth: server Apps Script; loaded into the project global scope by clasp.
const SidilanAuth = (() => {
  function requireRole_(requiredRole) {
    if (requiredRole !== 'READ' && requiredRole !== 'WRITE') throw new Error('ACCESS_DENIED');
    const config = SidilanConfig.getRuntimeConfig_();
    const email = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    if (!email) throw new Error('ACCESS_DENIED');

    const isWriter = config.writeEmails.includes(email);
    const isReader = config.readEmails.includes(email) || isWriter;
    if (!isReader || (requiredRole === 'WRITE' && !isWriter)) throw new Error('ACCESS_DENIED');
    return { config, email, role: isWriter ? 'WRITE' : 'READ' };
  }

  return { requireRole_ };
})();
