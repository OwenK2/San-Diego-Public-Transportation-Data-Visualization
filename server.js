const port = process.argv[2] || 9000;
const fs = require('fs');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();
const vehicleURL = "https://realtime.sdmts.com/api/api/gtfs_realtime/vehicle-positions-for-agency/MTS.pb?key=" + process.env.API_KEY;
const tripUpdateURL = "https://realtime.sdmts.com/api/api/gtfs_realtime/trip-updates-for-agency/MTS.pb?key=" + process.env.API_KEY;
const alertURL = "http://app.mecatran.com/utw/ws/gtfsfeed/alerts/sdmts?apiKey=" + process.env.PUB_KEY;
const app = express();



app.use(express.static(__dirname+'/public'));


const server = require('http').createServer(app);
server.listen(port, function() {
	console.log("Listening on port " + port);
});
