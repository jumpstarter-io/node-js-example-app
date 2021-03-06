/*
 * session storage module for express session using
 * sequelizejs for db access.
 * 
 * takes care of getting, creating, updating and destruction
 * of sessions.
 */

var models = require("./models");

module.exports = function (session) {
    var Store = session.Store;
    var db = null;
    var sessionTimeout = 3600; // secs

    function SequelizeStore() {};

    SequelizeStore.prototype.__proto__ = Store.prototype;

    // used by express to resolve a session
    // a valid session is a valid JSON object.
    SequelizeStore.prototype.get = function (sid, fn) {
        models.Session.find({
            where: {
                sid: sid
            }
        }).then(function (res) {
            if (!res) {
                fn && fn();
            } else {
                var session = null;
                try {
                    // if the session is expired we return a null session
		    session = JSON.parse(res.sess);
                } catch (e) {}
                fn && fn(null, session);
            }
        }, function() {
            fn && fn();
        });
    };

    // used by express to either create a new session or update an old one.
    SequelizeStore.prototype.set = function (sid, sess, fn) {
        var createSession = function () {
            models.Session.create({
                sid: sid,
                sess: JSON.stringify(sess)
            }).then(function () {
                fn && fn.apply(this, arguments);
            }, function (err) {
                fn && fn(err);
            });
        };

        var updateSession = function () {
            models.Session.update({
                sess: JSON.stringify(sess)
            }, {
                where: {sid: sid}
            }).then(function () {
                fn && fn.apply(this, arguments);
            }, function (err) {
                fn && fn(err);
            });
        };

        // check for the session and update or create accordingly
        models.Session.find({
            where: {sid: sid}
        }).then(function (doa) {
            if (doa) {
                updateSession();
            } else {
                createSession();
            }
        }, function (err) {
            fn && fn(err);
        });

    };

    // used when a certain session needs to be destroyed. eg: when 
    // the user manually logs out.
    SequelizeStore.prototype.destroy = function (sid, fn) {
        models.Session.destroy({
            sid: sid
        }).then(function() {
            fn && fn();
        });
    };

    return SequelizeStore;
};
