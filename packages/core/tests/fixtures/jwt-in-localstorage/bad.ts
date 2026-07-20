// All of these should be flagged
// @ts-nocheck
localStorage.setItem('token', jwtToken)
localStorage.setItem('jwt', response.data.token)
localStorage.setItem('auth_token', data.accessToken)
localStorage.setItem('access_token', token)
localStorage.setItem('session', sessionToken)