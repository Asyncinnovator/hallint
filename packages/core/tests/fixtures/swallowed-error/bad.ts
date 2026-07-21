// @ts-nocheck
// Should be flagged — empty catch
try {
  await db.query('SELECT * FROM users')
} catch (e) {
}

// Should be flagged — comment-only catch
try {
  const data = JSON.parse(input)
} catch (e) {
  // TODO: handle this later
}