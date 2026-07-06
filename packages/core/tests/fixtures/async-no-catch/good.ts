// @ts-nocheck
async function fetchUserGood(id) {
  try {
    const user = await db.findById(id)
    return user
  } catch (err) {
    throw err
  }
}
