// @ts-nocheck
async function fetchUserBad(id) {
  const user = await db.findById(id)
  return user
}
