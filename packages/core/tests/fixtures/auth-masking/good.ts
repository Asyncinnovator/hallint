// @ts-nocheck
// Should not be flagged — responds 401
try {
  await verifyToken(req.headers.authorization)
} catch (e) {
  return res.status(401).json({ error: 'Unauthorized' })
}

// Should not be flagged — rethrows
try {
  jwt.verify(token, process.env.JWT_SECRET)
} catch (e) {
  throw e
}