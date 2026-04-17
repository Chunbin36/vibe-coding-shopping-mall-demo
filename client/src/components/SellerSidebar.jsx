import { memo } from "react";
import { useNavigate } from "react-router-dom";

const SIDEBAR_MENU = [
  {
    group: "Overview",
    items: [{ label: "대시보드", key: "dashboard", path: "/seller", icon: "⊞" }],
  },
  {
    group: "Works",
    items: [
      { label: "작품 등록", key: "new", path: "/seller/products/new", icon: "＋" },
      { label: "내 작품 목록", key: "products", path: "/seller/products", icon: "◫" },
    ],
  },
  {
    group: "My",
    items: [
      { label: "작가 프로필", key: "profile", path: "/seller/profile", icon: "◯" },
    ],
  },
];

function SellerSidebar({ user, activeKey, onLogout }) {
  const navigate = useNavigate();
  const initial = user?.name ? user.name[0] : "S";

  return (
    <aside className="seller-sidebar">
      <div className="seller-sb-logo">
        <div className="seller-sb-logo-en">Artisanal Gallery</div>
        <div className="seller-sb-logo-kr">공예 갤러리</div>
        <span className="seller-sb-badge">Seller</span>
      </div>

      <nav className="seller-sb-nav">
        {SIDEBAR_MENU.map((group) => (
          <div key={group.group}>
            <p className="seller-sb-section-label">{group.group}</p>
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`seller-sb-item${item.key === activeKey ? " active" : ""}`}
                onClick={() => item.path && navigate(item.path)}
              >
                <span className="seller-sb-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="seller-sb-foot">
        <div className="seller-sb-avatar">{initial}</div>
        <div className="seller-sb-user-name">{user?.name || "작가"}</div>
        <div className="seller-sb-user-role">{user?.nickname || "셀러"}</div>
        <button type="button" className="seller-sb-logout" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </aside>
  );
}

export default memo(SellerSidebar);
