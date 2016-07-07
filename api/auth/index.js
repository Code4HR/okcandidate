
const Joi = require('joi')
const Boom = require('boom')
const Bluebird = require('bluebird')
const Hoek = require('hoek')

const time_logged_in = 2 * 60 * 1000
let uuid = 1

exports.register = function(server, options, next){

  const cache = server.cache({
	segment: 'standard',
	expiresIn: time_logged_in
  })

  server.app.cache = cache
  
  // Register cookie authorization library
  server.register([
	  {
	  	register: require('hapi-auth-cookie')
	  }
	], function(err) {
		if (err) {
			console.error('Failed to load a plugin:', err)
			throw err
		}
  })
  // Create strategy	
  server.auth.strategy('standard', 'cookie',{
	cookie: 'cookiename',
	password: 'cookiepass',
	isSecure: true,
	ttl: time_logged_in,
	validateFunc: function (request, session, callback) {

		cache.get(session.sid, (err, cached) => {
			if (err) {
				return callback(err, false)
			}
			if (!cached) {
				return callback(null, false)
			}
			return callback(null, true, cached.account)
		})

	}
  })

  server.route([
	{
	  method: 'GET',
	  path: '/logger',
	  config: {
	  	  auth: false,
		  handler: function(request, reply) {
			return reply('<html><head><title>Login page</title></head><body>' +
						'<form method="post" action="/logger">' +
						'Email:<br><input type="text" name="email" ><br>' +
						'Password:<br><input type="password" name="password"><br/><br/>' +
						'<input type="submit" value="Login"></form></body></html>')
		}
	  }
	},
	{
	  method: 'POST',
	  path: '/logger',
	  config: {
		auth: false,
		validate: {
		  payload: {
			email: Joi.string().required(),
			password: Joi.string().min(2).max(200).required()
		  }
		},
		handler: function(request, reply) {

		  const email = request.payload.email
		  const password = request.payload.password

		  getValidatedUser(request.payload.email,request.payload.password)
		  .then(function (user) {

			if (user) {

				const sid = String(++uuid)

				request.server.app.cache.set(sid, { account: user}, 0, (err) =>{
					Hoek.assert(!err, err)
					request.cookieAuth.set({sid: sid})
					return reply.redirect('/admin')
				}) 
			} else {
				return reply(Boom.badImplementation())
			}
		  })

		  .catch(function (err) {
			return reply(Boom.badImplementation())
		  })
		}
	  }
	}, {
		method: 'GET',
		path: '/logout',
		config: {
			auth: false,
			handler: function (request, reply) {
				request.cookieAuth.clear()
				return reply('Logged out')
			}
		}
	}])
  next()
}

exports.register.attributes = {
  name: 'auth'
}


// Placeholder function for users database
// Must update to connect to OKCDB with hapi-shelf
function getValidatedUser(email, password){
  return new Bluebird(function (fulfill, reject) {
	var users = [{
	  email: 'p',
	  password: 'paulopass',
	  scope: ['user', 'admin']
	},
	{
	  email: 'other@other.com',
	  password: 'otherpass',
	  scope: ['user']
	}]

	// Delete pw from memory after validating
	function grabCleanUser(user) {
	  var user = user
	  delete user.password
	  return user
	}

	// I'm sure there's a good library for user lookup
	if (email === users[0].email && password === users[0].password) {
	  return fulfill(grabCleanUser(users[0]))
	} else if (email === users[1].email && password === users[1].password) {
	  return fulfill(grabCleanUser(users[1]))
	} else {
	  return reject(null)
	}

  })
}