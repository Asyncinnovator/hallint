// @ts-nocheck
// Should be flagged — auth error silently swallowed, next() called anyway
try {
  await verifyToken(req.headers.authorization)
} catch (e) {
  next()
}

// Should be flagged — jwt.verify throws, nothing happens
try {
  jwt.verify(token, process.env.JWT_SECRET)
} catch (e) {
}