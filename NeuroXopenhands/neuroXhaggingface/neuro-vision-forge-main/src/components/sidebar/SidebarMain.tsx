import { NavLink } from "react-router-dom";
import { Brain, FolderOpen, Sparkles, Code } from "lucide-react";

const SidebarMain = () => {
  const menuItems = [
    { title: "Models", url: "/", icon: Brain, isDefault: true },
    { title: "My Collection", url: "/collection", icon: FolderOpen },
    { title: "Start Building", url: "/build", icon: Sparkles, isProminent: true },
  ];

  return (
    <aside 
      className="bg-sidebar border-r border-sidebar-border h-screen flex flex-col fixed left-0 top-0 z-10"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center">
          <span className="text-lg font-semibold text-sidebar-foreground">
            NeuroChat
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          item.title === "Start Building" ? (
            <button
              key={item.title}
              onClick={() => {
                window.location.href = 'http://localhost:8080/';
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-all duration-200 border border-neuro-accent-1 shadow-glow text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.title}</span>
            </button>
          ) : (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.isDefault}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary glow-effect'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.title}</span>
            </NavLink>
          )
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground text-center">
          NeuroChat Fusion v1.0
        </div>
      </div>
    </aside>
  );
};

export default SidebarMain;