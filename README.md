node-js-example-app
===================

Example app for Jumpstarter with NodeJS and Express with SQLite

To install:

Make sure that you've followed the instructions for installing NodeJS and cloning the Jumpstarter trail repo [here](https://github.com/jumpstarter-io/help/wiki/Getting-Started:-NodeJS).

Then ssh into your assembly and run the following commands:

    $ cd /app/code/
    
    $ git clone https://github.com/jumpstarter-io/node-js-example-app.git
    
    $ cd node-js-example-app
    
    $ npm install sequelize@2.0.0-rc1 
    $ npm install sequelize-cli 
    $ npm install sqlite3
    
    $ npm install

    $ mkdir /app/state/todo

To run:

    $ ./bin/www