/*
 * Defines the database session table.
 * 
 * sid: the session id
 * eTime: session expiry time
 * sess: session data. will be stored as stringified json
 */

"use strict";

module.exports = function (sequelize, DataTypes) {
    var Session = sequelize.define("Session", {
        sid: DataTypes.STRING,
        eTime: DataTypes.INTEGER,
        sess: DataTypes.TEXT
    });
    return Session;
};
