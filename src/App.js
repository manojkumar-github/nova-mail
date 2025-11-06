import React, { useState, useEffect } from 'react';
import { Mail, Send, Inbox, FileText, Trash2, Star, Archive, Search, PenSquare, X, RefreshCw, Paperclip, Clock, CheckCircle } from 'lucide-react';

// API Configuration - Update this with your Render backend URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://nova-mail-backend.onrender.com';

const EmailApp = () => {
  const [currentView, setCurrentView] = useState('inbox');
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authMode, setAuthMode] = useState('login');
  const [folderCounts, setFolderCounts] = useState({});
  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Fetch user data on mount if token exists
  useEffect(() => {
    if (token) {
      fetchEmails();
      fetchFolderCounts();
    }
  }, [token, currentView, searchQuery]);

  // API call helper
  const apiCall = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Authentication functions
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password, name: authForm.name };

      const data = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      setAuthForm({ email: '', password: '', name: '' });
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setEmails([]);
    setSelectedEmail(null);
  };

  // Fetch emails
  const fetchEmails = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (currentView !== 'starred') {
        params.append('folder', currentView);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const data = await apiCall(`/api/emails?${params}`);
      
      let filteredEmails = data;
      if (currentView === 'starred') {
        filteredEmails = data.filter(e => e.starred);
      }

      setEmails(filteredEmails);
    } catch (err) {
      console.error('Fetch emails error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch folder counts
  const fetchFolderCounts = async () => {
    try {
      const data = await apiCall('/api/folders/counts');
      setFolderCounts(data);
    } catch (err) {
      console.error('Fetch folder counts error:', err);
    }
  };

  // Compose and send email
  const handleCompose = () => {
    setComposing(true);
    setSelectedEmail(null);
    setComposeForm({ to: '', subject: '', body: '' });
  };

  const handleSendEmail = async () => {
    if (!composeForm.to || !composeForm.subject) {
      setError('To and subject are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiCall('/api/emails', {
        method: 'POST',
        body: JSON.stringify(composeForm)
      });

      setComposing(false);
      setComposeForm({ to: '', subject: '', body: '' });
      setCurrentView('sent');
      await fetchEmails();
      await fetchFolderCounts();
    } catch (err) {
      console.error('Send email error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete email
  const handleDeleteEmail = async (emailId) => {
    setLoading(true);
    setError(null);

    try {
      await apiCall(`/api/emails/${emailId}`, {
        method: 'DELETE'
      });

      setSelectedEmail(null);
      await fetchEmails();
      await fetchFolderCounts();
    } catch (err) {
      console.error('Delete email error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Star email
  const handleStarEmail = async (emailId, currentStarred) => {
    try {
      await apiCall(`/api/emails/${emailId}`, {
        method: 'PATCH',
        body: JSON.stringify({ starred: !currentStarred })
      });

      await fetchEmails();
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, starred: !currentStarred });
      }
    } catch (err) {
      console.error('Star email error:', err);
    }
  };

  // Archive email
  const handleArchiveEmail = async (emailId) => {
    setLoading(true);
    setError(null);

    try {
      await apiCall(`/api/emails/${emailId}`, {
        method: 'PATCH',
        body: JSON.stringify({ folder: 'archive' })
      });

      setSelectedEmail(null);
      await fetchEmails();
      await fetchFolderCounts();
    } catch (err) {
      console.error('Archive email error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark as read
  const handleMarkAsRead = async (emailId) => {
    try {
      await apiCall(`/api/emails/${emailId}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: true })
      });

      await fetchEmails();
      await fetchFolderCounts();
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Login/Register UI
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Mail className="mx-auto text-blue-600 mb-4" size={48} />
            <h1 className="text-3xl font-bold text-gray-900">MailBox</h1>
            <p className="text-gray-600 mt-2">Your secure email platform</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth}>
            {authMode === 'register' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={authMode === 'register'}
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Register')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              {authMode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main email UI
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600 flex items-center">
            <Mail className="mr-2" />
            MailBox
          </h1>
          {user && <p className="text-xs text-gray-500 mt-1">{user.email}</p>}
        </div>
        
        <div className="p-4">
          <button
            onClick={handleCompose}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg flex items-center justify-center hover:bg-blue-700 transition"
          >
            <PenSquare className="mr-2" size={18} />
            Compose
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <button
            onClick={() => setCurrentView('inbox')}
            className={`w-full text-left px-4 py-3 flex items-center hover:bg-gray-50 ${
              currentView === 'inbox' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
            }`}
          >
            <Inbox className="mr-3" size={20} />
            Inbox
            {folderCounts.unread > 0 && (
              <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {folderCounts.unread}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('starred')}
            className={`w-full text-left px-4 py-3 flex items-center hover:bg-gray-50 ${
              currentView === 'starred' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
            }`}
          >
            <Star className="mr-3" size={20} />
            Starred
          </button>

          <button
            onClick={() => setCurrentView('sent')}
            className={`w-full text-left px-4 py-3 flex items-center hover:bg-gray-50 ${
              currentView === 'sent' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
            }`}
          >
            <Send className="mr-3" size={20} />
            Sent
          </button>

          <button
            onClick={() => setCurrentView('archive')}
            className={`w-full text-left px-4 py-3 flex items-center hover:bg-gray-50 ${
              currentView === 'archive' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
            }`}
          >
            <Archive className="mr-3" size={20} />
            Archive
          </button>

          <button
            onClick={() => setCurrentView('trash')}
            className={`w-full text-left px-4 py-3 flex items-center hover:bg-gray-50 ${
              currentView === 'trash' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
            }`}
          >
            <Trash2 className="mr-3" size={20} />
            Trash
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-2xl flex items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={fetchEmails}
              disabled={loading}
              className="ml-3 p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Email List or Compose */}
        <div className="flex-1 overflow-hidden flex">
          {composing ? (
            <div className="flex-1 bg-white m-4 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">New Message</h2>
                <button onClick={() => setComposing(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input
                    type="email"
                    value={composeForm.to}
                    onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="recipient@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email subject"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={composeForm.body}
                    onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-64 resize-none"
                    placeholder="Write your message here..."
                  />
                </div>
                
                <div className="flex justify-between items-center pt-4">
                  <button className="flex items-center text-gray-600 hover:text-gray-800">
                    <Paperclip className="mr-2" size={20} />
                    Attach files
                  </button>
                  
                  <div className="space-x-3">
                    <button
                      onClick={() => setComposing(false)}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={loading || !composeForm.to || !composeForm.subject}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
                    >
                      <Send className="mr-2" size={18} />
                      {loading ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Email List */}
              <div className={`${selectedEmail ? 'w-96' : 'flex-1'} bg-white m-4 rounded-lg shadow overflow-y-auto`}>
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold capitalize">{currentView}</h2>
                  <p className="text-sm text-gray-500">{emails.length} emails</p>
                </div>
                
                <div>
                  {loading && emails.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <RefreshCw size={48} className="mx-auto mb-4 text-gray-300 animate-spin" />
                      <p>Loading emails...</p>
                    </div>
                  ) : emails.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>No emails in {currentView}</p>
                    </div>
                  ) : (
                    emails.map((email) => (
                      <div
                        key={email.id}
                        onClick={() => {
                          setSelectedEmail(email);
                          if (!email.read) handleMarkAsRead(email.id);
                        }}
                        className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                          selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                        } ${!email.read ? 'bg-blue-50 bg-opacity-30' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center mb-1">
                              <p className={`font-semibold truncate ${!email.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                {currentView === 'sent' ? email.to : email.from}
                              </p>
                              {!email.read && (
                                <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full"></span>
                              )}
                            </div>
                            <p className={`truncate ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {email.subject}
                            </p>
                            <p className="text-sm text-gray-500 truncate mt-1">{email.body}</p>
                          </div>
                          <div className="flex items-center ml-4 space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStarEmail(email.id, email.starred);
                              }}
                              className="text-gray-400 hover:text-yellow-500"
                            >
                              <Star size={18} fill={email.starred ? 'currentColor' : 'none'} />
                            </button>
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                              {formatDate(email.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Email Detail */}
              {selectedEmail && (
                <div className="flex-1 bg-white m-4 ml-0 rounded-lg shadow overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-2xl font-bold flex-1">{selectedEmail.subject}</h2>
                      <button
                        onClick={() => setSelectedEmail(null)}
                        className="text-gray-500 hover:text-gray-700 ml-4"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {currentView === 'sent' ? `To: ${selectedEmail.to}` : `From: ${selectedEmail.from}`}
                        </p>
                        <p className="text-gray-500 mt-1">
                          {new Date(selectedEmail.date).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStarEmail(selectedEmail.id, selectedEmail.starred)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="Star"
                        >
                          <Star size={20} fill={selectedEmail.starred ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={() => handleArchiveEmail(selectedEmail.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="Archive"
                        >
                          <Archive size={20} />
                        </button>
                        <button
                          onClick={() => handleDeleteEmail(selectedEmail.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="Delete"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap text-gray-800">{selectedEmail.body}</p>
                    </div>
                  </div>
                  
                  <div className="p-6 border-t border-gray-200">
                    <button 
                      onClick={() => {
                        setComposeForm({
                          to: selectedEmail.from,
                          subject: `Re: ${selectedEmail.subject}`,
                          body: ''
                        });
                        setComposing(true);
                      }}
                      className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Send className="mr-2" size={18} />
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailApp;