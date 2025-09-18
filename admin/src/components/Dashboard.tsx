import React, { useState, useEffect } from "react";
import { adminApi } from "../services/api";
import { Stats, User, Bill } from "../types";
import UsersList from "./UsersList";
import BillsList from "./BillsList";
import { FriendsList } from "./FriendsList";

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "stats" | "users" | "bills" | "friends"
  >("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, billsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getBills(),
      ]);

      setStats(statsData.stats);
      setUsers(usersData.users);
      setBills(billsData.bills);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Админ панель</h1>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Выйти
        </button>
      </header>

      <nav style={styles.nav}>
        <button
          onClick={() => setActiveTab("stats")}
          style={{
            ...styles.navButton,
            ...(activeTab === "stats" ? styles.navButtonActive : {}),
          }}
        >
          Статистика
        </button>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            ...styles.navButton,
            ...(activeTab === "users" ? styles.navButtonActive : {}),
          }}
        >
          Пользователи ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("bills")}
          style={{
            ...styles.navButton,
            ...(activeTab === "bills" ? styles.navButtonActive : {}),
          }}
        >
          Счета ({bills.length})
        </button>
        <button
          onClick={() => setActiveTab("friends")}
          style={{
            ...styles.navButton,
            ...(activeTab === "friends" ? styles.navButtonActive : {}),
          }}
        >
          Друзья
        </button>
      </nav>

      <main style={styles.main}>
        {activeTab === "stats" && stats && (
          <div style={styles.statsContainer}>
            <h2 style={styles.sectionTitle}>Общая статистика</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <h3 style={styles.statNumber}>{stats.totalUsers}</h3>
                <p style={styles.statLabel}>Всего пользователей</p>
              </div>
              <div style={styles.statCard}>
                <h3 style={styles.statNumber}>{stats.totalBills}</h3>
                <p style={styles.statLabel}>Всего счетов</p>
              </div>
              <div style={styles.statCard}>
                <h3 style={styles.statNumber}>{stats.totalPayments}</h3>
                <p style={styles.statLabel}>Всего платежей</p>
              </div>
              <div style={styles.statCard}>
                <h3 style={styles.statNumber}>{stats.recentBills}</h3>
                <p style={styles.statLabel}>Счетов за неделю</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && <UsersList users={users} />}

        {activeTab === "bills" && <BillsList bills={bills} />}

        {activeTab === "friends" && <FriendsList />}
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    fontFamily: "Arial, sans-serif",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    fontSize: "1.2rem",
  },
  header: {
    backgroundColor: "white",
    padding: "1rem 2rem",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    margin: 0,
    color: "#333",
    fontSize: "1.5rem",
  },
  logoutButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  nav: {
    backgroundColor: "white",
    padding: "0 2rem",
    borderBottom: "1px solid #eee",
    display: "flex",
    gap: "1rem",
  },
  navButton: {
    padding: "1rem 0",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    color: "#666",
    borderBottom: "2px solid transparent",
  },
  navButtonActive: {
    color: "#007bff",
    borderBottomColor: "#007bff",
  },
  main: {
    padding: "2rem",
  },
  statsContainer: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    margin: "0 0 2rem 0",
    color: "#333",
    fontSize: "1.5rem",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
  },
  statCard: {
    backgroundColor: "#f8f9fa",
    padding: "1.5rem",
    borderRadius: "8px",
    textAlign: "center" as const,
  },
  statNumber: {
    margin: "0 0 0.5rem 0",
    fontSize: "2rem",
    fontWeight: "bold" as const,
    color: "#007bff",
  },
  statLabel: {
    margin: 0,
    color: "#666",
    fontSize: "0.9rem",
  },
};

export default Dashboard;
