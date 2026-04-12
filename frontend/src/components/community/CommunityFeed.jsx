/**
 * CommunityFeed Component - Tailwind CSS Version
 * 
 * Posts: Hardcoded sample data (local state, resets on refresh)
 * Chat: Real-time Firebase (fully functional)
 */

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Plus, Send, X, Heart, MessageCircle, Share2, Edit2, Trash2 } from 'lucide-react';

const CommunityFeed = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    location: '',
    content: '',
    imageUrl: ''
  });
  const [editingPost, setEditingPost] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);
  const [showThreadPopup, setShowThreadPopup] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [newThreadName, setNewThreadName] = useState('');
  const [showCreateThreadModal, setShowCreateThreadModal] = useState(false);

  const samplePosts = [
    {
      id: 'sample-1',
      userId: 'demo-user-1',
      userName: 'Maria Santos',
      userPhoto: 'https://i.pravatar.cc/150?img=5',
      location: 'Baguio City, Benguet',
      content: 'Its so fun in Baguio City! 🌅',
      imageUrls: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800'],
      likes: 24,
      likedBy: [],
      comments: [
        {
          id: 'c1',
          userId: 'demo-user-2',
          userName: 'Juan Dela Cruz',
          userAvatar: 'https://i.pravatar.cc/150?img=12',
          text: 'Wow! This looks amazing! 😍',
          timestamp: new Date(Date.now() - 3600000)
        }
      ],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 }
    },
    {
      id: 'sample-2',
      userId: 'demo-user-2',
      userName: 'Juan Dela Cruz',
      userPhoto: 'https://i.pravatar.cc/150?img=12',
      location: 'Baguio City, Benguet',
      content: 'Burnham Park is a must-visit in Baguio! The gardens and lake are so peaceful. Perfect for a relaxing day out! 🌳🌸',
      imageUrls: [
        'https://images.unsplash.com/photo-1578469645742-27e5dd1d4ec4?w=800',
        'https://images.unsplash.com/photo-1621277224630-81d9af65e40e?w=800'
      ],
      likes: 42,
      likedBy: [],
      comments: [],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 172800 }
    },
    {
      id: 'sample-3',
      userId: 'demo-user-3',
      userName: 'Sarah Johnson',
      userPhoto: 'https://i.pravatar.cc/150?img=9',
      location: 'Baguio City, Benguet',
      content: 'Session road in Baguio is a must-visit! The vibrant atmosphere and local shops make it a great place to explore. ✨',
      imageUrls: ['https://images.unsplash.com/photo-1583316130613-29a86fa1b5f6?w=800'],
      likes: 67,
      likedBy: [],
      comments: [
        {
          id: 'c2',
          userId: 'demo-user-1',
          userName: 'Maria Santos',
          userAvatar: 'https://i.pravatar.cc/150?img=5',
          text: 'Adding this to my bucket list! 🙌',
          timestamp: new Date(Date.now() - 7200000)
        },
        {
          id: 'c3',
          userId: 'demo-user-4',
          userName: 'Pedro Reyes',
          userAvatar: 'https://i.pravatar.cc/150?img=15',
          text: 'Been there last year, truly magical!',
          timestamp: new Date(Date.now() - 5400000)
        }
      ],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 259200 }
    },
    {
      id: 'sample-4',
      userId: 'demo-user-4',
      userName: 'Pedro Reyes',
      userPhoto: 'https://i.pravatar.cc/150?img=15',
      location: 'Baguio City, Benguet',
      content: 'Strawberry picking in Baguio was so much fun! Fresh strawberries and beautiful farm views. A sweet experience! 🍓🌄',
      imageUrls: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
      likes: 31,
      likedBy: [],
      comments: [],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 345600 }
    },
    {
      id: 'sample-5',
      userId: 'demo-user-5',
      userName: 'Anna Lee',
      userPhoto: 'https://i.pravatar.cc/150?img=20',
      location: 'Baguio City, Benguet',
      content: 'The view from Mines View Park is breathtaking! You can see the mountains and pine trees stretching out as far as the eye can see. A must-see spot in Baguio! 🏞️🌲',
      imageUrls: [
        'https://images.unsplash.com/photo-1580501170888-80668882ca0c?w=800',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
      ],
      likes: 89,
      likedBy: [],
      comments: [
        {
          id: 'c4',
          userId: 'demo-user-3',
          userName: 'Sarah Johnson',
          userAvatar: 'https://i.pravatar.cc/150?img=9',
          text: 'This is on my list for next year!',
          timestamp: new Date(Date.now() - 10800000)
        }
      ],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 432000 }
    }
  ];

  useEffect(() => {
    const threadsRef = collection(db, 'chatThreads');
    const q = query(threadsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const threadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // ⭐ NEW: If no threads exist, create a default "General" thread
      if (threadsData.length === 0) {
        try {
          console.log('📝 No threads found. Creating default "General" thread...');
          const defaultThreadData = {
            name: 'General',
            createdBy: 'system',
            createdByName: 'System',
            createdAt: serverTimestamp(),
            lastMessage: serverTimestamp(),
            lastMessageText: 'Welcome to the community chat!'
          };
          
          const docRef = await addDoc(threadsRef, defaultThreadData);
          console.log('✅ Default "General" thread created with ID:', docRef.id);
          
          // Add welcome message to the new thread
          await addDoc(
            collection(db, 'chatThreads', docRef.id, 'messages'),
            {
              userId: 'system',
              userName: 'System',
              userAvatar: '🤖',
              text: 'Welcome to the Travel Community chat! Feel free to share your travel experiences and connect with fellow travelers. 🌏✈️',
              createdAt: serverTimestamp()
            }
          );
          
          return; // Let the listener trigger again with the new thread
        } catch (error) {
          console.error('❌ Error creating default thread:', error);
        }
      }
      
      setThreads(threadsData);
      
      // Set active thread to first one if not set
      if (!activeThread && threadsData.length > 0) {
        setActiveThread(threadsData[0]);
      }
      
      console.log('💬 Threads loaded:', threadsData.length);
    }, (error) => {
      console.error('❌ Error loading threads:', error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for messages in active thread
  useEffect(() => {
    if (!activeThread) return;

    const messagesRef = collection(db, 'chatThreads', activeThread.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update the active thread with messages
      setActiveThread(prev => ({
        ...prev,
        messages: messagesData
      }));
      
      console.log(`💬 Messages loaded for thread "${activeThread.name}":`, messagesData.length);
    }, (error) => {
      console.error('❌ Error loading messages:', error);
    });

    return () => unsubscribe();
  }, [activeThread?.id]);

  // ⭐ MODIFIED: Use hardcoded sample posts instead of Firebase (for demo without Storage billing)
  useEffect(() => {
    // Load sample posts into state
    setPosts(samplePosts);
    console.log('📝 Sample posts loaded:', samplePosts.length);
  }, []); // Load once on mount

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === 'chat' && activeThread?.messages) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread?.messages, activeTab]);

  // Upload images to Firebase Storage
  // Create post in local state only
  const handleCreatePost = async () => {
    if (!currentUser) {
      alert('Please login to create posts!');
      return;
    }

    if (!newPost.location.trim() || !newPost.content.trim()) {
      alert('Please fill in all fields!');
      return;
    }

    setIsUploading(true);

    try {
      let imageUrls = [];
      if (newPost.imageUrl && newPost.imageUrl.trim()) {
        imageUrls = [newPost.imageUrl.trim()];
        console.log('✅ Using image URL:', imageUrls[0]);
      }

      const postData = {
        id: `post-${Date.now()}`, // Generate unique ID for local state
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userPhoto: currentUser.photoURL || 'https://i.pravatar.cc/150?img=0',
        location: newPost.location,
        content: newPost.content,
        imageUrls: imageUrls,
        likes: 0,
        likedBy: [],
        comments: [],
        createdAt: new Date()
      };

      console.log('📝 Adding post to local state:', postData);
      setPosts([postData, ...posts]);
      
      console.log('✅ Post added to local state with ID:', postData.id);
    
      setNewPost({ location: '', content: '', imageUrl: '' });
      setShowCreatePost(false);
    
      alert('Post created! 🎉\n\nNote: This is demo mode - posts will reset on page refresh.');
    } catch (error) {
      console.error('❌ Error creating post:', error);
      alert(`Failed to create post: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // ⭐ NEW: Handler to send chat messages to Firebase
  // This function adds a new message to the active thread's messages subcollection
  const handleSendMessage = async () => {
    // Validation: Check if message is not empty, user is logged in, and thread is selected
    if (!newMessage.trim() || !currentUser || !activeThread) return;

    try {
      // Create message data object with user info and timestamp
      const messageData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userAvatar: currentUser.photoURL || '👤',
        text: newMessage,
        createdAt: serverTimestamp() // Firebase timestamp for sorting
      };

      // Add message to Firestore: chatThreads/{threadId}/messages
      await addDoc(
        collection(db, 'chatThreads', activeThread.id, 'messages'),
        messageData
      );

      // Update the thread's last message info for the sidebar
      await updateDoc(doc(db, 'chatThreads', activeThread.id), {
        lastMessage: serverTimestamp(),
        lastMessageText: newMessage.substring(0, 50) + (newMessage.length > 50 ? '...' : '')
      });

      console.log('✅ Message sent to thread:', activeThread.name);
      setNewMessage(''); // Clear input field after sending
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // ⭐ NEW: Handler to create new chat threads
  // This function creates a new thread in Firebase and makes it active
  const handleCreateThread = async () => {
    // Validation: Check if thread name is not empty and user is logged in
    if (!newThreadName.trim() || !currentUser) {
      if (!currentUser) {
        alert('Please login to create threads!');
      } else {
        alert('Please enter a thread name!');
      }
      return;
    }

    try {
      // Create thread data object with creator info
      const threadData = {
        name: newThreadName,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
        lastMessage: serverTimestamp(),
        lastMessageText: 'Thread created'
      };

      // Add thread to Firestore: chatThreads collection
      const docRef = await addDoc(collection(db, 'chatThreads'), threadData);
      console.log('✅ Thread created:', newThreadName);
      
      // Reset form and close modal
      setNewThreadName('');
      setShowCreateThreadModal(false);
      
      // Set as active thread (without messages initially - they'll load via useEffect)
      setActiveThread({
        id: docRef.id,
        ...threadData,
        messages: [] // Initialize with empty messages array
      });
    } catch (error) {
      console.error('❌ Error creating thread:', error);
      alert('Failed to create thread');
    }
  };

  // ⭐ NEW: Handler functions for post interactions (like, delete, edit, comment)
  // These were completely missing, causing PostCard to not work properly

  const handleLikePost = async (postId) => {
    if (!currentUser) {
      alert('Please login to like posts!');
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const isLiked = post.likedBy?.includes(currentUser.uid);
      
      // Update local state
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes: isLiked ? Math.max(0, p.likes - 1) : (p.likes || 0) + 1,
            likedBy: isLiked 
              ? p.likedBy.filter(uid => uid !== currentUser.uid)
              : [...(p.likedBy || []), currentUser.uid]
          };
        }
        return p;
      }));

      console.log(isLiked ? '👎 Post unliked' : '👍 Post liked');
    } catch (error) {
      console.error('❌ Error updating like:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!currentUser) return;

    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        setPosts(posts.filter(p => p.id !== postId));
        console.log('✅ Post deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting post:', error);
        alert('Failed to delete post');
      }
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !currentUser) return;

    try {
      const postRef = doc(db, 'posts', editingPost.id);
      await updateDoc(postRef, {
        location: editingPost.location,
        content: editingPost.content,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Post updated successfully');
      setEditingPost(null);
    } catch (error) {
      console.error('❌ Error updating post:', error);
      alert('Failed to update post');
    }
  };

  const handleAddComment = async (postId, commentText) => {
    if (!commentText.trim() || !currentUser) return;

    const comment = {
      id: Date.now().toString(),
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Anonymous',
      userAvatar: currentUser.photoURL || '👤',
      text: commentText,
      timestamp: new Date()
    };

    try {
      // Update local state
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...(p.comments || []), comment]
          };
        }
        return p;
      }));
      
      console.log('✅ Comment added');
      setReplyingTo(null);
    } catch (error) {
      console.error('❌ Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!currentUser) return;

    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        // Update local state
        setPosts(posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.filter(c => c.id !== commentId)
            };
          }
          return p;
        }));
        
        console.log('✅ Comment deleted');
      } catch (error) {
        console.error('❌ Error deleting comment:', error);
      }
    }
  };

  // ⭐ NEW: Main return statement - This renders the entire CommunityFeed UI
  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 animate-fadeIn">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-purple mb-2">
          Travel Community
        </h1>
        <p className="text-lg text-slate-600 font-medium">
          Share your adventures and connect with fellow travelers
        </p>
      </div>

      {/* Login Prompt */}
      {!currentUser && (
        <div className="bg-indigo-50 border-2 border-purple-primary rounded-lg p-5 mb-8">
          <p className="text-center text-purple-primary font-semibold text-base">
            👋 Please login to create posts and interact with the community!
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-8 border-b-2 border-slate-200">
        <button 
          className={`flex-1 px-6 py-4 text-center text-sm font-bold uppercase tracking-wider transition-all relative ${
            activeTab === 'posts'
              ? 'text-purple-primary'
              : 'text-slate-600 hover:text-purple-primary'
          }`}
          onClick={() => setActiveTab('posts')}
        >
          Posts
          {activeTab === 'posts' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-purple"></div>
          )}
        </button>
        <button 
          className={`flex-1 px-6 py-4 text-center text-sm font-bold uppercase tracking-wider transition-all relative ${
            activeTab === 'chat'
              ? 'text-purple-primary'
              : 'text-slate-600 hover:text-purple-primary'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-purple"></div>
          )}
        </button>
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {currentUser && (
            <button 
              onClick={() => setShowCreatePost(true)}
              className="w-full bg-gradient-purple hover:shadow-lg text-white font-bold py-5 px-7 rounded-2xl transition-all flex items-center justify-center gap-3 mb-6 hover:-translate-y-0.5"
            >
              <Plus size={20} />
              Share Your Travel Story
            </button>
          )}

          {/* Create Post Modal */}
          {showCreatePost && (
            <div 
              onClick={() => setShowCreatePost(false)}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-modalSlideUp"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-7 border-b-2 border-slate-200">
                  <h2 className="text-2xl font-black text-navy-900">Create New Post</h2>
                  <button 
                    onClick={() => {
                      setShowCreatePost(false);
                      setNewPost({ location: '', content: '', imageUrl: '' });
                    }}
                    disabled={isUploading}
                    className="text-slate-600 hover:text-navy-900 text-2xl font-light transition-colors"
                  >
                    <X size={28} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-7 space-y-5">
                  {/* Location Input */}
                  <div>
                    <label className="block mb-2 font-bold text-navy-900">📍 Location</label>
                    <input 
                      type="text" 
                      placeholder="Where did you go? (e.g., Boracay, Aklan)" 
                      value={newPost.location} 
                      onChange={(e) => setNewPost({ ...newPost, location: e.target.value })} 
                      disabled={isUploading}
                      className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 focus:bg-white transition-all bg-slate-100"
                    />
                  </div>

                  {/* Content Textarea */}
                  <div>
                    <label className="block mb-2 font-bold text-navy-900">✍️ Your Story</label>
                    <textarea 
                      placeholder="Share your experience..." 
                      value={newPost.content} 
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} 
                      disabled={isUploading}
                      rows="5"
                      className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 focus:bg-white focus:shadow-md transition-all bg-slate-100 resize-none font-inherit"
                    />
                  </div>

                  {/* Image URL Input */}
                  <div>
                    <label className="block mb-2 font-bold text-navy-900">🖼️ Image URL (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Paste image URL (e.g., https://images.unsplash.com/...)" 
                      value={newPost.imageUrl || ''} 
                      onChange={(e) => setNewPost({ ...newPost, imageUrl: e.target.value })} 
                      disabled={isUploading}
                      className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 focus:bg-white transition-all bg-slate-100"
                    />
                    <p className="text-xs text-slate-600 mt-1.5">
                      💡 Try{' '}
                      <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-purple-primary hover:underline">
                        Unsplash
                      </a>
                      {' '}or{' '}
                      <a href="https://picsum.photos" target="_blank" rel="noopener noreferrer" className="text-purple-primary hover:underline">
                        Lorem Picsum
                      </a>
                      {' '}for free images
                    </p>
                  </div>

                  {/* Image Preview */}
                  {newPost.imageUrl && (
                    <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                      <img 
                        src={newPost.imageUrl} 
                        alt="Preview" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'block';
                        }}
                        className="w-full max-h-52 object-cover"
                      />
                      <p className="hidden text-red-600 text-xs p-3">
                        ❌ Failed to load image. Please check the URL.
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex gap-3 justify-end p-7 border-t-2 border-slate-200">
                  <button 
                    onClick={handleCreatePost}
                    disabled={isUploading || !newPost.location.trim() || !newPost.content.trim()}
                    className={`px-6 py-2.5 rounded-lg font-bold text-white transition-all ${
                      isUploading || !newPost.location.trim() || !newPost.content.trim()
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-purple-primary hover:bg-indigo-700 active:scale-95'
                    }`}
                  >
                    {isUploading ? '⏳ Posting...' : '📤 Post'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Posts List */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-5xl mb-3">📭</p>
                <p className="text-xl text-slate-600">
                  No posts yet. Be the first to share your travel story!
                </p>
              </div>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onLike={handleLikePost}
                  onDelete={handleDeletePost}
                  onEdit={setEditingPost}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  editingPost={editingPost}
                  onUpdatePost={handleUpdatePost}
                  onCancelEdit={() => setEditingPost(null)}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  formatTimestamp={(timestamp) => {
                    if (!timestamp) return 'Just now';
                    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
                    const now = new Date();
                    const diff = now - date;
                    const minutes = Math.floor(diff / 60000);
                    const hours = Math.floor(diff / 3600000);
                    const days = Math.floor(diff / 86400000);
                    if (minutes < 1) return 'Just now';
                    if (minutes < 60) return `${minutes}m ago`;
                    if (hours < 24) return `${hours}h ago`;
                    return `${days}d ago`;
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex gap-0 rounded-xl border-2 border-slate-200 overflow-hidden bg-white h-[600px]">
          {/* Sidebar */}
          <div className="w-60 border-r border-slate-200 p-3 overflow-y-auto bg-white">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-purple-primary">Channels</span>
              <button
                onClick={() => setShowCreateThreadModal(true)}
                disabled={!currentUser}
                className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                  currentUser
                    ? 'bg-purple-primary text-white hover:bg-indigo-700'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
                title={currentUser ? 'Create new channel' : 'Login to create channels'}
              >
                + New
              </button>
            </div>
            {threads.length === 0 ? (
              <p className="text-slate-600 text-sm italic">Loading threads...</p>
            ) : (
              threads.map(thread => (
                <div
                  key={thread.id}
                  onClick={() => {
                    setActiveThread({
                      ...thread,
                      messages: activeThread?.id === thread.id ? activeThread.messages : []
                    });
                  }}
                  className={`p-3 rounded-lg cursor-pointer mb-1 transition-all ${
                    activeThread?.id === thread.id
                      ? 'bg-slate-100 font-semibold text-purple-primary'
                      : 'text-navy-900 hover:bg-slate-50'
                  }`}
                >
                  # {thread.name}
                </div>
              ))
            )}
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeThread ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 font-bold text-lg">
                  # {activeThread.name}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                  {!activeThread.messages || activeThread.messages.length === 0 ? (
                    <p className="text-slate-600 italic text-center mt-10">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    activeThread.messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.userId === currentUser?.uid ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-navy-900 text-white text-lg flex items-center justify-center">
                          {message.userAvatar && message.userAvatar.startsWith('http') ? (
                            <img 
                              src={message.userAvatar} 
                              alt={message.userName}
                              className="w-full h-full rounded-lg object-cover"
                            />
                          ) : (
                            message.userAvatar
                          )}
                        </div>
                        <div className={message.userId === currentUser?.uid ? 'text-right' : ''}>
                          <div className="text-sm font-semibold text-purple-primary mb-1">
                            {message.userName}
                          </div>
                          <div className={`inline-block px-4 py-2.5 rounded-xl border-2 ${
                            message.userId === currentUser?.uid
                              ? 'bg-navy-900 text-white border-navy-900'
                              : 'bg-white text-navy-900 border-slate-200'
                          }`}>
                            {message.text}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {message.createdAt ? (
                              message.createdAt.seconds ? 
                                new Date(message.createdAt.seconds * 1000).toLocaleTimeString() : 
                                'Just now'
                            ) : 'Just now'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-200 bg-white flex gap-3">
                  <input
                    type="text"
                    placeholder={`Message #${activeThread.name}`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={!currentUser}
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-navy-900 disabled:bg-slate-100"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !currentUser}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-white transition-all flex items-center gap-2 ${
                      !newMessage.trim() || !currentUser
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-navy-900 hover:bg-slate-800 active:scale-95'
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600">
                Select a channel to start chatting
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Thread Modal */}
      {showCreateThreadModal && (
        <div 
          onClick={() => setShowCreateThreadModal(false)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-7"
          >
            <h3 className="text-2xl font-bold text-navy-900 mb-4">Create New Channel</h3>
            <input
              type="text"
              placeholder="Enter channel name (e.g., Beach Trips)"
              value={newThreadName}
              onChange={(e) => setNewThreadName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateThread();
                }
              }}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-navy-900 mb-5 bg-slate-50"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateThreadModal(false);
                  setNewThreadName('');
                }}
                className="px-4 py-2 bg-slate-100 text-navy-900 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateThread}
                disabled={!newThreadName.trim()}
                className={`px-4 py-2 rounded-lg font-medium text-white transition-all ${
                  newThreadName.trim()
                    ? 'bg-purple-primary hover:bg-indigo-700 active:scale-95'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; // ⭐ End of CommunityFeed component

// PostCard Component with Tailwind
const PostCard = ({
  post,
  currentUser,
  onLike,
  onDelete,
  onEdit,
  onAddComment,
  onDeleteComment,
  formatTimestamp,
  editingPost,
  onUpdatePost,
  onCancelEdit,
  replyingTo,
  setReplyingTo
}) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');


  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all animate-postSlideIn overflow-hidden">
      {/* Post Header */}
      <div className="p-6 flex justify-between items-start mb-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <img
            src={post.userPhoto}
            alt={post.userName}
            className="w-14 h-14 rounded-2xl bg-navy-900"
          />
          <div className="flex flex-col gap-1">
            <div className="font-bold text-lg text-navy-900">{post.userName}</div>
            <div className="text-sm text-slate-400 font-medium">{formatTimestamp(post.createdAt)}</div>
          </div>
        </div>
        <div className="flex gap-2">
          {currentUser?.uid === post.userId && (
            <>
              <button 
                onClick={() => onEdit(post)}
                className="w-10 h-10 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-400 flex items-center justify-center text-blue-500 transition-all"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => onDelete(post.id)}
                className="w-10 h-10 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-500 flex items-center justify-center text-red-500 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Post Content */}
      <div className="px-6 pb-6">
        <h3 className="text-2xl font-black text-navy-900 mb-3">{post.location}</h3>
        <p className="text-slate-700 leading-relaxed text-lg mb-5">{post.content}</p>
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className="mb-6 rounded-2xl overflow-hidden border-2 border-slate-200">
            {post.imageUrls.map((img, idx) => (
              <img 
                key={idx}
                src={img} 
                alt="Post"
                className="w-full max-h-96 object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {/* Post Footer - Actions */}
      <div className="border-t-2 border-slate-100 flex divide-x-2 divide-slate-100">
        <button
          onClick={() => onLike(post.id)}
          className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wider transition-all ${
            post.likedBy?.includes(currentUser?.uid)
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'text-slate-600 hover:bg-red-50 hover:text-red-600'
          }`}
        >
          <Heart size={20} fill={post.likedBy?.includes(currentUser?.uid) ? 'currentColor' : 'none'} />
          {post.likes || 0}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm text-slate-600 uppercase tracking-wider hover:bg-blue-50 hover:text-blue-600 transition-all"
        >
          <MessageCircle size={20} />
          {post.comments?.length || 0}
        </button>
        <button className="flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm text-slate-600 uppercase tracking-wider hover:bg-green-50 hover:text-green-600 transition-all">
          <Share2 size={20} />
          Share
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="p-6 bg-slate-50 border-t-2 border-slate-100 space-y-4">
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-3">
              {post.comments.map(comment => (
                <div key={comment.id} className="bg-white p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 flex gap-3">
                  <img
                    src={comment.userAvatar}
                    alt={comment.userName}
                    className="w-10 h-10 rounded-lg bg-navy-900"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-navy-900 text-sm">{comment.userName}</span>
                      <span className="text-xs text-slate-400">{formatTimestamp(comment.timestamp)}</span>
                    </div>
                    <p className="text-slate-700 text-sm">{comment.text}</p>
                  </div>
                  {currentUser?.uid === comment.userId && (
                    <button
                      onClick={() => onDeleteComment(post.id, comment.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors text-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Input */}
          {currentUser && (
            <div className="flex gap-2 pt-3">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    onAddComment(post.id, commentText);
                    setCommentText('');
                  }
                }}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-navy-900 focus:bg-white transition-all bg-white"
              />
              <button
                onClick={() => {
                  if (commentText.trim()) {
                    onAddComment(post.id, commentText);
                    setCommentText('');
                  }
                }}
                className="w-12 h-12 bg-navy-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center font-semibold"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityFeed;