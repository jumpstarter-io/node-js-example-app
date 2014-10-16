/*
 * Defines the database subtask table
 * 
 * title: what the subtask is called
 * done: if the subtask has been done or not
 * 
 * every subtask belongs to one task
 */

"use strict";

module.exports = function (sequelize, DataTypes) {
    var SubTask = sequelize.define("SubTask", {
        title: DataTypes.STRING,
        done: DataTypes.BOOLEAN
    }, {
        classMethods: {
            associate: function (models) {
                SubTask.belongsTo(models.Task);
            }
        }
    });
    return SubTask;
};
