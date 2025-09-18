import { type FC } from "react";
import { useAppStore } from "../stores/appStore";
import HomePage from "./HomePage";
import { FriendsPage } from "./FriendsPage";
import AnalyticsPage from "./AnalyticsPage";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import BottomNavigation from "./BottomNavigation";

const MainApp: FC = () => {
  const { currentTab } = useAppStore();

  const renderCurrentTab = () => {
    switch (currentTab) {
      case "bills":
        return <HomePage />;
      case "friends":
        return <FriendsPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "profile":
        return <ProfilePage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="main-app">
      <div className="app-content">{renderCurrentTab()}</div>
      <BottomNavigation />
    </div>
  );
};

export default MainApp;
