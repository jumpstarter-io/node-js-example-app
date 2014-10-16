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

    function SQliteStore(options) {};

    SQliteStore.prototype.__proto__ = Store.prototype;

    SQliteStore.prototype.get = function (sid, fn) {
        var now = parseInt(new Date().getTime() / 1000);
        models.Session.find({
            where: {
                sid: sid
            }
        }).then(function (res) {
            if (!res) {
                fn && fn();
            } else {
                var result;
                try {
                    result = JSON.parse(res.sess);
                    (res.eTime < now)? result = null: void 0;
                } catch (e) {}
                fn && fn(null, result);
            }
        }, function() {
            fn && fn();
        });
    };

    SQliteStore.prototype.set = function (sid, sess, fn) {
        var eTime = parseInt(new Date().getTime() / 1000) + sessionTimeout;
        var createSession = function () {
            models.Session.create({
                sid: sid,
                eTime: eTime,
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

    SQliteStore.prototype.destroy = function (sid, fn) {
        models.Session.destroy({
            sid: sid
        }).then(function() {
            fn && fn();
        });
    };

    return SQliteStore;
};
