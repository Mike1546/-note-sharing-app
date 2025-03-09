import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Lock, Unlock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/authStore';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  password_hash: string;
}

function LockedNotes() {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});
  const [password, setPassword] = useState('');
  const [viewPassword, setViewPassword] = useState('');
  const [unlockedNotes, setUnlockedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('owner_id', user?.id)
      .eq('is_locked', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setNotes(data || []);
  }

  async function handleSave() {
    if (!currentNote.title || !currentNote.content || !password) return;

    const noteData = {
      title: currentNote.title,
      content: currentNote.content,
      owner_id: user?.id,
      is_locked: true,
      password_hash: password, // In a real app, hash this password
    };

    if (currentNote.id) {
      const { error } = await supabase
        .from('notes')
        .update(noteData)
        .eq('id', currentNote.id);

      if (error) {
        console.error('Error updating note:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('notes')
        .insert([noteData]);

      if (error) {
        console.error('Error creating note:', error);
        return;
      }
    }

    setIsEditing(false);
    setCurrentNote({});
    setPassword('');
    fetchNotes();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    fetchNotes();
  }

  function handleUnlock(note: Note) {
    if (viewPassword === note.password_hash) { // In a real app, verify hash
      setUnlockedNotes(new Set([...unlockedNotes, note.id]));
      setViewPassword('');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Locked Notes</h1>
        <button
          onClick={() => {
            setCurrentNote({});
            setIsEditing(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Locked Note
        </button>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-lg shadow p-6">
          <input
            type="text"
            placeholder="Title"
            value={currentNote.title || ''}
            onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
            className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md"
          />
          <textarea
            placeholder="Content"
            value={currentNote.content || ''}
            onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
            className="w-full h-40 mb-4 px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="password"
            placeholder="Set password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setPassword('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{note.title}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentNote(note);
                      setIsEditing(true);
                    }}
                    className="text-gray-600 hover:text-indigo-600"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {unlockedNotes.has(note.id) ? (
                <>
                  <p className="text-gray-600 whitespace-pre-wrap">{note.content}</p>
                  <div className="mt-4 text-sm text-gray-500">
                    Created: {new Date(note.created_at).toLocaleDateString()}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Enter password to view"
                    value={viewPassword}
                    onChange={(e) => setViewPassword(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={() => handleUnlock(note)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LockedNotes;