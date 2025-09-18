import React, { useState, useEffect } from "react";

interface Friend {
  id: string;
  name: string;
  telegramUsername?: string;
  telegramUserId?: string;
  createdAt: string;
  owner: {
    id: string;
    firstName?: string;
    username?: string;
  };
}

interface FriendsListProps {
  onRefresh?: () => void;
}

export const FriendsList: React.FC<FriendsListProps> = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:4041";
      const response = await fetch(`${API_BASE_URL}/api/admin/friends`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setError(null);
      } else {
        setError("Ошибка загрузки друзей");
      }
    } catch (err) {
      setError("Ошибка соединения");
      console.error("Ошибка загрузки друзей:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Фильтрация друзей
  const filteredFriends = friends.filter(friend => {
    const matchesSearch =
      friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.telegramUsername
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      friend.owner.firstName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      friend.owner.username?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOwner =
      selectedOwner === "all" || friend.owner.id === selectedOwner;

    return matchesSearch && matchesOwner;
  });

  // Получаем уникальных владельцев для фильтра
  const owners = Array.from(
    new Set(friends.map(friend => friend.owner.id))
  ).map(id => {
    const friend = friends.find(f => f.owner.id === id);
    return {
      id,
      name:
        friend?.owner.firstName ||
        friend?.owner.username ||
        `User ${id.slice(0, 8)}`,
    };
  });

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Загрузка друзей...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Друзья</h2>
        <div style={styles.stats}>
          Всего друзей: {friends.length} | Отфильтровано:{" "}
          {filteredFriends.length}
        </div>
        <button onClick={loadFriends} style={styles.refreshButton}>
          Обновить
        </button>
      </div>

      {/* Фильтры */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Поиск</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Поиск по имени, username или владельцу..."
              style={styles.filterInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Владелец</label>
            <select
              value={selectedOwner}
              onChange={e => setSelectedOwner(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">Все владельцы</option>
              {owners.map(owner => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorText}>{error}</div>
        </div>
      )}

      {/* Таблица друзей */}
      {filteredFriends.length === 0 ? (
        <div style={styles.empty}>
          {searchTerm || selectedOwner !== "all"
            ? "Друзья не найдены по заданным фильтрам"
            : "Друзья не найдены"}
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.headerCell}>Друг</th>
                <th style={styles.headerCell}>Telegram</th>
                <th style={styles.headerCell}>Владелец</th>
                <th style={styles.headerCell}>Дата создания</th>
                <th style={styles.headerCell}>ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredFriends.map(friend => (
                <tr key={friend.id} style={styles.row}>
                  <td style={styles.cell}>
                    <div style={styles.friendInfo}>
                      <div style={styles.avatar}>
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.friendName}>{friend.name}</div>
                    </div>
                  </td>
                  <td style={styles.cell}>
                    {friend.telegramUsername ? (
                      <span style={styles.usernameTag}>
                        @{friend.telegramUsername}
                      </span>
                    ) : (
                      <span style={styles.noData}>—</span>
                    )}
                    {friend.telegramUserId && (
                      <div style={styles.userId}>
                        ID: {friend.telegramUserId}
                      </div>
                    )}
                  </td>
                  <td style={styles.cell}>
                    <div style={styles.ownerName}>
                      {friend.owner.firstName ||
                        friend.owner.username ||
                        "Неизвестно"}
                    </div>
                    <div style={styles.ownerId}>
                      ID: {friend.owner.id.slice(0, 8)}...
                    </div>
                  </td>
                  <td style={styles.cell}>{formatDate(friend.createdAt)}</td>
                  <td style={styles.cell}>
                    <span style={styles.friendId}>
                      {friend.id.slice(0, 8)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Статистика по владельцам */}
      {owners.length > 0 && (
        <div style={styles.statsContainer}>
          <h3 style={styles.statsTitle}>Статистика по владельцам</h3>
          <div style={styles.statsGrid}>
            {owners.map(owner => {
              const ownerFriends = friends.filter(
                friend => friend.owner.id === owner.id
              );
              return (
                <div key={owner.id} style={styles.statCard}>
                  <div style={styles.statCardContent}>
                    <div>
                      <div style={styles.statOwnerName}>{owner.name}</div>
                      <div style={styles.statOwnerId}>
                        ID: {owner.id.slice(0, 8)}...
                      </div>
                    </div>
                    <div style={styles.statCount}>{ownerFriends.length}</div>
                  </div>
                </div>
              );
            })}
          </div>
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
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "2rem",
    color: "#666",
    fontSize: "1.1rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap" as const,
    gap: "1rem",
  },
  title: {
    margin: "0 0 0.5rem 0",
    color: "#333",
    fontSize: "1.5rem",
    fontWeight: "600" as const,
  },
  stats: {
    color: "#666",
    fontSize: "0.9rem",
  },
  refreshButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  filtersContainer: {
    backgroundColor: "#f8f9fa",
    padding: "1rem",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
  filterRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column" as const,
  },
  filterLabel: {
    fontSize: "0.9rem",
    fontWeight: "600" as const,
    color: "#333",
    marginBottom: "0.25rem",
  },
  filterInput: {
    padding: "0.5rem",
    border: "1px solid #dee2e6",
    borderRadius: "4px",
    fontSize: "0.9rem",
  },
  filterSelect: {
    padding: "0.5rem",
    border: "1px solid #dee2e6",
    borderRadius: "4px",
    fontSize: "0.9rem",
    backgroundColor: "white",
  },
  errorContainer: {
    backgroundColor: "#f8d7da",
    border: "1px solid #f5c6cb",
    borderRadius: "4px",
    padding: "1rem",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
  },
  errorIcon: {
    marginRight: "0.5rem",
    fontSize: "1.2rem",
  },
  errorText: {
    color: "#721c24",
    fontSize: "0.9rem",
  },
  empty: {
    textAlign: "center" as const,
    color: "#666",
    fontSize: "1.1rem",
    padding: "2rem",
  },
  tableContainer: {
    overflowX: "auto" as const,
    marginBottom: "2rem",
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
  friendInfo: {
    display: "flex",
    alignItems: "center",
  },
  avatar: {
    width: "32px",
    height: "32px",
    backgroundColor: "#007bff",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: "0.8rem",
    fontWeight: "600" as const,
    marginRight: "0.75rem",
  },
  friendName: {
    fontWeight: "500" as const,
  },
  usernameTag: {
    display: "inline-block",
    padding: "0.25rem 0.5rem",
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    borderRadius: "12px",
    fontSize: "0.8rem",
    fontWeight: "500" as const,
  },
  noData: {
    color: "#999",
  },
  userId: {
    fontSize: "0.8rem",
    color: "#666",
    marginTop: "0.25rem",
  },
  ownerName: {
    fontWeight: "500" as const,
  },
  ownerId: {
    fontSize: "0.8rem",
    color: "#666",
    marginTop: "0.25rem",
  },
  friendId: {
    fontFamily: "monospace",
    fontSize: "0.8rem",
    color: "#666",
  },
  statsContainer: {
    backgroundColor: "#f8f9fa",
    padding: "1.5rem",
    borderRadius: "8px",
  },
  statsTitle: {
    margin: "0 0 1rem 0",
    color: "#333",
    fontSize: "1.2rem",
    fontWeight: "600" as const,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
  },
  statCard: {
    backgroundColor: "white",
    padding: "1rem",
    borderRadius: "4px",
    border: "1px solid #dee2e6",
  },
  statCardContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statOwnerName: {
    fontSize: "0.9rem",
    fontWeight: "500" as const,
    color: "#333",
  },
  statOwnerId: {
    fontSize: "0.8rem",
    color: "#666",
    marginTop: "0.25rem",
  },
  statCount: {
    fontSize: "1.5rem",
    fontWeight: "bold" as const,
    color: "#007bff",
  },
};
