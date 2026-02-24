import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Home from "@/pages/Home";
import EventPage from "@/pages/EventPage"
import CreateEvent from "@/pages/CreateEvent";
import JoinEvent from "@/pages/JoinEvent";
import ModerationPage from "@/pages/ModerationPage";
import AuthPage from "@/pages/AuthPage";
import AdminDashboard from "@/pages/AdminDashboard";
import PricingPage from "@/pages/PricingPage";
import ProfilePage from "@/pages/ProfilePage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={
            <>
              <Navigation />
              <Home />
            </>
          } />
          <Route path="/auth" element={
            <>
              <Navigation />
              <AuthPage />
            </>
          } />
          <Route path="/pricing" element={
            <>
              <Navigation />
              <PricingPage />
            </>
          } />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/create" element={
            <>
              <Navigation />
              <CreateEvent />
            </>
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
            <>
              <Navigation />
              <ModerationPage />
            </>
          } />
          <Route path="/profile" element={
            <>
              <Navigation />
              <ProfilePage />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}
