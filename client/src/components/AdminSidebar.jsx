import { memo } from "react";
import { useNavigate } from "react-router-dom";

const SIDEBAR_MENU = [
  { group: "OVERVIEW", items: [{ icon: "⊞", label: "대시보드", key: "dashboard", path: "/admin" }] },
  {
    group: "MANAGE",
    items: [
      { icon: "☰", label: "상품 관리", key: "products", path: "/admin/products" },
      { icon: "📋", label: "주문 관리", key: "orders", path: "/admin/orders" },
      { icon: "👤", label: "판매자 관리", key: "sellers", path: null },
      { icon: "👥", label: "회원 관리", key: "users", path: null },
    ],
  },
  { group: "SYSTEM", items: [{ icon: "⚙", label: "설정", key: "settings", path: null }] },
];

function AdminSidebar({ user, activeKey, onLogout }) {
  const navigate = useNavigate();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-top">
        <div className="admin-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <p className="admin-brand-en">VIBE CODING</p>
          <p className="admin-brand-kr">쇼핑몰 관리</p>
          <span className="admin-badge">ADMIN</span>
        </div>

        <nav className="admin-nav">
          {SIDEBAR_MENU.map((group) => (
            <div key={group.group} className="admin-nav-group">
              <p className="admin-nav-group-label">{group.group}</p>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`admin-nav-item${item.key === activeKey ? " active" : ""}`}
                  onClick={() => item.path && navigate(item.path)}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="admin-sidebar-bottom">
        <p className="admin-user-name">관리자</p>
        <p className="admin-user-role">{user.name} · Admin</p>
        <button type="button" className="admin-logout-btn" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </aside>
  );
}

export default memo(AdminSidebar);
