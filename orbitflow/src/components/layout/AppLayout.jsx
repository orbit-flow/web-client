import { Outlet } from 'react-router-dom';
import { MobileTabBar } from './MobileTabBar';
import { MobileTopBar, MobileTopBarProvider } from './MobileTopBar';
import { RealtimeProvider } from './RealtimeProvider';
import { Sidebar } from './Sidebar';

// 로그인 후 서비스 화면 공통 틀: 왼쪽 사이드바 + 본문. 실시간(채팅·알림) 연결은 여기서 한 번만
// 모바일(767px 이하)은 사이드바 대신 상단바 + 하단 탭(어느 쪽을 보일지는 layout.css)
export function AppLayout() {
  return (
    <RealtimeProvider>
      <MobileTopBarProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="app-layout__main">
            <MobileTopBar />
            <Outlet />
          </main>
          <MobileTabBar />
        </div>
      </MobileTopBarProvider>
    </RealtimeProvider>
  );
}
