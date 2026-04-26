/**
 * Community controller
 * Handles: friend requests, posts (with daily limits), likes, comments, shares
 *
 * Posting limits by friend count:
 *   0 friends  → cannot post
 *   1 friend   → 1 post/day
 *   2 friends  → 2 posts/day
 *   3-10 friends → friends count posts/day
 *  >10 friends → unlimited
 */

const Post       = require('../models/Post');
const Friendship = require('../models/Friendship');
const User       = require('../models/User');
const { cloudinary } = require('../utils/cloudinary');
const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/* ── Cloudinary storage for community media ── */
const communityStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder        : 'careerbridge/community',
    resource_type : file.mimetype.startsWith('video') ? 'video' : 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'avi'],
    transformation : file.mimetype.startsWith('video')
      ? [{ width: 1280, height: 720, crop: 'limit' }]
      : [{ width: 1080, height: 1080, crop: 'limit', quality: 'auto' }],
  }),
});

exports.communityUpload = multer({
  storage: communityStorage,
  limits : { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

/* ── Helper: get friend count for a user ── */
const getFriendCount = async (userId) => {
  return Friendship.countDocuments({
    $or   : [{ requester: userId }, { recipient: userId }],
    status: 'accepted',
  });
};

/* ── Helper: get daily post limit ── */
const getDailyLimit = (friendCount) => {
  if (friendCount === 0)  return 0;
  if (friendCount <= 10)  return friendCount; // 1 friend = 1/day, 2 = 2/day ... 10 = 10/day
  return Infinity;                            // >10 friends = unlimited
};

/* ── Helper: count today's posts ── */
const getTodayPostCount = async (userId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return Post.countDocuments({ author: userId, createdAt: { $gte: startOfDay } });
};

/* ════════════════════════════════════════════════════════
   FRIEND SYSTEM
════════════════════════════════════════════════════════ */

/* Send friend request */
exports.sendFriendRequest = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const requesterId = req.user._id;

    if (requesterId.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself.' });
    }

    const target = await User.findById(targetUserId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    // Check if already friends or request pending
    const existing = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: targetUserId },
        { requester: targetUserId, recipient: requesterId },
      ],
    });

    if (existing) {
      const msg = existing.status === 'accepted'
        ? 'You are already friends.'
        : existing.status === 'pending'
        ? 'Friend request already sent.'
        : 'Friend request was previously rejected.';
      return res.status(400).json({ success: false, message: msg });
    }

    await Friendship.create({ requester: requesterId, recipient: targetUserId });
    return res.json({ success: true, message: `Friend request sent to ${target.fullName}.` });
  } catch (err) {
    console.error('sendFriendRequest error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Respond to friend request (accept / reject) */
exports.respondFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' | 'reject'

    const friendship = await Friendship.findById(requestId);
    if (!friendship) return res.status(404).json({ success: false, message: 'Request not found.' });

    if (friendship.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    friendship.status = action === 'accept' ? 'accepted' : 'rejected';
    await friendship.save();

    return res.json({
      success: true,
      message: action === 'accept' ? 'Friend request accepted!' : 'Friend request rejected.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Get friend requests (incoming pending) */
exports.getFriendRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({
      recipient: req.user._id,
      status   : 'pending',
    }).populate('requester', 'fullName avatarUrl cityOrRegion accountRole organisationName');

    const formatted = requests.map(r => ({
      _id      : r._id,
      createdAt: r.createdAt,
      user     : {
        _id           : r.requester._id,
        name          : r.requester.fullName,
        profilePicture: r.requester.avatarUrl,
        location      : r.requester.cityOrRegion,
        role          : r.requester.accountRole,
        companyName   : r.requester.organisationName,
      },
    }));

    return res.json({ success: true, requests: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Get friends list */
exports.getFriends = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;

    const friendships = await Friendship.find({
      $or   : [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    })
      .populate('requester', 'fullName avatarUrl cityOrRegion accountRole')
      .populate('recipient', 'fullName avatarUrl cityOrRegion accountRole');

    const friends = friendships.map(f => {
      const friend = f.requester._id.toString() === userId.toString()
        ? f.recipient : f.requester;
      return {
        _id           : friend._id,
        name          : friend.fullName,
        profilePicture: friend.avatarUrl,
        location      : friend.cityOrRegion,
        role          : friend.accountRole,
      };
    });

    return res.json({ success: true, friends, count: friends.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Search users to add as friends */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters.' });
    }

    const users = await User.find({
      _id      : { $ne: req.user._id },
      isActive : true,
      $or      : [
        { fullName    : { $regex: q, $options: 'i' } },
        { emailAddress: { $regex: q, $options: 'i' } },
      ],
    })
      .select('fullName avatarUrl cityOrRegion accountRole organisationName')
      .limit(20);

    // Get friendship status for each
    const myId = req.user._id.toString();
    const friendships = await Friendship.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    });

    const statusMap = {};
    friendships.forEach(f => {
      const otherId = f.requester.toString() === myId ? f.recipient.toString() : f.requester.toString();
      statusMap[otherId] = { status: f.status, requestId: f._id, isSender: f.requester.toString() === myId };
    });

    const result = users.map(u => ({
      _id           : u._id,
      name          : u.fullName,
      profilePicture: u.avatarUrl,
      location      : u.cityOrRegion,
      role          : u.accountRole,
      companyName   : u.organisationName,
      friendship    : statusMap[u._id.toString()] || null,
    }));

    return res.json({ success: true, users: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ════════════════════════════════════════════════════════
   POSTS
════════════════════════════════════════════════════════ */

/* Create post */
exports.createPost = async (req, res) => {
  try {
    const { caption } = req.body;
    const userId = req.user._id;

    if (!caption && !req.file) {
      return res.status(400).json({ success: false, message: 'Post must have a caption or media.' });
    }

    // Check friend count and daily limit
    const friendCount = await getFriendCount(userId);
    const dailyLimit  = getDailyLimit(friendCount);

    if (dailyLimit === 0) {
      return res.status(403).json({
        success: false,
        message: 'You need at least 1 friend to post in the community. Add friends to unlock posting!',
        friendCount,
      });
    }

    if (dailyLimit !== Infinity) {
      const todayCount = await getTodayPostCount(userId);
      if (todayCount >= dailyLimit) {
        return res.status(429).json({
          success: false,
          message: `You can post ${dailyLimit} time${dailyLimit > 1 ? 's' : ''} per day with ${friendCount} friend${friendCount > 1 ? 's' : ''}. Add more friends to increase your limit!`,
          friendCount,
          dailyLimit,
          todayCount,
        });
      }
    }

    const postData = {
      author : userId,
      caption: caption || '',
    };

    if (req.file) {
      postData.mediaUrl      = req.file.path;
      postData.mediaPublicId = req.file.filename;
      postData.mediaType     = req.file.mimetype?.startsWith('video') ? 'video' : 'image';
    }

    const post = await Post.create(postData);
    const populated = await Post.findById(post._id)
      .populate('author', 'fullName avatarUrl accountRole organisationName');

    return res.status(201).json({ success: true, post: normalisePost(populated, userId) });
  } catch (err) {
    console.error('createPost error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Get community feed */
exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const total = await Post.countDocuments();
    const posts = await Post.find()
      .populate('author', 'fullName avatarUrl accountRole organisationName')
      .populate('comments.author', 'fullName avatarUrl')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit));

    const userId = req.user._id;
    const friendCount = await getFriendCount(userId);
    const dailyLimit  = getDailyLimit(friendCount);
    const todayCount  = await getTodayPostCount(userId);

    return res.json({
      success: true,
      total,
      page   : Number(page),
      pages  : Math.ceil(total / Number(limit)),
      posts  : posts.map(p => normalisePost(p, userId)),
      postingInfo: {
        friendCount,
        dailyLimit : dailyLimit === Infinity ? -1 : dailyLimit,
        todayCount,
        canPost    : dailyLimit === Infinity || todayCount < dailyLimit,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Toggle like */
exports.toggleLike = async (req, res) => {
  try {
    const post   = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const userId  = req.user._id.toString();
    const liked   = post.likes.map(l => l.toString()).includes(userId);

    if (liked) {
      post.likes = post.likes.filter(l => l.toString() !== userId);
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();
    return res.json({ success: true, liked: !liked, likeCount: post.likes.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Add comment */
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text is required.' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    post.comments.push({ author: req.user._id, text: text.trim() });
    await post.save();

    const updated = await Post.findById(post._id)
      .populate('comments.author', 'fullName avatarUrl');

    const newComment = updated.comments[updated.comments.length - 1];
    return res.status(201).json({
      success : true,
      comment : {
        _id      : newComment._id,
        text     : newComment.text,
        createdAt: newComment.createdAt,
        author   : {
          _id           : newComment.author._id,
          name          : newComment.author.fullName,
          profilePicture: newComment.author.avatarUrl,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Increment share count */
exports.sharePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { $inc: { shares: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    return res.json({ success: true, shares: post.shares });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Delete post (own posts only) */
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    if (post.author.toString() !== req.user._id.toString() && req.user.accountRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    if (post.mediaPublicId) {
      await cloudinary.uploader.destroy(post.mediaPublicId, {
        resource_type: post.mediaType === 'video' ? 'video' : 'image',
      }).catch(() => {});
    }

    await post.deleteOne();
    return res.json({ success: true, message: 'Post deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Normaliser ── */
function normalisePost(doc, currentUserId) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const uid = currentUserId?.toString();
  return {
    ...obj,
    author: {
      _id           : obj.author?._id,
      name          : obj.author?.fullName,
      profilePicture: obj.author?.avatarUrl,
      role          : obj.author?.accountRole,
      companyName   : obj.author?.organisationName,
    },
    likeCount   : obj.likes?.length || 0,
    isLiked     : obj.likes?.map(l => l.toString()).includes(uid) || false,
    commentCount: obj.comments?.length || 0,
    comments    : (obj.comments || []).map(c => ({
      _id      : c._id,
      text     : c.text,
      createdAt: c.createdAt,
      author   : {
        _id           : c.author?._id,
        name          : c.author?.fullName,
        profilePicture: c.author?.avatarUrl,
      },
    })),
  };
}
