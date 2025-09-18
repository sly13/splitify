import React from "react";
import { User } from "../types";

interface UsersListProps {
  users: User[];
}

const UsersList: React.FC<UsersListProps> = ({ users }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Пользователи</h2>

      {users.length === 0 ? (
        <div style={styles.empty}>Пользователи не найдены</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.headerCell}>ID</th>
                <th style={styles.headerCell}>Telegram ID</th>
                <th style={styles.headerCell}>Имя пользователя</th>
                <th style={styles.headerCell}>Имя</th>
                <th style={styles.headerCell}>Создан</th>
                <th style={styles.headerCell}>Счетов создано</th>
                <th style={styles.headerCell}>Участий</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={styles.row}>
                  <td style={styles.cell}>{user.id}</td>
                  <td style={styles.cell}>{user.telegramUserId}</td>
                  <td style={styles.cell}>{user.username || "-"}</td>
                  <td style={styles.cell}>{user.firstName || "-"}</td>
                  <td style={styles.cell}>{formatDate(user.createdAt)}</td>
                  <td style={styles.cell}>{user.billsCreated.length}</td>
                  <td style={styles.cell}>{user.participants.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  title: {
    margin: "0 0 2rem 0",
    color: "#333",
    fontSize: "1.5rem",
  },
  empty: {
    textAlign: "center" as const,
    color: "#666",
    fontSize: "1.1rem",
    padding: "2rem",
  },
  tableContainer: {
    overflowX: "auto" as const,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.9rem",
  },
  headerRow: {
    backgroundColor: "#f8f9fa",
  },
  headerCell: {
    padding: "1rem 0.5rem",
    textAlign: "left" as const,
    fontWeight: "600" as const,
    color: "#333",
    borderBottom: "2px solid #dee2e6",
  },
  row: {
    borderBottom: "1px solid #dee2e6",
  },
  cell: {
    padding: "0.75rem 0.5rem",
    color: "#333",
  },
};

export default UsersList;
