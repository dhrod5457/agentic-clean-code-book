import { NavLink } from 'react-router';
import type { Permission } from '../types/permission';
import { buildMenu } from './adminRoutes';

interface SidebarProps {
  permissions: readonly Permission[];
}

export function Sidebar({ permissions }: SidebarProps) {
  const sections = buildMenu(permissions);
  return (
    <nav className="sidebar" aria-label="주메뉴">
      {sections.map((section) => (
        <section key={section.group} className="sidebar-group">
          <h2>{section.group}</h2>
          <ul>
            {section.items.map((item) => (
              <li key={item.path}>
                <NavLink to={item.path} end>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
