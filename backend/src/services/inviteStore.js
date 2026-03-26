const inviteTokens = new Map();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

const createInviteToken = ({ token, organizationName }) => {
  inviteTokens.set(token, {
    organizationName,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
};

const getInviteToken = (token) => {
  const data = inviteTokens.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    inviteTokens.delete(token);
    return null;
  }
  return data;
};

const consumeInviteToken = (token) => {
  const data = getInviteToken(token);
  if (!data) return null;
  inviteTokens.delete(token);
  return data;
};

module.exports = { createInviteToken, getInviteToken, consumeInviteToken };
