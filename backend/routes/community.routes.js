const express = require('express');
const router  = express.Router();
const {
  sendFriendRequest,
  respondFriendRequest,
  getFriendRequests,
  getFriends,
  searchUsers,
  createPost,
  getFeed,
  toggleLike,
  addComment,
  sharePost,
  deletePost,
  communityUpload,
} = require('../controllers/community.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

/* ── Friends ── */
router.post('/friends/request/:targetUserId',       sendFriendRequest);
router.put('/friends/respond/:requestId',           respondFriendRequest);
router.get('/friends/requests',                     getFriendRequests);
router.get('/friends/:userId?',                     getFriends);
router.get('/users/search',                         searchUsers);

/* ── Posts ── */
router.get('/feed',                                 getFeed);
router.post('/posts', communityUpload.single('media'), createPost);
router.delete('/posts/:postId',                     deletePost);

/* ── Interactions ── */
router.post('/posts/:postId/like',                  toggleLike);
router.post('/posts/:postId/comment',               addComment);
router.post('/posts/:postId/share',                 sharePost);

module.exports = router;
