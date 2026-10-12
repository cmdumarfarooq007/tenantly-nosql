import React, { useContext, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  LayoutDashboard,
  FolderKanban,
  Users,
  ShieldAlert,
  Bell,
  Settings,
  LogOut,
  CheckSquare,
  X
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { toggleNotificationDrawer, initNotificationDrawerListeners } from '../utils/jqueryInteractions';

const Sidebar = ({ mobileOpen, onCloseMobile }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    initNotificationDrawerListeners();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isTenantAdmin = user?.role === 'tenant_admin';

  const tenantName = isSuperAdmin ? 'System Admin' : (user?.tenant?.name || user?.tenantSubdomain || 'Workspace');
  
  // Calculate role-specific user name and subtitle
  let displayName = '';
  let roleLabel = '';

  if (isSuperAdmin) {
    displayName = 'Super Admin';
    roleLabel = 'System Governance';
  } else if (isTenantAdmin) {
    displayName = user?.fullName || user?.full_name || 'Tenant Admin';
    roleLabel = 'Tenant Admin';
  } else if (user?.role === 'manager') {
    displayName = user?.fullName || user?.full_name || 'Manager';
    roleLabel = 'Manager';
  } else {
    displayName = user?.fullName || user?.full_name || 'Employee';
    roleLabel = 'Employee';
  }

  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`} style={styles.sidebar}>
      {/* 1. Header Section */}
      <div style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.logoBox}>
            <img 
              src={(user?.tenant?.logo_url || user?.tenant?.logoUrl) ? (user.tenant.logo_url || user.tenant.logoUrl) : '/favicon.ico'} 
              alt="Logo" 
              style={{
                ...styles.logoImg,
                padding: (user?.tenant?.logo_url || user?.tenant?.logoUrl) ? '2px' : '4px',
                objectFit: 'contain'
              }}
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = '/favicon.ico'; 
                e.target.style.padding = '4px';
                e.target.style.objectFit = 'contain';
              }}
            />
          </div>
          <div style={styles.brandInfo}>
            <h6 style={styles.tenantName}>{tenantName}</h6>
            <span style={styles.poweredBy}>
              Powered by <strong style={{ color: '#93C5FD' }}>Tenantly</strong>
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            style={{ ...styles.bellBtn, position: 'relative' }} 
            title="Notifications"
            onClick={() => toggleNotificationDrawer('#app-notification-drawer')}
            id="btn-sidebar-notifications"
          >
            <Bell size={18} color="#E2E8F0" />
            <span className="notification-badge-count" style={styles.bellBadge}>2</span>
          </button>
          <button
            className="d-lg-none"
            style={styles.closeBtn}
            onClick={onCloseMobile}
            title="Close menu"
            aria-label="Close menu"
          >
            <X size={18} color="#ffffff" />
          </button>
        </div>
      </div>

      {/* Controlled jQuery interactive notification drawer */}
      <div id="app-notification-drawer" style={styles.notificationDrawer}>
        <div style={styles.drawerHeader}>
          <span style={{ fontWeight: 700, fontSize: '11.5px', color: '#0F2C59' }}>Recent Activity</span>
        </div>
        <div className="notification-item" style={styles.notificationItem}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '11px', color: '#0F2C59' }}>System Ready</div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>Workspace operational</div>
          </div>
          <button className="btn-dismiss-notification" style={styles.dismissBtn} title="Dismiss">×</button>
        </div>
        <div className="notification-item" style={styles.notificationItem}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '11px', color: '#0F2C59' }}>Active Role</div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>Authenticated as {roleLabel}</div>
          </div>
          <button className="btn-dismiss-notification" style={styles.dismissBtn} title="Dismiss">×</button>
        </div>
        <div id="notification-empty-state" style={{ display: 'none', padding: '10px', textAlign: 'center', fontSize: '11px', color: '#64748B' }}>
          No new notifications.
        </div>
      </div>

      {/* 2. Scrollable Navigation List */}
      <div style={styles.navList}>
        {/* Dashboard Direct Link */}
        <NavLink
          to="/dashboard"
          onClick={handleNavClick}
          style={({ isActive }) => (isActive ? { ...styles.navItem, ...styles.activeNavItem } : styles.navItem)}
        >
          {({ isActive }) => (
            <>
              {isActive && <div style={styles.activeBar} />}
              <LayoutDashboard size={18} style={isActive ? styles.activeIcon : styles.icon} />
              <span style={isActive ? styles.activeText : styles.text}>Dashboard</span>
            </>
          )}
        </NavLink>

        {/* Tenant Specific Nav Items (Hidden for Super Admin) */}
        {!isSuperAdmin && (
          <>
            {/* 2. Clients */}
            {(user?.role === 'tenant_admin' || user?.role === 'manager') && (
              <NavLink
                to="/clients"
                onClick={handleNavClick}
                style={({ isActive }) => (isActive ? { ...styles.navItem, ...styles.activeNavItem } : styles.navItem)}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div style={styles.activeBar} />}
                    <Building2 size={18} style={isActive ? styles.activeIcon : styles.icon} />
                    <span style={isActive ? styles.activeText : styles.text}>Clients</span>
                  </>
                )}
              </NavLink>
            )}

            {/* 3. Projects */}
            <NavLink
              to="/projects"
              onClick={handleNavClick}
              style={({ isActive }) => (isActive ? { ...styles.navItem, ...styles.activeNavItem } : styles.navItem)}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div style={styles.activeBar} />}
                  <FolderKanban size={18} style={isActive ? styles.activeIcon : styles.icon} />
                  <span style={isActive ? styles.activeText : styles.text}>Projects</span>
                </>
              )}
            </NavLink>

            {/* 4. Tasks */}
            <NavLink
              to="/tasks"
              onClick={handleNavClick}
              style={({ isActive }) => (isActive ? { ...styles.navItem, ...styles.activeNavItem } : styles.navItem)}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div style={styles.activeBar} />}
                  <CheckSquare size={18} style={isActive ? styles.activeIcon : styles.icon} />
                  <span style={isActive ? styles.activeText : styles.text}>Tasks</span>
                </>
              )}
            </NavLink>

            {/* 5. Meetings */}
            <NavLink
              to="/meetings"
              onClick={handleNavClick}
              style={({ isActive }) => (isActive ? { ...styles.navItem, ...styles.activeNavItem } : styles.navItem)}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div style={styles.activeBar} />}
                  <Calendar size={18} style={isActive ? styles.activeIcon : styles.icon} />
                  <span style={isActive ? styles.activeText : styles.text}>Meetings</span>
                </>
              )}
            </NavLink>

            {/* 6. Employees */}
            {user?.role === 'tenant_admin' && (
              <NavLink
                to="/users"
                onClick={handleNavClick}
                style={({ isActive }) => (isActive ? { ...styles.navItem, ...styles.activeNavItem } : styles.navItem)}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div style={styles.activeBar} />}
                    <Users size={18} style={isActive ? styles.activeIcon : styles.icon} />
                    <span style={isActive ? styles.activeText : styles.text}>Employees</span>
                  </>
                )}
              </NavLink>
            )}
          </>
        )}

        {/* Super Admin Nav Items */}
        {isSuperAdmin && (
          <>
            <NavLink
              to="/tenants"
              onClick={handleNavClick}
              style={({ isActive }) => (isActive ? { ...styles.navItem, ...styles.activeNavItem } : styles.navItem)}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div style={styles.activeBar} />}
                  <ShieldAlert size={18} style={isActive ? styles.activeIcon : styles.icon} />
                  <span style={isActive ? styles.activeText : styles.text}>Tenants Directory</span>
                </>
              )}
            </NavLink>
          </>
        )}
      </div>

      {/* 3. Footer User Profile Section */}
      <div style={styles.footer}>
        <div style={{
          ...styles.userAvatar,
          backgroundColor: (user?.avatar_url || user?.avatarUrl) ? 'transparent' : '#0F2C59',
          border: 'none',
          boxShadow: 'none',
          padding: 0
        }}>
          {(user?.avatar_url || user?.avatarUrl) ? (
            <img 
              src={user.avatar_url || user.avatarUrl} 
              alt={displayName} 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block', background: 'transparent' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            userInitial
          )}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{displayName}</div>
          <div style={styles.userSub}>{roleLabel}</div>
        </div>
        <div style={styles.footerActions}>
          <button style={styles.iconBtn} onClick={() => { handleNavClick(); navigate('/settings'); }} title="Settings">
            <Settings size={16} color="#E2E8F0" />
          </button>
          <button style={styles.iconBtn} onClick={() => { handleNavClick(); handleLogout(); }} title="Logout">
            <LogOut size={16} color="#E2E8F0" />
          </button>
        </div>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    backgroundColor: '#0F2C59',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  },
  closeBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    padding: '6px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease'
  },
  header: {
    padding: '16px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoBox: {
    width: '38px',
    height: '38px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 0
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    borderRadius: '8px',
    display: 'block'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  tenantName: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.2
  },
  poweredBy: {
    fontSize: '0.72rem',
    color: '#CBD5E1'
  },
  bellBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    padding: '6px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease'
  },
  bellBadge: {
    position: 'absolute',
    top: '-3px',
    right: '-3px',
    backgroundColor: '#EF4444',
    color: '#ffffff',
    fontSize: '9px',
    fontWeight: 700,
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  notificationDrawer: {
    display: 'none',
    backgroundColor: '#ffffff',
    margin: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  drawerHeader: {
    padding: '8px 12px',
    borderBottom: '1px solid #F1F5F9',
    backgroundColor: '#F8FAFC'
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #F1F5F9',
    gap: '8px'
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1
  },
  navList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 10px'
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#93C5FD',
    letterSpacing: '0.05em',
    marginTop: '18px',
    marginBottom: '6px',
    paddingLeft: '12px'
  },
  categoryIcon: {
    color: '#93C5FD'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '10px',
    textDecoration: 'none',
    position: 'relative',
    transition: 'all 0.2s ease',
    marginBottom: '3px',
    cursor: 'pointer'
  },
  activeNavItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    fontWeight: 700
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '6px',
    bottom: '6px',
    width: '4px',
    backgroundColor: '#60A5FA',
    borderRadius: '0 4px 4px 0'
  },
  icon: {
    color: '#E2E8F0',
    flexShrink: 0
  },
  activeIcon: {
    color: '#ffffff',
    flexShrink: 0
  },
  text: {
    fontSize: '0.9rem',
    color: '#F8FAFC',
    fontWeight: 600
  },
  activeText: {
    fontSize: '0.9rem',
    color: '#ffffff',
    fontWeight: 700
  },
  footer: {
    padding: '14px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#07162C'
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    color: '#ffffff',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    flexShrink: 0,
    border: 'none',
    boxShadow: 'none',
    overflow: 'hidden'
  },
  userInfo: {
    flex: 1,
    overflow: 'hidden'
  },
  userName: {
    fontSize: '0.825rem',
    fontWeight: 700,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  userSub: {
    fontSize: '0.725rem',
    color: '#CBD5E1',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textTransform: 'capitalize'
  },
  footerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    padding: '6px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease'
  }
};

export default Sidebar;
