import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../app/store'
import type { JSX } from 'react'

type Props = {
    children: JSX.Element
}

const ProtectedRoute = ({ children }: Props) => {
    const user = useSelector((state: RootState) => state.auth.user)

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}

export default ProtectedRoute;