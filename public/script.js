let map;
let routes = {};
let vMarkers = [];
let ACCENT, ACCENT2;
let vColors = ['#2ecc71', '#e74c3c', '#9b59b6', '#3498db', '#2980b9', '#1abc9c', '#f39c12', '#e67e22', '#f1c40f'];

window.addEventListener("load", function() {
	ACCENT = getComputedStyle(document.documentElement).getPropertyValue('--accent');
	ACCENT2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2');
	map = L.map('map').setView([32.715736, -117.161087], 13);
	L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',subdomains: 'abcd',maxZoom: 19}).addTo(map);

	getRouteData();
	document.getElementById("loading").className = "off";
	updateVehicles();
	setInterval(updateVehicles, 15000);
});

function getRouteData() {
	post("/routes", function(data) {
		routes = data;
	});
}
function updateVehicles() {
	post("/vehicles", function(data) {
		clearMarkers(vMarkers);
		Object.values(data).forEach(function(v) {
			if(!routes[v.route]) {return;}
			var type = routes[v.route].type;
			var mkr = L.circle(v.position, {radius: 5,color: vColors[type]});
			mkr.bindTooltip('<h4 class="tooltipTitle">' + enumType(type) + " " + v.id + '</h4><div>' + routes[v.route].name + '</div>');
			mkr.openTooltip();
			vMarkers.push(mkr);
			mkr.addTo(map);
		});
	});
}
function closeToolTips() {
	map.eachLayer(function(layer) {
    if(layer.options.pane === "tooltipPane") {
    	console.log(layer);
    }
	});
}
function clearMarkers(markers) {
	markers.forEach(function(m) {
		m.remove();
	});
	markers.length = 0;
}
function enumType(type) {
	switch(type) {
		case 0: return "Trolley"; break;
		case 1: return "Metro"; break;
		case 2: return "Train"; break;
		case 3: return "Bus"; break;
		case 4: return "Ferry"; break;
		case 5: return "Cable Car"; break;
		case 6: return "Gondola"; break;
		case 7: return "Funicular"; break;
	};
}


function post(path, callback, loader) {
	if(loader) {document.getElementById(loader).classList.add("on");}
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  xhr.startTime = new Date().getTime();
  xhr.responseType = 'json';
  xhr.onreadystatechange = function() {
  	if(xhr.readyState === 4 && !xhr.aborted) {
	    if(xhr.status === 200) {
	    	console.log(path.replace("./","") + " took " + (new Date().getTime() - xhr.startTime) + "ms");
	      if(callback instanceof Function) {callback(xhr.response);}
	    }
	    else if(xhr.status === 0) {
	    	notification("<h2>Error</h2>The server sent a blank response", true, true);
	    }
	    else {
	    	notification("<h2>Error "+xhr.status+"</h2>The server responded with an error " + xhr.status, true, true);
	    }
	    if(loader) {document.getElementById(loader).classList.remove("on");}
  	}
  };
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send();
  return xhr;
}




//UI Functions
var notifHeight = 0, notifs = [];
function notification(content,isHtml, isError) { //CREATES A NOTIFCATION
	var n = document.createElement('div');
	n.className = 'notification';
	n.onclick = function() {closeNotification(this);}
	var d = document.createElement('div');
	n.appendChild(d);
	if(isHtml) {d.innerHTML = content;}
	else {d.textContent = content;}
	document.body.appendChild(n);
	notifs.push(n);
	var height = n.offsetHeight + 10;
	n.style.bottom = "calc(100% - " + height + "px)";
	if(isError) {n.style.borderColor = "var(--error)";}
	notifHeight += height;
	fixNotifications();
	setTimeout(function() {closeNotification(n);}, 5000);
}
function closeNotification(elem) {
	if(!elem || notifs.indexOf(elem) === -1) {return;}
	notifHeight -= (elem.offsetHeight+10);
	elem.style.right = -(elem.offsetWidth+10)+"px";
	notifs.splice(notifs.indexOf(elem),1);
	setTimeout(function() {elem.remove();}, 500);
	setTimeout(function() {fixNotifications();}, 200);
}
function fixNotifications() {
	var height = notifHeight;
	notifs.forEach(function(n) {
		n.style.bottom = "calc(100% - " + height + "px)";
		height -= (n.offsetHeight + 10);
	});
}