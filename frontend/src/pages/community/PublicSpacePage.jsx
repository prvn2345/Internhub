import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartIcon, ChatBubbleLeftIcon, ShareIcon, PhotoIcon,
  VideoCameraIcon, UserPlusIcon, CheckIcon, XMarkIcon,
  MagnifyingGlassIcon, TrashIcon, PaperAirplaneIcon,
  UsersIcon, LockClosedIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import apiClient from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { PageLoader } from '../../components/common/LoadingSpinner';

const Spin = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const Avatar = ({ src, name, size = 'md' }) => {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  if (src) return <img src={src} alt={name} className={`${s} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${s} rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0`}>
      <span className="font-bold text-primary-600 dark:text-primary-400">{name?.[0]?.toUpperCase() || '?'}</span>
    </div>
  );
};

// ── Post Card ──────────────────────────────────────────
const PostCard = ({ post, currentUserId, onLike, onComment, onShare, onDelete }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [localPost, setLocalPost]       = useState(post);

  const handleLike = async () => {
    const res = await onLike(post._id);
    if (res) setLocalPost(p => ({ ...p, isLiked: res.liked, likeCount: res.likeCount }));
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    const res = await onComment(post._id, commentText);
    if (res) {
      setLocalPost(p => ({ ...p, comments: [...(p.comments || []), res.comment], commentCount: (p.commentCount || 0) + 1 }));
      setCommentText('');
    }
    setSubmitting(false);
  };

  const handleShare = async () => {
    await onShare(post._id);
    setLocalPost(p => ({ ...p, shares: (p.shares || 0) + 1 }));
    if (navigator.share) {
      navigator.share({ title: 'CareerBridge Post', text: localPost.caption || '', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };

  const isOwn = post.author?._id?.toString() === currentUserId?.toString();

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar src={localPost.author?.profilePicture} name={localPost.author?.name} size="lg" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{localPost.author?.name}</p>
            <p className="text-gray-400 text-xs">{localPost.author?.role === 'employer' ? localPost.author?.companyName : localPost.author?.role} • {new Date(localPost.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        {isOwn && (
          <button onClick={() => onDelete(post._id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" aria-label="Delete post">
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Caption */}
      {localPost.caption && (
        <p className="text-gray-800 dark:text-gray-200 text-sm mb-3 leading-relaxed">{localPost.caption}</p>
      )}

      {/* Media */}
      {localPost.mediaUrl && localPost.mediaType === 'image' && (
        <img src={localPost.mediaUrl} alt="post" className="w-full rounded-xl object-cover max-h-96 mb-3" />
      )}
      {localPost.mediaUrl && localPost.mediaType === 'video' && (
        <video src={localPost.mediaUrl} controls className="w-full rounded-xl max-h-96 mb-3" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <button onClick={handleLike} className={`flex items-center gap-1.5 text-sm transition-colors ${localPost.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
          {localPost.isLiked ? <HeartSolid className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
          <span>{localPost.likeCount || 0}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <ChatBubbleLeftIcon className="w-5 h-5" />
          <span>{localPost.commentCount || 0}</span>
        </button>
        <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition-colors">
          <ShareIcon className="w-5 h-5" />
          <span>{localPost.shares || 0}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {(localPost.comments || []).map(c => (
            <div key={c._id} className="flex items-start gap-2">
              <Avatar src={c.author?.profilePicture} name={c.author?.name} size="sm" />
              <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{c.author?.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{c.text}</p>
              </div>
            </div>
          ))}
          <form onSubmit={handleComment} className="flex items-center gap-2">
            <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..." className="input-field text-sm flex-1 py-1.5" />
            <button type="submit" disabled={submitting || !commentText.trim()}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {submitting ? <Spin /> : <PaperAirplaneIcon className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// ── Create Post Box ────────────────────────────────────
const CreatePostBox = ({ user, postingInfo, onPostCreated }) => {
  const [caption, setCaption]   = useState('');
  const [mediaFile, setMedia]   = useState(null);
  const [preview, setPreview]   = useState(null);
  const [posting, setPosting]   = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setMedia(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim() && !mediaFile) { toast.error('Add a caption or media'); return; }
    setPosting(true);
    try {
      const fd = new FormData();
      if (caption) fd.append('caption', caption);
      if (mediaFile) fd.append('media', mediaFile);
      const { data } = await apiClient.post('/community/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onPostCreated(data.post);
      setCaption(''); setMedia(null); setPreview(null);
      toast.success('Post shared!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    }
    setPosting(false);
  };

  const canPost = postingInfo?.canPost;
  const friendCount = postingInfo?.friendCount || 0;

  return (
    <div className="card p-5 mb-6">
      {!canPost ? (
        <div className="flex items-center gap-3 text-center flex-col py-2">
          <LockClosedIcon className="w-8 h-8 text-gray-300" />
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
              {friendCount === 0 ? 'Add friends to start posting' : `Daily limit reached (${postingInfo?.todayCount}/${postingInfo?.dailyLimit} posts)`}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {friendCount === 0 ? 'You need at least 1 friend to post in the community.' : 'Add more friends to increase your daily posting limit.'}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-3 mb-3">
            <Avatar src={user?.profilePicture} name={user?.name} size="lg" />
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2}
              placeholder="Share something with the community..."
              className="input-field text-sm resize-none flex-1" />
          </div>
          {preview && (
            <div className="relative mb-3">
              {mediaFile?.type?.startsWith('video')
                ? <video src={preview} className="w-full rounded-xl max-h-48 object-cover" />
                : <img src={preview} alt="preview" className="w-full rounded-xl max-h-48 object-cover" />
              }
              <button type="button" onClick={() => { setMedia(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current.click()}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <PhotoIcon className="w-4 h-4" /> Photo
              </button>
              <button type="button" onClick={() => fileRef.current.click()}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <VideoCameraIcon className="w-4 h-4" /> Video
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
            </div>
            <button type="submit" disabled={posting || (!caption.trim() && !mediaFile)}
              className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
              {posting ? <><Spin /> Posting...</> : 'Share'}
            </button>
          </div>
          {postingInfo?.dailyLimit > 0 && postingInfo?.dailyLimit !== -1 && (
            <p className="text-xs text-gray-400 mt-2">
              {postingInfo.todayCount}/{postingInfo.dailyLimit} posts today • {friendCount} friend{friendCount !== 1 ? 's' : ''}
            </p>
          )}
        </form>
      )}
    </div>
  );
};

// ── Find Friends Panel ─────────────────────────────────
const FindFriendsPanel = ({ onFriendAdded }) => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState('search'); // 'search' | 'requests'

  useEffect(() => {
    apiClient.get('/community/friends/requests').then(r => setRequests(r.data.requests || [])).catch(() => {});
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/community/users/search?q=${encodeURIComponent(query)}`);
      setResults(data.users || []);
    } catch { toast.error('Search failed'); }
    setLoading(false);
  };

  const sendRequest = async (userId) => {
    try {
      const { data } = await apiClient.post(`/community/friends/request/${userId}`);
      toast.success(data.message);
      setResults(r => r.map(u => u._id === userId ? { ...u, friendship: { status: 'pending', isSender: true } } : u));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const respond = async (requestId, action) => {
    try {
      await apiClient.put(`/community/friends/respond/${requestId}`, { action });
      toast.success(action === 'accept' ? 'Friend added!' : 'Request rejected');
      setRequests(r => r.filter(req => req._id !== requestId));
      if (action === 'accept' && onFriendAdded) onFriendAdded();
    } catch { toast.error('Failed'); }
  };

  const getFriendshipBtn = (u) => {
    if (!u.friendship) return (
      <button onClick={() => sendRequest(u._id)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
        <UserPlusIcon className="w-3.5 h-3.5" /> Add
      </button>
    );
    if (u.friendship.status === 'accepted') return <span className="text-xs text-green-600 font-medium">✓ Friends</span>;
    if (u.friendship.status === 'pending' && u.friendship.isSender) return <span className="text-xs text-gray-400">Pending</span>;
    return <span className="text-xs text-gray-400">Requested you</span>;
  };

  return (
    <div className="card p-5">
      <div className="flex gap-2 mb-4">
        {['search', 'requests'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            {t === 'search' ? 'Find Friends' : `Requests${requests.length ? ` (${requests.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or email..." className="input-field pl-9 text-sm" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary text-sm px-3">
              {loading ? <Spin /> : 'Go'}
            </button>
          </form>
          <div className="space-y-3">
            {results.map(u => (
              <div key={u._id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar src={u.profilePicture} name={u.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.location || u.role}</p>
                  </div>
                </div>
                {getFriendshipBtn(u)}
              </div>
            ))}
            {results.length === 0 && query && !loading && (
              <p className="text-gray-400 text-sm text-center py-2">No users found</p>
            )}
          </div>
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No pending requests</p>}
          {requests.map(req => (
            <div key={req._id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar src={req.user.profilePicture} name={req.user.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{req.user.name}</p>
                  <p className="text-xs text-gray-400">{req.user.location || req.user.role}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => respond(req._id, 'accept')}
                  className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button onClick={() => respond(req._id, 'reject')}
                  className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────
const PublicSpacePage = () => {
  const { currentUser: user } = useAuthStore();
  const [posts, setPosts]           = useState([]);
  const [postingInfo, setPostingInfo] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);
  const [friendCount, setFriendCount] = useState(0);

  const loadFeed = async (p = 1, append = false) => {
    try {
      const { data } = await apiClient.get(`/community/feed?page=${p}&limit=10`);
      setPosts(prev => append ? [...prev, ...data.posts] : data.posts);
      setPostingInfo(data.postingInfo);
      setFriendCount(data.postingInfo?.friendCount || 0);
      setHasMore(p < data.pages);
    } catch { toast.error('Failed to load feed'); }
    setLoading(false);
  };

  useEffect(() => { loadFeed(1); }, []);

  const handleLike = async (postId) => {
    try {
      const { data } = await apiClient.post(`/community/posts/${postId}/like`);
      return data;
    } catch { toast.error('Failed to like'); return null; }
  };

  const handleComment = async (postId, text) => {
    try {
      const { data } = await apiClient.post(`/community/posts/${postId}/comment`, { text });
      return data;
    } catch { toast.error('Failed to comment'); return null; }
  };

  const handleShare = async (postId) => {
    try { await apiClient.post(`/community/posts/${postId}/share`); } catch {}
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await apiClient.delete(`/community/posts/${postId}`);
      setPosts(p => p.filter(post => post._id !== postId));
      toast.success('Post deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handlePostCreated = (newPost) => {
    setPosts(p => [newPost, ...p]);
    setPostingInfo(prev => prev ? { ...prev, todayCount: (prev.todayCount || 0) + 1, canPost: prev.dailyLimit === -1 || (prev.todayCount + 1) < prev.dailyLimit } : prev);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-primary-600" /> Public Space
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Connect, share, and engage with the CareerBridge community
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{friendCount}</p>
          <p className="text-xs text-gray-400">friend{friendCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed */}
        <div className="lg:col-span-2">
          <CreatePostBox user={user} postingInfo={postingInfo} onPostCreated={handlePostCreated} />

          {posts.length === 0 ? (
            <div className="card p-12 text-center">
              <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No posts yet</p>
              <p className="text-gray-400 text-sm mt-1">Be the first to share something!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard key={post._id} post={post} currentUserId={user?._id}
                  onLike={handleLike} onComment={handleComment}
                  onShare={handleShare} onDelete={handleDelete} />
              ))}
              {hasMore && (
                <button onClick={() => { const next = page + 1; setPage(next); loadFeed(next, true); }}
                  className="btn-secondary w-full py-3 text-sm">
                  Load more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Posting limit info */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Posting Limits</h3>
            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              {[
                { friends: '0 friends', limit: 'Cannot post', active: friendCount === 0 },
                { friends: '1 friend', limit: '1 post/day', active: friendCount === 1 },
                { friends: '2 friends', limit: '2 posts/day', active: friendCount === 2 },
                { friends: '3-10 friends', limit: 'N posts/day', active: friendCount >= 3 && friendCount <= 10 },
                { friends: '10+ friends', limit: 'Unlimited', active: friendCount > 10 },
              ].map(row => (
                <div key={row.friends} className={`flex justify-between items-center px-2 py-1 rounded ${row.active ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium' : ''}`}>
                  <span>{row.friends}</span>
                  <span>{row.limit}</span>
                </div>
              ))}
            </div>
          </div>

          <FindFriendsPanel onFriendAdded={() => loadFeed(1)} />
        </div>
      </div>
    </div>
  );
};

export default PublicSpacePage;
