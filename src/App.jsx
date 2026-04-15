import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function blankContact() {
  return {
    id: "",
    name: "",
    relationship: "Friend",
    job: "",
    birthday: "",
    partner: "",
    children: "",
    pets: "",
    other: "",
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
  return Math.ceil((target - new Date(today.toDateString())) / (1000 * 60 * 60 * 24));
}

function addDaysToToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function mapRowToContact(row) {
  return {
    id: row.id,
    name: row.name || "",
    relationship: row.relationship || "Friend",
    job: row.job || "",
    birthday: row.birthday || "",
    partner: row.partner || "",
    children: row.children || "",
    pets: row.pets || "",
    other: row.other || "",
    notes: row.notes || "",
    lastContacted: row.last_contacted || "",
    nextReminder: row.next_reminder || "",
    conversations: Array.isArray(row.conversations) ? row.conversations : [],
  };
}

function mapContactToRow(contact) {
  return {
    name: contact.name,
    relationship: contact.relationship || null,
    job: contact.job || null,
    birthday: contact.birthday || null,
    partner: contact.partner || null,
    children: contact.children || null,
    pets: contact.pets || null,
    other: contact.other || null,
    notes: contact.notes || null,
    last_contacted: contact.lastContacted || null,
    next_reminder: contact.nextReminder || null,
    conversations: Array.isArray(contact.conversations) ? contact.conversations : [],
    updated_at: new Date().toISOString(),
  };
}

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [form, setForm] = useState(blankContact());
  const [conversationText, setConversationText] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddNote, setQuickAddNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const mapped = (data || []).map(mapRowToContact);
    setContacts(mapped);
    setSelectedId((current) => current || mapped[0]?.id || "");
    setLoading(false);
  }

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const text = [
        contact.name,
        contact.relationship,
        contact.job,
        contact.partner,
        contact.children,
        contact.pets,
        contact.other,
        contact.notes,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const diff = daysUntil(contact.nextReminder);
      const isDue = diff !== null && diff <= 7;
      const isOverdue = diff !== null && diff < 0;

      if (filterMode === "due") return matchesSearch && isDue;
      if (filterMode === "overdue") return matchesSearch && isOverdue;
      return matchesSearch;
    });
  }, [contacts, search, filterMode]);

  const selectedContact =
    contacts.find((contact) => contact.id === selectedId) || filteredContacts[0] || null;

  useEffect(() => {
    if (!selectedId && filteredContacts[0]) {
      setSelectedId(filteredContacts[0].id);
    }
  }, [filteredContacts, selectedId]);

  function openNewContact() {
    setForm(blankContact());
    setShowForm(true);
  }

  function openEditContact() {
    if (!selectedContact) return;
    setForm(selectedContact);
    setShowForm(true);
  }

  async function saveContact() {
    if (!form.name.trim()) return;

    setSaving(true);
    setErrorMessage("");

    if (form.id) {
      const { error } = await supabase
        .from("contacts")
        .update(mapContactToRow(form))
        .eq("id", form.id);

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("contacts")
        .insert([mapContactToRow({ ...form, conversations: [] })])
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }

      if (data?.id) setSelectedId(data.id);
    }

    await loadContacts();
    setShowForm(false);
    setForm(blankContact());
    setSaving(false);
  }

  async function deleteContact() {
    if (!selectedContact) return;

    setSaving(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", selectedContact.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await loadContacts();
    setSaving(false);
  }

  async function updateContact(contact) {
    setSaving(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("contacts")
      .update(mapContactToRow(contact))
      .eq("id", contact.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return false;
    }

    await loadContacts();
    setSaving(false);
    return true;
  }

  async function addConversation() {
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

    const ok = await updateContact(updatedContact);
    if (ok) setConversationText("");
  }

  async function setReminder(days) {
    if (!selectedContact) return;
    await updateContact({
      ...selectedContact,
      nextReminder: addDaysToToday(days),
    });
  }

  async function quickAddContact(reminderDays = null) {
    if (!quickAddName.trim()) return;

    setSaving(true);
    setErrorMessage("");

    const today = new Date().toISOString().slice(0, 10);
    const conversations = quickAddNote.trim()
      ? [
          {
            id: crypto.randomUUID(),
            date: today,
            summary: quickAddNote.trim(),
          },
        ]
      : [];

    const newContact = {
      name: quickAddName.trim(),
      relationship: "Friend",
      job: null,
      birthday: null,
      partner: null,
      children: null,
      pets: null,
      other: null,
      notes: quickAddNote.trim() || null,
      last_contacted: today,
      next_reminder: reminderDays ? addDaysToToday(reminderDays) : null,
      conversations,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("contacts")
      .insert([newContact])
      .select()
      .single();

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await loadContacts();
    if (data?.id) setSelectedId(data.id);
    setQuickAddName("");
    setQuickAddNote("");
    setShowQuickAdd(false);
    setSaving(false);
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) {
          alert("That file could not be imported.");
          return;
        }

        setSaving(true);
        setErrorMessage("");

        for (const contact of parsed) {
          const row = mapContactToRow(contact);
          if (contact.id) {
            await supabase.from("contacts").upsert([{ id: contact.id, ...row }]);
          } else {
            await supabase.from("contacts").insert([row]);
          }
        }

        await loadContacts();
        setSaving(false);
      } catch {
        alert("That file could not be imported.");
        setSaving(false);
      }
    };
    reader.readAsText(file);
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

        {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

        <div style={styles.topBar}>
          <button
            onClick={() => setFilterMode("all")}
            style={{ ...styles.statBox, ...(filterMode === "all" ? styles.statBoxActive : {}) }}
          >
            <strong style={styles.statNumber}>{contacts.length}</strong>
            <span style={styles.statLabel}>Contacts</span>
          </button>

          <button
            onClick={() => setFilterMode("due")}
            style={{ ...styles.statBox, ...(filterMode === "due" ? styles.statBoxActive : {}) }}
          >
            <strong style={styles.statNumber}>{remindersDue}</strong>
            <span style={styles.statLabel}>Need a touch base</span>
          </button>

          <button
            onClick={() => setFilterMode("overdue")}
            style={{ ...styles.statBox, ...(filterMode === "overdue" ? styles.statBoxActive : {}) }}
          >
            <strong style={styles.statNumber}>{overdueCount}</strong>
            <span style={styles.statLabel}>Overdue</span>
          </button>

          <button onClick={() => setShowQuickAdd(true)} style={styles.primaryButton} disabled={saving || loading}>Quick Add</button>
          <button onClick={openNewContact} style={styles.secondaryButton} disabled={saving || loading}>Add contact</button>
          <button onClick={exportData} style={styles.secondaryButton} disabled={saving || loading}>Export</button>
          <label style={styles.secondaryButton}>
            Import
            <input type="file" accept="application/json" onChange={importData} style={{ display: "none" }} />
          </label>
          <button onClick={loadContacts} style={styles.secondaryButton} disabled={saving || loading}>Refresh</button>
        </div>

        {loading ? (
          <div style={styles.card}>Loading contacts...</div>
        ) : (
          <div style={{ ...styles.layout, ...(window.innerWidth >= 900 ? { gridTemplateColumns: "320px minmax(0, 1fr)" } : {}) }}>
            <div style={{ ...styles.sidebar, ...(window.innerWidth >= 900 ? { order: 1 } : { order: 2 }) }}>
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
                      <div
                        style={{
                          ...styles.contactName,
                          ...(selectedId === contact.id ? { color: "#1d4ed8", fontWeight: "800" } : {}),
                        }}
                      >
                        {contact.name}
                      </div>
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

            <div style={{ ...styles.mainPanel, ...(window.innerWidth >= 900 ? { order: 2 } : { order: 1 }) }}>
              {selectedContact ? (
                <>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <div>
                        <h2 style={styles.detailName}>{selectedContact.name}</h2>
                        <div style={styles.smallText}>{selectedContact.relationship}</div>
                      </div>
                      <div style={{ ...styles.buttonRow, ...(window.innerWidth >= 700 ? { flexWrap: "wrap" } : { flexDirection: "column", width: "100%" }) }}>
                        <button onClick={openEditContact} style={styles.secondaryButton} disabled={saving}>Edit</button>
                        <button onClick={deleteContact} style={styles.dangerButton} disabled={saving}>Delete</button>
                      </div>
                    </div>

                    <div style={{ ...styles.detailsGrid, ...(window.innerWidth >= 700 ? { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" } : {}) }}>
                      <div><strong>Job:</strong> {selectedContact.job || ""}</div>
                      <div><strong>Birthday:</strong> {formatDate(selectedContact.birthday)}</div>
                      <div><strong>Partner:</strong> {selectedContact.partner || ""}</div>
                      <div><strong>Children:</strong> {selectedContact.children || ""}</div>
                      <div><strong>Pets:</strong> {selectedContact.pets || ""}</div>
                      <div><strong>Other:</strong> {selectedContact.other || ""}</div>
                      <div><strong>Last contacted:</strong> {formatDate(selectedContact.lastContacted)}</div>
                      <div><strong>Next reminder:</strong> {formatDate(selectedContact.nextReminder)}</div>
                    </div>

                    <div style={styles.reminderRow}>
                      <strong>Quick reminder:</strong>
                      <div style={{ ...styles.buttonRow, ...(window.innerWidth >= 700 ? { flexWrap: "wrap" } : { flexDirection: "column", width: "100%" }) }}>
                        <button onClick={() => setReminder(7)} style={styles.secondaryButton} disabled={saving}>In 7 days</button>
                        <button onClick={() => setReminder(14)} style={styles.secondaryButton} disabled={saving}>In 14 days</button>
                        <button onClick={() => setReminder(30)} style={styles.secondaryButton} disabled={saving}>In 30 days</button>
                      </div>
                    </div>

                    <div style={styles.notesBox}>
                      <strong>Notes</strong>
                      <p style={{ marginTop: 8 }}>{selectedContact.notes || "No notes yet."}</p>
                    </div>
                  </div>

                  <div style={styles.card}>
                    <h3 style={styles.sectionTitle}>Log a conversation</h3>
                    <textarea
                      value={conversationText}
                      onChange={(e) => setConversationText(e.target.value)}
                      placeholder="What did you talk about?"
                      style={styles.textarea}
                    />
                    <button onClick={addConversation} style={styles.primaryButton} disabled={saving}>Save conversation</button>
                  </div>

                  <div style={styles.card}>
                    <h3 style={styles.sectionTitle}>Conversation history</h3>
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
        )}

        {showQuickAdd && (
          <div style={styles.overlay}>
            <div style={styles.quickAddModal}>
              <h2 style={styles.modalTitle}>Quick Add</h2>
              <p style={styles.subtitle}>Name, quick note, and an optional reminder.</p>

              <input
                placeholder="Name"
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                style={styles.input}
              />
              <textarea
                placeholder="Quick note"
                value={quickAddNote}
                onChange={(e) => setQuickAddNote(e.target.value)}
                style={styles.textarea}
              />

              <div style={{ ...styles.buttonRow, ...(window.innerWidth >= 700 ? { flexWrap: "wrap" } : { flexDirection: "column", width: "100%" }) }}>
                <button onClick={() => setShowQuickAdd(false)} style={styles.secondaryButton} disabled={saving}>Cancel</button>
                <button onClick={() => quickAddContact(null)} style={styles.secondaryButton} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => quickAddContact(7)} style={styles.secondaryButton} disabled={saving}>{saving ? "Saving..." : "Save + 7d"}</button>
                <button onClick={() => quickAddContact(30)} style={styles.primaryButton} disabled={saving}>{saving ? "Saving..." : "Save + 30d"}</button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>{form.id ? "Edit contact" : "Add contact"}</h2>

              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} />
              <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} style={styles.input}>
                <option>Friend</option>
                <option>Colleague</option>
                <option>Family</option>
              </select>
              <input placeholder="Job" value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} style={styles.input} />
              <input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} style={styles.input} />
              <input placeholder="Partner" value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} style={styles.input} />
              <input placeholder="Children" value={form.children} onChange={(e) => setForm({ ...form, children: e.target.value })} style={styles.input} />
              <input placeholder="Pets" value={form.pets} onChange={(e) => setForm({ ...form, pets: e.target.value })} style={styles.input} />
              <input placeholder="Other" value={form.other} onChange={(e) => setForm({ ...form, other: e.target.value })} style={styles.input} />
              <input type="date" value={form.lastContacted} onChange={(e) => setForm({ ...form, lastContacted: e.target.value })} style={styles.input} />
              <input type="date" value={form.nextReminder} onChange={(e) => setForm({ ...form, nextReminder: e.target.value })} style={styles.input} />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={styles.textarea} />

              <div style={{ ...styles.buttonRow, ...(window.innerWidth >= 700 ? { flexWrap: "wrap" } : { flexDirection: "column", width: "100%" }) }}>
                <button onClick={() => setShowForm(false)} style={styles.secondaryButton} disabled={saving}>Cancel</button>
                <button onClick={saveContact} style={styles.primaryButton} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
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
    background: "#e9edf2",
    minHeight: "100vh",
    padding: "16px",
    color: "#111827",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  title: {
    fontSize: "clamp(28px, 5vw, 38px)",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "6px",
    letterSpacing: "0.3px",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "14px",
    color: "#475569",
    marginBottom: "18px",
    textAlign: "center",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "20px",
    lineHeight: 1.15,
    color: "#0f172a",
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "24px",
    lineHeight: 1.15,
    color: "#0f172a",
  },
  detailName: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "6px",
  },
  errorBox: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  topBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "10px",
    marginBottom: "18px",
    alignItems: "stretch",
  },
  statBox: {
    background: "white",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: "84px",
    cursor: "pointer",
    textAlign: "center",
    color: "#1f2937",
  },
  statBoxActive: {
    background: "#dbeafe",
    border: "1px solid #60a5fa",
  },
  statNumber: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#111827",
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#374151",
    marginTop: "6px",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "16px",
  },
  sidebar: {
    background: "white",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "14px",
    order: 1,
  },
  mainPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    order: 2,
  },
  card: {
    background: "white",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "16px",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  buttonRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  primaryButton: {
    background: "#0f172a",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    minHeight: "44px",
    fontSize: "15px",
    width: "100%",
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
    width: "100%",
  },
  dangerButton: {
    background: "#c0392b",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    minHeight: "44px",
    fontSize: "15px",
    width: "100%",
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
    maxHeight: "50vh",
    overflowY: "auto",
    paddingRight: "2px",
  },
  contactButton: {
    width: "100%",
    textAlign: "left",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "14px",
    cursor: "pointer",
  },
  contactButtonActive: {
    background: "#dbeafe",
    border: "1px solid #3b82f6",
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
    fontWeight: "700",
    marginBottom: "4px",
    fontSize: "16px",
    color: "#0f172a",
  },
  contactMeta: {
    fontSize: "13px",
    color: "#475569",
    marginBottom: "2px",
    lineHeight: 1.35,
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  },
  reminderRow: {
    marginTop: "16px",
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    flexDirection: "column",
  },
  notesBox: {
    marginTop: "16px",
    padding: "12px",
    background: "#f8fafc",
    borderRadius: "10px",
  },
  conversationItem: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "10px",
    marginTop: "10px",
  },
  smallText: {
    fontSize: "13px",
    color: "#64748b",
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
  quickAddModal: {
    width: "100%",
    maxWidth: "520px",
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxSizing: "border-box",
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
  desktopOnly: {
    display: "none",
  },
};
