var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
var Models = require('./models/user');

var User = Models.User;
var Boulder = Models.Boulder;
var Ascent = Models.Ascent;

// invoke an instance of express application.
var app = express();

// set our application port
app.set('port', 9001);

// set morgan to log info about our requests for development use.
app.use(morgan('dev'));

// initialize body-parser to parse incoming parameters requests to req.body
app.use(bodyParser.urlencoded({ extended: true }));

// initialize cookie-parser to allow us access the cookies stored in the browser. 
app.use(cookieParser());

// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
    key: 'user_sid',
    secret: 'somerandonstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
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
        User.create({
            username: req.body.username,
            wholename: req.body.wholename,
            password: req.body.password
        })
        .then(user => {
            req.session.user = user.dataValues;
            res.redirect('/modify');
        })
        .catch(error => {
            res.redirect('/signup');
        });
    });


// route for user Login
app.route('/login')
    .get(sessionChecker, (req, res) => {
        res.sendFile(__dirname + '/public/login.html');
    })
    .post((req, res) => {
        var username = req.body.username,
            password = req.body.password;

        User.findOne({ where: { username: username } }).then(function (user) {
            if (!user) {
                res.redirect('/login');
            } else if (!user.validPassword(password)) {
                res.redirect('/login');
            } else {
                req.session.user = user.dataValues;
                res.redirect('/modify');
            }
        });
    });


// route for user's dashboard
app.get('/modify', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
		console.log(req.session.user)
        res.sendFile(__dirname + '/public/modify.html');
    } else {
        res.redirect('/login');
    }
});


// route for user's dashboard
app.get('/results', (req, res) => {
	res.sendFile(__dirname + '/public/results.html');
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

		User.findAll({attributes: ['username', 'wholename']} ).then(function (users) {

			var usersAndNames = {}


			users.forEach(function(user) {
				usersAndNames[user.dataValues.username] = user.dataValues.wholename
	
			});


			scores = {} // username: score, ascents

			for (var user in usersAndNames) {
				scores[user] = {}
				scores[user].score = 0
				scores[user].ascents = 0
			}

			Object.keys(ascentsByRoute).forEach(function(key,index) {
				// key: the name of the object key
				// index: the ordinal position of the key within the object 

				var users = ascentsByRoute[key];
				for (var i = 0; i < users.length; i++) {
					scores[users[i]].score += 100/users.length
					scores[users[i]].ascents += 1

				}

			});


			
			var result = [];//[];
			for (var user in scores) {
				result.push([usersAndNames[user], scores[user].score, scores[user].ascents]);
			}
			
			result.sort(function(a, b) {
				return b[1] - a[1];
			});			
			res.json(result);
		});
	});
});

app.get('/my_ascents_json', (req, res) => {

    if (req.session.user && req.cookies.user_sid) {

		Boulder.findAll({attributes: ['number', 'color']} ).then(function (boulders) {

			var result = {}

			boulders.forEach(function(boulder) {
				var climbed = "no";
				var number = boulder.dataValues["number"]
				var color = boulder.dataValues["color"]

				result[number] = {"color": color, "climbed": climbed};

			});

			Ascent.findAll({where: { username: req.session.user.username }, attributes: ["username", "number"]} ).then(function (ascents) {
	
				ascents.forEach(function(ascent) {
					var climbed = "yes";
					var number = ascent.dataValues["number"]
					var color = result[number]["color"]
	
					result[number] = {"color": color, "climbed": climbed};
		
				});
				res.json(result)

			});
		});





	} else {
		res.send("forbidden")
	}

});



// POST method route
app.post('/add_ascent', function (req, res) {
	if (req.session.user && req.cookies.user_sid) {
		//username: req.session.user.username
        Ascent.create({
            username: req.session.user.username,
            number: req.body.number
		})
		res.send("done")


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
