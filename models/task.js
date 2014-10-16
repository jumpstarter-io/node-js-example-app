/*
 * Defines the database task table
 * 
 * title: what the task is called
 * content: textual description of the task
 * done: if the task is done or not
 * 
 * each task can have one or many subtasks
 */

"use strict";

module.exports = function (sequelize, DataTypes) {
    var Task = sequelize.define("Task", {
        title: DataTypes.STRING,
        content: DataTypes.TEXT,
        done: DataTypes.BOOLEAN
    }, {
        classMethods: {
            associate: function (models) {
                Task.hasMany(models.SubTask);
            }
        }
    });
    return Task;
};
