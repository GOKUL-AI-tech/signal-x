import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('nexus_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = (userData) => {
    sessionStorage.setItem('nexus_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    sessionStorage.removeItem('nexus_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
