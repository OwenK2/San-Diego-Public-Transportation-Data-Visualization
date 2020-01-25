const port = process.argv[2] || 9000;
const fs = require('fs');
const http2 = require('http2');
const mime = require('mime-types');
const request = require('request');
const unzipper = require('unzipper');
const gtfs = require('gtfs-realtime-bindings');
const dotenv = require('dotenv');

const root = "./public";

const {HTTP2_HEADER_METHOD,HTTP2_HEADER_PATH,HTTP2_HEADER_STATUS,HTTP2_HEADER_CONTENT_TYPE} = http2.constants;

dotenv.config();

let vehicles = {};
let routeData = {};





const server = http2.createSecureServer({
  key: fs.readFileSync(__dirname + '/server.key'),
  cert: fs.readFileSync(__dirname + '/server.crt')
});
server.on('error', (err) => errorHandler(err));
server.on('stream', (stream, headers) => {
	let path = headers[HTTP2_HEADER_PATH];
	if(headers[HTTP2_HEADER_METHOD] == 'GET') {
		if(path == '/') {path = "/index.html";}
		let fullPath = root + path;
		let type = mime.lookup(path);
		stream.respondWithFile(fullPath, {'content-type': type}, {onError: (err) => errorHandler(err, stream)});
	}
	else if(headers[HTTP2_HEADER_METHOD] == 'POST') {
		routePost(headers[HTTP2_HEADER_PATH], stream);
	}
});
function errorHandler(err,stream) {
	if(stream) {
	  if (err.code === 'ENOENT') {
	    stream.respond({HTTP2_HEADER_STATUS: 404 });
	  } 
	  else {
	    stream.respond({HTTP2_HEADER_STATUS: 500 });
	  }
	  stream.end();
	}
	else {
		console.log(err);
	}
}

server.listen(port, function() {
	console.log("Listening on on port " + port);

	setInterval(refreshGTFS,14400000);
	refreshGTFS(true);

	getVehicles();
	setInterval(getVehicles, 15000);




});


//API
function routePost(path,stream) {
	switch(path) {
		case "/vehicles":
			stream.respond({HTTP2_HEADER_STATUS: 200, 'content-type': 'json'});
			stream.end(JSON.stringify(vehicles));
		break;
		case "/routes":
			stream.respond({HTTP2_HEADER_STATUS: 200, 'content-type': 'json'});
			stream.end(JSON.stringify(routeData));
		break;
	}
}


//Data Getters
function refreshGTFS(alwaysLoad) {
	fs.readFile('./timestamp.txt', function(error, data) {
	  if (error) {
	  	console.log("Could not read timestamp.txt");
	  	return false;
	  };
	  let timestamp = parseInt(data.toString());
	  let time = new Date().getTime();
	  const oneDay = 86400000;
	  if(isNaN(timestamp) || time - timestamp > oneDay) {
	  	aquireGTFS();
	  }
	  else if(alwaysLoad) {loadData();}
	});
}
function aquireGTFS() {
	request("http://www.sdmts.com/google_transit_files/google_transit.zip", function(error) {
	  if(!error) {
	  	console.log("GTFS downloaded");
	  }
	  else {
	  	console.log("Failed to download GTFS data");
	  }
	}).pipe(unzipper.Extract({ path: './gtfs' })).promise()
	.then(function() {
		console.log("GTFS extracted");
		fs.writeFile("./timestamp.txt", new Date().getTime(), 'utf8', function(error) {
			if(error) {
				console.log("Failed to log to timestamp.txt");
			}
		});
		paths = {};
		fs.writeFile("./gtfs/paths.json", "{}", 'utf8', function(error) {
			if(error) {
				console.log("Failed to update paths.json");
			}
		});
		loadData();
	}, function() {
			console.log("Failed to extract GTFS data");
	});
}
function loadData() {
	readFile("./gtfs/routes.txt", "csv", function(cols) {
		routeData[cols[2]] = {
			id: cols[2],
			name: cols[1],
			nickname: cols[10],
			type: parseInt(cols[3])
		};
	});
}

function getVehicles() {
	request({url:"https://realtime.sdmts.com/api/api/gtfs_realtime/vehicle-positions-for-agency/MTS.pb?key=" + process.env.API_KEY,encoding:null,method:'get'}, function(error, res, body) {
		if(!error) {
			try {
				var entity = gtfs.transit_realtime.FeedMessage.decode(body).entity;
				entity.forEach(function(v) {
					if(!v.vehicle.trip) {return;}
					vehicles[v.vehicle.vehicle.id] = {
						id: v.vehicle.vehicle.id,
						route: v.vehicle.trip.routeId,
						trip: v.vehicle.trip.tripId,
						position: [v.vehicle.position.latitude,v.vehicle.position.longitude],
					}
				});
			}
			catch(error) {
				console.log("Failed to parse vehicles");
				return;
			}
		}
		else {
			console.log("Failed to get vehicles");
		}
	});
}


//HELPERS
function readFile(file,type,callback) {
	fs.readFile(file, function(error,data) {
		if(error) {
			console.log(("Failed to read " + file.split("/").pop()));
		}
		else if(callback) {
			if(type === 'csv') {
				data = data.toString().replace(/\r/g, '').split('\n');
				data.splice(0,1);
				data.forEach(function(row) {
					callback(row.split(","));
				});
			}
			else if(type === 'json') {
				if(!JSON.valid(data)) {console.log(("Failed to read " + file.split("/").pop() + ", not json... cleaning up"));callback({})}
				else {callback(JSON.parse(data.toString()));}
			}
			console.log(("Loaded " + file.split("/").pop()));
		}
	});
}
JSON.valid = function(text) {
	try {JSON.parse(text);}
	catch(e) {return false;}
	return true;
}