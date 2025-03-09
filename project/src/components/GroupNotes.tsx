import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Users, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/authStore';

interface GroupNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
}

interface GroupMember {
  user_id: string;
  role: string;
  profiles: {
    username: string;
  };
}

function GroupNotes() {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<GroupNote[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<GroupNote>>({});
  const [members, setMembers] = useState<Record<string, GroupMember[]>>({});
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [showAddMember, setShowAddMember] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data, error } = await supabase
      .from('group_notes')
      .select(`
        *,
        group_members!inner (
          user_id,
          role,
          profiles (
            username
          )
        )
      `)
      .eq('group_members.user_id', user?.id);

    if (error) {
      console.error('Error fetching group notes:', error);
      return;
    }

    if (data) {
      setNotes(data);
      const membersByNote: Record<string, GroupMember[]> = {};
      data.forEach((note: any) => {
        membersByNote[note.id] = note.group_members;
      });
      setMembers(membersByNote);
    }
  }

  async function handleSave() {
    if (!currentNote.title || !currentNote.content) return;

    const noteData = {
      title: currentNote.title,
      content: currentNote.content,
      created_by: user?.id,
    };

    if (currentNote.id) {
      const { error } = await supabase
        .from('group_notes')
        .update(noteData)
        .eq('id', currentNote.id);

      if (error) {
        console.error('Error updating note:', error);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('group_notes')
        .insert([noteData])
        .select()
        .single();

      if (error) {
        console.error('Error creating note:', error);
        return;
      }

      if (data) {
        // Add creator as owner
        const { error: memberError } = await supabase
          .from('group_members')
          .insert([{
            group_note_id: data.id,
            user_id: user?.id,
            role: 'owner'
          }]);

        if (memberError) {
          console.error('Error adding member:', memberError);
          return;
        }
      }
    }

    setIsEditing(false);
    setCurrentNote({});
    fetchNotes();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('group_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    fetchNotes();
  }

  async function handleAddMember(noteId: string) {
    if (!newMemberEmail) return;

    // First get the user ID from the email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', newMemberEmail)
      .single();

    if (userError || !userData) {
      console.error('User not found');
      return;
    }

    const { error } = await supabase
      .from('group_members')
      .insert([{
        group_note_id: noteId,
        user_id: userData.id,
        role: 'viewer'
      }]);

    if (error) {
      console.error('Error adding member:', error);
      return;
    }

    setNewMemberEmail('');
    setShowAddMember(null);
    fetchNotes();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Group Notes</h1>
        <button
          onClick={() => {
            setCurrentNote({});
            setIsEditing(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Group Note
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
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
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
                    onClick={() => setShowAddMember(note.id)}
                    className="text-gray-600 hover:text-indigo-600"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
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

              {showAddMember === note.id && (
                <div className="mb-4 flex gap-2">
                  <input
                    type="email"
                    placeholder="Member's email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={() => handleAddMember(note.id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddMember(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <p className="text-gray-600 whitespace-pre-wrap">{note.content}</p>
              
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>Members: </span>
                {members[note.id]?.map((member) => (
                  <span key={member.user_id} className="bg-gray-100 px-2 py-1 rounded">
                    {member.profiles.username} ({member.role})
                  </span>
                ))}
              </div>
              
              <div className="mt-2 text-sm text-gray-500">
                Created: {new Date(note.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GroupNotes;