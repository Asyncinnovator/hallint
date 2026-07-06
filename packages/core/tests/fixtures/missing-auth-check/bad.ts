// @ts-nocheck
router.get("/admin/users", async (req, res) => {
  const users = await User.findAll()
  res.json(users)
})
