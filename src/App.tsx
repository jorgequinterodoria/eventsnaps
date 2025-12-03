import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthProvider from "@/lib/auth";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import Navigation from "@/components/Navigation";
import Home from "@/pages/Home";
import EventPage from "@/pages/EventPage"
import CreateEvent from "@/pages/CreateEvent";
import JoinEvent from "@/pages/JoinEvent";
import ModerationPage from "@/pages/ModerationPage";
import type { ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={
              <>
                <Navigation />
                <Home />
              </>
            } />
            <Route path="/create" element={
              <ProtectedRoute>
                <Navigation />
                <CreateEvent />
              </ProtectedRoute>
            } />
            <Route path="/join" element={
              <>
                <Navigation />
                <JoinEvent />
              </>
            } />
            <Route path="/event/:code" element={
              <>
                <Navigation />
                <EventPage />
              </>
            } />
            <Route path="/moderate/:code" element={
              <ProtectedRoute>
                <Navigation />
                <ModerationPage />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}
