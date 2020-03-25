const User = require('../models/users')
const jsonwebtoken = require('jsonwebtoken')
const Question = require('../models/questions')
const Answer = require('../models/answers')
const { secret } = require('../config')

class HomeCtl {
  async checkOwner(ctx, next) {
    if (ctx.params.id !== ctx.state.user._id) {
      ctx.throw(403, '没有权限')
    }
    await next()
  }

  async find(ctx) {
    const { per_page = 4 } = ctx.query
    const page = Math.max(ctx.query.page * 1, 1) - 1
    const perPage = Math.max(per_page * 1, 1)
    ctx.body = await User.find({ name: new RegExp(ctx.query.q) })
      .limit(perPage)
      .skip(page * perPage)
  }
  async findById(ctx) {
    const { fields = '' } = ctx.query
    const selectFields = fields
      .split(';')
      .filter(v => v)
      .map(v => ' +' + v)
      .join('')
    const populateStr = fields
      .split(';')
      .filter(f => f)
      .map(f => {
        if (f == 'employments') {
          return 'employments.company employments.job'
        }
        if (f == 'educations') {
          return 'educations.school educations.major'
        }
        return f
      })
      .join(' ')
    const user = await User.findById(ctx.params.id)
      .select(selectFields)
      .populate(
        'following locations business employments.company employments.job educations.school educations.major'
      )
    if (!user) {
      ctx.throw(404, '用户不存在')
    }
    ctx.body = user
  }
  async create(ctx) {
    ctx.verifyParams({
      name: { type: 'string', required: true },
      password: { type: 'string', required: true }
    })
    const { name } = ctx.request.body
    const repeatedUser = await User.findOne({ name })
    if (repeatedUser) {
      ctx.throw(409, '用户已经存在')
    }
    const user = await new User(ctx.request.body).save()
    ctx.body = user
  }
  async update(ctx) {
    ctx.verifyParams({
      name: { type: 'string', required: false },
      password: { type: 'string', required: false },
      avatar: { type: 'string', required: false },
      gender: { type: 'string', required: false },
      headline: { type: 'string', required: false },
      locations: { type: 'array', itemType: 'string', required: false },
      business: { type: 'string', required: false },
      employments: { type: 'array', itemType: 'object', required: false },
      educations: { type: 'array', itemType: 'object', required: false }
    })
    const user = await User.findByIdAndUpdate(ctx.params.id, ctx.request.body)
    if (!user) {
      ctx.throw(404, '用户不存在')
    }
    ctx.body = user
  }
  async delete(ctx) {
    const user = await User.findByIdAndRemove(ctx.params.id)
    if (!user) {
      ctx.throw(404, '用户不存在')
    }
    ctx.status = 204
  }

  async login(ctx) {
    ctx.verifyParams({
      name: { type: 'string', required: true },
      password: { type: 'string', required: true }
    })
    const user = await User.findOne(ctx.request.body)
    if (!user) {
      ctx.throw(401, '用户名或密码错误')
    }
    const { _id, name } = user
    const token = jsonwebtoken.sign({ _id, name }, secret, { expiresIn: '1d' })
    ctx.body = { token }
  }

  async checkUserExist(ctx, next) {
    const user = await User.findById(ctx.params.id)
    if (!user) {
      ctx.throw(404, '用户不存在')
    }
    await next()
  }

  async listFollowing(ctx) {
    const user = await User.findById(ctx.params.id)
      .select('+following')
      .populate('following')
    if (!user) {
      ctx.throw(404)
    }
    ctx.body = user.following
  }

  async listFollowers(ctx) {
    const users = await User.find({ following: ctx.params.id })
    ctx.body = users
  }

  async follow(ctx) {
    const me = await User.findById(ctx.state.user._id).select('+following')
    if (!me.following.map(id => id.toString()).includes(ctx.params.id)) {
      me.following.push(ctx.params.id)
      me.save()
    }
    ctx.status = 204
  }

  async unfollow(ctx) {
    const me = await User.findById(ctx.state.user._id).select('+following')
    const index = me.following.map(id => id.toString()).indexOf(ctx.params.id)
    if (index > -1) {
      me.following.splice(index, 1)
      me.save()
    }
    ctx.status = 204
  }

  //话题接口

  async listFollowingTopic(ctx) {
    const user = await User.findById(ctx.params.id)
      .select('+followingTopics')
      .populate('followingTopics')
    if (!user) {
      ctx.throw(404)
    }
    ctx.body = user.followingTopics
  }

  async followTopic(ctx) {
    const me = await User.findById(ctx.state.user._id).select(
      '+followingTopics'
    )
    if (!me.followingTopics.map(id => id.toString()).includes(ctx.params.id)) {
      me.followingTopics.push(ctx.params.id)
      me.save()
    }
    ctx.status = 204
  }

  async unfollowTopic(ctx) {
    const me = await User.findById(ctx.state.user._id).select(
      '+followingTopics'
    )
    const index = me.followingTopics
      .map(id => id.toString())
      .indexOf(ctx.params.id)
    if (index > -1) {
      me.followingTopics.splice(index, 1)
      me.save()
    }
    ctx.status = 204
  }
  async listQuestions(ctx) {
    const questions = await Question.find({ questioner: ctx.params.id })
    ctx.body = questions
  }

  //赞

  async listLikedAnswer(ctx) {
    const user = await User.findById(ctx.params.id)
      .select('+likedAnswers')
      .populate('likedAnswers')
    if (!user) {
      ctx.throw(404)
    }
    ctx.body = user.likedAnswers
  }

  //喜欢答案
  async likedAnswer(ctx, next) {
    const me = await User.findById(ctx.state.user._id).select('+likedAnswers')
    if (!me.likedAnswers.map(id => id.toString()).includes(ctx.params.id)) {
      me.likedAnswers.push(ctx.params.id)
      me.save()
      await Answer.findByIdAndUpdate(ctx.params.id, { $inc: { voteCount: 1 } })
    }
    ctx.status = 204
    await next()
  }

  //取消喜欢答案
  async unlikedAnswer(ctx) {
    const me = await User.findById(ctx.state.user._id).select('+likedAnswers')
    const index = me.likedAnswers
      .map(id => id.toString())
      .indexOf(ctx.params.id)
    if (index > -1) {
      me.likedAnswers.splice(index, 1)
      me.save()
      await Answer.findByIdAndUpdate(ctx.params.id, { $inc: { voteCount: -1 } })
    }
    ctx.status = 204
  }

  //踩

  async dislistLikedAnswer(ctx) {
    const user = await User.findById(ctx.params.id)
      .select('+dislikedAnswers')
      .populate('dislikedAnswers')
    if (!user) {
      ctx.throw(404)
    }
    ctx.body = user.dislikedAnswers
  }

  //踩答案
  async dislikedAnswer(ctx, next) {
    const me = await User.findById(ctx.state.user._id).select(
      '+dislikedAnswers'
    )
    if (!me.dislikedAnswers.map(id => id.toString()).includes(ctx.params.id)) {
      me.dislikedAnswers.push(ctx.params.id)
      me.save()
    }
    ctx.status = 204
    await next()
  }

  //取消踩答案
  async undislikedAnswer(ctx) {
    const me = await User.findById(ctx.state.user._id).select(
      '+dislikedAnswers'
    )
    const index = me.dislikedAnswers
      .map(id => id.toString())
      .indexOf(ctx.params.id)
    if (index > -1) {
      me.dislikedAnswers.splice(index, 1)
      me.save()
    }
    ctx.status = 204
  }

  //收藏列表
  async listcolletedAnswer(ctx) {
    const user = await User.findById(ctx.params.id)
      .select('+collectedAnswers')
      .populate('collectedAnswers')
    if (!user) {
      ctx.throw(404)
    }
    ctx.body = user.collectedAnswers
  }

  //收藏答案
  async collectedAnswer(ctx, next) {
    const me = await User.findById(ctx.state.user._id).select(
      '+collectedAnswers'
    )
    if (!me.collectedAnswers.map(id => id.toString()).includes(ctx.params.id)) {
      me.collectedAnswers.push(ctx.params.id)
      me.save()
    }
    ctx.status = 204
    await next()
  }

  //取消收藏答案
  async uncollectedAnswer(ctx) {
    const me = await User.findById(ctx.state.user._id).select(
      '+collectedAnswers'
    )
    const index = me.collectedAnswers
      .map(id => id.toString())
      .indexOf(ctx.params.id)
    if (index > -1) {
      me.collectedAnswers.splice(index, 1)
      me.save()
    }
    ctx.status = 204
  }
}

module.exports = new HomeCtl()
