import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Login from './components/Login';
import Home from './components/Home';
import ProtectedRoute from './routes/ProtectedRoute';
import { supabase } from './services/supabaseClient'
import { setUser } from './features/auth/authSlice'
import type { AppDispatch, RootState } from './app/store'
import { Routes, Route, Navigate } from 'react-router-dom';

const App = () => {
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((state: RootState) => state.auth.user)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      dispatch(setUser(data.session?.user ?? null))
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        dispatch(setUser(session?.user ?? null))
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [dispatch])

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/home" /> : <Login />}
        />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route path ="*" element={<Navigate to="/login" />} />
    </Routes>
    )
}
export default App;