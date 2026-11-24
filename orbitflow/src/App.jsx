import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'
import {LandingPage} from './pages/LandingPage'
import {LoginPage} from './pages/LoginPage'
import {SignupPage} from './pages/SignupPage'
import {OnboardingPage} from './pages/OnboardingPage'
import {ForgotPasswordPage} from './pages/ForgotPasswordPage'
import {ResetPasswordPage} from './pages/ResetPasswordPage'
import {DormantPage} from './pages/DormantPage'
import {SuspendedPage} from './pages/SuspendedPage'
import {DashboardPage} from './pages/DashboardPage'
import {CategoryManagePage} from './pages/CategoryManagePage'
import {TimelinePage} from './pages/TimelinePage'
import {FriendsPage} from './pages/FriendsPage'
import {UserProfilePage} from './pages/UserProfilePage'
import {TeamListPage} from './pages/TeamListPage'
import {TeamMainPage} from './pages/TeamMainPage'
import {TeamSettingsPage} from './pages/TeamSettingsPage'
import {ChatPage} from './pages/ChatPage'
import {NotificationsPage} from './pages/NotificationsPage'
import {AvatarPage} from './pages/AvatarPage'
import {ShopPage} from './pages/ShopPage'
import {PointsPage} from './pages/PointsPage'
import {SettingsPage} from './pages/SettingsPage'
import {MePage} from './pages/MePage'
import {NotFoundPage} from './pages/NotFoundPage'
import {PolicyPage} from './pages/PolicyPage'
import {AdminLayout} from './components/admin/AdminLayout'
import {AdminReportsPage} from './pages/admin/AdminReportsPage'
import {AdminSuspensionsPage} from './pages/admin/AdminSuspensionsPage'
import {AdminItemsPage} from './pages/admin/AdminItemsPage'
import {AdminUsersPage} from './pages/admin/AdminUsersPage'
import {AdminMonitoringPage} from './pages/admin/AdminMonitoringPage'
import {AdminLogsPage} from './pages/admin/AdminLogsPage'
import {AppLayout} from './components/layout/AppLayout'
import {RequireAuth} from './components/layout/RequireAuth'
import {ErrorToaster} from './components/ui/ErrorToaster'
import {LevelUpCelebration} from './components/ui/LevelUpCelebration'


// 데이터 라우터(createBrowserRouter): 저장 안 한 내용이 있을 때 화면 이동을 막고 묻는 useBlocker가 이 라우터에서만 동작한다
// 전체를 감싼 경로의 errorElement와 맨 끝 path="*"가 라우터 기본 오류 화면 대신 NotFoundPage를 보여 준다
const router = createBrowserRouter(
  createRoutesFromElements(
      <Route errorElement={<NotFoundPage />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dormant" element={<DormantPage />} />
        <Route path="/suspended" element={<SuspendedPage />} />
        <Route path="/terms" element={<PolicyPage type="terms" />} />
        <Route path="/privacy" element={<PolicyPage type="privacy" />} />
        <Route path="/support" element={<PolicyPage type="support" />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/home" element={<DashboardPage />} />
          <Route path="/todos" element={<CategoryManagePage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/users/:uuid" element={<UserProfilePage />} />
          <Route path="/teams" element={<TeamListPage />} />
          <Route path="/teams/:uuid" element={<TeamMainPage />} />
          <Route path="/teams/:uuid/settings" element={<TeamSettingsPage />} />
          <Route path="/chats" element={<ChatPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/avatar" element={<AvatarPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/me" element={<MePage />} />
        </Route>
        {/* 관리자: 서비스와 다른 사이드바. 권한은 관리자 API 응답(403)으로 판단 */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="reports" replace />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="suspensions" element={<AdminSuspensionsPage />} />
          <Route path="items" element={<AdminItemsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="monitoring" element={<AdminMonitoringPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>,
  ),
)

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ErrorToaster />
      <LevelUpCelebration />
    </>
  )
}

export default App
