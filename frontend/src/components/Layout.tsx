import { type FC } from "react";
import { Outlet } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";

const Layout: FC = () => {
  const { activeTheme } = useTheme();

  return (
    <div className={`app ${activeTheme}`}>
      <div className="app-container">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
