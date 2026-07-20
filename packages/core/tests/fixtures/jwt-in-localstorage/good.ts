// Safe alternatives — should not be flagged
// @ts-nocheck
localStorage.setItem('theme', 'dark')
localStorage.setItem('language', 'en')
localStorage.setItem('username', user.name)
// Cookies handled server-side via Set-Cookie header — nothing to flag here