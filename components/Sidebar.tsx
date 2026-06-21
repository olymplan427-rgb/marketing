import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export type MenuItem = 'blog-assistant' | 'insta-content' | 'insta-text-pool' | 'insta-history' | 'threads-auto-posting' | 'content-history' | 'ai-settings' | 'prompt-settings' | 'sns-management' | 'dark-mode';

interface SidebarProps {
  activeMenu: MenuItem;
  onMenuChange: (menu: MenuItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// MenuItem을 URL 경로로 변환하는 매핑
const menuItemToPath: Record<MenuItem, string> = {
  'blog-assistant': '/',
  'insta-content': '/instagram',
  'insta-text-pool': '/instagram/text-pool',
  'insta-history': '/instagram/history',
  'threads-auto-posting': '/threads',
  'content-history': '/history',
  'ai-settings': '/settings/ai',
  'prompt-settings': '/settings/prompt',
  'sns-management': '/settings/sns',
  'dark-mode': '/settings/dark-mode',
};

const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onMenuChange, isCollapsed, onToggleCollapse }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-chalk border-r border-hairline flex flex-col h-screen sticky top-0 transition-all duration-300`}>
      {/* Logo/Brand */}
      <div className="px-6 border-b border-hairline flex items-center justify-between" style={{ height: '100px' }}>
        {!isCollapsed && (
          <div>
            <h1 className="text-lg font-bold text-graphite whitespace-nowrap">AI Contents Studio</h1>
            <p className="text-xs text-concrete mt-1">SNS Creator Manager</p>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-lg hover:bg-mist transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
          title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          <svg className={`w-5 h-5 text-concrete transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {/* Blog Assistant Menu */}
          <li>
            <NavLink
              to={menuItemToPath['blog-assistant']}
              className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-graphite text-chalk font-semibold'
                  : 'text-graphite hover:bg-mist'
              }`}
              title="블로그 포스트"
            >
              <img src="/tistory-logo.png" alt="티스토리" className="w-4 h-4 flex-shrink-0 object-contain" />
              {!isCollapsed && <span>블로그 포스트</span>}
            </NavLink>
          </li>

          {/* Instagram Content Generator Menu */}
          <li>
            <NavLink
              to={menuItemToPath['insta-content']}
              className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-graphite text-chalk font-semibold'
                  : 'text-graphite hover:bg-mist'
              }`}
              title="인스타그램 포스트"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              {!isCollapsed && <span>인스타그램 포스트</span>}
            </NavLink>
          </li>

          {/* Instagram Text Pool Menu */}
          <li>
            <NavLink
              to={menuItemToPath['insta-text-pool']}
              className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-graphite text-chalk font-semibold'
                  : 'text-graphite hover:bg-mist'
              }`}
              title="텍스트 풀 관리"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {!isCollapsed && <span>텍스트 풀 관리</span>}
            </NavLink>
          </li>

          {/* Instagram History Menu */}
          <li>
            <NavLink
              to={menuItemToPath['insta-history']}
              className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-graphite text-chalk font-semibold'
                  : 'text-graphite hover:bg-mist'
              }`}
              title="포스트 히스토리"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {!isCollapsed && <span>포스트 히스토리</span>}
            </NavLink>
          </li>

          {/* Threads Auto Posting Menu */}
          <li>
            <NavLink
              to={menuItemToPath['threads-auto-posting']}
              className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-graphite text-chalk font-semibold'
                  : 'text-graphite hover:bg-mist'
              }`}
              title="쓰레드 포스트"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 192 192" fill="currentColor">
                <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
              </svg>
              {!isCollapsed && <span>쓰레드 포스트</span>}
            </NavLink>
          </li>

          {/* Content History Menu */}
          <li>
            <NavLink
              to={menuItemToPath['content-history']}
              className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-graphite text-chalk font-semibold'
                  : 'text-graphite hover:bg-mist'
              }`}
              title="컨텐츠 히스토리"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {!isCollapsed && <span>컨텐츠 히스토리</span>}
            </NavLink>
          </li>

          {/* Settings Menu with Submenu */}
          <li className="mt-2">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left text-graphite hover:bg-mist transition-all duration-200"
              title="설정"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!isCollapsed && <span className="font-medium">설정</span>}
              </div>
              {!isCollapsed && (
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isSettingsOpen ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            {/* Submenu */}
            {!isCollapsed && isSettingsOpen && (
              <ul className="mt-1 ml-4 space-y-1">
                <li>
                  <NavLink
                    to={menuItemToPath['ai-settings']}
                    className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-graphite text-chalk font-medium'
                        : 'text-concrete hover:bg-mist'
                    }`}
                    title="AI 설정"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>AI 설정</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={menuItemToPath['prompt-settings']}
                    className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-graphite text-chalk font-medium'
                        : 'text-concrete hover:bg-mist'
                    }`}
                    title="프롬프트 설정"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span>프롬프트 설정</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={menuItemToPath['sns-management']}
                    className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-graphite text-chalk font-medium'
                        : 'text-concrete hover:bg-mist'
                    }`}
                    title="운영중인 SNS"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>운영중인 SNS</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={menuItemToPath['dark-mode']}
                    className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-graphite text-chalk font-medium'
                        : 'text-concrete hover:bg-mist'
                    }`}
                    title="다크모드 설정"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span>다크모드 설정</span>
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-hairline">
        <p className="text-xs text-concrete text-center">
          &copy; {new Date().getFullYear()} AI Contents Studio
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
