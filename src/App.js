import React, { useState, useEffect } from 'react';
import { Mail, Send, Inbox, FileText, Trash2, Star, Archive, Search, PenSquare, X, RefreshCw, Paperclip, Clock, CheckCircle } from 'lucide-react';

const EmailApp = () => {
  const [currentView, setCurrentView] = useState('inbox');
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    body: ''
  });

  // Initialize with sample data
  useEffect(() => {
    const sampleEmails = [
      {
        id: 1,
        from: 'john.doe@example.com',
        to: 'me@myemail.com',
        subject: 'Welcome to our platform!',
        body: 'Thank you for joining us. We are excited to have you on board.',
        date: new Date(Date.now() - 3600000),
        read: false,
        starred: false,
        folder: 'inbox'
      },
      {
        id: 2,
        from: 'newsletter@tech.com',
        to: 'me@myemail.com',
        subject: 'Weekly Tech Digest',
        body: 'Here are this week\'s top tech stories...',
        date: new Date(Date.now() - 7200000),
        read: true,
        starred: true,
        folder: 'inbox'
      },
      {
        id: 3,
        from: 'me@myemail.com',
        to: 'client@company.com',
        subject: 'Project Update',
        body: 'Here is the latest update on our project progress.',
        date: new Date(Date.now() - 86400000),
        read: true,
        starred: false,
        folder: 'sent'
      }
    ];
    setEmails(sampleEmails);
  }, []);

  const handleCompose = () => {
    setComposing(true);
    setSelectedEmail(null);
    setComposeForm({ to: '', subject: '', body: '' });
  };

  const handleSendEmail = () => {
    const newEmail = {
      id: emails.length + 1,
      from: 'me@myemail.com',
      to: composeForm.to,
      subject: composeForm.subject,
      body: composeForm.body,
      date: new Date(),
      read: true,
      starred: false,
      folder: 'sent'
    };
    setEmails([newEmail, ...emails]);
    setComposing(false);
    setComposeForm({ to: '', subject: '', body: '' });
    setCurrentView('sent');
  };

  const handleDeleteEmail = (emailId) => {
    const email = emails.find(e => e.id === emailId);
    if (email.folder === 'trash') {
      setEmails(emails.filter(e => e.id !== emailId));
    } else {
      setEmails(emails.map(e => 
        e.id === emailId ? { ...e, folder: 'trash' } : e
      ));
    }
    setSelectedEmail(null);
  };

  const handleStarEmail = (emailId) => {
    setEmails(emails.map(e => 
      e.id === emailId ? { ...e, starred: !e.starred } : e
    ));
  };

  const handleArchiveEmail = (emailId) => {
    setEmails(emails.map(e => 
      e.id === emailId ? { ...e, folder: 'archive' } : e
    ));
    setSelectedEmail(null);
  };

  const handleMarkAsRead = (emailId) => {
    setEmails(emails.map(e => 
      e.id === emailId ? { ...e, read: true } : e
    ));
  };

  const getFilteredEmails = () => {
    let filtered = emails;
    
    if (currentView === 'inbox') {
      filtered = emails.filter(e => e.folder === 'inbox');
    } else if (currentView === 'sent') {
      filtered = emails.filter(e => e.folder === 'sent');
    } else if (currentView === 'starred') {
      filtered = emails.filter(e => e.starred);
    } else if (currentView === 'trash') {
      filtered = emails.filter(e => e.folder === 'trash');
    } else if (currentView === 'archive') {
      filtered = emails.filter(e => e.folder === 'archive');
    }

    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.body.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => b.date - a.date);
  };

  const formatDate = (date) => {
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

  const unreadCount = emails.filter(e => !e.read && e.folder === 'inbox').length;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600 flex items-center">
            <Mail className="mr-2" />
            MailBox
          </h1>
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
            {unreadCount > 0 && (
              <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
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
            <button className="ml-3 p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

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
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                      disabled={!composeForm.to || !composeForm.subject}
                    >
                      <Send className="mr-2" size={18} />
                      Send
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
                  <p className="text-sm text-gray-500">{getFilteredEmails().length} emails</p>
                </div>
                
                <div>
                  {getFilteredEmails().map((email) => (
                    <div
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(email);
                        handleMarkAsRead(email.id);
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
                              handleStarEmail(email.id);
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
                  ))}
                  
                  {getFilteredEmails().length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>No emails in {currentView}</p>
                    </div>
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
                          {selectedEmail.date.toLocaleString('en-US', { 
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
                          onClick={() => handleStarEmail(selectedEmail.id)}
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
                    <button className="flex items-center text-blue-600 hover:text-blue-700 font-medium">
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