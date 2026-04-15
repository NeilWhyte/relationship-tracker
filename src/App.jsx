import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "relationship-tracker-simple-v1";

const starterContacts = [
  {
    id: crypto.randomUUID(),
    name: "Sarah Thompson",
    relationship: "Friend",
    job: "Architect",
    birthday: "1990-07-14",
    family: "Married, two children",
    trips: "Italy in 2024, Cape Town in 2025",
    notes: "Loves trail running and good coffee.",
    lastContacted: "2026-04-01",
    nextReminder: "2026-04-20",
    conversations: [
      {
        id: crypto.randomUUID(),
        date: "2026-04-01",
        summary: "Caught up about her new project and family holiday plans.",
      },
    ],
  },
];

function blankContact() {
  return {
    id: "",
    name: "",
    relationship: "Friend",
    job: "",
    birthday: "",
    family: "",
    trips: "",
    notes: "",
    lastContacted: "",
    nextReminder: "",
    conversations: [],
  };
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString();
}

function daysUntil(value) {
  if (!value) return null;
  const today = new Date();
  const target = new Date(value + "T00:00:00");
  const diff = Math.ceil((target - new Date(today.toDateString())) / (1000 * 60 * 60 * 24));
  return diff;
}

function addDaysToToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function App() {
  const [contacts, setContacts] = useState(starterContacts);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankContact());
  const [conversationText, setConversationText] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setContacts(parsed);
      setSelectedId(parsed[0]?.id || "");
    } else {
      setSelectedId(starterContacts[0].id);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const text = [
        contact.name,
        contact.relationship,
        contact.job,
        contact.family,
        contact.trips,
        contact.notes,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [contacts, search]);

  const selectedContact =
    contacts.find((contact) => contact.id === selectedId) || filteredContacts[0] || null;

  function openNewContact() {
    setForm(blankContact());
    setShowForm(true);
  }

  function openEditContact() {
    if (!selectedContact) return;
    setForm(selectedContact);
    setShowForm(true);
  }

  function saveContact() {
    if (!form.name.trim()) return;

    if (form.id) {
      setContacts((prev) => prev.map((c) => (c.id === form.id ? form : c)));
      setSelectedId(form.id);
    } else {
      const newContact = { ...form, id: crypto.randomUUID(), conversations: [] };
      setContacts((prev) => [newContact, ...prev]);
      setSelectedId(newContact.id);
    }

    setShowForm(false);
    setForm(blankContact());
  }

  function deleteContact() {
    if (!selectedContact) return;
    const updated = contacts.filter((c) => c.id !== selectedContact.id);
    setContacts(updated);
    setSelectedId(updated[0]?.id || "");
  }

  function addConversation() {
    if (!selectedContact || !conversationText.trim()) return;

    const today = new Date().toISOString().slice(0, 10);
    const updatedContact = {
      ...selectedContact,
      lastContacted: today,
      conversations: [
        {
          id: crypto.randomUUID(),
          date: today,
          summary: conversationText.trim(),
        },
        ...selectedContact.conversations,
      ],
    };

    setContacts((prev) =>
      prev.map((contact) => (contact.id === selectedContact.id ? updatedContact : contact))
    );
    setConversationText("");
  }

  function setReminder(days) {
    if (!selectedContact) return;

    const updatedContact = {
      ...selectedContact,
      nextReminder: addDaysToToday(days),
    };

    setContacts((prev) =>
      prev.map((contact) => (contact.id === selectedContact.id ? updatedContact : contact))
    );
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relationship-tracker-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (Array.isArray(parsed)) {
          setContacts(parsed);
          setSelectedId(parsed[0]?.id || "");
        }
      } catch (error) {
        alert("That file could not be imported.");
      }
    };
    reader.readAsText(file);
  }

  const remindersDue = contacts.filter((contact) => {
    const diff = daysUntil(contact.nextReminder);
    return diff !== null && diff <= 7;
  }).length;

  const overdueCount = contacts.filter((contact) => {
    const diff = daysUntil(contact.nextReminder);
    return diff !== null && diff < 0;
  }).length;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Relationship Tracker</h1>
        <p style={styles.subtitle}>A simple place to keep tabs on friends, colleagues, and conversations.</p>

        <div style={styles.topBar}>
          <div style={styles.statBox}>
            <strong>{contacts.length}</strong>
            <span>Contacts</span>
          </div>
          <div style={styles.statBox}>
            <strong>{remindersDue}</strong>
            <span>Need a touch base</span>
          </div>
          <div style={styles.statBox}>
            <strong>{overdueCount}</strong>
            <span>Overdue</span>
          </div>
          <button onClick={openNewContact} style={styles.primaryButton}>Add contact</button>
          <button onClick={exportData} style={styles.secondaryButton}>Export</button>
          <label style={styles.secondaryButton}>
            Import
            <input type="file" accept="application/json" onChange={importData} style={{ display: "none" }} />
          </label>
        </div>

        <div style={styles.layout}>
          <div style={styles.sidebar}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              style={styles.input}
            />

            <div style={styles.contactList}>
              {filteredContacts.map((contact) => {
                const diff = daysUntil(contact.nextReminder);
                const overdue = diff !== null && diff < 0;
                const dueSoon = diff !== null && diff >= 0 && diff <= 7;

                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedId(contact.id)}
                    style={{
                      ...styles.contactButton,
                      ...(selectedContact?.id === contact.id ? styles.contactButtonActive : {}),
                      ...(overdue ? styles.contactButtonOverdue : dueSoon ? styles.contactButtonDueSoon : {}),
                    }}
                  >
                    <div style={styles.contactName}>{contact.name}</div>
                    <div style={styles.contactMeta}>
                      {contact.relationship}{contact.job ? ` • ${contact.job}` : ""}
                    </div>
                    <div style={styles.contactMeta}>
                      {contact.nextReminder
                        ? overdue
                          ? `Overdue since ${formatDate(contact.nextReminder)}`
                          : dueSoon
                            ? `Due ${formatDate(contact.nextReminder)}`
                            : `Reminder: ${formatDate(contact.nextReminder)}`
                        : "No reminder set"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.mainPanel}>
            {selectedContact ? (
              <>
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h2 style={{ ...styles.sectionTitle, fontSize: "30px" }}>{selectedContact.name}</h2>
                      <div style={styles.smallText}>{selectedContact.relationship}</div>
                    </div>
                    <div style={styles.buttonRow}>
                      <button onClick={openEditContact} style={styles.secondaryButton}>Edit</button>
                      <button onClick={deleteContact} style={styles.dangerButton}>Delete</button>
                    </div>
                  </div>

                  <div style={styles.detailsGrid}>
                    <div><strong>Job:</strong> {selectedContact.job || ""}</div>
                    <div><strong>Birthday:</strong> {formatDate(selectedContact.birthday)}</div>
                    <div><strong>Family:</strong> {selectedContact.family || ""}</div>
                    <div><strong>Trips:</strong> {selectedContact.trips || ""}</div>
                    <div><strong>Last contacted:</strong> {formatDate(selectedContact.lastContacted)}</div>
                    <div><strong>Next reminder:</strong> {formatDate(selectedContact.nextReminder)}</div>
                  </div>

                  <div style={styles.reminderRow}>
                    <strong>Quick reminder:</strong>
                    <div style={styles.buttonRow}>
                      <button onClick={() => setReminder(7)} style={styles.secondaryButton}>In 7 days</button>
                      <button onClick={() => setReminder(14)} style={styles.secondaryButton}>In 14 days</button>
                      <button onClick={() => setReminder(30)} style={styles.secondaryButton}>In 30 days</button>
                    </div>
                  </div>

                  <div style={styles.notesBox}>
                    <strong>Notes</strong>
                    <p style={{ marginTop: 8 }}>{selectedContact.notes || "No notes yet."}</p>
                  </div>
                </div>

                <div style={styles.card}>
                  <h3 style={{ ...styles.sectionTitle, fontSize: "20px" }}>Log a conversation</h3>
                  <textarea
                    value={conversationText}
                    onChange={(e) => setConversationText(e.target.value)}
                    placeholder="What did you talk about?"
                    style={styles.textarea}
                  />
                  <button onClick={addConversation} style={styles.primaryButton}>Save conversation</button>
                </div>

                <div style={styles.card}>
                  <h3 style={{ ...styles.sectionTitle, fontSize: "20px" }}>Conversation history</h3>
                  {selectedContact.conversations.length === 0 ? (
                    <p style={styles.smallText}>No conversations logged yet.</p>
                  ) : (
                    selectedContact.conversations.map((conversation) => (
                      <div key={conversation.id} style={styles.conversationItem}>
                        <div style={styles.smallText}>{formatDate(conversation.date)}</div>
                        <div>{conversation.summary}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div style={styles.card}>Select a contact to begin.</div>
            )}
          </div>
        </div>

        {showForm && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <h2 style={{ ...styles.sectionTitle, fontSize: "24px" }}>{form.id ? "Edit contact" : "Add contact"}</h2>

              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} />
              <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} style={styles.input}>
                <option>Friend</option>
                <option>Colleague</option>
                <option>Family</option>
              </select>
              <input placeholder="Job" value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} style={styles.input} />
              <input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} style={styles.input} />
              <input placeholder="Family details" value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} style={styles.input} />
              <input placeholder="Trips or experiences" value={form.trips} onChange={(e) => setForm({ ...form, trips: e.target.value })} style={styles.input} />
              <input type="date" value={form.lastContacted} onChange={(e) => setForm({ ...form, lastContacted: e.target.value })} style={styles.input} />
              <input type="date" value={form.nextReminder} onChange={(e) => setForm({ ...form, nextReminder: e.target.value })} style={styles.input} />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={styles.textarea} />

              <div style={styles.buttonRow}>
                <button onClick={() => setShowForm(false)} style={styles.secondaryButton}>Cancel</button>
                <button onClick={saveContact} style={styles.primaryButton}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Arial, sans-serif",
    background: "#f4f6f8",
    minHeight: "100vh",
    padding: "16px",
    color: "#1f2937",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  title: {
    marginBottom: "8px",
    fontSize: "32px",
    lineHeight: 1.1,
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "20px",
    color: "#6b7280",
    fontSize: "16px",
  },
  topBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
    alignItems: "stretch",
  },
  statBox: {
    background: "white",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minWidth: "120px",
    flex: "1 1 120px",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  sidebar: {
    background: "white",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "14px",
  },
  mainPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
  },
  card: {
    background: "white",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "16px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "24px",
    lineHeight: 1.15,
  },
  buttonRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  primaryButton: {
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    minHeight: "44px",
    fontSize: "15px",
  },
  secondaryButton: {
    background: "white",
    color: "#111827",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    minHeight: "44px",
    fontSize: "15px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  dangerButton: {
    background: "#b91c1c",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    minHeight: "44px",
    fontSize: "15px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    marginBottom: "10px",
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    minHeight: "110px",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    marginBottom: "10px",
    resize: "vertical",
    fontSize: "16px",
  },
  contactList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "10px",
  },
  contactButton: {
    width: "100%",
    textAlign: "left",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "14px",
    cursor: "pointer",
  },
  contactButtonActive: {
    background: "#e5e7eb",
  },
  contactButtonDueSoon: {
    border: "1px solid #f59e0b",
    background: "#fff7ed",
  },
  contactButtonOverdue: {
    border: "1px solid #dc2626",
    background: "#fef2f2",
  },
  contactName: {
    fontWeight: "bold",
    marginBottom: "4px",
    fontSize: "16px",
  },
  contactMeta: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "2px",
    lineHeight: 1.35,
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "10px",
  },
  reminderRow: {
    marginTop: "16px",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  notesBox: {
    marginTop: "16px",
    padding: "12px",
    background: "#f9fafb",
    borderRadius: "10px",
  },
  conversationItem: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "10px",
    marginTop: "10px",
  },
  smallText: {
    fontSize: "13px",
    color: "#6b7280",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modal: {
    width: "100%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxSizing: "border-box",
  },
};
