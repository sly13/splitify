import React from "react";
import { useTelegram } from "../hooks/useTelegram";
import TonWalletConnect from "./TonWalletConnect";

const ProfilePage: React.FC = () => {
  const { user } = useTelegram();

  // const handleBack = () => {
  //   webApp?.BackButton.onClick(() => {
  //     // TODO: Navigate back
  //   });
  // };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="user-info">
          <div className="user-avatar">
            {user?.photo_url ? (
              <img src={user.photo_url} alt={user.first_name} />
            ) : (
              <span>{user?.first_name?.[0] || "?"}</span>
            )}
          </div>
          <div className="user-details">
            <h2>
              {user?.first_name} {user?.last_name}
            </h2>
            {user?.username && <p>@{user.username}</p>}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Кошелек</h3>
        <TonWalletConnect />
      </div>
    </div>
  );
};

export default ProfilePage;
