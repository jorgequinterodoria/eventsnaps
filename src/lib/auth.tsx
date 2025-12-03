import { ClerkProvider } from '@clerk/clerk-react'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

interface AuthProviderProps {
  children: React.ReactNode
}

const  AuthProvider = ({ children }: AuthProviderProps) =>{
  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      appearance={{
        elements: {
          formButtonPrimary: 'bg-blue-500 hover:bg-blue-600 text-white',
          card: 'bg-white shadow-lg rounded-lg',
          headerTitle: 'text-gray-900',
          headerSubtitle: 'text-gray-600',
        },
        layout: {
          socialButtonsPlacement: 'bottom',
          socialButtonsVariant: 'blockButton',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}

export default AuthProvider