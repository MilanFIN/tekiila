var Sequelize = require('sequelize');
var bcrypt = require('bcrypt');


// create a sequelize instance with our local postgres database information.
//var sequelize = new Sequelize('postgres://milan@localhost/auth-system');
var sequelize = new Sequelize('postgres', 'mmo', 'mmo', {
    dialect: 'postgres',
    pool: {
      max: 15,
      min: 5,
      idle: 20000,
      evict: 15000,
      acquire: 30000
    },
});

var asd = {}
  

// setup User model and its fields.
asd.User = sequelize.define('users', {
    username: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },
    wholename: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    }
}, {
    hooks: {
      beforeCreate: (user) => {
        const salt = bcrypt.genSaltSync();
        user.password = bcrypt.hashSync(user.password, salt);
      }
    },
    instanceMethods: {
      validPassword: function(password) {
		return bcrypt.compareSync(password, this.password);

      }
    }    
});


// setup User model and its fields.
asd.Boulder = sequelize.define('boulders', {
    number: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },
    color: {
        type: Sequelize.STRING,
        unique: false,
        allowNull: false
    }
});

asd.Ascent = sequelize.define('ascents', {
	username: {
        type: Sequelize.STRING,
        unique: false,
        allowNull: false
    },
    number: {
        type: Sequelize.STRING,
        unique: false,
        allowNull: false
    }
});



asd.User.prototype.validPassword = function(password) {
	return bcrypt.compareSync(password, this.password);

};


// create all the defined tables in the specified database.
sequelize.sync()
    .then(() => console.log('users table has been successfully created, if one doesn\'t exist'))
    .catch(error => console.log('This error occured', error));

// export User model for use in other files.
module.exports = asd;

