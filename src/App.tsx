import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { PostsProvider } from "@/context/PostsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Feed from "./pages/Feed";
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import Followers from "./pages/Followers";
import Following from "./pages/Following";
import FollowRequests from "./pages/FollowRequests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Session Monitor Wrapper Component
const SessionMonitorWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSessionMonitor();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <PostsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SessionMonitorWrapper>
              <Routes>
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/feed" element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              } />
              <Route path="/upload" element={
                <ProtectedRoute>
                  <Upload />
                </ProtectedRoute>
              } />
              <Route path="/search" element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              } />
              <Route path="/profile/:username" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/followers/:userId" element={
                <ProtectedRoute>
                  <Followers />
                </ProtectedRoute>
              } />
              <Route path="/following/:userId" element={
                <ProtectedRoute>
                  <Following />
                </ProtectedRoute>
              } />
              <Route path="/follow-requests" element={
                <ProtectedRoute>
                  <FollowRequests />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SessionMonitorWrapper>
          </BrowserRouter>
        </PostsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
