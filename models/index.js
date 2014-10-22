"use strict";

var fs = require("fs");
var path = require("path");
var Sequelize = require("sequelize");
var env = process.env.NODE_ENV || "production";
var config = require(__dirname + '/../config/config.json')[env];

// if we're running a dev environment we don't want to try to
// open a database stored in the /app/state/todo directory as specified
// in the $PROJECT_ROOT/config/config.json. instead we place a dev_db
// in $PROJECT_ROOT
if (env === "development") {
    config = {
        storage: path.join(__dirname, "..", "dev_db.sqlite"),
        dialect: "sqlite",
        logging: true
    };
}

// initialize sequelize with the read config
var sequelize = new Sequelize(config.database, config.username, config.password, config);
var db = {};

fs.readdirSync(__dirname)
        .filter(function (file) {
            return (file.indexOf(".") !== 0) && (file !== "index.js");
        })
        .forEach(function (file) {
            var model = sequelize["import"](path.join(__dirname, file));
            db[model.name] = model;
        });

Object.keys(db).forEach(function (modelName) {
    if ("associate" in db[modelName]) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
