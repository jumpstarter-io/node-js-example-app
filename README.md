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

To run:

If you're running the app on the Jumpstarter platform:

    $ ./bin/www

Otherwise we need to disable Jumpstarter specific paths with the command:

    $ NODE_ENV = "development" ./bin/www

_NOTE_ that this will disable all authentication and while running in development mode the Jumpstarter integrations won't work.