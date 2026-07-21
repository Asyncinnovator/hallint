// @ts-nocheck
// Should not be flagged — logs the error
try {
  await db.query('SELECT * FROM users')
} catch (e) {
  console.error(e)
}

// Should not be flagged — rethrows
try {
  const data = JSON.parse(input)
} catch (e) {
  throw e
}