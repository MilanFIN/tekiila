//
//
//SET TO TRUE TO ALLOW NEW USERS AND EXISTING LOGINS
const allowLogin = true;
const SECRET = "secret goes here";
const PORT = 80
//
//
//




var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
var Models = require('./models/model');

var User = Models.User;
var Boulder = Models.Boulder;
var Ascent = Models.Ascent;
var Route = Models.Route;
var Lead = Models.Lead;







// invoke an instance of express application.
var app = express();

// set our application port
app.set('port', PORT);

// set morgan to log info about our requests for development use.
app.use(morgan('dev'));

// initialize body-parser to parse incoming parameters requests to req.body
app.use(bodyParser.urlencoded({ extended: true }));

// initialize cookie-parser to allow us access the cookies stored in the browser. 
app.use(cookieParser());

// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
    key: 'user_sid',
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 36000000
    }
}));


// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');        
    }
    next();
});


// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/modify');
    } else {
        next();
    }    
};



// route for Home-Page
app.get('/', sessionChecker, (req, res) => {
    res.redirect('/results');
});

// route for user's dashboard
app.get('/styles.css', (req, res) => {
	res.sendFile(__dirname + '/public/styles.css');
});


// route for user signup
app.route('/signup')
    .get(sessionChecker, (req, res) => {
        res.sendFile(__dirname + '/public/signup.html');
    })
    .post((req, res) => {
		if(allowLogin)
		{
			User.create({
				username: req.body.username,
				wholename: req.body.wholename,
				password: req.body.password,
				gender: req.body.gender
			})
			.then(user => {
				req.session.user = user.dataValues;
				res.redirect('/modify');
			})
			.catch(error => {
				res.redirect('/signup');
			});
	
		}
		else {
			res.redirect("/signup")
		}
    });


// route for user Login
app.route('/login')
    .get(sessionChecker, (req, res) => {
        res.sendFile(__dirname + '/public/login.html');
    })
    .post((req, res) => {

		if (allowLogin) {
			var username = req.body.username,
            password = req.body.password;

        	User.findOne({ where: { username: username } }).then(function (user) {
				console.log("MOI")
            if (!user) {
                res.redirect('/login');
            } else if (!user.validPassword(password)) {
                res.redirect('/login');
            } else {
                req.session.user = user.dataValues;
                res.redirect('/modify');
            }
        	}).catch(function (err) {
				console.log("MOI2")
			  });
			console.log("MOI")

		}
		else {
			res.redirect('/login');
		}

    });


app.get('/modify', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
		console.log(req.session.user)
        res.sendFile(__dirname + '/public/modify.html');
    } else {
        res.redirect('/login');
    }
});


app.get('/results', (req, res) => {
	res.sendFile(__dirname + '/public/results.html');
});


app.get('/info', (req, res) => {
	res.sendFile(__dirname + '/public/info.html');
});

app.get('/result_json', (req, res) => {

	//calculate total number of ascents for a route, and send that to browser?
	Ascent.findAll({attributes: ['username', 'number']} ).then(function (ascents) {

		var ascentsByRoute = {}
		ascents.forEach(function(ascent) {
			var number = ascent.dataValues.number
			var username = ascent.dataValues.username
			if (!(number in ascentsByRoute)){
				ascentsByRoute[number] = []
			}

			ascentsByRoute[number].push(username)
		});
		//console.log(ascentsByRoute)

		User.findAll({attributes: ['username', 'wholename', 'gender']} ).then(function (users) {
			console.log(users)

			var usersAndNames = {}

			users.forEach(function(user) {
				usersAndNames[user.dataValues.username] = {}

				usersAndNames[user.dataValues.username].wholename = user.dataValues.wholename;
				usersAndNames[user.dataValues.username].gender = user.dataValues.gender;
			});

			ascentsByRouteMen = {}
			ascentsByRouteWomen = {}
			ascentsByRouteRoutesetters = {}


			Object.keys(ascentsByRoute).forEach(function(key,index) {
				ascentsByRoute[key].forEach(function (item, index) {
					if (usersAndNames[item].gender == "Male"){
						if (!(key in ascentsByRouteMen)){
							ascentsByRouteMen[key] = [];
						}
						ascentsByRouteMen[key].push(item)
					}
					else if (usersAndNames[item].gender == "Female"){
						if (!(key in ascentsByRouteWomen)){
							ascentsByRouteWomen[key] = [];
						}
						ascentsByRouteWomen[key].push(item)
					}
					else if (usersAndNames[item].gender == "Routesetter"){
						if (!(key in ascentsByRouteRoutesetters)){
							ascentsByRouteRoutesetters[key] = [];
						}
						ascentsByRouteRoutesetters[key].push(item)
					}
				});
			});
			scoresMen = {} // username: score, ascents
			scoresWomen = {} // username: score, ascents
			scoresRoutesetters = {} // username: score, ascents

			for (var user in usersAndNames) {
				if (usersAndNames[user].gender == "Male") {
					scoresMen[user] = {}
					scoresMen[user].score = 0
					scoresMen[user].ascents = 0

	
				}
				else if (usersAndNames[user].gender == "Female") {
					scoresWomen[user] = {}
					scoresWomen[user].score = 0
					scoresWomen[user].ascents = 0
				}
				else if (usersAndNames[user].gender == "Routesetter") {
					scoresRoutesetters[user] = {}
					scoresRoutesetters[user].score = 0
					scoresRoutesetters[user].ascents = 0
				}
			}



			Object.keys(ascentsByRouteMen).forEach(function(key,index) {
				var users = ascentsByRouteMen[key];
				for (var i = 0; i < users.length; i++) {
					scoresMen[users[i]].score += 100/users.length
					scoresMen[users[i]].ascents += 1

				}
			});
			Object.keys(ascentsByRouteWomen).forEach(function(key,index) {
				var users = ascentsByRouteWomen[key];
				for (var i = 0; i < users.length; i++) {
					scoresWomen[users[i]].score += 100/users.length
					scoresWomen[users[i]].ascents += 1

				}
			});
			Object.keys(ascentsByRouteRoutesetters).forEach(function(key,index) {
				var users = ascentsByRouteRoutesetters[key];
				for (var i = 0; i < users.length; i++) {
					scoresRoutesetters[users[i]].score += 100/users.length
					scoresRoutesetters[users[i]].ascents += 1

				}
			});
			var result = {};//[];
			result["Men"] = [];
			result["Women"] = [];
			result["Routesetters"] = [];

			for (var user in scoresMen) {
				result["Men"].push([usersAndNames[user], scoresMen[user].score, scoresMen[user].ascents]);
			}
			
			result["Men"].sort(function(a, b) {
				var n = b[1] - a[1];
				if (n !== 0) {
					return n;
				}
			
				return a[3] - b[3];
			});		
			for (var user in scoresWomen) {
				result["Women"].push([usersAndNames[user], scoresWomen[user].score, scoresWomen[user].ascents]);
			}
			
			result["Women"].sort(function(a, b) {
				var n = b[1] - a[1];
				if (n !== 0) {
					return n;
				}
			
				return a[3] - b[3];
			});		
			for (var user in scoresRoutesetters) {
				result["Routesetters"].push([usersAndNames[user], scoresRoutesetters[user].score, scoresRoutesetters[user].ascents]);
			}
			
			result["Routesetters"].sort(function(a, b) {
				var n = b[1] - a[1];
				if (n !== 0) {
					return n;
				}
			
				return a[3] - b[3];
			});	
			res.json(result)
		});


		
		/*

		User.findAll({attributes: ['username', 'wholename', 'gender']} ).then(function (users) {


			var usersAndNames = {}

			users.forEach(function(user) {
				usersAndNames[user.dataValues.username] = {}

				usersAndNames[user.dataValues.username].wholename = user.dataValues.wholename;
				usersAndNames[user.dataValues.username].gender = user.dataValues.gender;
			});


			ascentsByRouteMen = {}
			ascentsByRouteWomen = {}


			Object.keys(ascentsByRoute).forEach(function(key,index) {
				ascentsByRoute[key].forEach(function (item, index) {
					console.log(usersAndNames[item])
					if (usersAndNames[item].gender == "Male"){
						if (!(key in ascentsByRouteMen)){
							ascentsByRouteMen[key] = [];
						}
						ascentsByRouteMen[key].push(item)
					}
					else if (usersAndNames[item].gender == "Female"){
						if (!(key in ascentsByRouteWomen)){
							ascentsByRouteWomen[key] = [];
						}
						ascentsByRouteWomen[key].push(item)
					}
				});
			});


			
			scoresMen = {} // username: score, ascents
			scoresWomen = {} // username: score, ascents

			for (var user in usersAndNames) {
				if (usersAndNames[user].gender == "Male") {
					scoresMen[user] = {}
					scoresMen[user].score = 0
					scoresMen[user].ascents = 0
					scoresMen[user].attempts = 0

	
				}
				else if (usersAndNames[user].gender == "Female") {
					scoresWomen[user] = {}
					scoresWomen[user].score = 0
					scoresWomen[user].ascents = 0
					scoresWomen[user].attempts = 0
				}
			}

			
			Object.keys(ascentsByRouteMen).forEach(function(key,index) {
				var users = ascentsByRouteMen[key];
				for (var i = 0; i < users.length; i++) {
					scoresMen[users[i]].score += 1//100/users.length
					scoresMen[users[i]].ascents += 1

				}
			});
			Object.keys(ascentsByRouteWomen).forEach(function(key,index) {
				var users = ascentsByRouteWomen[key];
				for (var i = 0; i < users.length; i++) {
					scoresWomen[users[i]].score += 1;
					scoresWomen[users[i]].ascents += 1

				}
			});



			ascents.forEach(function(ascent) {
				var user = ascent.dataValues.username
				var attempts = ascent.dataValues.attempts

				if (user in scoresMen) {
					scoresMen[user].attempts += attempts;
				}
				else if (user in scoresWomen) {
					scoresWomen[user].attempts += attempts;
				}
			});	

			//console.log(scoresMen);




			Lead.findAll({attributes: ["username", "number", 'type']} ).then(function (leads) {
	
				leads.forEach(function(lead) {
					
					var addition = 0;
					var ascentAdd = 0;
					if (lead.dataValues.type == "top") {
						addition = 3;
						ascentAdd = 1;

					}
					else if (lead.dataValues.type == "zone2") {
						addition = 2;
					}
					else if (lead.dataValues.type == "zone1") {
						addition = 1;
					}

					if (lead.dataValues.username in scoresMen) {
						scoresMen[lead.dataValues.username].score += addition
						scoresMen[lead.dataValues.username].ascents += ascentAdd

					}
					else if (lead.dataValues.username in scoresWomen) {
						scoresWomen[lead.dataValues.username].score += addition
						scoresWomen[lead.dataValues.username].ascents += ascentAdd

					}
					

				});

				console.log(scoresMen);

			
				var result = {};//[];
				result["Men"] = [];
				result["Women"] = [];
	
				for (var user in scoresMen) {
					result["Men"].push([usersAndNames[user], scoresMen[user].score, scoresMen[user].ascents, scoresMen[user].attempts]);
				}
				
				result["Men"].sort(function(a, b) {
					var n = b[1] - a[1];
					if (n !== 0) {
						return n;
					}
				
					return a[3] - b[3];
				});		
				for (var user in scoresWomen) {
					result["Women"].push([usersAndNames[user], scoresWomen[user].score, scoresWomen[user].ascents, scoresWomen[user].attempts]);
				}
				
				result["Women"].sort(function(a, b) {
					var n = b[1] - a[1];
					if (n !== 0) {
						return n;
					}
				
					return a[3] - b[3];
				});		
				res.json(result);

			});


			
		});
		*/
	});
});

app.get('/my_boulders_json', (req, res) => {

    if (req.session.user && req.cookies.user_sid) {

		User.findAll({attributes: ['username', 'gender']} ).then(function (users) {

			var usersAndGenders = {}

			users.forEach(function(user) {
				usersAndGenders[user.dataValues.username] = user.dataValues.gender;
			});

			var myGender = usersAndGenders[req.session.user.username];

			Boulder.findAll({attributes: ['number', 'color']} ).then(function (boulders) {

				var result = {}
				var numberOfAscentsByRoute = {}

				boulders.forEach(function(boulder) {
					var number = boulder.dataValues["number"]

					numberOfAscentsByRoute[number] = 0

					var climbed = "no";
					var number = boulder.dataValues["number"]
					var color = boulder.dataValues["color"]

					result[number] = {"color": color, "climbed": climbed};

				});

	//where: { username: req.session.user.username }
				Ascent.findAll({attributes: ["username", "number"]} ).then(function (ascents) {
					ascents.forEach(function(ascent) {
						if (usersAndGenders[ascent.dataValues.username] == myGender){
							var number = ascent.dataValues["number"];
							numberOfAscentsByRoute[number] += 1;
						}

					});

					ascents.forEach(function(ascent) {

						if (ascent.dataValues.username == req.session.user.username){
							var number = ascent.dataValues["number"]
							var climbed = "yes";
							var color = result[number]["color"]
			
							result[number] = {"color": color, "climbed": climbed};
						}
			
					});

					boulders.forEach(function(boulder) {
						var number = boulder.dataValues["number"]
	
						result[number]["ascents"] = numberOfAscentsByRoute[number].toString();
	
					});
					res.send(result)

				});
			});

		});

	} else {
		res.send("forbidden")
	}

});




// POST method route
app.post('/add_ascent', function (req, res) {
	console.log("ADDED ASCENT")
	if (req.session.user && req.cookies.user_sid) {
		console.log(req.body)
		if (!isNaN(req.body.number) && req.body.number > 0){
		//username: req.session.user.username
        Ascent.destroy({
			where: {
				username:req.session.user.username,
				number:req.body.number
			}        
		}).then(result => {
			Ascent.create({
				username: req.session.user.username,
				number: req.body.number,
				//attempts: req.body.attempts
			}).then(result2 => {
				res.send("done")
			});
	
		});

		}
		else {
			res.send("mangled input")
		}


	}
	else {
		res.send("forbidden")
	}
});



// POST method route
app.post('/remove_ascent', function (req, res) {
	if (req.session.user && req.cookies.user_sid) {
		//username: req.session.user.username
        Ascent.destroy({
			where: {
				username:req.session.user.username,
				number:req.body.number
			}        
		}).then(result => {
			res.send("done")
		});
		

	}
	else {
		res.send("forbidden")
	}
});




// POST method route
app.post('/add_lead', function (req, res) {
	if (req.session.user && req.cookies.user_sid) {
		//username: req.session.user.username
        Lead.destroy({
			where: {
				username:req.session.user.username,
				number:req.body.number
			}        
		});

		Lead.create({
            username: req.session.user.username,
			number: req.body.number,
			type: req.body.type
		})
		res.send("done")


	}
	else {
		res.send("forbidden")
	}
});

// POST method route
app.post('/remove_lead', function (req, res) {
	if (req.session.user && req.cookies.user_sid) {
		//username: req.session.user.username
        Lead.destroy({
			where: {
				username:req.session.user.username,
				number:req.body.number
			}        
		});
		res.send("done")

	}
	else {
		res.send("forbidden")
	}
});



// route for user logout
app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});


// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
});


// start the express server
app.listen(app.get('port'), () => console.log(`App started on port ${app.get('port')}`));
