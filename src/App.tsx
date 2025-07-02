import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost/crud-activity/api.php";

if (!API_URL) {
  console.error("API_URL is not defined. Please set VITE_API_URL in your environment.");
}

interface EventItem {
  id: number;
  title: string;
  description: string;
  date: string;
  url?: string;  
}

interface EventForm {
  title: string;
  description: string;
  date: string;
  image?: File | null;      
  imageUrl?: string | null; 
}

function App() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [form, setForm] = useState<EventForm>({ title: '', description: '', date: '', image: null, imageUrl: null });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseURL = API_URL.replace('/api.php', '');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data: EventItem[] = await res.json();
      setEvents(data);
    } catch (error) {
      alert("Error fetching events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setForm((prev) => ({ ...prev, image: e.target.files![0], imageUrl: null }));
    } else {
      setForm((prev) => ({ ...prev, image: null }));
    }
  };

  const handleClearImage = () => {
    setForm((prev) => ({ ...prev, image: null, imageUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setForm({ title: '', description: '', date: '', image: null, imageUrl: null });
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      alert("Title and Date are required");
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('date', form.date);

    if (editingId) {
      formData.append('id', editingId.toString()); 
    }

    if (form.image) {
      formData.append('image', form.image);
    } else if (editingId && form.imageUrl === null) {
      formData.append('remove_image', '1');
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        resetForm();
        fetchEvents();
      } else {
        const error = await res.json();
        alert(error.error || "Something went wrong");
      }
    } catch (err) {
      alert("Request failed");
    }
  };

  const handleEdit = (event: EventItem) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      date: event.date,
      image: null,
      imageUrl: event.url ?? null,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      const res = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchEvents();
      else alert("Failed to delete event");
    } catch (err) {
      alert("Delete failed");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>Event Management</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <input
          type="text"
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 8, marginBottom: 8 }}
        />
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          style={{ width: '100%', padding: 8, marginBottom: 8 }}
        />
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 8, marginBottom: 8 }}
        />

        {form.imageUrl && !form.image && (
          <div style={{ marginBottom: 8 }}>
            <img
              src={`${baseURL}/${form.imageUrl}`}
              alt="Current"
              style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 6 }}
            />
            <br />
            <button type="button" onClick={handleClearImage} style={{ marginTop: 4 }}>
              Remove Image
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          name="image"
          accept="image/*"
          onChange={handleFileChange}
          style={{ marginBottom: 16 }}
        />

        <button type="submit">{editingId ? "Update Event" : "Add Event"}</button>
        {editingId !== null && (
          <button
            type="button"
            onClick={resetForm}
            style={{ marginLeft: 8 }}
          >
            Cancel
          </button>
        )}
      </form>

      {loading ? (
        <p>Loading events...</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {events.map((event) => (
            <li
              key={event.id}
              style={{
                marginBottom: 12,
                borderBottom: '1px solid #ccc',
                paddingBottom: 8,
              }}
            >
              <strong>{event.title}</strong> - <em>{event.date}</em>
              <p>{event.description}</p>
              {event.url && (
                <img
                  src={`${baseURL}/${event.url}`}
                  alt={event.title}
                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, marginTop: 8 }}
                />
              )}
              <div style={{ marginTop: 8 }}>
                <button onClick={() => handleEdit(event)}>Edit</button>
                <button
                  onClick={() => handleDelete(event.id)}
                  style={{ marginLeft: 8 }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
