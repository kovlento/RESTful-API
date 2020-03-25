const Router = require('koa-router')
const router = new Router({ prefix: '/users' })
const jwt = require('koa-jwt')
const {
  find,
  findById,
  update,
  create,
  delete: del,
  login,
  checkOwner,
  listFollowing,
  listFollowers,
  checkUserExist,
  follow,
  unfollow,
  followTopic,
  unfollowTopic,
  listFollowingTopic,
  listQuestions,
  listLikedAnswer,
  likedAnswer,
  unlikedAnswer,
  dislistLikedAnswer,
  dislikedAnswer,
  undislikedAnswer,
  listcolletedAnswer,
  collectedAnswer,
  uncollectedAnswer
} = require('../controllers/users')

const { checkTopicExist } = require('../controllers/topics')
const { checkAnswerExist } = require('../controllers/answers')

const { secret } = require('../config')

const auth = jwt({ secret })

router.get('/', find)
router.post('/', create)
router.get('/:id', findById)
router.patch('/:id', auth, checkOwner, update)
router.delete('/:id', auth, checkOwner, del)

// 登录页接口
router.post('/login', login)

//获取用户关注列表、获取粉丝列表、关注某人、取消关注
router.get('/:id/following', listFollowing)
router.get('/:id/followers', listFollowers)
router.put('/following/:id', auth, checkUserExist, follow)
router.delete('/following/:id', auth, checkUserExist, unfollow)

//获取用户话题列表、获取话题列表、添加话题、取消话题
router.get('/:id/followingTopic', listFollowingTopic)
router.put('/followingTopic/:id', auth, checkTopicExist, followTopic)
router.delete('/followingTopic/:id', auth, checkTopicExist, unfollowTopic)

router.get('/:id/questions', listQuestions)

//赞
router.get('/:id/likedAnswers', listLikedAnswer)
router.put(
  '/likedAnswers/:id',
  auth,
  checkAnswerExist,
  likedAnswer,
  undislikedAnswer
)
router.delete('/likedAnswers/:id', auth, checkAnswerExist, unlikedAnswer)

//踩
router.get('/:id/dislikedAnswers', dislistLikedAnswer)
router.put(
  '/dislikedAnswers/:id',
  auth,
  checkAnswerExist,
  dislikedAnswer,
  unlikedAnswer
)
router.delete('/dislikedAnswers/:id', auth, checkAnswerExist, undislikedAnswer)

//收藏
router.get('/:id/collectedAnswers', listcolletedAnswer)
router.put('/collectedAnswers/:id', auth, checkAnswerExist, collectedAnswer)
router.delete(
  '/collectedAnswers/:id',
  auth,
  checkAnswerExist,
  uncollectedAnswer
)
module.exports = router
