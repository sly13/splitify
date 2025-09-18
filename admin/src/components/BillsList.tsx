import React from "react";
import { Bill } from "../types";

interface BillsListProps {
  bills: Bill[];
}

const BillsList: React.FC<BillsListProps> = ({ bills }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "#28a745";
      case "closed":
        return "#6c757d";
      default:
        return "#333";
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Счета</h2>

      {bills.length === 0 ? (
        <div style={styles.empty}>Счета не найдены</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.headerCell}>ID</th>
                <th style={styles.headerCell}>Название</th>
                <th style={styles.headerCell}>Сумма</th>
                <th style={styles.headerCell}>Валюта</th>
                <th style={styles.headerCell}>Тип разделения</th>
                <th style={styles.headerCell}>Статус</th>
                <th style={styles.headerCell}>Создатель</th>
                <th style={styles.headerCell}>Участников</th>
                <th style={styles.headerCell}>Создан</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(bill => (
                <tr key={bill.id} style={styles.row}>
                  <td style={styles.cell}>{bill.id}</td>
                  <td style={styles.cell}>{bill.title}</td>
                  <td style={styles.cell}>{bill.totalAmount}</td>
                  <td style={styles.cell}>{bill.currency}</td>
                  <td style={styles.cell}>{bill.splitType}</td>
                  <td style={styles.cell}>
                    <span
                      style={{
                        ...styles.status,
                        color: getStatusColor(bill.status),
                      }}
                    >
                      {bill.status}
                    </span>
                  </td>
                  <td style={styles.cell}>
                    {bill.creator.firstName ||
                      bill.creator.username ||
                      bill.creator.telegramUserId}
                  </td>
                  <td style={styles.cell}>{bill.participants.length}</td>
                  <td style={styles.cell}>{formatDate(bill.createdAt)}</td>
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
  status: {
    fontWeight: "600" as const,
  },
};

export default BillsList;
