// @ts-nocheck
router.get("/admin/users", authenticate, async (req, res) => {
  const users = await User.findAll()
  res.json(users)
})
